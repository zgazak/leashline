"""Notification service — filters alert types and dispatches to channels."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from engine.models.alert import Alert, AlertType

if TYPE_CHECKING:
    from app.notifications.channels import NotificationChannel
    from app.notifications.models import PushSubscription

logger = logging.getLogger(__name__)

# Only these alert types trigger push notifications
PUSH_ALERT_TYPES: frozenset[AlertType] = frozenset({
    AlertType.escape_detected,
    AlertType.geofence_breach,
    AlertType.signal_lost,
    AlertType.return_detected,
})


class NotificationService:
    """Holds channels and dispatches alerts to them."""

    def __init__(self, channels: list[NotificationChannel]) -> None:
        self._channels = channels

    def should_notify(self, alert: Alert) -> bool:
        return alert.type in PUSH_ALERT_TYPES

    async def notify(
        self, alert: Alert, subscriptions: list[PushSubscription]
    ) -> list[str]:
        """Send alert to all channels. Returns expired subscription IDs."""
        if not self.should_notify(alert):
            return []

        if not subscriptions:
            return []

        expired: list[str] = []
        for channel in self._channels:
            expired.extend(await channel.send(alert, subscriptions))
        return expired
