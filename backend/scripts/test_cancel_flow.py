#!/usr/bin/env python3
"""
Test script for the job cancellation flow.

Validates:
  1. Cancel a pending job              → 200, status = cancelled
  2. Cancel an already cancelled job   → 409 Conflict
  3. Cancel a completed job            → 409 Conflict
  4. Cancel a non-existent job         → 404 Not Found
  5. Cancel another user's job         → 404 Not Found
  6. List jobs with ?status=cancelled  → includes the cancelled job
  7. SSE stream receives cancelled event

Prerequisites:
  - API running at BASE_URL (default http://localhost:8000)
  - Docker compose up (at least api, db, redis)

Usage:
  python scripts/test_cancel_flow.py [--base-url http://localhost:8000]
"""

import sys
import os
import json
import time
import argparse
import threading

# Load root .env (docker compose creds) and backend .env into the environment
# before importing app modules, so pydantic-settings picks them up.
_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
for _env_file in [os.path.join(_root, ".env"), os.path.join(_root, "backend", ".env")]:
    if os.path.exists(_env_file):
        with open(_env_file) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import requests

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"
TEST_VIDEO_URL = (
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
)

PASS = 0
FAIL = 0


def _url(path: str) -> str:
    return f"{BASE_URL}{API_PREFIX}{path}"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_headers(api_key: str) -> dict:
    return {"x-api-key": api_key, "Content-Type": "application/json"}


def ensure_test_user_and_key() -> tuple[str, str]:
    """Create a test user + API key via the existing script logic. Returns (email, api_key)."""
    from app.core.database import SessionLocal
    from app.models.user import User
    from app.models.api_key import ApiKey
    import uuid, secrets, string
    import bcrypt

    def _hash_key(plain: str) -> str:
        return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

    db = SessionLocal()
    try:
        # User 1 — main test user
        email = "cancel_test@transcodeflow.api"
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(id=uuid.uuid4(), email=email)
            db.add(user)
            db.commit()
            db.refresh(user)

        alphabet = string.ascii_letters + string.digits
        raw = "".join(secrets.choice(alphabet) for _ in range(32))
        api_key_str = "vf_" + raw
        api_key = ApiKey(
            user_id=user.id,
            key_hash=_hash_key(api_key_str),
            key_prefix="vf_",
            name="Cancel Test Key",
        )
        db.add(api_key)

        # User 2 — different user for cross-user test
        email2 = "cancel_test_other@transcodeflow.api"
        user2 = db.query(User).filter(User.email == email2).first()
        if not user2:
            user2 = User(id=uuid.uuid4(), email=email2)
            db.add(user2)
            db.commit()
            db.refresh(user2)

        raw2 = "".join(secrets.choice(alphabet) for _ in range(32))
        api_key2_str = "vf_" + raw2
        api_key2 = ApiKey(
            user_id=user2.id,
            key_hash=_hash_key(api_key2_str),
            key_prefix="vf_",
            name="Cancel Test Key — Other User",
        )
        db.add(api_key2)
        db.commit()

        return (api_key_str, api_key2_str)
    finally:
        db.close()


def create_job(api_key: str) -> dict:
    """Create a job and return the JSON response."""
    resp = requests.post(
        _url("/jobs/"),
        headers=make_headers(api_key),
        json={
            "source_url": TEST_VIDEO_URL,
            "output_format": "mp4",
        },
        timeout=10,
    )
    assert resp.status_code == 201, f"Create job failed: {resp.status_code} {resp.text}"
    return resp.json()


def create_job_for_other_user(api_key2: str) -> dict:
    """Create a job owned by user 2."""
    return create_job(api_key2)


# ---------------------------------------------------------------------------
# Test runner helpers
# ---------------------------------------------------------------------------


def report(name: str, passed: bool, detail: str = ""):
    global PASS, FAIL
    icon = "PASS" if passed else "FAIL"
    PASS += int(passed)
    FAIL += int(not passed)
    msg = f"  [{icon}] {name}"
    if detail:
        msg += f" — {detail}"
    print(msg)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_health():
    """Sanity check — API is reachable."""
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        ok = r.status_code == 200
        report("Health check", ok, f"status={r.status_code}")
    except requests.ConnectionError:
        report("Health check", False, "Cannot connect to API")
        sys.exit(1)


