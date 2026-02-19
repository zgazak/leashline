"""Parse Meshtastic MQTT packets into engine TrackPoint models.

Meshtastic base stations publish to MQTT in two formats:
- JSON on topics like msh/region/2/json/LongFast/!hexid
- Protobuf on topics like msh/region/2/e/LongFast/!hexid
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from engine.models.position import GpsReading, TrackPoint

logger = logging.getLogger(__name__)


def parse_mqtt_json_packet(payload: bytes, topic: str = "") -> TrackPoint | None:
    """Parse a Meshtastic JSON MQTT message into a TrackPoint.

    The JSON format uses integer-encoded coordinates:
    - latitude_i / longitude_i: degrees × 1e7
    - ground_track: degrees × 100 (heading)
    - PDOP: value × 100

    The sender field contains the device ID (e.g. "!aabbccdd").
    """
    try:
        data = json.loads(payload)
    except (json.JSONDecodeError, UnicodeDecodeError):
        logger.debug("MQTT: failed to decode JSON payload")
        return None

    # Meshtastic JSON wraps position in payload
    msg_type = data.get("type")
    if msg_type != "position":
        return None

    payload_data = data.get("payload", {})
    if not payload_data:
        return None

    lat_i = payload_data.get("latitude_i")
    lon_i = payload_data.get("longitude_i")
    if lat_i is None or lon_i is None:
        return None

    lat = lat_i / 1e7
    lon = lon_i / 1e7

    # Device ID: use "from" (originating node) over "sender" (relay node)
    from_id = data.get("from")
    if from_id is not None:
        sender = f"!{from_id:08x}" if isinstance(from_id, int) else str(from_id)
    else:
        sender = data.get("sender", "unknown")
        if isinstance(sender, int):
            sender = f"!{sender:08x}"

    # GPS timestamp
    gps_time = payload_data.get("time")
    if gps_time:
        timestamp = datetime.fromtimestamp(gps_time, tz=timezone.utc)
    else:
        timestamp = datetime.now(tz=timezone.utc)

    # ground_track is heading in degrees × 100
    heading_raw = payload_data.get("ground_track")
    heading = heading_raw / 100.0 if heading_raw is not None else None

    # PDOP is value × 100
    pdop_raw = payload_data.get("PDOP")
    pdop = pdop_raw / 100.0 if pdop_raw is not None else None

    reading = GpsReading(
        lat=lat,
        lon=lon,
        alt=payload_data.get("altitude"),
        speed=payload_data.get("ground_speed"),
        heading=heading,
        sats=payload_data.get("sats_in_view"),
        pdop=pdop,
        timestamp=timestamp,
    )

    return TrackPoint(
        device_id=str(sender),
        reading=reading,
        received_at=datetime.now(tz=timezone.utc),
        rssi=data.get("rssi"),
        snr=data.get("snr"),
    )


def parse_mqtt_protobuf_packet(payload: bytes) -> TrackPoint | None:
    """Parse a Meshtastic protobuf MQTT message (ServiceEnvelope) into a TrackPoint.

    Uses meshtastic's generated protobuf modules to decode the binary payload.
    """
    try:
        from meshtastic.mesh_pb2 import MeshPacket
        from meshtastic.mqtt_pb2 import ServiceEnvelope
        from meshtastic.portnums_pb2 import POSITION_APP
        from meshtastic.telemetry_pb2 import Position  # noqa: F811
    except ImportError:
        logger.warning("meshtastic protobuf modules not available; cannot parse protobuf MQTT")
        return None

    try:
        envelope = ServiceEnvelope()
        envelope.ParseFromString(payload)
    except Exception:
        logger.debug("MQTT: failed to decode protobuf ServiceEnvelope")
        return None

    packet: MeshPacket = envelope.packet
    if not packet or not packet.decoded:
        return None

    if packet.decoded.portnum != POSITION_APP:
        return None

    try:
        position = Position()
        position.ParseFromString(packet.decoded.payload)
    except Exception:
        logger.debug("MQTT: failed to decode Position protobuf")
        return None

    if position.latitude_i == 0 and position.longitude_i == 0:
        return None

    lat = position.latitude_i / 1e7
    lon = position.longitude_i / 1e7

    # protobuf uses 'from' which is a reserved word — access via getattr
    from_id = getattr(packet, "from", 0)
    sender = f"!{from_id:08x}" if from_id else "unknown"

    gps_time = position.time if position.time else None
    if gps_time:
        timestamp = datetime.fromtimestamp(gps_time, tz=timezone.utc)
    else:
        timestamp = datetime.now(tz=timezone.utc)

    heading = position.ground_track / 100.0 if position.ground_track else None
    pdop = position.PDOP / 100.0 if position.PDOP else None

    reading = GpsReading(
        lat=lat,
        lon=lon,
        alt=position.altitude if position.altitude else None,
        speed=position.ground_speed if position.ground_speed else None,
        heading=heading,
        sats=position.sats_in_view if position.sats_in_view else None,
        pdop=pdop,
        timestamp=timestamp,
    )

    return TrackPoint(
        device_id=sender,
        reading=reading,
        received_at=datetime.now(tz=timezone.utc),
        rssi=packet.rx_rssi if packet.rx_rssi else None,
        snr=packet.rx_snr if packet.rx_snr else None,
    )
