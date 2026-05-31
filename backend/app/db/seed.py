"""Seed the DB with a default admin user on first boot. Idempotent."""
import logging

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.db.base import SessionLocal
import app.db.models_registry  # noqa: F401 — registers all models so relationships resolve
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin1234"  # TODO(M2): pull from env var


def seed_admin(db: Session) -> None:
    existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if existing:
        logger.debug("Seed: admin already exists, skipping.")
        return
    admin = User(
        email=ADMIN_EMAIL,
        password_hash=_pwd_context.hash(ADMIN_PASSWORD),
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
