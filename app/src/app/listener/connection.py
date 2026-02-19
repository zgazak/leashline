"""Meshtastic device connection manager."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Callable

from app.listener.connection_state import BLEScanResult, ConnectionState, ConnectionStatus

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


class MeshtasticConnection:
    """Manages a serial/TCP/BLE connection to a Meshtastic device."""

    def __init__(
        self,
        connection_type: str = "serial",
        serial_port: str = "/dev/ttyUSB0",
        tcp_host: str = "localhost",
        tcp_port: int = 4403,
        ble_address: str | None = None,
        on_state_change: Callable[[ConnectionState], None] | None = None,
    ) -> None:
        self.connection_type = connection_type
        self.serial_port = serial_port
        self.tcp_host = tcp_host
        self.tcp_port = tcp_port
        self.ble_address = ble_address
        self._interface = None
        self._on_state_change = on_state_change
        self._state = ConnectionState(
            status=ConnectionStatus.disconnected,
            connection_type=connection_type,
        )

    def _set_state(self, status: ConnectionStatus, detail: str | None = None) -> None:
        self._state = ConnectionState(
            status=status,
            connection_type=self.connection_type,
            detail=detail,
            since=datetime.now(timezone.utc),
        )
        if self._on_state_change:
            self._on_state_change(self._state)

    @property
    def state(self) -> ConnectionState:
        return self._state

    @staticmethod
    def detect() -> tuple[str, dict]:
        """Probe for an available Meshtastic device.

        Tries serial ports first (fastest, most common at-home setup), then BLE.
        Returns (connection_type, params) or ("none", {}) if nothing found.
        """
        # 1. Serial — check for known Meshtastic USB devices
        try:
            import meshtastic.util

            ports = meshtastic.util.findPorts()
            if ports:
                port = ports[0]
                logger.info("Auto-detect: found serial device on %s", port)
                return "serial", {"serial_port": port}
        except Exception:
            logger.debug("Auto-detect: serial probe failed", exc_info=True)

        # 2. BLE — scan for nearby Meshtastic devices
        try:
            results = MeshtasticConnection.scan_ble()
            if results:
                best = results[0]
                logger.info("Auto-detect: found BLE device %s (%s)", best.name, best.address)
                return "ble", {"ble_address": best.address}
        except Exception:
            logger.debug("Auto-detect: BLE scan failed", exc_info=True)

        logger.info("Auto-detect: no Meshtastic devices found")
        return "none", {}

    def connect(self):
        """Open the connection to the Meshtastic device. Returns the interface."""
        if self.connection_type == "auto":
            return self._connect_auto()

        self._set_state(ConnectionStatus.connecting)

        try:
            if self.connection_type == "serial":
                import meshtastic.serial_interface

                logger.info("Connecting to Meshtastic via serial: %s", self.serial_port)
                self._interface = meshtastic.serial_interface.SerialInterface(self.serial_port)

            elif self.connection_type == "tcp":
                import meshtastic.tcp_interface

                logger.info("Connecting to Meshtastic via TCP: %s:%d", self.tcp_host, self.tcp_port)
                self._interface = meshtastic.tcp_interface.TCPInterface(
                    hostname=self.tcp_host, portNumber=self.tcp_port
                )

            elif self.connection_type == "ble":
                import meshtastic.ble_interface

                address = self.ble_address
                if not address:
                    raise ValueError("BLE address is required for BLE connections")
                logger.info("Connecting to Meshtastic via BLE: %s", address)
                self._interface = meshtastic.ble_interface.BLEInterface(address=address)

            else:
                raise ValueError(f"Unsupported connection type: {self.connection_type}")

            self._set_state(ConnectionStatus.connected)
            return self._interface

        except Exception as e:
            self._set_state(ConnectionStatus.error, detail=str(e))
            raise

    def _connect_auto(self):
        """Auto-detect a device and connect to it."""
        self._set_state(ConnectionStatus.connecting, detail="Scanning for devices...")

        detected_type, params = self.detect()
        if detected_type == "none":
            self._set_state(ConnectionStatus.disconnected, detail="No devices found")
            return None

        # Update our own fields so state reflects what we actually connected to
        self.connection_type = detected_type
        if detected_type == "serial":
            self.serial_port = params["serial_port"]
        elif detected_type == "ble":
            self.ble_address = params["ble_address"]

        return self.connect()

    def close(self) -> None:
        if self._interface:
            try:
                self._interface.close()
            except Exception:
                logger.debug("Error closing interface", exc_info=True)
            self._interface = None
        self._set_state(ConnectionStatus.disconnected)

    @property
    def interface(self):
        return self._interface

    @staticmethod
    def scan_ble() -> list[BLEScanResult]:
        """Scan for nearby BLE Meshtastic devices. Blocking call."""
        try:
            from meshtastic.ble_interface import BLEInterface

            devices = BLEInterface.scan()
            results = []
            for d in devices:
                results.append(
                    BLEScanResult(
                        address=d.address,
                        name=d.name,
                        rssi=getattr(d, "rssi", None),
                    )
                )
            return results
        except Exception as e:
            logger.warning("BLE scan failed: %s", e)
            raise
