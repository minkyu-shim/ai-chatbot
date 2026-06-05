"""M5 tests — Weather, Unsplash, and SSE Suggestion Stream."""
from __future__ import annotations
import json
from datetime import date

import pytest
import respx
from httpx import Response
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.entry import Entry
from app.models.entry_message import EntryMessage, MessageRole
from app.models.user import User, UserRole
from app.services.external import weather as weather_mod
from app.services.external import unsplash as unsplash_mod
from app.llm import factory as llm_factory
from app.services import entry_service
from tests.conftest import _TestingSessionLocal


# ---------------------------------------------------------------------------
# Shared constants
# ---------------------------------------------------------------------------

WEATHER_PAYLOAD = {
    "main": {"temp": 12.0, "feels_like": 10.0, "humidity": 70},
    "weather": [{"main": "Clouds", "description": "overcast clouds"}],
    "wind": {"speed": 3.0},
    "name": "Paris",
}
UNSPLASH_PAYLOAD = {
    "results": [{"urls": {"regular": "https://img.unsplash.com/photo-1"}}]
}


# ---------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------

def _ow_url():
    from app.config import get_settings
    return f"{get_settings().openweather_base_url}/weather"


def _us_url():
    from app.config import get_settings
    return f"{get_settings().unsplash_base_url}/search/photos"


# ---------------------------------------------------------------------------
# SSE parser
# ---------------------------------------------------------------------------

def parse_sse(text: str) -> list[tuple[str, str]]:
    events = []
    for raw in text.strip().split("\n\n"):
        if not raw.strip():
            continue
        lines = raw.split("\n")
        event = ""
        data_lines = []
        for ln in lines:
            if ln.startswith("event: "):
                event = ln[len("event: "):]
            elif ln.startswith("data: "):
                data_lines.append(ln[len("data: "):])
        if event:
            events.append((event, "\n".join(data_lines)))
    return events


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _reset_external_caches():
    weather_mod._reset_cache_for_tests()
    unsplash_mod._reset_cache_for_tests()
    yield
    weather_mod._reset_cache_for_tests()
    unsplash_mod._reset_cache_for_tests()


@pytest.fixture
def fake_llm(monkeypatch):
    class FakeProvider:
        def __init__(self, tokens, *, raise_after=None):
            self.tokens = tokens
            self.raise_after = raise_after
            self.received_messages = None

        async def stream_chat(self, messages):
            self.received_messages = messages
            for i, t in enumerate(self.tokens):
                if self.raise_after is not None and i >= self.raise_after:
                    raise RuntimeError("simulated LLM failure")
                yield t

    def _install(tokens, *, raise_after=None):
        provider = FakeProvider(tokens, raise_after=raise_after)
        llm_factory.reset_provider()
        monkeypatch.setattr(llm_factory, "_provider", provider)
        return provider

    return _install


@pytest.fixture
def client() -> TestClient:
    from app.main import app as fastapi_app
    return TestClient(fastapi_app, raise_server_exceptions=True)


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


