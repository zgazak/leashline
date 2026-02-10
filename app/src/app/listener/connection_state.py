"""Connection state models for tracking Meshtastic device connections."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


class ConnectionStatus(str, Enum):
    disconnected = "disconnected"
    connecting = "connecting"
    connected = "connected"
    error = "error"
    scanning = "scanning"


class ConnectionState(BaseModel):
    status: ConnectionStatus = ConnectionStatus.disconnected
    connection_type: str | None = None
    detail: str | None = None
    since: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BLEScanResult(BaseModel):
    address: str
    name: str | None = None
    rssi: int | None = None
