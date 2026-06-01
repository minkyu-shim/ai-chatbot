"""Auth endpoints: signup, login, me, logout."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token
from app.db.base import get_db
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserPublic
from app.services.auth_service import authenticate_user, create_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _build_token_response(user) -> TokenResponse:
    """Construct a TokenResponse for *user*."""
    token = create_access_token(subject=user.id, role=user.role.value)
    return TokenResponse(
        access_token=token,
        user=UserPublic.model_validate(user),
    )


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Register a new user and return a token."""
    try:
        user = create_user(db, email=body.email, password=body.password)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    return _build_token_response(user)


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Authenticate and return a token."""
    user = authenticate_user(db, email=body.email, password=body.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _build_token_response(user)


@router.get("/me", response_model=UserPublic, status_code=status.HTTP_200_OK)
def me(current_user=Depends(get_current_user)) -> UserPublic:
    """Return the profile of the authenticated user."""
    return UserPublic.model_validate(current_user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(current_user=Depends(get_current_user)) -> None:
    """Stateless logout — client must discard the token."""
    return None
