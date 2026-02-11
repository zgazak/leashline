"""Leashline FastAPI application entry point."""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import click
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import AppConfig, load_config
from app.core.events import EventBus

logger = logging.getLogger(__name__)

# Module-level state (set during lifespan)
_storage = None
_event_bus = None
_config = None
_connection_manager = None


def get_storage():
    return _storage


def get_event_bus():
    return _event_bus


def get_config():
    return _config


def get_connection_manager():
    return _connection_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown of background services."""
    global _storage, _event_bus, _config, _connection_manager

    from app.listener.connection_manager import ConnectionManager

    _config = app.state.config
    _event_bus = EventBus()

    # Initialize storage backend
    if _config.storage.backend == "dynamodb":
        from app.storage.dynamodb import DynamoStorage
        _storage = await DynamoStorage.create(
            table_prefix=_config.storage.dynamodb.table_prefix,
            region=_config.storage.dynamodb.region,
            endpoint_url=_config.storage.dynamodb.endpoint_url,
        )
    else:
        from app.storage.sqlite import SqliteStorage
        _storage = await SqliteStorage.create(_config.effective_db_path)

    # Start detection processor
    from app.processor import run_detection_processor
    from engine.detection.escape import DetectionConfig

    det_cfg = DetectionConfig(
        warning_buffer_m=_config.detection.warning_buffer_m,
        breach_confirm_s=_config.detection.breach_confirm_s,
        scatter_threshold_m=_config.detection.scatter_threshold_m,
        max_history=_config.detection.max_history,
    )
    processor_task = asyncio.create_task(run_detection_processor(_event_bus, _storage, det_cfg))

    # Connection manager
    loop = asyncio.get_running_loop()
    _connection_manager = ConnectionManager(_event_bus, loop)

    try:
        if _config.meshtastic.connection_type == "mqtt":
            _connection_manager.connect(
                connection_type="mqtt",
                broker_host=_config.mqtt.broker_host,
                broker_port=_config.mqtt.broker_port,
                mqtt_username=_config.mqtt.username,
                mqtt_password=_config.mqtt.password,
                mqtt_topic=_config.mqtt.topic,
                mqtt_tls=_config.mqtt.tls_enabled,
            )
        else:
            _connection_manager.connect(
                connection_type=_config.meshtastic.connection_type,
                serial_port=_config.meshtastic.serial_port,
                tcp_host=_config.meshtastic.tcp_host,
                tcp_port=_config.meshtastic.tcp_port,
                ble_address=_config.meshtastic.ble_address,
            )
    except Exception:
        logger.warning("Listener not started (device/broker not available)", exc_info=True)

    logger.info("Leashline started on %s:%d", _config.host, _config.port)

    yield

    # Shutdown
    processor_task.cancel()
    try:
        await processor_task
    except asyncio.CancelledError:
        pass

    _connection_manager.disconnect()
    await _storage.close()
    logger.info("Leashline stopped")


def create_app(config: AppConfig | None = None) -> FastAPI:
    """Create and configure the FastAPI application."""
    if config is None:
        config = load_config()

    app = FastAPI(title="Leashline", version="0.1.0", lifespan=lifespan)
    app.state.config = config

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://localhost:3001",
            "https://leashline.io",
            "https://www.leashline.io",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.api import alerts, connection, devices, dogs, geofences, packs, positions, root, stream

    app.include_router(root.router)
    app.include_router(dogs.router)
    app.include_router(geofences.router)
    app.include_router(positions.router)
    app.include_router(alerts.router)
    app.include_router(devices.router)
    app.include_router(stream.router)
    app.include_router(connection.router)
    app.include_router(packs.router)

    return app


@click.command()
@click.option("--config", "config_path", type=click.Path(exists=True, path_type=Path), default=None, help="Path to YAML config file")
@click.option("--host", default=None, help="Bind host")
@click.option("--port", default=None, type=int, help="Bind port")
def main(config_path: Path | None, host: str | None, port: int | None):
    """Start the Leashline server."""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

    config = load_config(config_path)
    if host:
        config = config.model_copy(update={"host": host})
    if port:
        config = config.model_copy(update={"port": port})

    app = create_app(config)
    uvicorn.run(app, host=config.host, port=config.port)


if __name__ == "__main__":
    import sys
    sys.modules["app.main"] = sys.modules[__name__]
    main()
