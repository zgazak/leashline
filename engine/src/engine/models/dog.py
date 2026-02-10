"""Dog and collar device models."""

from datetime import datetime

from pydantic import BaseModel, Field


class CollarDevice(BaseModel, frozen=True):
    """A Meshtastic device attached to a dog collar."""

    device_id: str = Field(description="Meshtastic node number (hex)")
    long_name: str = Field(default="", description="Meshtastic long name")
    short_name: str = Field(default="", description="Meshtastic short name")
    hw_model: str = Field(default="", description="Hardware model string")
    last_seen: datetime | None = Field(default=None, description="Last time a packet was received")


class DogProfile(BaseModel, frozen=True):
    """A tracked dog profile."""

    id: str = Field(description="Unique dog identifier")
    name: str = Field(description="Dog's name")
    device_id: str | None = Field(default=None, description="Assigned collar device ID")
    geofence_ids: list[str] = Field(default_factory=list, description="Active geofence IDs for this dog")
    notes: str = Field(default="")
    created_at: datetime = Field(default_factory=datetime.utcnow)
