"""GPS noise profile model — learned per-device GPS uncertainty."""

from datetime import datetime

from pydantic import BaseModel, Field


class NoiseProfile(BaseModel, frozen=True):
    """Learned GPS noise characteristics for a specific device.

    Built from stationary periods where the device isn't moving but GPS
    positions still jitter. The noise_radius_m represents the RMS scatter
    when the device is known to be stationary.
    """

    device_id: str = Field(description="Device this profile belongs to")
    noise_radius_m: float = Field(description="Learned RMS scatter when stationary (meters)")
    sample_count: int = Field(description="Total stationary points contributed")
    last_updated: datetime = Field(description="When the profile was last updated")
    confidence: float = Field(default=0.0, description="min(1.0, sample_count / 50)")
