from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class EntryMessageOut(BaseModel):
    id: int
    role: str
    content: str
    metadata: dict[str, Any] | None = Field(default=None, validation_alias="metadata_json")
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_validator("metadata", mode="before")
    @classmethod
    def _parse_metadata_json(cls, v: Any) -> dict[str, Any] | None:
        if v is None or v == "":
            return None
        if isinstance(v, dict):
            return v
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return None


class _WeatherMixin(BaseModel):
    weather: dict[str, Any] | None = Field(default=None, validation_alias="weather_json")

    @field_validator("weather", mode="before")
    @classmethod
    def _parse_weather_json(cls, v: Any) -> dict[str, Any] | None:
        if v is None or v == "":
            return None
        if isinstance(v, dict):
            return v
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return None


class EntryCreate(BaseModel):
    city: str = Field(min_length=1, max_length=120)
    mood: str = Field(min_length=1, max_length=120)
    outfit_worn: str | None = None
    entry_date: date | None = None

    @field_validator("city", "mood", mode="before")
    @classmethod
    def _strip_and_require_non_empty(cls, v: Any) -> str:
        if isinstance(v, str):
            stripped = v.strip()
            if not stripped:
                raise ValueError("must not be blank")
            return stripped
        return v


class EntryUpdate(BaseModel):
    outfit_worn: str | None = None
    reflection: str | None = None


class EntryOut(_WeatherMixin):
    id: int
    entry_date: date
    city: str
    mood: str
    outfit_worn: str | None
    photo_url: str | None
    reflection: str | None
    model: str
    created_at: datetime
    updated_at: datetime
    messages: list[EntryMessageOut] = []

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class EntrySummary(_WeatherMixin):
    id: int
    entry_date: date
    city: str
    mood: str
    photo_url: str | None
    created_at: datetime
    ai_preview: str | None = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
