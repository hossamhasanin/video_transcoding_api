import os
import uuid
import time
import tempfile
import requests
import re
import shutil
import zipfile
from urllib.parse import urlparse
from botocore.exceptions import ClientError

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.job import Job
from app.models.upload import PendingUpload
from app.worker.transcoder import process_video_transcode
from app.core.storage import get_s3_client, upload_directory_to_s3, extract_r2_key
from app.core.config import settings
from app.core.redis import set_progress, publish_event


def _get_dir_size(path: str) -> int:
    """Calculate total size of all files in a directory (for HLS output)."""
    total = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if os.path.isfile(fp):
                total += os.path.getsize(fp)
    return total


def _check_job_cancelled(job_id: str) -> bool:
    """Check if a job has been marked as cancelled in the database."""
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        return job is not None and job.status == "cancelled"
    finally:
        db.close()


def _zip_directory(directory_path: str, zip_path: str) -> str:
    """Create a zip archive of the given directory."""
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(directory_path):
            for filename in files:
                file_path = os.path.join(root, filename)
                arcname = os.path.relpath(file_path, directory_path)
                zf.write(file_path, arcname)
    return zip_path


@celery_app.task(name="transcode_video", bind=True, max_retries=3)
def transcode_video_task(self, job_id: str):
    start_time = time.time()
    source_size = 0
    output_size = 0

    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return f"Job {job_id} not found"

        # Cooperative cancellation check — job may have been cancelled while queued
        if job.status == "cancelled":
            print(f"Job {job_id} was cancelled before processing started")
            return f"Job {job_id} cancelled"

        job.status = "processing"

        source_url = job.source_url
        output_format = job.output_format
        preset = job.preset
        generate_subtitles = job.generate_subtitles
        webhook_url = job.webhook_url
        hls_config = job.hls_config
        db.commit()
        publish_event(job_id, "status_change", {"status": "processing"})

        # Fire job.started webhook
        if webhook_url:
            from app.worker.webhooks import send_webhook_task

            send_webhook_task.delay(str(job.id), "job.started")
    finally:
        db.close()

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            source_file_path = os.path.join(temp_dir, f"source_{job_id}.tmp")
            if output_format == "hls":
                output_path = os.path.join(temp_dir, f"output_{job_id}_hls")
            else:
                output_path = os.path.join(temp_dir, f"output_{job_id}.mp4")

            # Handle file:// URLs (local dev uploads)
            parsed = urlparse(source_url)
            if parsed.scheme == "file":
                local_src = parsed.path
                if not os.path.exists(local_src):
                    raise FileNotFoundError(f"Local source file not found: {local_src}")
                shutil.copy2(local_src, source_file_path)
                source_size = os.path.getsize(source_file_path)
                print(f"Copied local file ({source_size} bytes) " f"from {local_src}")
            else:
                max_size_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

                # Detect R2/S3 URLs and download via boto3
                s3_key = extract_r2_key(source_url)
                if s3_key:
                    print(
                        f"Downloading from R2: bucket={settings.R2_BUCKET_NAME}, "
                        f"key={s3_key}"
                    )
                    s3 = get_s3_client()
                    head = s3.head_object(Bucket=settings.R2_BUCKET_NAME, Key=s3_key)
                    content_length = head.get("ContentLength", 0)
                    if content_length > max_size_bytes:
                        raise ValueError(
                            f"Source file too large: "
                            f"{content_length / (1024*1024):.1f}MB "
                            f"exceeds limit of {settings.MAX_UPLOAD_SIZE_MB}MB"
                        )
                    s3.download_file(settings.R2_BUCKET_NAME, s3_key, source_file_path)
                    source_size = os.path.getsize(source_file_path)
                    print(
                        f"Source file size: {source_size} bytes "
                        f"({source_size / (1024*1024):.1f}MB)"
                    )
                else:
                    # Public URL fallback — use requests
                    print(f"Checking source file size from {source_url}")
                    head_response = requests.head(
                        source_url, timeout=10, allow_redirects=True
                    )
                    head_response.raise_for_status()
                    content_length = head_response.headers.get("Content-Length")
                    if content_length and int(content_length) > max_size_bytes:
                        raise ValueError(
                            f"Source file too large: "
                            f"{int(content_length) / (1024*1024):.1f}MB "
                            f"exceeds limit of {settings.MAX_UPLOAD_SIZE_MB}MB"
                        )

                    print(f"Downloading source video from {source_url}")
                    response = requests.get(source_url, stream=True, timeout=(10, 600))
                    response.raise_for_status()
                    downloaded_bytes = 0
                    with open(source_file_path, "wb") as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            downloaded_bytes += len(chunk)
                            if downloaded_bytes > max_size_bytes:
                                f.close()
                                os.remove(source_file_path)
                                raise ValueError(
                                    f"Source file too large: exceeds limit "
                                    f"of {settings.MAX_UPLOAD_SIZE_MB}MB"
                                )
                            f.write(chunk)

                    source_size = os.path.getsize(source_file_path)
                    print(
                        f"Source file size: {source_size} bytes "
                        f"({source_size / (1024*1024):.1f}MB)"
                    )

            print(
                f"Starting transcode for job {job_id} with format {output_format} and preset {preset}"
            )

            # Cooperative cancellation check — job may have been cancelled during download
            if _check_job_cancelled(job_id):
                print(f"Job {job_id} cancelled after download, aborting transcode")
                return f"Job {job_id} cancelled"

            publish_event(job_id, "status_change", {"status": "transcoding"})

            def _progress_callback(progress: int, eta_seconds: float | None):
                set_progress(job_id, progress, eta_seconds, "transcoding")

            process_video_transcode(
                source_file_path,
                output_path,
                output_format=output_format,
                preset_name=preset,
                hls_config=hls_config,
                progress_callback=_progress_callback,
            )

            # Track output file size
            if output_format == "hls":
                output_size = _get_dir_size(output_path)
            else:
                output_size = os.path.getsize(output_path)
            print(
                f"Output size: {output_size} bytes ({output_size / (1024*1024):.1f}MB)"
            )

            print(f"Uploading transcoded video to storage")

            # Cooperative cancellation check — job may have been cancelled during transcode
            if _check_job_cancelled(job_id):
                print(f"Job {job_id} cancelled after transcode, skipping upload")
                return f"Job {job_id} cancelled"
            publish_event(job_id, "status_change", {"status": "uploading"})
            bucket_name = settings.R2_BUCKET_NAME
            base_s3_prefix = f"transcoded/{job_id}"

            audio_extracted = False
            audio_s3_key = None
            if generate_subtitles:
                from app.worker.transcoder import extract_audio, has_audio_stream

                if has_audio_stream(source_file_path):
                    audio_path = os.path.join(temp_dir, f"audio_{job_id}.wav")

                    print(f"Extracting audio for job {job_id}")
                    extract_audio(source_file_path, audio_path)

                    print("Uploading audio to storage for ML processing")
                    s3 = get_s3_client()
                    audio_s3_key = f"{base_s3_prefix}/audio.wav"
                    s3.upload_file(
                        audio_path,
                        bucket_name,
                        audio_s3_key,
                        ExtraArgs={"ContentType": "audio/wav"},
                    )
                    audio_extracted = True
                else:
                    print(f"No audio stream found for job {job_id}, skipping subtitles")

            if output_format == "hls":
                upload_directory_to_s3(output_path, bucket_name, base_s3_prefix)
                object_key = f"{base_s3_prefix}/master.m3u8"

                # Zip the HLS directory and upload
                zip_local_path = os.path.join(temp_dir, f"output_{job_id}_hls.zip")
                _zip_directory(output_path, zip_local_path)
                zip_s3_key = f"{base_s3_prefix}/hls_output.zip"
                s3 = get_s3_client()
                s3.upload_file(
                    zip_local_path,
                    bucket_name,
                    zip_s3_key,
                    ExtraArgs={"ContentType": "application/zip"},
                )
            else:
                s3 = get_s3_client()
                object_key = f"{base_s3_prefix}/output.mp4"
                s3.upload_file(
                    output_path,
                    bucket_name,
                    object_key,
                    ExtraArgs={"ContentType": "video/mp4"},
                )

            if settings.R2_ACCOUNT_ID:
                public_url = f"https://{settings.R2_BUCKET_NAME}.{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/{object_key}"
            else:
                public_url = f"https://{bucket_name}.s3.amazonaws.com/{object_key}"

            # Build zip URL for HLS jobs
            zip_public_url = None
            if output_format == "hls":
                zip_object_key = f"{base_s3_prefix}/hls_output.zip"
                if settings.R2_ACCOUNT_ID:
                    zip_public_url = f"https://{settings.R2_BUCKET_NAME}.{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/{zip_object_key}"
                else:
                    zip_public_url = (
                        f"https://{bucket_name}.s3.amazonaws.com/{zip_object_key}"
                    )

        # Calculate processing duration
        processing_duration = time.time() - start_time
        print(f"Job {job_id} transcode completed in {processing_duration:.1f} seconds")

        db_completion = SessionLocal()
        try:
            job_complete = db_completion.query(Job).filter(Job.id == job_id).first()
            if job_complete:
                job_complete.output_url = public_url
                job_complete.output_zip_url = zip_public_url
                job_complete.source_size_bytes = source_size
                job_complete.output_size_bytes = output_size
                job_complete.processing_duration_seconds = round(processing_duration, 2)
                if not (generate_subtitles and audio_extracted):
                    job_complete.status = "completed"
                    publish_event(
                        job_id,
                        "done",
                        {
                            "status": "completed",
                            "output_url": public_url,
                            "output_zip_url": zip_public_url,
                            "source_size_bytes": source_size,
                            "output_size_bytes": output_size,
                            "processing_duration_seconds": round(
                                processing_duration, 2
                            ),
                        },
                    )
                db_completion.commit()
        finally:
            db_completion.close()

        if generate_subtitles and audio_extracted:
            print(f"Queueing ML task for job {job_id}")
            subtitle_result = generate_subtitles_task.delay(job_id, audio_s3_key)
            # Store subtitle task ID for cancellation
            db_sub = SessionLocal()
            try:
                job_sub = db_sub.query(Job).filter(Job.id == job_id).first()
                if job_sub:
                    job_sub.subtitle_task_id = subtitle_result.id
                    db_sub.commit()
            finally:
                db_sub.close()
            return f"Job {job_id} video completed, queued for subtitles"
        else:
            if webhook_url:
                from app.worker.webhooks import send_webhook_task

                send_webhook_task.delay(job_id, "job.completed")
            return (
                f"Job {job_id} completed successfully (subtitles skipped or disabled)"
            )

    except Exception as e:
        err_str = str(e)
        error_message = ""
        if "ffmpeg" in err_str.lower() or "ffprobe" in err_str.lower():
            sanitized = re.sub(
                r"(/.+/temp.+/)(source_.+\.tmp|output_.+|audio_.+|subtitles_.+)",
                r"[SERVER_PATH]",
                err_str,
            )
            error_message = f"ffmpeg Error: {sanitized[-200:]}"
        else:
            error_message = f"Job Error: {err_str[-200:]}"

        print(f"Job {job_id} failed: {e}")

        try:
            raise self.retry(exc=e, countdown=60)
        except self.MaxRetriesExceededError:
            db_fail = SessionLocal()
            try:
                job_fail = db_fail.query(Job).filter(Job.id == job_id).first()
                if job_fail:
                    job_fail.status = "failed"
                    job_fail.error_message = error_message
                    # Still track what we know
                    if source_size > 0:
                        job_fail.source_size_bytes = source_size
                    db_fail.commit()
                    publish_event(
                        job_id,
                        "error",
                        {
                            "status": "failed",
                            "error_message": error_message,
                        },
                    )
            finally:
                db_fail.close()

            if webhook_url:
                from app.worker.webhooks import send_webhook_task

                send_webhook_task.delay(job_id, "job.failed")
            raise


