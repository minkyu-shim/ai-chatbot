"""Integration tests for auth endpoints."""
import time

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token


# ---------------------------------------------------------------------------
# Signup
# ---------------------------------------------------------------------------

def test_signup_new_user_returns_201(client: TestClient):
    resp = client.post("/api/auth/signup", json={"email": "new@test.com", "password": "password123"})
    assert resp.status_code == 201
    body = resp.json()
    assert "access_token" in body
    assert body["user"]["role"] == "user"


def test_signup_duplicate_email_returns_409(client: TestClient):
    payload = {"email": "dup@test.com", "password": "password123"}
    client.post("/api/auth/signup", json=payload)
    resp = client.post("/api/auth/signup", json=payload)
    assert resp.status_code == 409


def test_signup_short_password_returns_422(client: TestClient):
    resp = client.post("/api/auth/signup", json={"email": "short@test.com", "password": "1234567"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

def test_login_correct_credentials_returns_200(client: TestClient):
    client.post("/api/auth/signup", json={"email": "login@test.com", "password": "password123"})
    resp = client.post("/api/auth/login", json={"email": "login@test.com", "password": "password123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password_returns_401(client: TestClient):
    client.post("/api/auth/signup", json={"email": "wrongpw@test.com", "password": "password123"})
    resp = client.post("/api/auth/login", json={"email": "wrongpw@test.com", "password": "wrongpassword"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid credentials"


def test_login_unknown_email_returns_401_same_detail(client: TestClient):
    """Unknown email must return the same detail as wrong password (anti-enumeration)."""
    resp = client.post("/api/auth/login", json={"email": "nobody@test.com", "password": "password123"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid credentials"


# ---------------------------------------------------------------------------
# /me
# ---------------------------------------------------------------------------

def test_me_without_token_returns_401(client: TestClient):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_with_valid_token_returns_user(client: TestClient):
    signup = client.post("/api/auth/signup", json={"email": "me@test.com", "password": "password123"})
    token = signup.json()["access_token"]
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "me@test.com"
    assert "id" in body
    assert "role" in body


def test_me_with_mangled_token_returns_401(client: TestClient):
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer this.is.garbage"})
    assert resp.status_code == 401


def test_me_with_expired_token_returns_401(client: TestClient):
    # Create a token that is already expired (expires_minutes=-1).
    token = create_access_token(subject=999, role="user", expires_minutes=-1)
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Token expired"


# ---------------------------------------------------------------------------
# Admin ping
# ---------------------------------------------------------------------------

def test_admin_ping_as_regular_user_returns_403(client: TestClient):
    signup = client.post("/api/auth/signup", json={"email": "user@test.com", "password": "password123"})
    token = signup.json()["access_token"]
    resp = client.get("/api/admin/ping", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


def test_admin_ping_as_admin_returns_200(client: TestClient, admin_token: str):
    resp = client.get("/api/admin/ping", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    assert resp.json() == {"pong": True}


# ---------------------------------------------------------------------------
# Email normalisation
# ---------------------------------------------------------------------------

def test_signup_uppercase_login_lowercase(client: TestClient):
    """Signup with mixed-case email, login with all-lowercase — must succeed."""
    client.post("/api/auth/signup", json={"email": "Alice@X.com", "password": "password123"})
    resp = client.post("/api/auth/login", json={"email": "alice@x.com", "password": "password123"})
    assert resp.status_code == 200
