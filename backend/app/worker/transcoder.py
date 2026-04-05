import ffmpeg
import os
from app.core.presets import SMART_PRESETS


def process_video_transcode(
    source_file_path: str,
    output_path: str,
    output_format: str = "mp4",
    preset_name: str = None,
) -> bool:
    """
    Transcodes a given source video file based on format and preset.
    If output_format is 'hls', output_path should be a directory.
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

        # Apply preset if exists
        if preset_name and preset_name in SMART_PRESETS:
            preset_opts = SMART_PRESETS[preset_name]
            if "vf" in preset_opts:
                kwargs["vf"] = preset_opts["vf"]
            if "video_bitrate" in preset_opts:
                kwargs["video_bitrate"] = preset_opts["video_bitrate"]
            if "audio_bitrate" in preset_opts:
                kwargs["audio_bitrate"] = preset_opts["audio_bitrate"]

        if output_format == "hls":
            # Create master playlist and segmentation in the output_path directory
            os.makedirs(output_path, exist_ok=True)
            output_file = os.path.join(output_path, "master.m3u8")
            kwargs.update(
                {
                    "f": "hls",
                    "hls_time": 10,
                    "hls_playlist_type": "vod",
                    "hls_segment_filename": os.path.join(
                        output_path, "segment_%03d.ts"
                    ),
                }
            )
        else:
            # MP4 specific
            output_file = output_path
            kwargs["movflags"] = "+faststart"

        stream = ffmpeg.output(stream, output_file, **kwargs)

        # Execute the transcode
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
