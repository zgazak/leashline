"""Pack (household) models — app-layer only, not in engine."""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field


class Pack(BaseModel):
    id: str
    name: str
    mqtt_topic_prefix: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = ""


class PackMember(BaseModel):
    pack_id: str
    user_id: str
    role: str = "member"  # "owner" or "member"
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PackInvite(BaseModel):
    code: str
    pack_id: str
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    used_by: str | None = None
