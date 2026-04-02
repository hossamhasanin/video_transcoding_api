import json
import requests
from requests.exceptions import RequestException

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.job import Job
from app.models.user import User
from app.schemas.job import JobStatusResponse
from app.core.security import generate_hmac_signature


@celery_app.task(
    name="send_webhook",
    bind=True,
    max_retries=5,
    autoretry_for=(RequestException,),
    retry_backoff=5,
    retry_jitter=True,
)
def send_webhook_task(self, job_id: str):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()

        if not job or not job.webhook_url:
            return (
                f"Webhook not sent: Job {job_id} not found or no webhook_url configured"
            )

        user = db.query(User).filter(User.id == job.user_id).first()

        # Serialize the job status to a dictionary
        job_data = JobStatusResponse.model_validate(job)
        payload_dict = job_data.model_dump(mode="json")
        payload_str = json.dumps(payload_dict)

        headers = {"Content-Type": "application/json"}

        # Add HMAC signature if a secret is configured for the user
        if user and user.webhook_secret:
            signature = generate_hmac_signature(payload_str, user.webhook_secret)
            headers["X-Webhook-Signature"] = signature

        print(f"Sending webhook for job {job_id} to {job.webhook_url}")

        # Execute the HTTP POST request to the webhook URL
        response = requests.post(
            job.webhook_url, data=payload_str, headers=headers, timeout=10
        )
        response.raise_for_status()
        print(
            f"Webhook delivered successfully for job {job_id}. Status Code: {response.status_code}"
        )

        return f"Webhook for {job_id} delivered successfully"

    except RequestException as e:
        print(f"Failed to send webhook for job {job_id}: {e}")
        raise  # Let autoretry_for handle the backoff and retry
    except Exception as e:
        print(f"Unexpected error in webhook delivery for job {job_id}: {e}")
        # Still retry but with a static delay for non-request exceptions
        raise self.retry(exc=e, countdown=60)
    finally:
        db.close()
