"""Device telemetry models — app-layer only, not in engine."""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field


class DeviceTelemetry(BaseModel):
    device_id: str
    battery_level: int | None = None
    voltage: float | None = None
    uptime_seconds: int | None = None
    channel_utilization: float | None = None
    air_util_tx: float | None = None
    rssi: int | None = None
    snr: float | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
