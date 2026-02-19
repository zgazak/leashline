"""Notification channels — abstraction for push delivery backends."""

from __future__ import annotations

import asyncio
import logging
from abc import ABC, abstractmethod

from engine.models.alert import Alert

from app.notifications.models import PushSubscription

logger = logging.getLogger(__name__)


class NotificationChannel(ABC):
    """Base class for notification delivery channels."""

    @abstractmethod
    async def send(
        self, alert: Alert, subscriptions: list[PushSubscription]
    ) -> list[str]:
        """Send a notification to the given subscriptions.

        Returns a list of subscription IDs that are expired/invalid
        and should be removed from storage.
        """


class WebPushChannel(NotificationChannel):
    """Web Push (VAPID) notification channel using pywebpush."""

    def __init__(self, vapid_private_key: str, vapid_claims: dict) -> None:
        self._private_key = vapid_private_key
        self._claims = vapid_claims

    async def send(
        self, alert: Alert, subscriptions: list[PushSubscription]
    ) -> list[str]:
        expired_ids: list[str] = []
        loop = asyncio.get_running_loop()

        payload = _build_payload(alert)

        for sub in subscriptions:
            try:
                await loop.run_in_executor(
                    None,
                    self._send_one,
                    sub,
                    payload,
                )
            except _ExpiredSubscription:
                expired_ids.append(sub.id)
            except Exception:
                logger.warning("Web push failed for %s", sub.endpoint, exc_info=True)

        return expired_ids

    def _send_one(self, sub: PushSubscription, payload: str) -> None:
        from pywebpush import WebPushException, webpush

        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {"p256dh": sub.keys.p256dh, "auth": sub.keys.auth},
        }
        try:
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=self._private_key,
                vapid_claims=self._claims,
            )
        except WebPushException as e:
            if hasattr(e, "response") and e.response is not None:
                status = e.response.status_code
                if status in (404, 410):
                    raise _ExpiredSubscription from e
            raise


class _ExpiredSubscription(Exception):
    pass


def _build_payload(alert: Alert) -> str:
    """Build a JSON payload for the push notification."""
    import json

    title = "Leashline Alert"
    body = alert.message or f"{alert.type.value} for device {alert.device_id}"

    if alert.type.value == "escape_detected":
        title = "Escape Detected!"
    elif alert.type.value == "geofence_breach":
        title = "Geofence Breach"
    elif alert.type.value == "signal_lost":
        title = "Signal Lost"

    return json.dumps({"title": title, "body": body, "alertId": alert.id})
