import hmac
import hashlib


def generate_hmac_signature(payload: str, secret: str) -> str:
    """
    Generate an HMAC SHA256 signature for the given payload using the provided secret.
    Returns the hex digest.
    """
    if not secret:
        return ""

    secret_bytes = secret.encode("utf-8")
    payload_bytes = payload.encode("utf-8")

    signature = hmac.new(key=secret_bytes, msg=payload_bytes, digestmod=hashlib.sha256).hexdigest()
    return signature
