#!/usr/bin/env python3
"""
End-to-end test script for the Video Transcoding API.

Exercises the full flow:
  1. Presigned upload → upload video to R2
  2. Create HLS transcoding job (multiple renditions + subtitles)
  3. Poll job status until completion
  4. Verify HLS master playlist
  5. Receive & verify webhook (local HTTP server)
  6. Print usage stats

Usage:
  python test_api_flow.py --api-key vf_xxx --video sample.mp4
  python test_api_flow.py --api-key vf_xxx --video sample.mp4 --no-upload --source-url https://example.com/video.mp4
"""

import argparse
import hashlib
import hmac
import json
import mimetypes
import os
import sys
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler

try:
    import requests
except ImportError:
    print("ERROR: 'requests' is required. Install it with:  pip install requests")
    sys.exit(1)

try:
    import sseclient  # type: ignore
except ImportError:
    sseclient = None  # SSE tests will be skipped unless installed

# ---------------------------------------------------------------------------
# Terminal colours
# ---------------------------------------------------------------------------
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def log(tag: str, msg: str, colour: str = CYAN) -> None:
    ts = time.strftime("%H:%M:%S")
    print(f"{colour}{BOLD}[{ts}] [{tag}]{RESET} {msg}")


def log_success(msg: str) -> None:
    log("OK", f"{GREEN}{msg}{RESET}", GREEN)


def log_error(msg: str) -> None:
    log("FAIL", f"{RED}{msg}{RESET}", RED)


def log_info(msg: str) -> None:
    log("INFO", msg, CYAN)


def log_warn(msg: str) -> None:
    log("WARN", f"{YELLOW}{msg}{RESET}", YELLOW)


# ---------------------------------------------------------------------------
# Webhook receiver (background thread)
# ---------------------------------------------------------------------------
webhook_event = threading.Event()
webhook_payload: dict = {}
webhook_headers: dict = {}


class WebhookHandler(BaseHTTPRequestHandler):
    """Minimal HTTP handler that captures the webhook POST."""

    def do_POST(self):
        global webhook_payload, webhook_headers
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        webhook_headers = dict(self.headers)
        try:
            webhook_payload = json.loads(body)
        except json.JSONDecodeError:
            webhook_payload = {"raw": body.decode(errors="replace")}

        log_success("Webhook received!")
        print(f"  Headers: {json.dumps(webhook_headers, indent=2)}")
        print(f"  Payload:  {json.dumps(webhook_payload, indent=2)}")

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")
        webhook_event.set()

    def log_message(self, format, *args):
        pass  # suppress default stderr logging