def test_cancel_pending_job(api_key: str):
    """Test 1: Cancel a freshly-created (pending) job."""
    job = create_job(api_key)
    job_id = job["id"]
    report(
        "Created pending job",
        job["status"] == "pending",
        f"id={job_id[:8]}... status={job['status']}",
    )

    resp = requests.post(
        _url(f"/jobs/{job_id}/cancel"),
        headers=make_headers(api_key),
        timeout=10,
    )
    body = resp.json()
    ok = (
        resp.status_code == 200
        and body.get("status") == "cancelled"
        and "cancelled" in body.get("message", "").lower()
    )
    report("Cancel pending job", ok, f"status={resp.status_code} body={body}")

    # Verify via GET status
    status_resp = requests.get(
        _url(f"/jobs/{job_id}"),
        headers=make_headers(api_key),
        timeout=10,
    )
    status_body = status_resp.json()
    ok2 = status_body.get("status") == "cancelled"
    report("  GET confirms cancelled", ok2, f"status={status_body.get('status')}")


def test_cancel_already_cancelled(api_key: str):
    """Test 2: Cancel a job that is already cancelled → 409."""
    job = create_job(api_key)
    job_id = job["id"]

    # First cancel succeeds
    requests.post(
        _url(f"/jobs/{job_id}/cancel"), headers=make_headers(api_key), timeout=10
    )

    # Second cancel should fail
    resp = requests.post(
        _url(f"/jobs/{job_id}/cancel"),
        headers=make_headers(api_key),
        timeout=10,
    )
    ok = resp.status_code == 409
    body = resp.json()
    report(
        "Cancel already-cancelled job → 409",
        ok,
        f"status={resp.status_code} detail={body.get('detail', '')}",
    )


def test_cancel_completed_job(api_key: str):
    """Test 3: Cancel a completed job → 409.

    We fake a completed job by creating one and manually setting its status
    in the DB, since we can't wait for a real transcode to finish.
    """
    from app.core.database import SessionLocal
    from app.models.job import Job

    job = create_job(api_key)
    job_id = job["id"]

    # Force status to completed in DB
    db = SessionLocal()
    try:
        row = db.query(Job).filter(Job.id == job_id).first()
        row.status = "completed"
        db.commit()
    finally:
        db.close()

    resp = requests.post(
        _url(f"/jobs/{job_id}/cancel"),
        headers=make_headers(api_key),
        timeout=10,
    )
    ok = resp.status_code == 409
    body = resp.json()
    report(
        "Cancel completed job → 409",
        ok,
        f"status={resp.status_code} detail={body.get('detail', '')}",
    )


