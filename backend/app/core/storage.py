import os
import boto3
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