def _seed_entry_direct(
    db: Session,
    user: User,
    *,
    city: str = "Paris",
    mood: str = "tired",
    weather_json: str | None = None,
    photo_url: str | None = None,
    outfit_worn: str | None = None,
) -> Entry:
    """Insert an entry directly into DB, bypassing the route (so no external calls)."""
    entry = Entry(
        user_id=user.id,
        entry_date=date.today(),
        city=city,
        mood=mood,
        model="test-model",
        weather_json=weather_json,
        photo_url=photo_url,
        outfit_worn=outfit_worn,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@pytest.fixture
def _patch_suggestion_session(monkeypatch):
    """Make suggestion_service use the test in-memory DB instead of the prod SessionLocal."""
    import app.services.suggestion_service as svc
    monkeypatch.setattr(svc, "SessionLocal", _TestingSessionLocal)


# ---------------------------------------------------------------------------
# T1 — POST valid city → 201, weather populated, photo_url set
# ---------------------------------------------------------------------------

def test_t1_post_valid_weather_and_photo(client: TestClient, monkeypatch):
    monkeypatch.setattr(get_settings_cached(), "openweather_api_key", "test-key")
    monkeypatch.setattr(get_settings_cached(), "unsplash_access_key", "test-us-key")

    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
    finally:
        db.close()

    with respx.mock:
        respx.get(_ow_url()).mock(return_value=Response(200, json=WEATHER_PAYLOAD))
        respx.get(_us_url()).mock(return_value=Response(200, json=UNSPLASH_PAYLOAD))

        resp = client.post(
            "/api/entries",
            json={"city": "Paris", "mood": "tired"},
            headers=_auth(token),
        )

    assert resp.status_code == 201
    data = resp.json()
    assert data["weather"]["temp"] == 12.0
    assert data["weather"]["condition"] == "Clouds"
    assert data["photo_url"] == "https://img.unsplash.com/photo-1"

    # Verify weather_json is persisted in DB
    db = _TestingSessionLocal()
    try:
        entry = db.get(Entry, data["id"])
        assert entry.weather_json is not None
        assert json.loads(entry.weather_json)["temp"] == 12.0
    finally:
        db.close()


# ---------------------------------------------------------------------------
# T2 — POST where OWM returns 404 → 502, no entry created
# ---------------------------------------------------------------------------

def test_t2_owm_404_returns_502(client: TestClient, monkeypatch):
    monkeypatch.setattr(get_settings_cached(), "openweather_api_key", "test-key")

    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        before_count = db.query(Entry).count()
    finally:
        db.close()

    with respx.mock:
        respx.get(_ow_url()).mock(return_value=Response(404, json={"cod": "404"}))
        resp = client.post(
            "/api/entries",
            json={"city": "Nonexistentcity123", "mood": "tired"},
            headers=_auth(token),
        )

    assert resp.status_code == 502
    assert "City not found" in resp.json()["detail"]

    db = _TestingSessionLocal()
    try:
        after_count = db.query(Entry).count()
        assert after_count == before_count
    finally:
        db.close()


# ---------------------------------------------------------------------------
# T3 — POST where OWM network error → 502, no entry created
# ---------------------------------------------------------------------------

def test_t3_owm_network_error_returns_502(client: TestClient, monkeypatch):
    import httpx
    monkeypatch.setattr(get_settings_cached(), "openweather_api_key", "test-key")

    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        before_count = db.query(Entry).count()
    finally:
        db.close()

    with respx.mock:
        respx.get(_ow_url()).mock(side_effect=httpx.ConnectError("connection refused"))
        resp = client.post(
            "/api/entries",
            json={"city": "Paris", "mood": "tired"},
            headers=_auth(token),
        )

    assert resp.status_code == 502
    assert "unreachable" in resp.json()["detail"].lower()

    db = _TestingSessionLocal()
    try:
        after_count = db.query(Entry).count()
        assert after_count == before_count
    finally:
        db.close()


# ---------------------------------------------------------------------------
# T4 — POST where Unsplash 500s → 201, photo_url is None, entry persisted
# ---------------------------------------------------------------------------

def test_t4_unsplash_500_degrades_silently(client: TestClient, monkeypatch):
    monkeypatch.setattr(get_settings_cached(), "openweather_api_key", "test-key")
    monkeypatch.setattr(get_settings_cached(), "unsplash_access_key", "test-us-key")

    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
    finally:
        db.close()

    with respx.mock:
        respx.get(_ow_url()).mock(return_value=Response(200, json=WEATHER_PAYLOAD))
        respx.get(_us_url()).mock(return_value=Response(500, json={}))

        resp = client.post(
            "/api/entries",
            json={"city": "Paris", "mood": "tired"},
            headers=_auth(token),
        )

    assert resp.status_code == 201
    data = resp.json()
    assert data["photo_url"] is None
    assert data["weather"]["temp"] == 12.0


# ---------------------------------------------------------------------------
# T5 — POST where unsplash key absent → 201, photo_url None, Unsplash NOT called
# ---------------------------------------------------------------------------

def test_t5_unsplash_key_absent_skips_call(client: TestClient, monkeypatch):
    monkeypatch.setattr(get_settings_cached(), "openweather_api_key", "test-key")
    monkeypatch.setattr(get_settings_cached(), "unsplash_access_key", "")

    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
    finally:
        db.close()

    with respx.mock:
        respx.get(_ow_url()).mock(return_value=Response(200, json=WEATHER_PAYLOAD))
        us_route = respx.get(_us_url()).mock(return_value=Response(200, json=UNSPLASH_PAYLOAD))

        resp = client.post(
            "/api/entries",
            json={"city": "Paris", "mood": "tired"},
            headers=_auth(token),
        )

    assert resp.status_code == 201
    assert resp.json()["photo_url"] is None
    assert us_route.call_count == 0


# ---------------------------------------------------------------------------
# T6 — TTL cache: two POSTs same city → OWM called exactly once
# ---------------------------------------------------------------------------

def test_t6_weather_cache_hit(client: TestClient, monkeypatch):
    monkeypatch.setattr(get_settings_cached(), "openweather_api_key", "test-key")
    monkeypatch.setattr(get_settings_cached(), "unsplash_access_key", "")

    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
    finally:
        db.close()

    with respx.mock:
        ow_route = respx.get(_ow_url()).mock(return_value=Response(200, json=WEATHER_PAYLOAD))

        client.post("/api/entries", json={"city": "Paris", "mood": "happy"}, headers=_auth(token))
        client.post("/api/entries", json={"city": "Paris", "mood": "tired"}, headers=_auth(token))

        assert ow_route.call_count == 1


# ---------------------------------------------------------------------------
# T7 — TTL cache: two POSTs same (condition, mood) → Unsplash called exactly once
# ---------------------------------------------------------------------------

def test_t7_unsplash_cache_hit(client: TestClient, monkeypatch):
    monkeypatch.setattr(get_settings_cached(), "openweather_api_key", "test-key")
    monkeypatch.setattr(get_settings_cached(), "unsplash_access_key", "test-us-key")

    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
    finally:
        db.close()

    with respx.mock:
        respx.get(_ow_url()).mock(return_value=Response(200, json=WEATHER_PAYLOAD))
        us_route = respx.get(_us_url()).mock(return_value=Response(200, json=UNSPLASH_PAYLOAD))

        # Both entries have mood="tired"; weather is "Clouds" — same cache key
        client.post("/api/entries", json={"city": "Paris", "mood": "tired"}, headers=_auth(token))
        client.post("/api/entries", json={"city": "Lyon", "mood": "tired"}, headers=_auth(token))

        assert us_route.call_count == 1


# ---------------------------------------------------------------------------
# T8 — build_history_summary with 0 prior entries → "(no previous diary entries)"
# ---------------------------------------------------------------------------

def test_t8_history_summary_empty():
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        result = entry_service.build_history_summary(db, user, exclude_entry_id=None, limit=5)
        assert result == "(no previous diary entries)"
    finally:
        db.close()


# ---------------------------------------------------------------------------
# T9 — build_history_summary with 3 prior entries → 3 lines, newest first
# ---------------------------------------------------------------------------

def test_t9_history_summary_three_entries():
    from datetime import date as _date
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        weather_j = json.dumps({"temp": 10.0, "condition": "Clear"})
        # Use different entry_dates so ordering is deterministic
        e1 = Entry(user_id=user.id, entry_date=_date(2026, 1, 1), city="Paris",
                   mood="happy", model="test", weather_json=weather_j)
        e2 = Entry(user_id=user.id, entry_date=_date(2026, 2, 1), city="Berlin",
                   mood="tired", model="test", weather_json=weather_j)
        e3 = Entry(user_id=user.id, entry_date=_date(2026, 3, 1), city="Tokyo",
                   mood="energetic", model="test", weather_json=weather_j)
        for e in (e1, e2, e3):
            db.add(e)
        db.commit()

        result = entry_service.build_history_summary(db, user, exclude_entry_id=None, limit=5)
        lines = result.split("\n")
        assert len(lines) == 3
        # Newest first: 2026-03-01 (Tokyo), 2026-02-01 (Berlin), 2026-01-01 (Paris)
        assert "Tokyo" in lines[0]
        assert "Berlin" in lines[1]
        assert "Paris" in lines[2]
    finally:
        db.close()


# ---------------------------------------------------------------------------
# T10 — build_history_summary with 7 prior entries → exactly 5 lines
# ---------------------------------------------------------------------------

def test_t10_history_summary_capped_at_five():
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        weather_j = json.dumps({"temp": 15.0, "condition": "Sunny"})
        for i in range(7):
            _seed_entry_direct(db, user, city=f"City{i}", mood="ok", weather_json=weather_j)

        result = entry_service.build_history_summary(db, user, exclude_entry_id=None, limit=5)
        lines = result.split("\n")
        assert len(lines) == 5
    finally:
        db.close()


# ---------------------------------------------------------------------------
# T11 — build_history_summary excludes the current entry
# ---------------------------------------------------------------------------

def test_t11_history_summary_excludes_current_entry():
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        weather_j = json.dumps({"temp": 15.0, "condition": "Rainy"})
        e1 = _seed_entry_direct(db, user, city="London", mood="gloomy", weather_json=weather_j)
        e2 = _seed_entry_direct(db, user, city="Manchester", mood="grey", weather_json=weather_j)

        result = entry_service.build_history_summary(db, user, exclude_entry_id=e2.id, limit=5)
        assert "Manchester" not in result
        assert "London" in result
    finally:
        db.close()


# ---------------------------------------------------------------------------
# T12 — SSE happy path: meta + tokens + done; DB has user + assistant messages
# ---------------------------------------------------------------------------

def test_t12_sse_happy_path(client: TestClient, fake_llm, _patch_suggestion_session):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        weather_j = json.dumps({"temp": 12.0, "condition": "Clouds",
                                 "description": "overcast", "humidity": 70,
                                 "wind_speed": 3.0, "city": "Paris"})
        entry = _seed_entry_direct(db, user, city="Paris", mood="tired",
                                   weather_json=weather_j,
                                   photo_url="https://img.unsplash.com/photo-1")
        entry_id = entry.id
    finally:
        db.close()

    provider = fake_llm(["Wear ", "a wool ", "coat."])

    resp = client.post(
        f"/api/entries/{entry_id}/suggest/stream",
        headers=_auth(token),
    )

    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]

    events = parse_sse(resp.text)
    event_names = [e for e, _ in events]
    assert event_names[0] == "meta"
    token_events = [(e, d) for e, d in events if e == "token"]
    assert len(token_events) == 3
    assert [d for _, d in token_events] == ["Wear ", "a wool ", "coat."]
    assert event_names[-1] == "done"

    # Verify DB has both user and assistant messages
    db = _TestingSessionLocal()
    try:
        msgs = db.query(EntryMessage).filter_by(entry_id=entry_id).all()
        roles = [m.role for m in msgs]
        assert MessageRole.user in roles
        assert MessageRole.assistant in roles
        assistant_msg = next(m for m in msgs if m.role == MessageRole.assistant)
        assert assistant_msg.content == "Wear a wool coat."
    finally:
        db.close()


