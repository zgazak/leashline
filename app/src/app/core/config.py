"""Application configuration loaded from YAML."""

from pathlib import Path

import yaml
from pydantic import BaseModel, Field


class MeshtasticConfig(BaseModel):
    connection_type: str = Field(default="auto", description="auto, serial, tcp, ble, or mqtt")
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


class ClerkConfig(BaseModel):
    secret_key: str = Field(default="", description="Clerk secret key")
    jwt_key: str = Field(default="", description="Clerk JWT verification key (optional)")


class AuthConfig(BaseModel):
    enabled: bool = Field(default=False, description="Enable authentication")
    dev_mode: bool = Field(default=False, description="Use synthetic dev user instead of Clerk")
    dev_user_id: str = Field(default="dev-user", description="User ID for dev mode")
    clerk: ClerkConfig = Field(default_factory=ClerkConfig)


class SqliteStorageConfig(BaseModel):
    path: str = Field(default="leashline.db", description="Path to SQLite database file")


class DynamoStorageConfig(BaseModel):
    table_prefix: str = Field(default="leashline", description="DynamoDB table name prefix")
    region: str = Field(default="us-east-1", description="AWS region")


class StorageConfig(BaseModel):
    backend: str = Field(default="sqlite", description="Storage backend: sqlite or dynamodb")
    sqlite: SqliteStorageConfig = Field(default_factory=SqliteStorageConfig)
    dynamodb: DynamoStorageConfig = Field(default_factory=DynamoStorageConfig)


class AppConfig(BaseModel):
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    db_path: str = Field(default="leashline.db", description="Deprecated — use storage.sqlite.path")
    storage: StorageConfig = Field(default_factory=StorageConfig)
    meshtastic: MeshtasticConfig = Field(default_factory=MeshtasticConfig)
    mqtt: MqttConfig = Field(default_factory=MqttConfig)
    detection: DetectionSettings = Field(default_factory=DetectionSettings)
    auth: AuthConfig = Field(default_factory=AuthConfig)

    @property
    def effective_db_path(self) -> str:
        """Return the SQLite path, preferring storage.sqlite.path over legacy db_path."""
        if self.storage.sqlite.path != "leashline.db":
            return self.storage.sqlite.path
        return self.db_path


def load_config(path: Path | None = None) -> AppConfig:
    """Load config from a YAML file, falling back to defaults."""
    if path and path.exists():
        with open(path) as f:
            data = yaml.safe_load(f) or {}
        return AppConfig(**data)
    return AppConfig()
