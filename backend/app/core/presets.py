SMART_PRESETS = {
    "tiktok": {
        "vf": "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
        "video_bitrate": "2M",
        "audio_bitrate": "128k",
    },
    "youtube": {
        "vf": "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
        "video_bitrate": "4M",
        "audio_bitrate": "192k",
    },
    "instagram": {
        "vf": "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2",
        "video_bitrate": "2M",
        "audio_bitrate": "128k",
    },
}