# ---------------------------------------------------------------------------
# T13 — SSE LLM fails mid-stream (raise_after=2) → meta+2 tokens+error; partial content persisted
# ---------------------------------------------------------------------------

def test_t13_sse_llm_fails_mid_stream(client: TestClient, fake_llm, _patch_suggestion_session):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        weather_j = json.dumps({"temp": 5.0, "condition": "Snow",
                                 "description": "heavy snow", "humidity": 90,
                                 "wind_speed": 5.0, "city": "Oslo"})
        entry = _seed_entry_direct(db, user, city="Oslo", mood="cold", weather_json=weather_j)
        entry_id = entry.id
    finally:
        db.close()

    fake_llm(["Token1 ", "Token2 ", "Token3"], raise_after=2)

    resp = client.post(
        f"/api/entries/{entry_id}/suggest/stream",
        headers=_auth(token),
    )

    events = parse_sse(resp.text)
    event_names = [e for e, _ in events]
    assert event_names[0] == "meta"
    token_events = [d for e, d in events if e == "token"]
    assert len(token_events) == 2
    assert "error" in event_names
    assert "done" not in event_names

    # Partial content should be persisted
    db = _TestingSessionLocal()
    try:
        msgs = db.query(EntryMessage).filter_by(entry_id=entry_id).all()
        assistant_msgs = [m for m in msgs if m.role == MessageRole.assistant]
        assert len(assistant_msgs) == 1
        assert assistant_msgs[0].content == "Token1 Token2 "
    finally:
        db.close()


