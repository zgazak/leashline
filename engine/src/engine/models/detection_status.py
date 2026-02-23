"""Per-dog detection pipeline status snapshot."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class DetectionStatus(BaseModel, frozen=True):
    """Headline-level snapshot of the detection pipeline state for one dog."""

    device_id: str
    dog_id: str | None = None
    altitude_rejected: int = 0
    jump_rejected: int = 0
    fixes_evaluated: int = 0
    breach_window: list[bool] = Field(default_factory=list)
    breach_count: int = 0
    breach_needed: int = 3
    noise_suppressed: bool = False
    last_evaluated: datetime | None = None
