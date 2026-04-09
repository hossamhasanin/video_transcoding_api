import ffmpeg
import os
import re
import subprocess
import time
from typing import Callable

from app.core.presets import SMART_PRESETS, DEFAULT_HLS_RENDITIONS


def _probe_duration(source_file_path: str) -> float | None:
    """Probe the duration of the source video in seconds. Returns None on failure."""
    try:
        probe = ffmpeg.probe(source_file_path)
        # Try format duration first, then stream duration
        duration = probe.get("format", {}).get("duration")
        if duration:
            return float(duration)
        for stream in probe.get("streams", []):
            dur = stream.get("duration")
            if dur:
                return float(dur)
    except (ffmpeg.Error, ValueError, KeyError):
        pass
    return None


# Regex to parse FFmpeg stderr progress lines
_TIME_RE = re.compile(r"time=(\d+:\d+:\d+\.\d+)")
_TIME_SHORT_RE = re.compile(r"time=(\d+\.\d+)")
_SPEED_RE = re.compile(r"speed=\s*([\d.]+)x")


def _parse_time_to_seconds(time_str: str) -> float:
    """Convert HH:MM:SS.ms or seconds-only string to float seconds."""
    if ":" in time_str:
        parts = time_str.split(":")
        return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
    return float(time_str)


def _run_ffmpeg_with_progress(
    ffmpeg_stream,
    progress_callback: Callable[[int, float | None], None] | None,
    total_duration: float | None,
    progress_offset: float = 0.0,
    progress_range: float = 100.0,
) -> None:
    """Execute an FFmpeg stream via subprocess, parsing stderr for progress.

    Args:
        ffmpeg_stream: ffmpeg-python stream object
        progress_callback: called with (progress_percent, eta_seconds)
        total_duration: source video duration in seconds
        progress_offset: base percentage for this run (for HLS multi-rendition)
        progress_range: percentage range this run covers (for HLS multi-rendition)
    """
    args = ffmpeg_stream.compile()
    process = subprocess.Popen(
        args,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        universal_newlines=True,
    )

    last_report_time = 0.0
    stderr_lines = []

    for line in process.stderr:
        stderr_lines.append(line)

        if progress_callback is None or total_duration is None or total_duration <= 0:
            continue

        # Parse time from FFmpeg progress line
        match = _TIME_RE.search(line) or _TIME_SHORT_RE.search(line)
        if not match:
            continue

        current_time = _parse_time_to_seconds(match.group(1))

        # Throttle progress reporting to once per second
        now = time.time()
        if now - last_report_time < 1.0:
            continue
        last_report_time = now

        # Calculate progress within this run's slice
        run_fraction = min(current_time / total_duration, 1.0)
        overall_progress = int(progress_offset + run_fraction * progress_range)

        # Parse speed for ETA estimation
        speed_match = _SPEED_RE.search(line)
        speed = float(speed_match.group(1)) if speed_match else None
        remaining_time = total_duration - current_time
        eta = (remaining_time / speed) if speed and speed > 0 else None

        progress_callback(min(overall_progress, 99), eta)

    process.wait()

    if process.returncode != 0:
        stderr_output = "".join(stderr_lines[-50:])
        raise Exception(
            f"FFmpeg failed (exit {process.returncode}): {stderr_output[-500:]}"
        )


def _bitrate_to_bps(bitrate_str: str) -> int:
    """Convert a bitrate string like '1500k' or '2M' to integer bits per second."""
    bitrate_str = bitrate_str.strip()
    if bitrate_str.endswith("M"):
        return int(float(bitrate_str[:-1]) * 1_000_000)
    elif bitrate_str.endswith("k"):
        return int(float(bitrate_str[:-1]) * 1_000)
    return int(bitrate_str)


def _probe_resolution(source_file_path: str) -> tuple[int, int] | None:
    """Probe the resolution of the source video. Returns (width, height) or None."""
    try:
        probe = ffmpeg.probe(source_file_path)
        video_stream = next(
            (s for s in probe.get("streams", []) if s.get("codec_type") == "video"),
            None,
        )
        if video_stream:
            return (int(video_stream["width"]), int(video_stream["height"]))
    except ffmpeg.Error:
        pass
    return None


def _generate_master_playlist(output_dir: str, renditions: list[dict]) -> None:
    """Generate a master.m3u8 referencing all variant playlists."""
    lines = ["#EXTM3U", "#EXT-X-VERSION:3"]

    for rendition in renditions:
        name = rendition["name"]
        v_bitrate = _bitrate_to_bps(rendition["video_bitrate"])
        a_bitrate = _bitrate_to_bps(rendition.get("audio_bitrate", "128k"))
        total_bandwidth = v_bitrate + a_bitrate
        width = rendition["width"]
        height = rendition["height"]

        lines.append(
            f"#EXT-X-STREAM-INF:BANDWIDTH={total_bandwidth},"
            f"RESOLUTION={width}x{height}"
        )
        lines.append(f"{name}/index.m3u8")

    master_path = os.path.join(output_dir, "master.m3u8")
    with open(master_path, "w") as f:
        f.write("\n".join(lines) + "\n")


