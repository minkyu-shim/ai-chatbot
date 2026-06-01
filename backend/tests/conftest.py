"""Pytest fixtures for backend tests.

Uses an in-memory SQLite database so tests are isolated and fast.
The seed admin is NOT created here — tests must set up their own data.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.base import Base, get_db
from app.main import app as fastapi_app
from app.models.user import User, UserRole
# Import models registry so all ORM models are registered before Base.metadata.create_all.
import app.db.models_registry  # noqa: F401

_IN_MEMORY_URL = "sqlite:///:memory:"

_engine = create_engine(
    _IN_MEMORY_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestingSessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False)


def _override_get_db():
    db = _TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True, scope="session")
def _create_tables():
    """Create all tables once for the entire test session."""
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)


@pytest.fixture(autouse=True)
def _override_db():
    """Override the DB dependency before each test and clear tables after."""
    fastapi_app.dependency_overrides[get_db] = _override_get_db
    yield
    # Truncate all tables between tests for isolation.
    with _engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def client() -> TestClient:
    """A TestClient wired to the in-memory DB."""
    return TestClient(fastapi_app, raise_server_exceptions=True)


@pytest.fixture
def admin_token(client: TestClient) -> str:
    """Create an admin user directly and return a valid JWT for them."""
    db = _TestingSessionLocal()
    try:
        from app.core.security import hash_password
        admin = User(
            email="testadmin@example.com",
            password_hash=hash_password("adminpass123"),
            role=UserRole.admin,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        token = create_access_token(subject=admin.id, role=admin.role.value)
    finally:
        db.close()
    return token
