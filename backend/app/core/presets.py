DEFAULT_HLS_RENDITIONS = [
    {
        "name": "360p",
        "width": 640,
        "height": 360,
        "video_bitrate": "800k",
        "audio_bitrate": "128k",
    },
    {
        "name": "480p",
        "width": 842,
        "height": 480,
        "video_bitrate": "1500k",
        "audio_bitrate": "128k",
    },
    {
        "name": "720p",
        "width": 1280,
        "height": 720,
        "video_bitrate": "3000k",
        "audio_bitrate": "128k",
    },
    {
        "name": "1080p",
        "width": 1920,
        "height": 1080,
        "video_bitrate": "5000k",
        "audio_bitrate": "192k",
    },
]

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
