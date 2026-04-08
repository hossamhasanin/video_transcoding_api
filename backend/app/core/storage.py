import os
from datetime import datetime, timezone
from urllib.parse import urlparse

import boto3
from botocore.exceptions import ClientError
from app.core.config import settings


def get_s3_client():
    endpoint_url = settings.S3_ENDPOINT_URL
    if not endpoint_url and settings.R2_ACCOUNT_ID:
        endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )


def generate_presigned_upload_url(
    bucket_name: str,
    object_key: str,
    content_type: str,
    expires_in: int = 3600,
) -> dict:
    s3 = get_s3_client()
    response = s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": bucket_name,
            "Key": object_key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_in,
    )
    expires_at = datetime.now(timezone.utc).timestamp() + expires_in
    return {
        "upload_url": response,
        "expires_at": datetime.fromtimestamp(expires_at, tz=timezone.utc),
        "headers": {"Content-Type": content_type},
    }


def check_object_exists(bucket_name: str, object_key: str) -> dict | None:
    s3 = get_s3_client()
    try:
        response = s3.head_object(Bucket=bucket_name, Key=object_key)
        return {
            "content_length": response.get("ContentLength"),
            "content_type": response.get("ContentType"),
            "last_modified": response.get("LastModified"),
        }
    except ClientError:
        return None


def delete_object(bucket_name: str, object_key: str) -> bool:
    s3 = get_s3_client()
    try:
        s3.delete_object(Bucket=bucket_name, Key=object_key)
        return True
    except ClientError:
        return False


def upload_directory_to_s3(
    local_directory: str, bucket_name: str, destination_prefix: str
):
    """
    Recursively uploads a directory to S3.
    """
    s3 = get_s3_client()
    for root, dirs, files in os.walk(local_directory):
        for filename in files:
            local_path = os.path.join(root, filename)

            # Construct the full S3 object key
            relative_path = os.path.relpath(local_path, local_directory)
            s3_key = os.path.join(destination_prefix, relative_path).replace("\\", "/")

            # Set basic content type for HLS files
            content_type = "application/octet-stream"
            if filename.endswith(".m3u8"):
                content_type = "application/vnd.apple.mpegurl"
            elif filename.endswith(".ts"):
                content_type = "video/mp2t"

            s3.upload_file(
                local_path, bucket_name, s3_key, ExtraArgs={"ContentType": content_type}
            )


def upload_file_to_s3(
    local_file_path: str,
    bucket_name: str,
    object_name: str = None,
    content_type: str = None,
):
    """
    Uploads a single file to S3.
    """
    s3 = get_s3_client()
    if object_name is None:
        object_name = os.path.basename(local_file_path)

    extra_args = {}
    if content_type:
        extra_args["ContentType"] = content_type
    elif local_file_path.endswith(".mp4"):
        extra_args["ContentType"] = "video/mp4"
    elif local_file_path.endswith(".vtt"):
        extra_args["ContentType"] = "text/vtt"
    elif local_file_path.endswith(".srt"):
        extra_args["ContentType"] = "application/x-subrip"

    if extra_args:
        s3.upload_file(
            local_file_path,
            bucket_name,
            object_name,
            ExtraArgs=extra_args,
        )
    else:
        s3.upload_file(
            local_file_path,
            bucket_name,
            object_name,
        )


# ---------------------------------------------------------------------------
# Shared constants
# ---------------------------------------------------------------------------

CONTENT_TYPES = {
    ".m3u8": "application/vnd.apple.mpegurl",
    ".ts": "video/mp2t",
    ".mp4": "video/mp4",
    ".vtt": "text/vtt",
    ".srt": "application/x-subrip",
    ".wav": "audio/wav",
}


# ---------------------------------------------------------------------------
# Presigned download URL
# ---------------------------------------------------------------------------


def generate_presigned_download_url(
    bucket_name: str, object_key: str, expires_in: int = 3600
) -> str:
    """Generate a time-limited presigned GET URL for an S3/R2 object."""
    s3 = get_s3_client()
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket_name, "Key": object_key},
        ExpiresIn=expires_in,
    )


# ---------------------------------------------------------------------------
# URL → object-key extraction
# ---------------------------------------------------------------------------


def extract_r2_key(source_url: str) -> str | None:
    """Extract the S3 object key from an R2/S3 URL.

    Returns None if the URL doesn't match a recognised R2/S3 pattern.
    """
    parsed = urlparse(source_url)
    host = parsed.hostname or ""
    path = parsed.path.lstrip("/")

    if host.endswith(".r2.cloudflarestorage.com"):
        # Virtual-hosted style: bucket.account.r2.cloudflarestorage.com/key
        if host.startswith(f"{settings.R2_BUCKET_NAME}."):
            return path
        # Path style: account.r2.cloudflarestorage.com/bucket/key
        parts = path.split("/", 1)
        if len(parts) > 1 and parts[0] == settings.R2_BUCKET_NAME:
            return parts[1]
        return None

    # S3: bucket.s3.amazonaws.com/key or s3.amazonaws.com/bucket/key
    if host.endswith(".s3.amazonaws.com"):
        return path
    if host == "s3.amazonaws.com":
        parts = path.split("/", 1)
        if len(parts) > 1:
            return parts[1]

    return None
