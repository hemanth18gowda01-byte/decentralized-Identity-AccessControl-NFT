import base64
import json
import os
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _encryption_key() -> bytes:
    encoded_key = os.environ.get("ENCRYPTION_KEY")
    if not encoded_key:
        raise RuntimeError("ENCRYPTION_KEY must be a base64-encoded 32-byte key")

    key = base64.b64decode(encoded_key, validate=True)
    if len(key) != 32:
        raise RuntimeError("ENCRYPTION_KEY must decode to exactly 32 bytes")
    return key


def encrypt_data(data: bytes, associated_data: bytes | None = None) -> dict[str, str]:
    """Encrypt data with AES-256-GCM and a fresh nonce for every record."""
    nonce = os.urandom(12)
    ciphertext = AESGCM(_encryption_key()).encrypt(nonce, data, associated_data)
    return {
        "nonce": base64.b64encode(nonce).decode("ascii"),
        "ciphertext": base64.b64encode(ciphertext).decode("ascii"),
    }


def decrypt_data(
    nonce: str, ciphertext: str, associated_data: bytes | None = None
) -> bytes:
    return AESGCM(_encryption_key()).decrypt(
        base64.b64decode(nonce),
        base64.b64decode(ciphertext),
        associated_data,
    )


def encrypt_json(value: Any, associated_data: bytes | None = None) -> dict[str, str]:
    return encrypt_data(
        json.dumps(value, separators=(",", ":"), ensure_ascii=True).encode("utf-8"),
        associated_data,
    )


def decrypt_json(
    nonce: str, ciphertext: str, associated_data: bytes | None = None
) -> Any:
    return json.loads(decrypt_data(nonce, ciphertext, associated_data).decode("utf-8"))