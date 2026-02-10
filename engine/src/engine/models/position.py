"""GPS position models."""

from datetime import datetime

from pydantic import BaseModel, Field


class GpsReading(BaseModel, frozen=True):
    """A single GPS fix from a collar device."""

    lat: float = Field(description="Latitude in decimal degrees")
    lon: float = Field(description="Longitude in decimal degrees")
    alt: float | None = Field(default=None, description="Altitude in meters above sea level")
    speed: float | None = Field(default=None, description="Speed in m/s")
    heading: float | None = Field(default=None, description="Heading in degrees (0-360)")
    sats: int | None = Field(default=None, description="Number of satellites in view")
    pdop: float | None = Field(default=None, description="Position dilution of precision")
    hdop: float | None = Field(default=None, description="Horizontal dilution of precision")
    timestamp: datetime = Field(description="GPS fix timestamp (from device)")


class TrackPoint(BaseModel, frozen=True):
    """A GPS reading enriched with device and reception metadata."""

    device_id: str = Field(description="Meshtastic device ID (hex node num)")
    dog_id: str | None = Field(default=None, description="Associated dog profile ID")
    reading: GpsReading
    received_at: datetime = Field(description="When the base station received this point")
    rssi: int | None = Field(default=None, description="Received signal strength indicator (dBm)")
    snr: float | None = Field(default=None, description="Signal-to-noise ratio (dB)")
