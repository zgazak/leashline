"""MQTT listener — subscribes to Meshtastic MQTT topics and bridges to the async EventBus."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING

import paho.mqtt.client as mqtt

from app.listener.connection_state import ConnectionState, ConnectionStatus
from app.listener.mqtt_packet_parser import parse_mqtt_json_packet, parse_mqtt_protobuf_packet

if TYPE_CHECKING:
    from app.core.events import EventBus

logger = logging.getLogger(__name__)


def extract_pack_id(topic: str) -> str | None:
    """Extract pack_id from topic like 'leashline/{pack_id}/2/json/...'

    Returns None for non-leashline topics (e.g. msh/+/2/json/#).
    """
    parts = topic.split("/")
    if len(parts) >= 2 and parts[0] == "leashline":
        return parts[1]
    return None


class MqttListener:
    """Subscribes to Meshtastic MQTT topics and publishes TrackPoints to the EventBus.

    Uses paho-mqtt's loop_start() for a background thread, bridging into
    the async event loop via asyncio.run_coroutine_threadsafe (same pattern
    as MeshtasticListener).
    """

    def __init__(
        self,
        event_bus: EventBus,
        loop: asyncio.AbstractEventLoop,
        broker_host: str = "localhost",
        broker_port: int = 1883,
        username: str | None = None,
        password: str | None = None,
        topic: str = "msh/+/2/json/#",
        tls_enabled: bool = False,
    ) -> None:
        self._event_bus = event_bus
        self._loop = loop
        self._broker_host = broker_host
        self._broker_port = broker_port
        self._username = username
        self._password = password
        self._topic = topic
        self._tls_enabled = tls_enabled
        self._running = False
        self._state = ConnectionState(status=ConnectionStatus.disconnected, connection_type="mqtt")
        self._client: mqtt.Client | None = None

    @property
    def running(self) -> bool:
        return self._running

    @property
    def state(self) -> ConnectionState:
        return self._state

    def _set_state(self, status: ConnectionStatus, detail: str | None = None) -> None:
        self._state = ConnectionState(
            status=status,
            connection_type="mqtt",
            detail=detail,
            since=datetime.now(timezone.utc),
        )
        self._event_bus.publish_nowait("connection", self._state)

    def _on_connect(self, client: mqtt.Client, userdata, flags, reason_code, properties=None) -> None:
        """Called when the MQTT connection is established (or reconnected)."""
        if reason_code == 0:
            logger.info("MQTT connected to %s:%d", self._broker_host, self._broker_port)
            client.subscribe(self._topic)
            logger.info("MQTT subscribed to %s", self._topic)
            self._set_state(ConnectionStatus.connected, detail=f"{self._broker_host}:{self._broker_port}")
        else:
            logger.warning("MQTT connection failed: reason_code=%s", reason_code)
            self._set_state(ConnectionStatus.error, detail=f"Connection refused: {reason_code}")

    def _on_disconnect(self, client: mqtt.Client, userdata, flags, reason_code, properties=None) -> None:
        """Called when disconnected from the broker."""
        if self._running:
            logger.warning("MQTT disconnected (reason_code=%s), will auto-reconnect", reason_code)
            self._set_state(ConnectionStatus.connecting, detail="Reconnecting...")
        else:
            logger.info("MQTT disconnected")
            self._set_state(ConnectionStatus.disconnected)

    def _on_message(self, client: mqtt.Client, userdata, msg: mqtt.MQTTMessage) -> None:
        """Called for each received MQTT message."""
        topic = msg.topic
        payload = msg.payload

        # Detect format from topic path: /json/ → JSON, /e/ → protobuf
        if "/json/" in topic:
            track_point = parse_mqtt_json_packet(payload, topic)
        elif "/e/" in topic:
            track_point = parse_mqtt_protobuf_packet(payload)
        else:
            logger.debug("MQTT: unknown topic format: %s", topic)
            return

        if track_point:
            logger.debug("MQTT: received position from %s", track_point.device_id)

            # Extract pack_id from topic for per-pack routing
            pack_id = extract_pack_id(topic)
            if pack_id:
                envelope = {"pack_id": pack_id, "data": track_point}
            else:
                # Non-leashline topic (legacy msh/ format) → local pack
                envelope = {"pack_id": "local", "data": track_point}

            asyncio.run_coroutine_threadsafe(
                self._event_bus.publish("positions", envelope),
                self._loop,
            )

    def start(self) -> None:
        """Connect to the MQTT broker and start receiving messages."""
        self._set_state(ConnectionStatus.connecting, detail=f"{self._broker_host}:{self._broker_port}")

        self._client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

        if self._username:
            self._client.username_pw_set(self._username, self._password)

        if self._tls_enabled:
            self._client.tls_set()

        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message

        self._client.connect_async(self._broker_host, self._broker_port)
        self._client.loop_start()
        self._running = True
        logger.info("MQTT listener started (broker=%s:%d, topic=%s)", self._broker_host, self._broker_port, self._topic)

    def stop(self) -> None:
        """Disconnect from the broker and stop the background loop."""
        self._running = False
        if self._client:
            self._client.loop_stop()
            self._client.disconnect()
            self._client = None
        self._set_state(ConnectionStatus.disconnected)
        logger.info("MQTT listener stopped")