@celery_app.task(name="generate_subtitles_task", bind=True, max_retries=3)
def generate_subtitles_task(self, job_id: str, audio_s3_key: str):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return f"Job {job_id} not found"
        webhook_url = job.webhook_url
    finally:
        db.close()

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            audio_path = os.path.join(temp_dir, f"audio_{job_id}.wav")
            subtitle_path = os.path.join(temp_dir, f"subtitles_{job_id}.vtt")

            s3 = get_s3_client()
            bucket_name = settings.R2_BUCKET_NAME
            base_s3_prefix = f"transcoded/{job_id}"

            print(f"Downloading audio from S3: {audio_s3_key}")
            s3.download_file(bucket_name, audio_s3_key, audio_path)

            # Cooperative cancellation check — job may have been cancelled before ML work
            if _check_job_cancelled(job_id):
                print(f"Job {job_id} cancelled, skipping subtitle generation")
                return f"Job {job_id} cancelled"

            print(f"Generating subtitles for job {job_id}")
            publish_event(job_id, "status_change", {"status": "generating_subtitles"})
            from app.worker.subtitles import generate_subtitles_from_audio

            generate_subtitles_from_audio(audio_path, subtitle_path)

            print("Uploading subtitles to storage")
            subtitle_key = f"{base_s3_prefix}/subtitles.vtt"
            s3.upload_file(
                subtitle_path,
                bucket_name,
                subtitle_key,
                ExtraArgs={"ContentType": "text/vtt"},
            )

            if settings.R2_ACCOUNT_ID:
                sub_url = f"https://{settings.R2_BUCKET_NAME}.{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/{subtitle_key}"
            else:
                sub_url = f"https://{bucket_name}.s3.amazonaws.com/{subtitle_key}"

            try:
                s3.delete_object(Bucket=bucket_name, Key=audio_s3_key)
            except Exception as e:
                print(f"Failed to delete audio from S3: {e}")

        db_completion = SessionLocal()
        try:
            job_complete = db_completion.query(Job).filter(Job.id == job_id).first()
            if job_complete:
                job_complete.status = "completed"
                job_complete.subtitle_url = sub_url
                db_completion.commit()
                publish_event(
                    job_id,
                    "done",
                    {
                        "status": "completed",
                        "subtitle_url": sub_url,
                    },
                )
        finally:
            db_completion.close()

        if webhook_url:
            from app.worker.webhooks import send_webhook_task

            send_webhook_task.delay(job_id, "job.completed")

        return f"Job {job_id} subtitles completed successfully"

    except Exception as e:
        err_str = str(e)
        error_message = f"ML Error: {err_str[-200:]}"
        print(f"Job {job_id} ML failed: {e}")

        try:
            raise self.retry(exc=e, countdown=60)
        except self.MaxRetriesExceededError:
            db_fail = SessionLocal()
            try:
                job_fail = db_fail.query(Job).filter(Job.id == job_id).first()
                if job_fail:
                    job_fail.status = "failed"
                    old_msg = job_fail.error_message or ""
                    job_fail.error_message = f"{old_msg} | {error_message}"
                    db_fail.commit()
                    publish_event(
                        job_id,
                        "error",
                        {
                            "status": "failed",
                            "error_message": f"{old_msg} | {error_message}",
                        },
                    )
            finally:
                db_fail.close()

            if webhook_url:
                from app.worker.webhooks import send_webhook_task

                send_webhook_task.delay(job_id, "job.failed")
            raise


@celery_app.task(name="cleanup_abandoned_uploads")
def cleanup_abandoned_uploads():
    """Remove abandoned pending uploads from R2 and DB."""
    from datetime import datetime, timedelta
    from app.core.storage import delete_object

    cutoff = datetime.utcnow() - timedelta(hours=settings.UPLOAD_AUTO_CLEANUP_HOURS)
    db = SessionLocal()
    try:
        abandoned = (
            db.query(PendingUpload)
            .filter(
                PendingUpload.status == "pending",
                PendingUpload.created_at < cutoff,
            )
            .all()
        )
        cleaned = 0
        for upload in abandoned:
            try:
                delete_object(settings.R2_BUCKET_NAME, upload.s3_key)
            except Exception:
                pass  # Object may not exist
            upload.status = "expired"
            upload.updated_at = datetime.utcnow()
            cleaned += 1
        db.commit()
        return f"Cleaned up {cleaned} abandoned uploads"
    finally:
        db.close()