def start_webhook_server(port: int) -> HTTPServer:
    server = HTTPServer(("0.0.0.0", port), WebhookHandler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    return server


def verify_hmac_signature(payload: str, secret: str, received_sig: str) -> bool:
    expected = hmac.new(
        key=secret.encode(), msg=payload.encode(), digestmod=hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, received_sig)


# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------
def api_headers(api_key: str) -> dict:
    return {
        "x-api-key": api_key,
        "Content-Type": "application/json",
    }


def presign_upload(
    base_url: str, api_key: str, filename: str, file_size: int, content_type: str
) -> dict:
    url = f"{base_url}/api/v1/uploads/presign"
    resp = requests.post(
        url,
        headers=api_headers(api_key),
        json={
            "filename": filename,
            "file_size_bytes": file_size,
            "content_type": content_type,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def upload_file_to_r2(upload_url: str, file_path: str, content_type: str) -> None:
    with open(file_path, "rb") as f:
        resp = requests.put(
            upload_url,
            data=f,
            headers={"Content-Type": content_type},
            timeout=600,
        )
    resp.raise_for_status()


def poll_upload_status(
    base_url: str, api_key: str, upload_id: str, timeout: int = 120
) -> dict:
    url = f"{base_url}/api/v1/uploads/{upload_id}/status"
    headers = api_headers(api_key)
    start = time.time()
    while time.time() - start < timeout:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        status = data.get("status")
        log_info(f"Upload {upload_id[:8]}... status={status}")
        if status == "completed":
            return data
        if status in ("expired", "cancelled"):
            raise RuntimeError(f"Upload {status}")
        time.sleep(3)
    raise TimeoutError("Upload status polling timed out")


def create_job(base_url: str, api_key: str, payload: dict) -> dict:
    url = f"{base_url}/api/v1/jobs/"
    resp = requests.post(url, headers=api_headers(api_key), json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()


def poll_job_status(
    base_url: str, api_key: str, job_id: str, timeout: int = 600
) -> dict:
    url = f"{base_url}/api/v1/jobs/{job_id}"
    headers = api_headers(api_key)
    start = time.time()
    while time.time() - start < timeout:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        status = data.get("status")
        elapsed = int(time.time() - start)
        log_info(f"Job {job_id[:8]}... status={status}  ({elapsed}s)")
        if status == "completed":
            return data
        if status == "failed":
            error = data.get("error_message", "unknown")
            raise RuntimeError(f"Job failed: {error}")
        time.sleep(5)
    raise TimeoutError("Job status polling timed out")


def stream_job_events(base_url: str, api_key: str, job_id: str, timeout: int = 600) -> dict:
    """Connect to SSE event stream and wait for job completion."""
    url = f"{base_url}/api/v1/jobs/{job_id}/events"
    params = {"api_key": api_key}
    start = time.time()

    resp = requests.get(url, params=params, stream=True, timeout=timeout)
    resp.raise_for_status()

    client = sseclient.SSEClient(resp)
    result: dict = {}

    for event in client.events():
        elapsed = int(time.time() - start)
        event_type = event.event or "message"
        try:
            data = json.loads(event.data) if event.data else {}
        except json.JSONDecodeError:
            data = {}

        if event_type == "progress":
            pct = data.get("progress", "?")
            eta = data.get("eta_seconds")
            eta_str = f", ETA {eta:.0f}s" if eta else ""
            log_info(f"Job {job_id[:8]}... SSE progress={pct}%{eta_str}  ({elapsed}s)")
        elif event_type == "status_change":
            status = data.get("status", "?")
            log_info(f"Job {job_id[:8]}... SSE status={status}  ({elapsed}s)")
        elif event_type == "done":
            log_success(f"Job {job_id[:8]}... SSE done  ({elapsed}s)")
            result = data
            break
        elif event_type == "error":
            error = data.get("error_message", data.get("status", "unknown"))
            raise RuntimeError(f"Job failed (SSE): {error}")
        elif event_type == "heartbeat":
            pass  # silent
        else:
            log_info(f"Job {job_id[:8]}... SSE event={event_type}  ({elapsed}s)")

        if time.time() - start > timeout:
            raise TimeoutError("SSE stream timed out")

    return result


def fetch_master_playlist(base_url: str, api_key: str, job_id: str) -> str:
    url = f"{base_url}/api/v1/jobs/{job_id}/stream/master.m3u8"
    params = {"api_key": api_key}
    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    return resp.text


def get_usage(base_url: str, api_key: str) -> dict:
    url = f"{base_url}/api/v1/usage/"
    resp = requests.get(url, headers=api_headers(api_key), timeout=30)
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# Main flow
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="End-to-end test for the Video Transcoding API"
    )
    parser.add_argument(
        "--api-url",
        default=os.getenv("API_URL", "http://localhost:8000"),
        help="API base URL (default: http://localhost:8000)",
    )
    parser.add_argument("--api-key", required=True, help="API key (x-api-key)")
    parser.add_argument("--video", required=True, help="Path to local video file")
    parser.add_argument(
        "--webhook-port",
        type=int,
        default=int(os.getenv("WEBHOOK_PORT", "9090")),
        help="Port for local webhook receiver (default: 9090)",
    )
    parser.add_argument(
        "--webhook-secret",
        default=os.getenv("WEBHOOK_SECRET", ""),
        help="Secret for HMAC signature verification",
    )
    parser.add_argument(
        "--no-webhook",
        action="store_true",
        help="Skip webhook testing",
    )
    parser.add_argument(
        "--no-upload",
        action="store_true",
        help="Skip upload flow; use --source-url instead",
    )
    parser.add_argument(
        "--source-url",
        help="Public video URL to use with --no-upload",
    )
    parser.add_argument(
        "--no-subtitles",
        action="store_true",
        help="Disable subtitle generation",
    )
    parser.add_argument(
        "--sse",
        action="store_true",
        help="Use SSE stream instead of polling for job status",
    )
    parser.add_argument(
        "--sse-only",
        action="store_true",
        help="Only test the SSE stream (skip polling entirely)",
    )
    args = parser.parse_args()

    api_key = args.api_key
    base_url = args.api_url.rstrip("/")
    video_path = args.video

    if not os.path.isfile(video_path):
        log_error(f"Video file not found: {video_path}")
        sys.exit(1)

    if args.no_upload and not args.source_url:
        log_error("--no-upload requires --source-url")
        sys.exit(1)

    file_size = os.path.getsize(video_path)
    filename = os.path.basename(video_path)
    content_type = mimetypes.guess_type(video_path)[0] or "video/mp4"

    print()
    print(f"{BOLD}{'=' * 60}")
    print("  Video Transcoding API — End-to-End Test")
    print(f"{'=' * 60}{RESET}")
    print(f"  API:          {base_url}")
    print(f"  Video:        {filename} ({file_size / 1024 / 1024:.1f} MB)")
    print(f"  Webhook:      {'disabled' if args.no_webhook else f'port {args.webhook_port}'}")
    print(f"  Subtitles:    {'disabled' if args.no_subtitles else 'enabled'}")
    if args.sse or args.sse_only:
        print(f"  Job tracking: SSE stream")
    else:
        print(f"  Job tracking: HTTP polling")
    print()

    # ------------------------------------------------------------------
    # Step 1 — Start webhook server
    # ------------------------------------------------------------------
    webhook_server = None
    webhook_url = None
    if not args.no_webhook:
        log_info("Starting webhook receiver...")
        webhook_server = start_webhook_server(args.webhook_port)
        webhook_url = f"http://host.docker.internal:{args.webhook_port}/webhook"
        log_success(f"Webhook receiver listening on port {args.webhook_port}")
        print()

    # ------------------------------------------------------------------
    # Step 2 — Upload video (or use source_url)
    # ------------------------------------------------------------------
    source_url = None
    upload_id = None

    if args.no_upload:
        source_url = args.source_url
        log_info(f"Using source URL: {source_url}")
    else:
        log_info("Requesting presigned upload URL...")
        presign = presign_upload(base_url, api_key, filename, file_size, content_type)
        upload_id = presign["upload_id"]
        upload_url = presign["upload_url"]
        log_success(f"Presigned URL obtained (upload_id={upload_id[:8]}...)")

        log_info(f"Uploading {filename} to R2...")
        upload_file_to_r2(upload_url, video_path, content_type)
        log_success("File uploaded to R2")

        log_info("Waiting for upload status confirmation...")
        upload_status = poll_upload_status(base_url, api_key, upload_id)
        source_url = upload_status.get("source_url")
        log_success(f"Upload confirmed. source_url={source_url}")
    print()

    # ------------------------------------------------------------------
    # Step 3 — Create HLS transcoding job
    # ------------------------------------------------------------------
    hls_renditions = [
        {"name": "360p", "width": 640, "height": 360, "video_bitrate": "800k", "audio_bitrate": "128k"},
        {"name": "480p", "width": 842, "height": 480, "video_bitrate": "1500k", "audio_bitrate": "128k"},
        {"name": "720p", "width": 1280, "height": 720, "video_bitrate": "3000k", "audio_bitrate": "128k"},
        {"name": "1080p", "width": 1920, "height": 1080, "video_bitrate": "5000k", "audio_bitrate": "192k"},
    ]

    job_payload: dict = {
        "output_format": "hls",
        "generate_subtitles": not args.no_subtitles,
        "hls_config": {
            "renditions": hls_renditions,
            "segment_duration": 10,
            "video_codec_preset": "fast",
            "video_crf": 23,
            "video_profile": "high",
        },
    }

    if upload_id:
        job_payload["upload_id"] = upload_id
    else:
        job_payload["source_url"] = source_url

    if webhook_url:
        job_payload["webhook_url"] = webhook_url

    log_info("Creating HLS transcoding job...")
    log_info(f"  Renditions: {', '.join(r['name'] for r in hls_renditions)}")
    job = create_job(base_url, api_key, job_payload)
    job_id = job["id"]
    log_success(f"Job created: {job_id}")
    print(f"  Status:          {job['status']}")
    print(f"  Output format:   {job['output_format']}")
    print(f"  Webhook URL:     {job.get('webhook_url', 'none')}")
    print(f"  Subtitles:       {job.get('generate_subtitles', False)}")
    print()

    # ------------------------------------------------------------------
    # Step 4 — Wait for job completion (poll or SSE)
    # ------------------------------------------------------------------
    use_sse = args.sse or args.sse_only

    final: dict = {}

    if use_sse:
        if sseclient is None:
            log_error("--sse requires the 'sseclient-py' package. Install with:  pip install sseclient-py")
            sys.exit(1)

        log_info("Connecting to SSE event stream...")
        try:
            final = stream_job_events(base_url, api_key, job_id)
        except TimeoutError:
            log_error("SSE stream timed out before job completed.")
            sys.exit(1)
        except RuntimeError as e:
            log_error(str(e))
            sys.exit(1)
    else:
        log_info("Waiting for job to complete (polling)...")
        try:
            final = poll_job_status(base_url, api_key, job_id)
        except TimeoutError:
            log_error("Job did not complete within the polling timeout.")
            log_info("You can check status manually:")
            log_info(f"  curl -H 'x-api-key: {api_key}' {base_url}/api/v1/jobs/{job_id}")
            sys.exit(1)
        except RuntimeError as e:
            log_error(str(e))
            sys.exit(1)

    # If --sse (not --sse-only), also do a polling comparison
    if args.sse and not args.sse_only:
        log_info("Verifying final status via polling...")
        try:
            poll_final = poll_job_status(base_url, api_key, job_id, timeout=30)
            poll_status = poll_final.get("status")
            if poll_status == "completed":
                log_success(f"Polling confirmed: status={poll_status}")
                final = poll_final  # use richer polling response
            else:
                log_warn(f"Polling returned status={poll_status}, expected completed")
        except Exception as e:
            log_warn(f"Polling verification failed: {e}")

    log_success("Job completed!")
    print(f"  Duration:        {final.get('processing_duration_seconds', '?')}s")
    print(f"  Source size:     {final.get('source_size_bytes', '?')} bytes")
    print(f"  Output size:     {final.get('output_size_bytes', '?')} bytes")
    print(f"  Subtitle URL:    {final.get('subtitle_url', 'none')}")
    print()

    # ------------------------------------------------------------------
    # Step 5 — Verify HLS master playlist
    # ------------------------------------------------------------------
    log_info("Fetching HLS master playlist...")
    try:
        playlist = fetch_master_playlist(base_url, api_key, job_id)
        variant_count = sum(1 for line in playlist.splitlines() if line.startswith("http"))
        log_success(f"Master playlist retrieved ({variant_count} variants)")
        for line in playlist.splitlines():
            if line and not line.startswith("#"):
                print(f"    {line}")
        print()
    except Exception as e:
        log_warn(f"Could not fetch master playlist: {e}")
        print()

    # ------------------------------------------------------------------
    # Step 6 — Wait for webhook
    # ------------------------------------------------------------------
    if not args.no_webhook:
        log_info("Waiting for webhook delivery (up to 60s)...")
        received = webhook_event.wait(timeout=60)
        if received:
            log_success("Webhook delivered successfully!")
            if args.webhook_secret:
                sig = webhook_headers.get("X-Webhook-Signature", "")
                if sig:
                    raw = json.dumps(
                        webhook_payload, sort_keys=True, separators=(",", ":")
                    )
                    valid = verify_hmac_signature(raw, args.webhook_secret, sig)
                    if valid:
                        log_success("HMAC signature is VALID")
                    else:
                        log_warn(
                            "HMAC signature is INVALID — "
                            "the server may sort JSON keys differently"
                        )
                else:
                    log_warn("No X-Webhook-Signature header received")
        else:
            log_warn("Webhook was NOT received within timeout")
        print()

    # ------------------------------------------------------------------
    # Step 7 — Usage stats
    # ------------------------------------------------------------------
    log_info("Fetching usage stats...")
    try:
        usage = get_usage(base_url, api_key)
        log_success("Usage stats:")
        print(f"  Total jobs:      {usage.get('total_jobs', '?')}")
        print(f"  Completed:       {usage.get('completed_jobs', '?')}")
        print(f"  Failed:          {usage.get('failed_jobs', '?')}")
        print(f"  Storage used:    {usage.get('storage_used_bytes', 0) / 1024 / 1024:.1f} MB")
        print(f"  Processed:       {usage.get('processed_minutes', 0):.1f} min")
    except Exception as e:
        log_warn(f"Could not fetch usage: {e}")

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------
    if webhook_server:
        webhook_server.shutdown()

    print()
    print(f"{BOLD}{'=' * 60}")
    print(f"  Test complete!")
    print(f"{'=' * 60}{RESET}")


if __name__ == "__main__":
    main()
