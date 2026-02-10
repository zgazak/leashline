"""Detection processor — background async task that bridges positions to escape detection."""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import TYPE_CHECKING

from engine.detection.escape import DetectionConfig, EscapeDetector

if TYPE_CHECKING:
    from app.core.events import EventBus
    from app.storage.sqlite import SqliteStorage

logger = logging.getLogger(__name__)


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
            track_point = await queue.get()

            # Store position
            pos_id = uuid.uuid4().hex[:12]
            await storage.positions.put(pos_id, track_point)

            # Publish position to SSE subscribers
            await event_bus.publish("positions_sse", track_point)

            # Look up dog by device_id
            dogs = await storage.dogs.list_all()
            dog = next((d for d in dogs if d.device_id == track_point.device_id), None)

            if dog is None:
                continue

            # Enrich track point with dog_id
            from engine.models.position import TrackPoint

            enriched = TrackPoint(**{**track_point.model_dump(), "dog_id": dog.id})

            # Check against all active geofences for this dog
            for gf_id in dog.geofence_ids:
                geofence = await storage.geofences.get(gf_id)
                if geofence is None or not geofence.enabled:
                    continue

                alert = detector.evaluate(enriched, geofence)
                if alert:
                    await storage.alerts.put(alert.id, alert)
                    await event_bus.publish("alerts", alert)
                    logger.info("Alert: %s", alert.message)
    except asyncio.CancelledError:
        logger.info("Detection processor stopped")
        event_bus.unsubscribe("positions", queue)
