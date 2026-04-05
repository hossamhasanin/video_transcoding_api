import os
import uuid
import time
import tempfile
import requests
import re
from botocore.exceptions import ClientError

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.job import Job
from app.worker.transcoder import process_video_transcode
from app.core.storage import get_s3_client, upload_directory_to_s3
from app.core.config import settings


def _get_dir_size(path: str) -> int:
    """Calculate total size of all files in a directory (for HLS output)."""
    total = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if os.path.isfile(fp):
                total += os.path.getsize(fp)
    return total


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

        job.status = "processing"

        source_url = job.source_url
        output_format = job.output_format
        preset = job.preset
        generate_subtitles = job.generate_subtitles
        webhook_url = job.webhook_url
        db.commit()
    finally:
        db.close()

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            source_file_path = os.path.join(temp_dir, f"source_{job_id}.tmp")
            if output_format == "hls":
                output_path = os.path.join(temp_dir, f"output_{job_id}_hls")
            else:
                output_path = os.path.join(temp_dir, f"output_{job_id}.mp4")

            # Validate file size before downloading (HEAD request)
            max_size_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
            print(f"Checking source file size from {source_url}")
            head_response = requests.head(source_url, timeout=10, allow_redirects=True)
            head_response.raise_for_status()
            content_length = head_response.headers.get("Content-Length")
            if content_length and int(content_length) > max_size_bytes:
                raise ValueError(
                    f"Source file too large: {int(content_length) / (1024*1024):.1f}MB "
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
                            f"Source file too large: exceeds limit of {settings.MAX_UPLOAD_SIZE_MB}MB"
                        )
                    f.write(chunk)

            # Track actual source file size
            source_size = os.path.getsize(source_file_path)
            print(
                f"Source file size: {source_size} bytes ({source_size / (1024*1024):.1f}MB)"
            )

            print(
                f"Starting transcode for job {job_id} with format {output_format} and preset {preset}"
            )
            process_video_transcode(
                source_file_path,
                output_path,
                output_format=output_format,
                preset_name=preset,
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

        # Calculate processing duration
        processing_duration = time.time() - start_time
        print(f"Job {job_id} transcode completed in {processing_duration:.1f} seconds")

        db_completion = SessionLocal()
        try:
            job_complete = db_completion.query(Job).filter(Job.id == job_id).first()
            if job_complete:
                job_complete.output_url = public_url
                job_complete.source_size_bytes = source_size
                job_complete.output_size_bytes = output_size
                job_complete.processing_duration_seconds = round(processing_duration, 2)
                if not (generate_subtitles and audio_extracted):
                    job_complete.status = "completed"
                db_completion.commit()
        finally:
            db_completion.close()

        if generate_subtitles and audio_extracted:
            print(f"Queueing ML task for job {job_id}")
            generate_subtitles_task.delay(job_id, audio_s3_key)
            return f"Job {job_id} video completed, queued for subtitles"
        else:
            if webhook_url:
                from app.worker.webhooks import send_webhook_task

                send_webhook_task.delay(job_id)
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
            finally:
                db_fail.close()

            if webhook_url:
                from app.worker.webhooks import send_webhook_task

                send_webhook_task.delay(job_id)
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

            print(f"Generating subtitles for job {job_id}")
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
        finally:
            db_completion.close()

        if webhook_url:
            from app.worker.webhooks import send_webhook_task

            send_webhook_task.delay(job_id)

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
            finally:
                db_fail.close()

            if webhook_url:
                from app.worker.webhooks import send_webhook_task

                send_webhook_task.delay(job_id)
            raise
