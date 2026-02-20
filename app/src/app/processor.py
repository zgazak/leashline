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

# In-memory registry of recently seen devices: {(pack_id, device_id): {...}}
_recent_devices: dict[tuple[str, str], dict] = {}

# How long to keep a device in the "nearby" list (seconds)
_DEVICE_TTL_S = 600


def get_nearby_devices(pack_id: str) -> list[dict]:
    """Return recently-seen devices for a pack, sorted by last_seen desc."""
    now = datetime.now(timezone.utc)
    result = []
    expired = []
    for key, info in _recent_devices.items():
        pid, device_id = key
        age = (now - info["last_seen"]).total_seconds()
        if age > _DEVICE_TTL_S:
            expired.append(key)
            continue
        if pid == pack_id:
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

            # Support envelope format {"pack_id": ..., "data": TrackPoint}
            # or raw TrackPoint (from MQTT listener — look up pack by device)
            if isinstance(message, dict) and "pack_id" in message:
                pack_id = message["pack_id"]
                track_point = message["data"]
            else:
                track_point = message
                pack_id = await storage.find_pack_by_device_id(track_point.device_id)
                if pack_id is None:
                    logger.debug("No pack found for device %s, skipping", track_point.device_id)
                    continue

            # Track device sighting (even if not assigned to a dog)
            _recent_devices[(pack_id, track_point.device_id)] = {
                "last_seen": datetime.now(timezone.utc),
                "lat": track_point.reading.lat,
                "lon": track_point.reading.lon,
                "rssi": track_point.rssi,
                "snr": track_point.snr,
            }

            # Store position
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
                    await storage.alerts.put(alert.id, alert, pack_id)
                    await event_bus.publish("alerts", {"pack_id": pack_id, "data": alert})
                    logger.info("Alert: %s", alert.message)
    except asyncio.CancelledError:
        logger.info("Detection processor stopped")
        event_bus.unsubscribe("positions", queue)
