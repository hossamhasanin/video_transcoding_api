HLS_TEMPLATES = {
    "adaptive_streaming": {
        "name": "Adaptive Streaming",
        "description": "Balanced quality ladder for most streaming use cases",
        "renditions": [
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
        ],
    },
    "low_bandwidth": {
        "name": "Low Bandwidth",
        "description": "Optimized for constrained networks and emerging markets",
        "renditions": [
            {
                "name": "240p",
                "width": 426,
                "height": 240,
                "video_bitrate": "400k",
                "audio_bitrate": "64k",
            },
            {
                "name": "360p",
                "width": 640,
                "height": 360,
                "video_bitrate": "600k",
                "audio_bitrate": "96k",
            },
            {
                "name": "480p",
                "width": 842,
                "height": 480,
                "video_bitrate": "1000k",
                "audio_bitrate": "128k",
            },
        ],
    },
    "4k_ultra": {
        "name": "4K Ultra",
        "description": "High quality ladder up to 4K resolution",
        "renditions": [
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
                "video_bitrate": "6000k",
                "audio_bitrate": "192k",
            },
            {
                "name": "1440p",
                "width": 2560,
                "height": 1440,
                "video_bitrate": "12000k",
                "audio_bitrate": "192k",
            },
            {
                "name": "2160p",
                "width": 3840,
                "height": 2160,
                "video_bitrate": "20000k",
                "audio_bitrate": "192k",
            },
        ],
    },
    "mobile_only": {
        "name": "Mobile Only",
        "description": "Optimized for mobile devices with smaller screens",
        "renditions": [
            {
                "name": "240p",
                "width": 426,
                "height": 240,
                "video_bitrate": "400k",
                "audio_bitrate": "64k",
            },
            {
                "name": "360p",
                "width": 640,
                "height": 360,
                "video_bitrate": "800k",
                "audio_bitrate": "96k",
            },
            {
                "name": "480p",
                "width": 854,
                "height": 480,
                "video_bitrate": "1200k",
                "audio_bitrate": "128k",
            },
        ],
    },
    "broadcast": {
        "name": "Broadcast",
        "description": "High bitrate tiers for professional streaming platforms",
        "renditions": [
            {
                "name": "720p",
                "width": 1280,
                "height": 720,
                "video_bitrate": "4500k",
                "audio_bitrate": "192k",
            },
            {
                "name": "1080p",
                "width": 1920,
                "height": 1080,
                "video_bitrate": "8000k",
                "audio_bitrate": "192k",
            },
        ],
    },
}

# Default HLS renditions — used by the worker when no template or config is provided.
# Kept for backward compatibility; mirrors the "adaptive_streaming" template.
DEFAULT_HLS_RENDITIONS = HLS_TEMPLATES["adaptive_streaming"]["renditions"]

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


def get_hls_template_renditions(template_id: str) -> list[dict] | None:
    """Return the renditions list for a given HLS template ID, or None."""
    template = HLS_TEMPLATES.get(template_id)
    if template is not None:
        return template["renditions"]
    return None
