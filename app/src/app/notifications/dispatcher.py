"""Background task that subscribes to EventBus alerts and dispatches push notifications."""

from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.events import EventBus
    from app.notifications.service import NotificationService

logger = logging.getLogger(__name__)


async def run_notification_dispatcher(
    event_bus: EventBus,
    storage,
    service: NotificationService,
) -> None:
    """Subscribe to 'alerts' topic and push notifications for each alert."""
    queue = event_bus.subscribe("alerts")
    logger.info("Push notification dispatcher started")

    try:
        while True:
            message = await queue.get()

            # Envelope format: {"pack_id": ..., "data": Alert}
            if isinstance(message, dict) and "pack_id" in message:
                pack_id = message["pack_id"]
                alert = message["data"]
            else:
                pack_id = "local"
                alert = message

            if not service.should_notify(alert):
                continue

            try:
                subscriptions = await storage.push_subscriptions.list_for_pack(pack_id)
            except Exception:
                logger.warning("Failed to load push subscriptions for pack %s", pack_id, exc_info=True)
                continue

            if not subscriptions:
                continue

            try:
                expired_ids = await service.notify(alert, subscriptions)
                # Clean up expired subscriptions
                for sub_id in expired_ids:
                    try:
                        await storage.push_subscriptions.delete_for_pack(sub_id, pack_id)
                        logger.info("Removed expired push subscription %s", sub_id)
                    except Exception:
                        logger.warning("Failed to remove expired subscription %s", sub_id, exc_info=True)
            except Exception:
                logger.warning("Notification dispatch failed for alert %s", alert.id, exc_info=True)

    except asyncio.CancelledError:
        logger.info("Push notification dispatcher stopped")
        event_bus.unsubscribe("alerts", queue)
