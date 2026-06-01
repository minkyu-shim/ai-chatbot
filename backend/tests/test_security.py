"""Unit tests for app.core.security helpers."""
import pytest
from jose import ExpiredSignatureError

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_hash_password_returns_different_string():
    plain = "my-secret-password"
    hashed = hash_password(plain)
    assert isinstance(hashed, str)
    assert hashed != plain


def test_verify_password_correct():
    plain = "correct-password"
    assert verify_password(plain, hash_password(plain)) is True


def test_verify_password_wrong():
    assert verify_password("wrong", hash_password("right")) is False


def test_decode_token_sub_matches_subject():
    token = create_access_token(subject=1, role="user")
    payload = decode_access_token(token)
    assert payload["sub"] == "1"


def test_expired_token_raises_expired_signature_error():
    token = create_access_token(subject=42, role="user", expires_minutes=-1)
    with pytest.raises(ExpiredSignatureError):
        decode_access_token(token)