# ---------------------------------------------------------------------------
# T14 — SSE LLM fails immediately (raise_after=0) → meta+error; user msg persisted; no assistant
# ---------------------------------------------------------------------------

def test_t14_sse_llm_fails_immediately(client: TestClient, fake_llm, _patch_suggestion_session):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        weather_j = json.dumps({"temp": 20.0, "condition": "Clear",
                                 "description": "clear sky", "humidity": 40,
                                 "wind_speed": 1.0, "city": "Madrid"})
        entry = _seed_entry_direct(db, user, city="Madrid", mood="sunny", weather_json=weather_j)
        entry_id = entry.id
    finally:
        db.close()

    fake_llm(["x"], raise_after=0)

    resp = client.post(
        f"/api/entries/{entry_id}/suggest/stream",
        headers=_auth(token),
    )

    events = parse_sse(resp.text)
    event_names = [e for e, _ in events]
    assert "meta" in event_names
    assert "error" in event_names
    assert "done" not in event_names

    db = _TestingSessionLocal()
    try:
        msgs = db.query(EntryMessage).filter_by(entry_id=entry_id).all()
        user_msgs = [m for m in msgs if m.role == MessageRole.user]
        assistant_msgs = [m for m in msgs if m.role == MessageRole.assistant]
        assert len(user_msgs) == 1
        assert len(assistant_msgs) == 0
    finally:
        db.close()