def process_video_transcode(
    source_file_path: str,
    output_path: str,
    output_format: str = "mp4",
    preset_name: str = None,
    hls_config: dict | None = None,
    progress_callback: Callable[[int, float | None], None] | None = None,
) -> bool:
    """
    Transcodes a given source video file based on format and preset.
    If output_format is 'hls', output_path should be a directory.
    When HLS, produces multi-rendition adaptive bitrate output.
    """
    try:
        stream = ffmpeg.input(source_file_path)

        # Base encoding settings
        kwargs = {
            "vcodec": "libx264",
            "acodec": "aac",
            "preset": "fast",
            "crf": 23,
        }

        # Apply preset if exists (used for MP4 and as base for HLS)
        if preset_name and preset_name in SMART_PRESETS:
            preset_opts = SMART_PRESETS[preset_name]
            if "vf" in preset_opts:
                kwargs["vf"] = preset_opts["vf"]
            if "video_bitrate" in preset_opts:
                kwargs["video_bitrate"] = preset_opts["video_bitrate"]
            if "audio_bitrate" in preset_opts:
                kwargs["audio_bitrate"] = preset_opts["audio_bitrate"]

        if output_format == "hls":
            config = hls_config or {}
            renditions = config.get("renditions") or DEFAULT_HLS_RENDITIONS
            segment_duration = config.get("segment_duration", 10)
            codec_preset = config.get("video_codec_preset", "fast")
            crf = config.get("video_crf", 23)
            profile = config.get("video_profile", "high")

            os.makedirs(output_path, exist_ok=True)

            source_res = _probe_resolution(source_file_path)
            total_duration = _probe_duration(source_file_path)
            num_renditions = len(renditions)
            range_per_rendition = (
                100.0 / num_renditions if num_renditions > 0 else 100.0
            )

            for idx, rendition in enumerate(renditions):
                name = rendition["name"]
                w = rendition["width"]
                h = rendition["height"]
                v_bitrate = rendition["video_bitrate"]
                a_bitrate = rendition.get("audio_bitrate", "128k")

                if source_res and h > source_res[1]:
                    print(
                        f"Warning: rendition {name} ({h}p) exceeds source "
                        f"resolution ({source_res[1]}p). Upscaling will occur."
                    )

                rendition_dir = os.path.join(output_path, name)
                os.makedirs(rendition_dir, exist_ok=True)

                inp = ffmpeg.input(source_file_path)
                scale_filter = (
                    f"scale={w}:{h}:force_original_aspect_ratio=decrease,"
                    f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2"
                )

                rendition_file = os.path.join(rendition_dir, "index.m3u8")
                rendition_kwargs = {
                    "vcodec": "libx264",
                    "acodec": "aac",
                    "preset": codec_preset,
                    "crf": crf,
                    "profile:v": profile,
                    "vf": scale_filter,
                    "video_bitrate": v_bitrate,
                    "audio_bitrate": a_bitrate,
                    "f": "hls",
                    "hls_time": segment_duration,
                    "hls_playlist_type": "vod",
                    "hls_segment_filename": os.path.join(
                        rendition_dir, "segment_%03d.ts"
                    ),
                }

                output_stream = ffmpeg.output(inp, rendition_file, **rendition_kwargs)
                _run_ffmpeg_with_progress(
                    output_stream,
                    progress_callback,
                    total_duration,
                    progress_offset=idx * range_per_rendition,
                    progress_range=range_per_rendition,
                )

            _generate_master_playlist(output_path, renditions)
        else:
            # MP4 specific
            output_file = output_path
            kwargs["movflags"] = "+faststart"
            stream = ffmpeg.output(stream, output_file, **kwargs)
            total_duration = _probe_duration(source_file_path)
            _run_ffmpeg_with_progress(stream, progress_callback, total_duration)

        return True
    except ffmpeg.Error as e:
        error_msg = e.stderr.decode("utf8") if e.stderr else "Unknown FFmpeg Error"
        raise Exception(f"FFmpeg transcode failed: {error_msg}")


def has_audio_stream(source_file_path: str) -> bool:
    """
    Checks if a given video file has an audio stream.
    """
    try:
        probe = ffmpeg.probe(source_file_path)
        return any(
            stream.get("codec_type") == "audio" for stream in probe.get("streams", [])
        )
    except ffmpeg.Error:
        return False


def extract_audio(source_file_path: str, output_path: str) -> bool:
    """
    Extracts audio from video and converts it to 16kHz mono WAV for speech recognition.
    """
    try:
        stream = ffmpeg.input(source_file_path)
        stream = ffmpeg.output(stream, output_path, acodec="pcm_s16le", ac=1, ar="16k")
        ffmpeg.run(
            stream, overwrite_output=True, capture_stdout=True, capture_stderr=True
        )
        return True
    except ffmpeg.Error as e:
        error_msg = e.stderr.decode("utf8") if e.stderr else "Unknown FFmpeg Error"
        raise Exception(f"FFmpeg audio extraction failed: {error_msg}")
