"""Password hashing and JWT utilities.

All auth crypto lives here. Import these helpers instead of calling
jose or passlib directly in other modules.
"""
from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError  # noqa: F401 — re-exported for callers
from passlib.context import CryptContext

from app.config import get_settings

_settings = get_settings()
_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plaintext: str) -> str:
    """Return a bcrypt hash of *plaintext*."""
    return _pwd.hash(plaintext)


def verify_password(plaintext: str, hashed: str) -> bool:
    """Return True if *plaintext* matches *hashed*."""
    return _pwd.verify(plaintext, hashed)


def create_access_token(
    subject: str | int,
    role: str,
    expires_minutes: int | None = None,
) -> str:
    """Create a signed JWT for *subject* (user id) with the given *role*.

    If *expires_minutes* is not provided, falls back to the configured default.
    The payload contains: sub (str), role, iat (int epoch), exp (int epoch).
    """
    if expires_minutes is None:
        expires_minutes = _settings.jwt_access_token_expire_minutes

    now = datetime.now(tz=timezone.utc)
    expire = now + timedelta(minutes=expires_minutes)

    payload = {
        "sub": str(subject),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, _settings.jwt_secret_key, algorithm=_settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """Decode and verify *token*, returning the payload dict.

    Raises jose.JWTError subclasses (e.g. ExpiredSignatureError) on failure.
    """
    return jwt.decode(token, _settings.jwt_secret_key, algorithms=[_settings.jwt_algorithm])