def test_cancel_nonexistent_job(api_key: str):
    """Test 4: Cancel a job that doesn't exist → 404."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = requests.post(
        _url(f"/jobs/{fake_id}/cancel"),
        headers=make_headers(api_key),
        timeout=10,
    )
    ok = resp.status_code == 404
    body = resp.json()
    report(
        "Cancel non-existent job → 404",
        ok,
        f"status={resp.status_code} detail={body.get('detail', '')}",
    )


def test_cancel_other_users_job(api_key: str, api_key2: str):
    """Test 5: Cancel a job belonging to another user → 404."""
    # Create job with user 2
    job = create_job_for_other_user(api_key2)
    job_id = job["id"]

    # Try to cancel with user 1's key
    resp = requests.post(
        _url(f"/jobs/{job_id}/cancel"),
        headers=make_headers(api_key),
        timeout=10,
    )
    ok = resp.status_code == 404
    body = resp.json()
    report(
        "Cancel other user's job → 404",
        ok,
        f"status={resp.status_code} detail={body.get('detail', '')}",
    )


def test_list_cancelled_jobs(api_key: str):
    """Test 6: List jobs with status=cancelled filter."""
    job = create_job(api_key)
    job_id = job["id"]

    # Cancel it
    requests.post(
        _url(f"/jobs/{job_id}/cancel"), headers=make_headers(api_key), timeout=10
    )

    # List cancelled jobs
    resp = requests.get(
        _url("/jobs/"),
        headers=make_headers(api_key),
        params={"status": "cancelled", "limit": 10},
        timeout=10,
    )
    body = resp.json()
    ids = [item["id"] for item in body.get("items", [])]
    ok = resp.status_code == 200 and str(job_id) in ids
    report(
        "List jobs ?status=cancelled includes job", ok, f"found={str(job_id) in ids}"
    )


def test_sse_cancelled_event(api_key: str):
    """Test 7: SSE stream receives 'cancelled' event when job is cancelled."""
    job = create_job(api_key)
    job_id = job["id"]

    received_events = []

    def sse_listener():
        try:
            resp = requests.get(
                _url(f"/jobs/{job_id}/events"),
                headers={"x-api-key": api_key},
                stream=True,
                timeout=15,
            )
            for line in resp.iter_lines(decode_unicode=True):
                if not line:
                    continue
                if line.startswith("event:"):
                    received_events.append(line.split(":", 1)[1].strip())
                if "cancelled" in line.lower():
                    break
        except Exception as e:
            pass  # Timeout or connection close is expected

    # Start SSE listener in background
    t = threading.Thread(target=sse_listener, daemon=True)
    t.start()
    time.sleep(0.5)  # Let SSE connect

    # Cancel the job
    requests.post(
        _url(f"/jobs/{job_id}/cancel"), headers=make_headers(api_key), timeout=10
    )

    t.join(timeout=10)
    ok = "cancelled" in received_events
    report("SSE receives cancelled event", ok, f"events={received_events}")


def test_cancel_failed_job(api_key: str):
    """Test 8: Cancel a failed job → 409."""
    from app.core.database import SessionLocal
    from app.models.job import Job

    job = create_job(api_key)
    job_id = job["id"]

    db = SessionLocal()
    try:
        row = db.query(Job).filter(Job.id == job_id).first()
        row.status = "failed"
        row.error_message = "Simulated failure"
        db.commit()
    finally:
        db.close()

    resp = requests.post(
        _url(f"/jobs/{job_id}/cancel"),
        headers=make_headers(api_key),
        timeout=10,
    )
    ok = resp.status_code == 409
    body = resp.json()
    report(
        "Cancel failed job → 409",
        ok,
        f"status={resp.status_code} detail={body.get('detail', '')}",
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    global BASE_URL

    parser = argparse.ArgumentParser(description="Test job cancellation flow")
    parser.add_argument(
        "--base-url", default="http://localhost:8000", help="API base URL"
    )
    args = parser.parse_args()
    BASE_URL = args.base_url.rstrip("/")

    print("=" * 60)
    print("Job Cancellation — Integration Tests")
    print("=" * 60)

    # 0. Health check
    test_health()

    # Setup
    print("\n--- Setup: creating test users and API keys ---")
    api_key, api_key2 = ensure_test_user_and_key()
    print(f"  API key 1: {api_key[:10]}...")
    print(f"  API key 2: {api_key2[:10]}...")

    # Run tests
    print("\n--- Running tests ---")

    test_cancel_pending_job(api_key)
    test_cancel_already_cancelled(api_key)
    test_cancel_completed_job(api_key)
    test_cancel_nonexistent_job(api_key)
    test_cancel_other_users_job(api_key, api_key2)
    test_list_cancelled_jobs(api_key)
    test_sse_cancelled_event(api_key)
    test_cancel_failed_job(api_key)

    # Summary
    print("\n" + "=" * 60)
    total = PASS + FAIL
    print(f"Results: {PASS}/{total} passed, {FAIL}/{total} failed")
    if FAIL == 0:
        print("All tests passed!")
    else:
        print("Some tests failed.")
    print("=" * 60)
    sys.exit(0 if FAIL == 0 else 1)


if __name__ == "__main__":
    main()
