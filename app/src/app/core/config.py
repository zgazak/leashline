"""Application configuration loaded from YAML."""

import os
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
    ca_certs: str | None = Field(default=None, description="Path to CA cert file for TLS")


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
    region: str = Field(default="us-west-2", description="AWS region")
    endpoint_url: str | None = Field(default=None, description="DynamoDB endpoint URL (for local testing)")


class StorageConfig(BaseModel):
    backend: str = Field(default="sqlite", description="Storage backend: sqlite or dynamodb")
    sqlite: SqliteStorageConfig = Field(default_factory=SqliteStorageConfig)
    dynamodb: DynamoStorageConfig = Field(default_factory=DynamoStorageConfig)


class VapidConfig(BaseModel):
    public_key: str = Field(default="", description="VAPID public key (base64url)")
    private_key: str = Field(default="", description="VAPID private key (base64url)")
    mailto: str = Field(default="mailto:admin@leashline.io", description="VAPID contact email")


class NotificationConfig(BaseModel):
    enabled: bool = Field(default=False, description="Enable push notifications")
    vapid: VapidConfig = Field(default_factory=VapidConfig)


class SecretsConfig(BaseModel):
    """Flat secrets loaded from a gitignored YAML file."""
    clerk_secret_key: str | None = None
    clerk_jwt_key: str | None = None
    mqtt_broker_host: str | None = None
    mqtt_username: str | None = None
    mqtt_password: str | None = None
    vapid_public_key: str | None = None
    vapid_private_key: str | None = None


class AppConfig(BaseModel):
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    db_path: str = Field(default="leashline.db", description="Deprecated — use storage.sqlite.path")
    storage: StorageConfig = Field(default_factory=StorageConfig)
    meshtastic: MeshtasticConfig = Field(default_factory=MeshtasticConfig)
    mqtt: MqttConfig = Field(default_factory=MqttConfig)
    detection: DetectionSettings = Field(default_factory=DetectionSettings)
    auth: AuthConfig = Field(default_factory=AuthConfig)
    notifications: NotificationConfig = Field(default_factory=NotificationConfig)
    secrets_path: str | None = Field(default=None, description="Path to secrets YAML file")

    @property
    def effective_db_path(self) -> str:
        """Return the SQLite path, preferring storage.sqlite.path over legacy db_path."""
        if self.storage.sqlite.path != "leashline.db":
            return self.storage.sqlite.path
        return self.db_path


def _load_secrets(secrets_path: str | None, config_dir: Path | None = None) -> SecretsConfig:
    """Load secrets from a YAML file if it exists."""
    if not secrets_path:
        return SecretsConfig()
    path = Path(secrets_path)
    if not path.is_absolute() and config_dir:
        path = config_dir / path
    if path.exists():
        with open(path) as f:
            data = yaml.safe_load(f) or {}
        return SecretsConfig(**data)
    return SecretsConfig()


def _apply_overrides(config: AppConfig) -> AppConfig:
    """Apply secrets file and env var overrides to config.

    Priority (highest wins): env vars > secrets file > YAML config.
    """
    # Load secrets file
    config_dir = Path(os.environ.get("CONFIG_PATH", "")).parent if os.environ.get("CONFIG_PATH") else None
    secrets = _load_secrets(config.secrets_path, config_dir)

    updates: dict = {}
    mqtt_updates: dict = {}
    auth_updates: dict = {}
    clerk_updates: dict = {}
    dynamo_updates: dict = {}
    vapid_updates: dict = {}

    # Secrets file values (middle priority)
    if secrets.mqtt_broker_host:
        mqtt_updates["broker_host"] = secrets.mqtt_broker_host
    if secrets.mqtt_username:
        mqtt_updates["username"] = secrets.mqtt_username
    if secrets.mqtt_password:
        mqtt_updates["password"] = secrets.mqtt_password
    if secrets.clerk_secret_key:
        clerk_updates["secret_key"] = secrets.clerk_secret_key
    if secrets.clerk_jwt_key:
        clerk_updates["jwt_key"] = secrets.clerk_jwt_key
    if secrets.vapid_public_key:
        vapid_updates["public_key"] = secrets.vapid_public_key
    if secrets.vapid_private_key:
        vapid_updates["private_key"] = secrets.vapid_private_key

    # Env var overrides (highest priority)
    if os.environ.get("DYNAMODB_TABLE"):
        dynamo_updates["table_prefix"] = os.environ["DYNAMODB_TABLE"]
    if os.environ.get("DYNAMODB_REGION") or os.environ.get("AWS_DEFAULT_REGION"):
        dynamo_updates["region"] = os.environ.get("DYNAMODB_REGION") or os.environ["AWS_DEFAULT_REGION"]
    if os.environ.get("MQTT_BROKER_HOST"):
        mqtt_updates["broker_host"] = os.environ["MQTT_BROKER_HOST"]
    if os.environ.get("MQTT_USERNAME"):
        mqtt_updates["username"] = os.environ["MQTT_USERNAME"]
    if os.environ.get("MQTT_PASSWORD"):
        mqtt_updates["password"] = os.environ["MQTT_PASSWORD"]
    if os.environ.get("CLERK_SECRET_KEY"):
        clerk_updates["secret_key"] = os.environ["CLERK_SECRET_KEY"]
    if os.environ.get("CLERK_JWT_KEY"):
        clerk_updates["jwt_key"] = os.environ["CLERK_JWT_KEY"]
    if os.environ.get("VAPID_PUBLIC_KEY"):
        vapid_updates["public_key"] = os.environ["VAPID_PUBLIC_KEY"]
    if os.environ.get("VAPID_PRIVATE_KEY"):
        vapid_updates["private_key"] = os.environ["VAPID_PRIVATE_KEY"]

    # Build updated config
    if mqtt_updates:
        updates["mqtt"] = config.mqtt.model_copy(update=mqtt_updates)
    if clerk_updates:
        auth_updates["clerk"] = config.auth.clerk.model_copy(update=clerk_updates)
    if auth_updates:
        updates["auth"] = config.auth.model_copy(update=auth_updates)
    if dynamo_updates:
        storage_dynamo = config.storage.dynamodb.model_copy(update=dynamo_updates)
        updates["storage"] = config.storage.model_copy(update={"dynamodb": storage_dynamo})
    if vapid_updates:
        notif_vapid = config.notifications.vapid.model_copy(update=vapid_updates)
        updates["notifications"] = config.notifications.model_copy(update={"vapid": notif_vapid})

    if updates:
        return config.model_copy(update=updates)
    return config


def load_config(path: Path | None = None) -> AppConfig:
    """Load config from a YAML file, falling back to defaults.

    Override chain: YAML config < secrets file < env vars.
    """
    # CONFIG_PATH env var as fallback
    if path is None:
        env_path = os.environ.get("CONFIG_PATH")
        if env_path:
            path = Path(env_path)

    if path and path.exists():
        with open(path) as f:
            data = yaml.safe_load(f) or {}
        config = AppConfig(**data)
    else:
        config = AppConfig()

    return _apply_overrides(config)
