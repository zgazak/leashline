"""ConnectionManager — single point of control for Meshtastic connection lifecycle."""

from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING

from app.listener.connection import MeshtasticConnection
from app.listener.connection_state import BLEScanResult, ConnectionState, ConnectionStatus
from app.listener.meshtastic_listener import MeshtasticListener
from app.listener.mqtt_listener import MqttListener

if TYPE_CHECKING:
    from app.core.events import EventBus

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Owns the MeshtasticListener and manages connection lifecycle."""

    def __init__(self, event_bus: EventBus, loop: asyncio.AbstractEventLoop) -> None:
        self._event_bus = event_bus
        self._loop = loop
        self._listener: MeshtasticListener | MqttListener | None = None
        self._state = ConnectionState(status=ConnectionStatus.disconnected)

    @property
    def state(self) -> ConnectionState:
        if self._listener and self._listener.running:
            return self._listener.state
        return self._state

    def _on_state_change(self, state: ConnectionState) -> None:
        """Callback invoked by MeshtasticConnection on state transitions."""
        self._state = state
        self._event_bus.publish_nowait("connection", state)

    def connect(
        self,
        connection_type: str = "auto",
        serial_port: str = "/dev/ttyUSB0",
        tcp_host: str = "localhost",
        tcp_port: int = 4403,
        ble_address: str | None = None,
        broker_host: str = "localhost",
        broker_port: int = 1883,
        mqtt_username: str | None = None,
        mqtt_password: str | None = None,
        mqtt_topic: str = "msh/+/2/json/#",
        mqtt_tls: bool = False,
    ) -> None:
        """Create a new connection and start (or restart) the listener.

        When connection_type is "auto", probes serial then BLE and connects
        to the first device found. Stays disconnected (no error) if nothing found.

        When connection_type is "mqtt", creates an MqttListener instead.
        """
        # Stop any existing listener first
        if self._listener and self._listener.running:
            self._listener.stop()

        if connection_type == "mqtt":
            self._listener = MqttListener(
                event_bus=self._event_bus,
                loop=self._loop,
                broker_host=broker_host,
                broker_port=broker_port,
                username=mqtt_username,
                password=mqtt_password,
                topic=mqtt_topic,
                tls_enabled=mqtt_tls,
            )
            self._listener.start()
            return

        conn = MeshtasticConnection(
            connection_type=connection_type,
            serial_port=serial_port,
            tcp_host=tcp_host,
            tcp_port=tcp_port,
            ble_address=ble_address,
            on_state_change=self._on_state_change,
        )

        # For auto-detect, probe first — if nothing found, stay disconnected
        if connection_type == "auto":
            interface = conn.connect()  # handles detect internally, returns None if nothing
            if interface is None:
                self._state = conn.state
                return

            # Auto-detect succeeded and connected; subscribe to packets
            self._listener = MeshtasticListener(conn, self._event_bus, self._loop)
            self._listener._subscribe()
            return

        self._listener = MeshtasticListener(conn, self._event_bus, self._loop)
        self._listener.start()

    def disconnect(self) -> None:
        """Stop the listener and disconnect."""
        if self._listener and self._listener.running:
            self._listener.stop()
        self._state = ConnectionState(status=ConnectionStatus.disconnected)
        self._on_state_change(self._state)

    @staticmethod
    def scan_ble() -> list[BLEScanResult]:
        """Scan for BLE devices. Blocking — run in a thread pool."""
        return MeshtasticConnection.scan_ble()
