"""Seed the DB with a default admin user on first boot. Idempotent."""
import logging

from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.security import hash_password
from app.db.base import SessionLocal
import app.db.models_registry  # noqa: F401 — registers all models so relationships resolve
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

_settings = get_settings()

ADMIN_EMAIL = _settings.seed_admin_email
ADMIN_PASSWORD = _settings.seed_admin_password


def seed_admin(db: Session) -> None:
    existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if existing:
        logger.debug("Seed: admin already exists, skipping.")
        return
    admin = User(
        email=ADMIN_EMAIL,
        password_hash=hash_password(ADMIN_PASSWORD),
        role=UserRole.admin,
    )
    db.add(admin)
    db.commit()
    logger.info("Seed: created default admin user (%s).", ADMIN_EMAIL)


def run_seed() -> None:
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
