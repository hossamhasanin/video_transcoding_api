import json
import redis
from datetime import datetime, timezone

from app.core.config import settings

_redis_pool: redis.ConnectionPool | None = None


def get_redis() -> redis.Redis:
    """Return a Redis connection from the shared pool (lazy-initialised)."""
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = redis.ConnectionPool.from_url(
            settings.CELERY_BROKER_URL,
            decode_responses=True,
        )
    return redis.Redis(connection_pool=_redis_pool)


def _progress_key(job_id: str) -> str:
    return f"job:{job_id}:progress"


def _events_channel(job_id: str) -> str:
    return f"job:{job_id}:events"


def set_progress(
    job_id: str,
    progress: int,
    eta_seconds: float | None,
    status: str,
) -> None:
    """Write progress to a Redis Hash and publish an update event."""
    r = get_redis()
    key = _progress_key(job_id)
    mapping = {
        "progress": str(progress),
        "eta_seconds": str(eta_seconds) if eta_seconds is not None else "",
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    r.hset(key, mapping=mapping)
    r.expire(key, settings.PROGRESS_KEY_TTL)

    # Also publish so SSE subscribers get notified immediately
    publish_event(
        job_id,
        "progress",
        {
            "progress": progress,
            "eta_seconds": eta_seconds,
            "status": status,
        },
    )


def get_progress(job_id: str) -> dict | None:
    """Read the current progress hash for a job. Returns None if no data."""
    r = get_redis()
    data = r.hgetall(_progress_key(job_id))
    if not data:
        return None
    return {
        "progress": int(data["progress"]) if data.get("progress") else None,
        "eta_seconds": (
            float(data["eta_seconds"]) if data.get("eta_seconds") else None
        ),
        "status": data.get("status"),
        "updated_at": data.get("updated_at"),
    }


def publish_event(job_id: str, event_type: str, payload: dict) -> None:
    """Publish a JSON message to the job's event channel."""
    r = get_redis()
    message = {"event_type": event_type, **payload}
    r.publish(_events_channel(job_id), json.dumps(message))


def subscribe_to_job(job_id: str) -> redis.client.PubSub:
    """Subscribe to a job's event channel. Returns a PubSub object."""
    r = get_redis()
    pubsub = r.pubsub()
    pubsub.subscribe(_events_channel(job_id))
    return pubsub


def clear_progress(job_id: str) -> None:
    """Remove the progress hash for a job (used on cancellation)."""
    r = get_redis()
    r.delete(_progress_key(job_id))
