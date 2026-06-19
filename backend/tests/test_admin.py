"""Tests for admin-only endpoints."""
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.entry import Entry
from app.models.user import User, UserRole
from tests.conftest import _TestingSessionLocal


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user(db: Session, email: str, role: UserRole = UserRole.user) -> User:
    user = User(
        email=email,
        password_hash=hash_password("password123"),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _token_for(user: User) -> str:
    return create_access_token(subject=user.id, role=user.role.value)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _seed_entry(db: Session, user: User, *, city: str = "Paris", mood: str = "happy") -> Entry:
    entry = Entry(
        user_id=user.id,
        entry_date=date.today(),
        city=city,
        mood=mood,
        model="test-model",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


# ---------------------------------------------------------------------------
# TA1 — Admin gets 200 with entries across multiple users
# ---------------------------------------------------------------------------

def test_ta1_admin_sees_all_users_entries(client: TestClient):
    db = _TestingSessionLocal()
    try:
        admin = _make_user(db, "admin@test.com", role=UserRole.admin)
        alice = _make_user(db, "alice@test.com")
        bob = _make_user(db, "bob@test.com")
        _seed_entry(db, alice, city="Paris", mood="happy")
        _seed_entry(db, bob, city="Tokyo", mood="tired")
        token = _token_for(admin)
    finally:
        db.close()

    resp = client.get("/api/admin/entries", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    emails = {row["user_email"] for row in data}
    assert emails == {"alice@test.com", "bob@test.com"}


# ---------------------------------------------------------------------------
# TA2 — Non-admin gets 403
# ---------------------------------------------------------------------------

def test_ta2_non_admin_gets_403(client: TestClient):
    db = _TestingSessionLocal()
    try:
        regular_user = _make_user(db, "user@test.com", role=UserRole.user)
        token = _token_for(regular_user)
    finally:
        db.close()

    resp = client.get("/api/admin/entries", headers=_auth(token))
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# TA3 — Pagination: 60 entries, limit=20 returns exactly 20
# ---------------------------------------------------------------------------

def test_ta3_pagination_limit_20(client: TestClient):
    db = _TestingSessionLocal()
    try:
        admin = _make_user(db, "admin@test.com", role=UserRole.admin)
        regular = _make_user(db, "user@test.com")
        for i in range(60):
            _seed_entry(db, regular, city=f"City{i}", mood="ok")
        token = _token_for(admin)
    finally:
        db.close()

    resp = client.get("/api/admin/entries?limit=20", headers=_auth(token))
    assert resp.status_code == 200
    assert len(resp.json()) == 20
