"""Pydantic schemas for auth endpoints."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(SignupRequest):
    pass


class UserPublic(BaseModel):
    id: int
    email: EmailStr
    role: Literal["admin", "user"]

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserPublic
