"""Meshtastic listener — subscribes to position packets and bridges to the async EventBus."""

from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING

from app.listener.connection import MeshtasticConnection
from app.listener.connection_state import ConnectionState
from app.listener.packet_parser import parse_position_packet

if TYPE_CHECKING:
    from app.core.events import EventBus

logger = logging.getLogger(__name__)


class MeshtasticListener:
    """Listens for Meshtastic position packets and publishes TrackPoints to the EventBus.

    The meshtastic library uses threads for callbacks, so we bridge into
    the async event loop via asyncio.run_coroutine_threadsafe.
    """

    def __init__(self, connection: MeshtasticConnection, event_bus: EventBus, loop: asyncio.AbstractEventLoop) -> None:
        self._connection = connection
        self._event_bus = event_bus
        self._loop = loop
        self._callback = None
        self._running = False

    @property
    def running(self) -> bool:
        return self._running

    @property
    def state(self) -> ConnectionState:
        return self._connection.state

    @property
    def connection(self) -> MeshtasticConnection:
        return self._connection

    def _subscribe(self) -> None:
        """Subscribe to meshtastic position packets via pubsub.

        Call after the connection is already open.
        """
        from pubsub import pub

        def on_receive(packet, interface=None):
            track_point = parse_position_packet(packet, interface)
            if track_point:
                logger.debug("Received position from %s", track_point.device_id)
                asyncio.run_coroutine_threadsafe(self._event_bus.publish("positions", track_point), self._loop)

        self._callback = on_receive
        pub.subscribe(on_receive, "meshtastic.receive.position")
        self._running = True
        logger.info("Meshtastic listener started")

    def start(self) -> None:
        """Connect to the device and start receiving packets."""
        self._connection.connect()
        self._subscribe()

    def stop(self) -> None:
        """Disconnect from the device and unsubscribe callbacks."""
        if self._callback:
            try:
                from pubsub import pub

                pub.unsubscribe(self._callback, "meshtastic.receive.position")
            except Exception:
                logger.debug("Error unsubscribing callback", exc_info=True)
            self._callback = None

        self._connection.close()
        self._running = False
        logger.info("Meshtastic listener stopped")

    def restart(self, new_connection: MeshtasticConnection) -> None:
        """Stop the current connection and start a new one."""
        self.stop()
        self._connection = new_connection
        self.start()
