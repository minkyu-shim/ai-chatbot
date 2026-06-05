"""Tests for the /api/entries CRUD endpoints (M3)."""
import json
import time
from datetime import date, datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.entry import Entry
from app.models.entry_message import EntryMessage, MessageRole
from app.models.user import User, UserRole

# Re-export the session factory from conftest internals for direct DB seeding.
from tests.conftest import _TestingSessionLocal


# ---------------------------------------------------------------------------
# Autouse fixture: stub out external services so M3 tests stay isolated
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _fake_weather(monkeypatch):
    async def fake_weather(city):
        return {"city": city, "temp": 10.0, "condition": "Clear",
                "description": "clear sky", "humidity": 50,
                "wind_speed": 2.0, "raw": {}}
    async def fake_photo(condition, mood):
        return None
    monkeypatch.setattr("app.api.routes.entries.fetch_weather", fake_weather)
    monkeypatch.setattr("app.api.routes.entries.fetch_outfit_photo", fake_photo)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user(db: Session, email: str = "alice@example.com") -> User:
    user = User(
        email=email,
        password_hash=hash_password("password123"),
        role=UserRole.user,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _token_for(user: User) -> str:
    return create_access_token(subject=user.id, role=user.role.value)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _seed_entry(
    db: Session,
    user: User,
    *,
    city: str = "Paris",
    mood: str = "happy",
    entry_date: date | None = None,
    outfit_worn: str | None = None,
) -> Entry:
    entry = Entry(
        user_id=user.id,
        entry_date=entry_date or date.today(),
        city=city,
        mood=mood,
        outfit_worn=outfit_worn,
        model="test-model",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def _seed_message(
    db: Session,
    entry: Entry,
    *,
    role: MessageRole = MessageRole.assistant,
    content: str = "Wear a raincoat",
    metadata_json: str | None = None,
    created_at: datetime | None = None,
) -> EntryMessage:
    msg = EntryMessage(
        entry_id=entry.id,
        role=role,
        content=content,
        metadata_json=metadata_json,
    )
    if created_at is not None:
        msg.created_at = created_at
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


# ---------------------------------------------------------------------------
# T1 — POST without token → 401
# ---------------------------------------------------------------------------

def test_t1_create_entry_without_token(client: TestClient):
    resp = client.post("/api/entries", json={"city": "Paris", "mood": "tired"})
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# T2 — POST with city+mood → 201, entry_date==today, weather populated by fake, messages==[]
# ---------------------------------------------------------------------------

def test_t2_create_entry_minimal(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
    finally:
        db.close()

    resp = client.post(
        "/api/entries",
        json={"city": "Paris", "mood": "tired"},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["city"] == "Paris"
    assert data["mood"] == "tired"
    assert data["entry_date"] == str(date.today())
    assert data["weather"] == {"city": "Paris", "temp": 10.0, "condition": "Clear",
                               "description": "clear sky", "humidity": 50,
                               "wind_speed": 2.0, "raw": {}}
    assert data["photo_url"] is None
    assert data["messages"] == []


# ---------------------------------------------------------------------------
# T3 — POST with entry_date + outfit_worn → 201, fields persisted
# ---------------------------------------------------------------------------

def test_t3_create_entry_with_optional_fields(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
    finally:
        db.close()

    resp = client.post(
        "/api/entries",
        json={"city": "Tokyo", "mood": "chill", "entry_date": "2026-01-15", "outfit_worn": "Hoodie"},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["entry_date"] == "2026-01-15"
    assert data["outfit_worn"] == "Hoodie"


# ---------------------------------------------------------------------------
# T4 — POST missing city or mood → 422
# ---------------------------------------------------------------------------

def test_t4_create_entry_missing_required_fields(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
    finally:
        db.close()

    headers = _auth(token)
    assert client.post("/api/entries", json={"mood": "tired"}, headers=headers).status_code == 422
    assert client.post("/api/entries", json={"city": "Paris"}, headers=headers).status_code == 422


# ---------------------------------------------------------------------------
# T5 — POST with city=="   " (whitespace-only) → 422
# ---------------------------------------------------------------------------

def test_t5_create_entry_whitespace_city(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
    finally:
        db.close()

    resp = client.post(
        "/api/entries",
        json={"city": "   ", "mood": "tired"},
        headers=_auth(token),
    )
    # city stripped to "" has length 0, violating min_length=1
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# T6 — GET /entries with no entries → 200, []
# ---------------------------------------------------------------------------

def test_t6_list_entries_empty(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
    finally:
        db.close()

    resp = client.get("/api/entries", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# T7 — GET after 3 entries on different dates → ordered entry_date DESC
# ---------------------------------------------------------------------------

def test_t7_list_entries_sorted_by_date(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        _seed_entry(db, user, city="A", mood="ok", entry_date=date(2026, 1, 1))
        _seed_entry(db, user, city="B", mood="ok", entry_date=date(2026, 3, 1))
        _seed_entry(db, user, city="C", mood="ok", entry_date=date(2026, 2, 1))
    finally:
        db.close()

    resp = client.get("/api/entries", headers=_auth(token))
    assert resp.status_code == 200
    dates = [item["entry_date"] for item in resp.json()]
    assert dates == ["2026-03-01", "2026-02-01", "2026-01-01"]


# ---------------------------------------------------------------------------
# T8 — GET ?limit=2 → 2 results
# ---------------------------------------------------------------------------

def test_t8_list_entries_limit(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        for i in range(3):
            _seed_entry(db, user, city=f"City{i}", mood="ok", entry_date=date(2026, 1, i + 1))
    finally:
        db.close()

    resp = client.get("/api/entries?limit=2", headers=_auth(token))
    assert resp.status_code == 200
    assert len(resp.json()) == 2


# ---------------------------------------------------------------------------
# T9 — GET ?limit=2&offset=2 → 1 result
# ---------------------------------------------------------------------------

def test_t9_list_entries_pagination(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        for i in range(3):
            _seed_entry(db, user, city=f"City{i}", mood="ok", entry_date=date(2026, 1, i + 1))
    finally:
        db.close()

    resp = client.get("/api/entries?limit=2&offset=2", headers=_auth(token))
    assert resp.status_code == 200
    assert len(resp.json()) == 1


# ---------------------------------------------------------------------------
# T10 — GET ?limit=0 → 422
# ---------------------------------------------------------------------------

def test_t10_list_entries_limit_zero(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
    finally:
        db.close()

    resp = client.get("/api/entries?limit=0", headers=_auth(token))
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# T11 — GET ?limit=999 → 422
# ---------------------------------------------------------------------------

def test_t11_list_entries_limit_too_large(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
    finally:
        db.close()

    resp = client.get("/api/entries?limit=999", headers=_auth(token))
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# T12 — GET list populates ai_preview from seeded assistant message
# ---------------------------------------------------------------------------

def test_t12_list_entries_ai_preview(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        entry = _seed_entry(db, user, city="Berlin", mood="lazy")
        _seed_message(db, entry, role=MessageRole.user, content="What should I wear?")
        _seed_message(db, entry, role=MessageRole.assistant, content="Wear a cozy sweater today!")
    finally:
        db.close()

    resp = client.get("/api/entries", headers=_auth(token))
    assert resp.status_code == 200
    items = resp.json()
    assert items[0]["ai_preview"] == "Wear a cozy sweater today!"


# ---------------------------------------------------------------------------
# T13 — GET /{id} returns messages ordered created_at ASC
# ---------------------------------------------------------------------------

def test_t13_get_entry_messages_asc_order(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        entry = _seed_entry(db, user, city="Rome", mood="sunny")
        t1 = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
        t2 = datetime(2026, 1, 1, 10, 0, 5, tzinfo=timezone.utc)
        _seed_message(db, entry, role=MessageRole.user, content="First", created_at=t1)
        _seed_message(db, entry, role=MessageRole.assistant, content="Second", created_at=t2)
        entry_id = entry.id
    finally:
        db.close()

    resp = client.get(f"/api/entries/{entry_id}", headers=_auth(token))
    assert resp.status_code == 200
    messages = resp.json()["messages"]
    assert len(messages) == 2
    assert messages[0]["content"] == "First"
    assert messages[1]["content"] == "Second"


# ---------------------------------------------------------------------------
# T14 — GET /{id} parses metadata_json correctly
# ---------------------------------------------------------------------------

def test_t14_get_entry_message_metadata_parsed(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        entry = _seed_entry(db, user, city="Oslo", mood="cold")
        _seed_message(
            db, entry,
            role=MessageRole.assistant,
            content="Bundle up",
            metadata_json=json.dumps({"temp": -5, "icon": "snow"}),
        )
        entry_id = entry.id
    finally:
        db.close()

    resp = client.get(f"/api/entries/{entry_id}", headers=_auth(token))
    assert resp.status_code == 200
    msg = resp.json()["messages"][0]
    assert msg["metadata"] == {"temp": -5, "icon": "snow"}


# ---------------------------------------------------------------------------
# T15 — GET /{id} where metadata_json is null → metadata==None
# ---------------------------------------------------------------------------

def test_t15_get_entry_message_metadata_null(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        entry = _seed_entry(db, user, city="Madrid", mood="warm")
        _seed_message(db, entry, content="Simple", metadata_json=None)
        entry_id = entry.id
    finally:
        db.close()

    resp = client.get(f"/api/entries/{entry_id}", headers=_auth(token))
    assert resp.status_code == 200
    msg = resp.json()["messages"][0]
    assert msg["metadata"] is None


# ---------------------------------------------------------------------------
# T16 — GET /{id} nonexistent → 404
# ---------------------------------------------------------------------------

def test_t16_get_entry_not_found(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
    finally:
        db.close()

    resp = client.get("/api/entries/99999", headers=_auth(token))
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Entry not found"


# ---------------------------------------------------------------------------
# T17 — GET /{id} another user's entry → 404
# ---------------------------------------------------------------------------

def test_t17_get_entry_another_user(client: TestClient):
    db = _TestingSessionLocal()
    try:
        alice = _make_user(db, email="alice@example.com")
        bob = _make_user(db, email="bob@example.com")
        entry = _seed_entry(db, bob, city="London", mood="rainy")
        token = _token_for(alice)
        entry_id = entry.id
    finally:
        db.close()

    resp = client.get(f"/api/entries/{entry_id}", headers=_auth(token))
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# T18 — PATCH outfit_worn → 200, updated_at > created_at
# ---------------------------------------------------------------------------

def test_t18_patch_outfit_updates_timestamp(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        entry = _seed_entry(db, user, city="Paris", mood="chic")
        entry_id = entry.id
        # Backdate created_at so updated_at is guaranteed to be later.
        entry.created_at = datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        db.commit()
    finally:
        db.close()

    resp = client.patch(
        f"/api/entries/{entry_id}",
        json={"outfit_worn": "Trench coat"},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["outfit_worn"] == "Trench coat"
    created = datetime.fromisoformat(data["created_at"])
    updated = datetime.fromisoformat(data["updated_at"])
    assert updated > created


# ---------------------------------------------------------------------------
# T19 — PATCH reflection → 200
# ---------------------------------------------------------------------------

def test_t19_patch_reflection(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        entry = _seed_entry(db, user, city="Vienna", mood="cosy")
        entry_id = entry.id
    finally:
        db.close()

    resp = client.patch(
        f"/api/entries/{entry_id}",
        json={"reflection": "Great day overall"},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    assert resp.json()["reflection"] == "Great day overall"


# ---------------------------------------------------------------------------
# T20 — PATCH another user's entry → 404
# ---------------------------------------------------------------------------

def test_t20_patch_another_users_entry(client: TestClient):
    db = _TestingSessionLocal()
    try:
        alice = _make_user(db, email="alice@example.com")
        bob = _make_user(db, email="bob@example.com")
        entry = _seed_entry(db, bob, city="Dublin", mood="windy")
        token = _token_for(alice)
        entry_id = entry.id
    finally:
        db.close()

    resp = client.patch(
        f"/api/entries/{entry_id}",
        json={"reflection": "Not mine"},
        headers=_auth(token),
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# T21 — PATCH ignores unknown fields → 200, original city preserved
# ---------------------------------------------------------------------------

def test_t21_patch_ignores_unknown_fields(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        entry = _seed_entry(db, user, city="Lisbon", mood="sunny")
        entry_id = entry.id
    finally:
        db.close()

    resp = client.patch(
        f"/api/entries/{entry_id}",
        # city is not in EntryUpdate — Pydantic will ignore it
        json={"reflection": "Fine", "city": "Nowhere"},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["city"] == "Lisbon"
    assert data["reflection"] == "Fine"


# ---------------------------------------------------------------------------
# T22 — DELETE own entry → 204, entry+messages gone from DB
# ---------------------------------------------------------------------------

def test_t22_delete_own_entry(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        entry = _seed_entry(db, user, city="Athens", mood="warm")
        _seed_message(db, entry, content="Wear sandals")
        entry_id = entry.id
    finally:
        db.close()

    resp = client.delete(f"/api/entries/{entry_id}", headers=_auth(token))
    assert resp.status_code == 204

    # Confirm the entry is gone from the DB.
    db = _TestingSessionLocal()
    try:
        assert db.get(Entry, entry_id) is None
    finally:
        db.close()

    # Confirm 404 on subsequent GET.
    assert client.get(f"/api/entries/{entry_id}", headers=_auth(token)).status_code == 404


# ---------------------------------------------------------------------------
# T23 — DELETE another user's entry → 404
# ---------------------------------------------------------------------------

def test_t23_delete_another_users_entry(client: TestClient):
    db = _TestingSessionLocal()
    try:
        alice = _make_user(db, email="alice@example.com")
        bob = _make_user(db, email="bob@example.com")
        entry = _seed_entry(db, bob, city="Brussels", mood="grey")
        token = _token_for(alice)
        entry_id = entry.id
    finally:
        db.close()

    resp = client.delete(f"/api/entries/{entry_id}", headers=_auth(token))
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# T24 — DELETE nonexistent → 404
# ---------------------------------------------------------------------------

def test_t24_delete_nonexistent_entry(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
    finally:
        db.close()

    resp = client.delete("/api/entries/99999", headers=_auth(token))
    assert resp.status_code == 404
