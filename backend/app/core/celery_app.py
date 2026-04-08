from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.worker.tasks", "app.worker.webhooks", "app.worker.subtitles"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_routes={
        "transcode_video": {"queue": "transcode_queue"},
        "generate_subtitles_task": {"queue": "ml_queue"},
        "send_webhook": {"queue": "default"},
    },
    task_default_queue="default",
    beat_schedule={
        "cleanup-abandoned-uploads": {
            "task": "cleanup_abandoned_uploads",
            "schedule": crontab(hour="*/6", minute=0),
        },
    },
)