# ---------------------------------------------------------------------------
# T15 — SSE entry owned by other user → 404 JSON (not SSE)
# ---------------------------------------------------------------------------

def test_t15_sse_entry_other_user(client: TestClient):
    db = _TestingSessionLocal()
    try:
        alice = _make_user(db, "alice@example.com")
        bob = _make_user(db, "bob@example.com")
        weather_j = json.dumps({"temp": 10.0, "condition": "Clear"})
        entry = _seed_entry_direct(db, bob, city="Dublin", mood="windy", weather_json=weather_j)
        token = _token_for(alice)
        entry_id = entry.id
    finally:
        db.close()

    resp = client.post(
        f"/api/entries/{entry_id}/suggest/stream",
        headers=_auth(token),
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# T16 — SSE nonexistent entry → 404
# ---------------------------------------------------------------------------

def test_t16_sse_nonexistent_entry(client: TestClient):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
    finally:
        db.close()

    resp = client.post(
        "/api/entries/99999/suggest/stream",
        headers=_auth(token),
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# T17 — SSE no auth token → 401
# ---------------------------------------------------------------------------

def test_t17_sse_no_auth(client: TestClient):
    resp = client.post("/api/entries/1/suggest/stream")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# T18 — After SSE happy path, GET /entries/{id} returns assistant message with metadata
# ---------------------------------------------------------------------------

def test_t18_get_entry_after_sse_has_assistant_metadata(
    client: TestClient, fake_llm, _patch_suggestion_session
):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        weather_j = json.dumps({"temp": 18.0, "condition": "Sunny",
                                 "description": "clear", "humidity": 45,
                                 "wind_speed": 2.5, "city": "Nice"})
        entry = _seed_entry_direct(db, user, city="Nice", mood="relaxed",
                                   weather_json=weather_j,
                                   photo_url="https://img.unsplash.com/photo-2")
        entry_id = entry.id
    finally:
        db.close()

    fake_llm(["Light ", "linen ", "shirt."])

    client.post(f"/api/entries/{entry_id}/suggest/stream", headers=_auth(token))

    resp = client.get(f"/api/entries/{entry_id}", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assistant_msgs = [m for m in data["messages"] if m["role"] == "assistant"]
    assert len(assistant_msgs) == 1
    meta = assistant_msgs[0]["metadata"]
    assert meta is not None
    assert meta["weather"]["temp"] == 18.0
    assert meta["photo_url"] == "https://img.unsplash.com/photo-2"


# ---------------------------------------------------------------------------
# T19 — POST response body weather["temp"] == 12.0 (dict, not string)
# ---------------------------------------------------------------------------

def test_t19_post_response_weather_is_dict(client: TestClient, monkeypatch):
    monkeypatch.setattr(get_settings_cached(), "openweather_api_key", "test-key")
    monkeypatch.setattr(get_settings_cached(), "unsplash_access_key", "")

    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
    finally:
        db.close()

    with respx.mock:
        respx.get(_ow_url()).mock(return_value=Response(200, json=WEATHER_PAYLOAD))

        resp = client.post(
            "/api/entries",
            json={"city": "Paris", "mood": "curious"},
            headers=_auth(token),
        )

    assert resp.status_code == 201
    body = resp.json()
    assert isinstance(body["weather"], dict)
    assert body["weather"]["temp"] == 12.0


# ---------------------------------------------------------------------------
# T20 — History summary appears in system prompt (captured via fake_llm.received_messages)
# ---------------------------------------------------------------------------

def test_t20_history_summary_in_system_prompt(
    client: TestClient, fake_llm, _patch_suggestion_session
):
    db = _TestingSessionLocal()
    try:
        user = _make_user(db)
        token = _token_for(user)
        prior_weather = json.dumps({"temp": 5.0, "condition": "Rain"})
        # Create a prior entry
        _seed_entry_direct(db, user, city="London", mood="gloomy",
                           weather_json=prior_weather, outfit_worn="Trench coat")
        # Create the target entry
        target_weather = json.dumps({"temp": 12.0, "condition": "Clouds",
                                      "description": "overcast", "humidity": 70,
                                      "wind_speed": 3.0, "city": "Paris"})
        entry = _seed_entry_direct(db, user, city="Paris", mood="tired",
                                   weather_json=target_weather)
        entry_id = entry.id
    finally:
        db.close()

    provider = fake_llm(["Great outfit."])

    client.post(f"/api/entries/{entry_id}/suggest/stream", headers=_auth(token))

    assert provider.received_messages is not None
    system_msg = next(m for m in provider.received_messages if m["role"] == "system")
    # Prior entry for London should appear in the system prompt history summary
    assert "London" in system_msg["content"]
    assert "Trench coat" in system_msg["content"]


# ---------------------------------------------------------------------------
# Helper to get the lru_cache'd Settings instance for monkeypatching
# ---------------------------------------------------------------------------

def get_settings_cached():
    from app.config import get_settings
    return get_settings()
