"""Auth models for user identity."""

from __future__ import annotations

from pydantic import BaseModel


class UserInfo(BaseModel):
    user_id: str
    session_id: str | None = None
    email: str | None = None
