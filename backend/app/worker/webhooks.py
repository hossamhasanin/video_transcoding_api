import json
import requests
from requests.exceptions import RequestException

from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.job import Job
from app.models.user import User
from app.models.webhook_delivery import WebhookDeliveryLog
from app.schemas.job import JobStatusResponse
from app.core.security import generate_hmac_signature
from app.core.storage import extract_r2_key, generate_presigned_download_url

from datetime import datetime, timezone, timedelta


def _build_output_url_for_webhook(job: Job) -> tuple[str | None, str | None]:
    """Build an accessible output URL for the webhook payload.

    Returns (output_url, output_url_expires_at_iso) or (None, None).
    - HLS: streaming proxy URL via the API
    - MP4: presigned download URL with expiry
    """
    if not job.output_url:
        return None, None

    base_url = settings.API_BASE_URL.rstrip("/")

    if job.output_format == "hls":
        url = f"{base_url}{settings.API_V1_STR}/jobs/{job.id}/stream/master.m3u8"
        return url, None

    # MP4 / other single-file output — presigned URL
    key = extract_r2_key(job.output_url)
    if not key:
        return job.output_url, None

    presigned = generate_presigned_download_url(
        settings.R2_BUCKET_NAME,
        key,
        expires_in=settings.PRESIGNED_URL_EXPIRES_SECONDS,
    )
    expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=settings.PRESIGNED_URL_EXPIRES_SECONDS
    )
    return presigned, expires_at.isoformat()


def _build_subtitle_url_for_webhook(job: Job) -> str | None:
    """Build an accessible subtitle URL for the webhook payload."""
    if not job.subtitle_url:
        return None

    key = extract_r2_key(job.subtitle_url)
    if not key:
        return job.subtitle_url

    return generate_presigned_download_url(
        settings.R2_BUCKET_NAME,
        key,
        expires_in=settings.PRESIGNED_URL_EXPIRES_SECONDS,
    )


def _build_output_zip_url_for_webhook(job: Job) -> tuple[str | None, str | None]:
    """Build a presigned download URL for the HLS zip archive.

    Returns (presigned_url, expires_at_iso) or (None, None).
    """
    if not job.output_zip_url:
        return None, None

    key = extract_r2_key(job.output_zip_url)
    if not key:
        return job.output_zip_url, None

    presigned = generate_presigned_download_url(
        settings.R2_BUCKET_NAME,
        key,
        expires_in=settings.PRESIGNED_URL_EXPIRES_SECONDS,
    )
    expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=settings.PRESIGNED_URL_EXPIRES_SECONDS
    )
    return presigned, expires_at.isoformat()


def _persist_delivery_log(
    db,
    job_id,
    event_type,
    attempt_number,
    status_code,
    response_body,
    error_message,
):
    """Persist a webhook delivery attempt to the database."""
    max_body_len = settings.WEBHOOK_RESPONSE_BODY_MAX_LENGTH
    log = WebhookDeliveryLog(
        job_id=job_id,
        event_type=event_type,
        attempt_number=attempt_number,
        status_code=status_code,
        response_body=response_body[:max_body_len] if response_body else None,
        error_message=error_message[:500] if error_message else None,
        delivered_at=datetime.utcnow(),
    )
    db.add(log)
    db.commit()


@celery_app.task(
    name="send_webhook",
    bind=True,
    max_retries=settings.WEBHOOK_MAX_RETRIES,
    autoretry_for=(RequestException,),
    retry_backoff=settings.WEBHOOK_BACKOFF_BASE,
    retry_jitter=True,
)
def send_webhook_task(self, job_id: str, event_type: str = "job.completed"):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()

        if not job or not job.webhook_url:
            return (
                f"Webhook not sent: Job {job_id} not found or no webhook_url configured"
            )

        user = db.query(User).filter(User.id == job.user_id).first()
        attempt = self.request.retries + 1

        # Build accessible URLs instead of raw R2 URLs
        output_url, output_url_expires_at = _build_output_url_for_webhook(job)
        subtitle_url = _build_subtitle_url_for_webhook(job)
        output_zip_url, output_zip_url_expires_at = _build_output_zip_url_for_webhook(
            job
        )

        # Serialize the job status to a dictionary
        job_data = JobStatusResponse.model_validate(job)
        payload_dict = job_data.model_dump(mode="json")

        # Override with accessible URLs
        payload_dict["output_url"] = output_url
        payload_dict["output_url_expires_at"] = output_url_expires_at
        payload_dict["subtitle_url"] = subtitle_url
        payload_dict["output_zip_url"] = output_zip_url
        payload_dict["output_zip_url_expires_at"] = output_zip_url_expires_at

        # Add event type to payload
        payload_dict["event_type"] = event_type

        payload_str = json.dumps(payload_dict, sort_keys=True, separators=(",", ":"))

        headers = {"Content-Type": "application/json"}

        # Add HMAC signature if a secret is configured for the user
        if user and user.webhook_secret:
            signature = generate_hmac_signature(payload_str, user.webhook_secret)
            headers["X-Webhook-Signature"] = signature

        print(f"Sending webhook for job {job_id} to {job.webhook_url}")

        try:
            response = requests.post(
                job.webhook_url, data=payload_str, headers=headers, timeout=10
            )

            # Log the attempt before raising so we capture all responses
            _persist_delivery_log(
                db,
                job_id,
                event_type,
                attempt,
                status_code=response.status_code,
                response_body=response.text[
                    : settings.WEBHOOK_RESPONSE_BODY_MAX_LENGTH
                ],
                error_message=(
                    None
                    if response.ok
                    else f"HTTP {response.status_code}: {response.reason}"
                ),
            )

            response.raise_for_status()
            print(
                f"Webhook delivered successfully for job {job_id}. "
                f"Status Code: {response.status_code}"
            )
            return f"Webhook for {job_id} delivered successfully"

        except RequestException as e:
            # Only log here if we didn't already log above (connection-level failures)
            # HTTPError from raise_for_status() is already logged above
            if not isinstance(e, requests.HTTPError):
                _persist_delivery_log(
                    db,
                    job_id,
                    event_type,
                    attempt,
                    status_code=None,
                    response_body=None,
                    error_message=str(e)[:500],
                )
            print(f"Failed to send webhook for job {job_id}: {e}")
            raise  # Let autoretry_for handle the backoff and retry

    except RequestException:
        raise  # autoretry_for handles this
    except Exception as e:
        print(f"Unexpected error in webhook delivery for job {job_id}: {e}")
        raise self.retry(exc=e, countdown=60)
    finally:
        db.close()
