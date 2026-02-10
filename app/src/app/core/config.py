"""Application configuration loaded from YAML."""

from pathlib import Path

import yaml
from pydantic import BaseModel, Field


class MeshtasticConfig(BaseModel):
    connection_type: str = Field(default="auto", description="auto, serial, tcp, or ble")
    serial_port: str = Field(default="/dev/ttyUSB0")
    tcp_host: str = Field(default="localhost")
    tcp_port: int = Field(default=4403)
    ble_address: str | None = Field(default=None, description="BLE MAC address for Meshtastic device")


class MqttConfig(BaseModel):
    broker_host: str = Field(default="localhost", description="MQTT broker hostname")
    broker_port: int = Field(default=1883, description="MQTT broker port")
    username: str | None = Field(default=None, description="MQTT username")
    password: str | None = Field(default=None, description="MQTT password")
    topic: str = Field(default="msh/+/2/json/#", description="MQTT topic filter")
    tls_enabled: bool = Field(default=False, description="Enable TLS for MQTT connection")


class DetectionSettings(BaseModel):
    warning_buffer_m: float = 20.0
    breach_confirm_s: float = 10.0
    scatter_threshold_m: float = 50.0
    max_history: int = 20


class AppConfig(BaseModel):
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    db_path: str = Field(default="leashline.db")
    meshtastic: MeshtasticConfig = Field(default_factory=MeshtasticConfig)
    mqtt: MqttConfig = Field(default_factory=MqttConfig)
    detection: DetectionSettings = Field(default_factory=DetectionSettings)


def load_config(path: Path | None = None) -> AppConfig:
    """Load config from a YAML file, falling back to defaults."""
    if path and path.exists():
        with open(path) as f:
            data = yaml.safe_load(f) or {}
        return AppConfig(**data)
    return AppConfig()
