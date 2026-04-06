import ffmpeg
import os
from app.core.presets import SMART_PRESETS, DEFAULT_HLS_RENDITIONS


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

            for rendition in renditions:
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
                ffmpeg.run(
                    output_stream,
                    overwrite_output=True,
                    capture_stdout=True,
                    capture_stderr=True,
                )

            _generate_master_playlist(output_path, renditions)
        else:
            # MP4 specific
            output_file = output_path
            kwargs["movflags"] = "+faststart"
            stream = ffmpeg.output(stream, output_file, **kwargs)
            ffmpeg.run(
                stream, overwrite_output=True, capture_stdout=True, capture_stderr=True
            )

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
