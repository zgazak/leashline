"""Parse Meshtastic position packets into engine TrackPoint models."""

from __future__ import annotations

from datetime import datetime, timezone

from engine.models.position import GpsReading, TrackPoint


def parse_position_packet(packet: dict, interface=None) -> TrackPoint | None:
    """Convert a raw Meshtastic position packet dict to a TrackPoint.

    Returns None if the packet doesn't contain position data.
    """
    decoded = packet.get("decoded", {})
    if decoded.get("portnum") != "POSITION_APP":
        return None

    position = decoded.get("position", {})
    if "latitude" not in position or "longitude" not in position:
        return None

    from_id = packet.get("fromId") or packet.get("from") or "unknown"
    if isinstance(from_id, int):
        from_id = f"!{from_id:08x}"

    # Extract GPS timestamp or use reception time
    gps_time = position.get("time")
    if gps_time:
        timestamp = datetime.fromtimestamp(gps_time, tz=timezone.utc)
    else:
        timestamp = datetime.now(tz=timezone.utc)

    reading = GpsReading(
        lat=position["latitude"],
        lon=position["longitude"],
        alt=position.get("altitude"),
        speed=position.get("groundSpeed"),
        heading=position.get("groundTrack"),
        sats=position.get("satsInView"),
        pdop=position.get("PDOP"),
        timestamp=timestamp,
    )

    return TrackPoint(
        device_id=str(from_id),
        reading=reading,
        received_at=datetime.now(tz=timezone.utc),
        rssi=packet.get("rxRssi"),
        snr=packet.get("rxSnr"),
    )
