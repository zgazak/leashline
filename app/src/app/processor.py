"""Detection processor — background async task that bridges positions to escape detection."""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from engine.detection.escape import DetectionConfig, EscapeDetector

if TYPE_CHECKING:
    from app.core.events import EventBus
    from app.storage.sqlite import SqliteStorage

logger = logging.getLogger(__name__)

# In-memory registry of recently seen devices: {device_id: {...}}
# This is a global discovery list — not pack-scoped — so any user can
# discover and claim an unassigned collar heard via MQTT.
_recent_devices: dict[str, dict] = {}

# How long to keep a device in the "nearby" list (seconds)
_DEVICE_TTL_S = 600


def get_nearby_devices() -> list[dict]:
    """Return all recently-seen devices, sorted by last_seen desc."""
    now = datetime.now(timezone.utc)
    result = []
    expired = []
    for device_id, info in _recent_devices.items():
        age = (now - info["last_seen"]).total_seconds()
        if age > _DEVICE_TTL_S:
            expired.append(device_id)
            continue
        result.append({"device_id": device_id, **info})
    for key in expired:
        _recent_devices.pop(key, None)
    result.sort(key=lambda d: d["last_seen"], reverse=True)
    return result


async def run_detection_processor(
    event_bus: EventBus,
    storage: SqliteStorage,
    detection_config: DetectionConfig | None = None,
) -> None:
    """Read positions from the event bus, run escape detection, store results, publish alerts."""
    detector = EscapeDetector(detection_config)
    queue = event_bus.subscribe("positions")

    logger.info("Detection processor started")

    try:
        while True:
            message = await queue.get()

            # Extract track_point from envelope or raw message
            if isinstance(message, dict) and "pack_id" in message:
                track_point = message["data"]
            else:
                track_point = message

            # Track device sighting globally for discovery (even if not assigned to a dog)
            _recent_devices[track_point.device_id] = {
                "last_seen": datetime.now(timezone.utc),
                "lat": track_point.reading.lat,
                "lon": track_point.reading.lon,
                "rssi": track_point.rssi,
                "snr": track_point.snr,
            }

            # Resolve pack by device→dog ownership.
            # The MQTT topic pack_id (e.g. "local") is just a transport
            # detail — the real pack is whichever one has a dog assigned
            # to this device_id.
            pack_id = await storage.find_pack_by_device_id(track_point.device_id)
            if pack_id is None:
                logger.debug("No pack found for device %s, skipping", track_point.device_id)
                continue

            # Store position under the owning pack
            pos_id = uuid.uuid4().hex[:12]
            await storage.positions.put(pos_id, track_point, pack_id)

            # Publish position to SSE subscribers (with envelope)
            await event_bus.publish("positions_sse", {"pack_id": pack_id, "data": track_point})

            # Look up dog by device_id within this pack
            dogs = await storage.dogs.list_for_pack(pack_id)
            dog = next((d for d in dogs if d.device_id == track_point.device_id), None)

            if dog is None:
                continue

            # Enrich track point with dog_id
            from engine.models.position import TrackPoint

            enriched = TrackPoint(**{**track_point.model_dump(), "dog_id": dog.id})

            # Check against all active geofences for this dog
            for gf_id in dog.geofence_ids:
                geofence = await storage.geofences.get_for_pack(gf_id, pack_id)
                if geofence is None or not geofence.enabled:
                    continue
                if geofence.zone_type == "label":
                    continue

                alert = detector.evaluate(enriched, geofence)
                if alert:
                    # Replace raw dog_id with dog name in the message
                    from engine.models.alert import Alert as AlertModel

                    friendly_msg = alert.message.replace(dog.id, dog.name)
                    alert = AlertModel(**{**alert.model_dump(), "message": friendly_msg})

                    await storage.alerts.put(alert.id, alert, pack_id)
                    await event_bus.publish("alerts", {"pack_id": pack_id, "data": alert})
                    logger.info("Alert: %s", alert.message)
    except asyncio.CancelledError:
        logger.info("Detection processor stopped")
        event_bus.unsubscribe("positions", queue)


async def run_telemetry_processor(
    event_bus: EventBus,
    storage: SqliteStorage,
) -> None:
    """Read telemetry from the event bus, store latest per device, publish to SSE."""
    queue = event_bus.subscribe("telemetry")

    logger.info("Telemetry processor started")

    try:
        while True:
            message = await queue.get()

            if isinstance(message, dict) and "pack_id" in message:
                telemetry = message["data"]
            else:
                telemetry = message

            # Resolve pack by device→dog ownership
            pack_id = await storage.find_pack_by_device_id(telemetry.device_id)
            if pack_id is None:
                logger.debug("No pack found for device %s (telemetry), skipping", telemetry.device_id)
                continue

            # Upsert: use device_id as key so we always keep only the latest
            await storage.telemetry.put(telemetry.device_id, telemetry, pack_id)

            # Publish to SSE subscribers
            await event_bus.publish("telemetry_sse", {"pack_id": pack_id, "data": telemetry})
            logger.debug("Telemetry stored for device %s (pack=%s)", telemetry.device_id, pack_id)
    except asyncio.CancelledError:
        logger.info("Telemetry processor stopped")
        event_bus.unsubscribe("telemetry", queue)
