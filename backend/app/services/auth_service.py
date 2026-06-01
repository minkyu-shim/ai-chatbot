"""Authentication service — DB-level operations for users."""
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User, UserRole


def get_user_by_email(db: Session, email: str) -> User | None:
    """Return the User whose email matches *email* (case-insensitive), or None."""
    return db.query(User).filter(User.email == email.lower()).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    """Return the User with *user_id*, or None."""
    return db.query(User).filter(User.id == user_id).first()


def create_user(
    db: Session,
    email: str,
    password: str,
    role: UserRole = UserRole.user,
) -> User:
    """Create and persist a new user.

    Normalises *email* to lowercase. Raises ValueError if the email is already
    taken (pre-check) or if a concurrent insert triggers an IntegrityError.
    """
    normalised_email = email.lower()

    if get_user_by_email(db, normalised_email) is not None:
        raise ValueError(f"Email already registered: {normalised_email}")

    user = User(
        email=normalised_email,
        password_hash=hash_password(password),
        role=role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError(f"Email already registered: {normalised_email}")

    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Return the User if credentials are valid, otherwise None.

    Returns None for both unknown email and wrong password so callers cannot
    distinguish the two failure modes (anti-enumeration).
    """
    user = get_user_by_email(db, email.lower())
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
