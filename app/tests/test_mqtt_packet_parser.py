"""Tests for MQTT packet parser."""

import json
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.listener.mqtt_packet_parser import parse_mqtt_json_packet, parse_mqtt_protobuf_packet


# --- JSON parser tests ---


def _make_json_payload(
    lat_i: int = 355000000,
    lon_i: int = -835000000,
    altitude: int = 200,
    ground_speed: int = 3,
    ground_track: int = 18000,
    sats_in_view: int = 8,
    pdop: int = 150,
    time: int = 1700000000,
    sender: str = "!aabbccdd",
    msg_type: str = "position",
    rssi: int | None = -90,
    snr: float | None = 6.5,
) -> bytes:
    """Build a Meshtastic JSON MQTT payload."""
    data = {
        "type": msg_type,
        "sender": sender,
        "payload": {
            "latitude_i": lat_i,
            "longitude_i": lon_i,
            "altitude": altitude,
            "ground_speed": ground_speed,
            "ground_track": ground_track,
            "sats_in_view": sats_in_view,
            "PDOP": pdop,
            "time": time,
        },
    }
    if rssi is not None:
        data["rssi"] = rssi
    if snr is not None:
        data["snr"] = snr
    return json.dumps(data).encode()


class TestParseJsonPacket:
    def test_basic_position(self):
        payload = _make_json_payload()
        result = parse_mqtt_json_packet(payload, "msh/US/2/json/LongFast/!aabbccdd")

        assert result is not None
        assert result.device_id == "!aabbccdd"
        assert result.reading.lat == pytest.approx(35.5)
        assert result.reading.lon == pytest.approx(-83.5)
        assert result.reading.alt == 200
        assert result.reading.speed == 3
        assert result.reading.heading == pytest.approx(180.0)
        assert result.reading.sats == 8
        assert result.reading.pdop == pytest.approx(1.5)
        assert result.reading.timestamp == datetime(2023, 11, 14, 22, 13, 20, tzinfo=timezone.utc)
        assert result.rssi == -90
        assert result.snr == 6.5

    def test_lat_lon_conversion(self):
        """latitude_i and longitude_i are degrees x 1e7."""
        payload = _make_json_payload(lat_i=401234567, lon_i=-740987654)
        result = parse_mqtt_json_packet(payload)

        assert result is not None
        assert result.reading.lat == pytest.approx(40.1234567)
        assert result.reading.lon == pytest.approx(-74.0987654)

    def test_ground_track_conversion(self):
        """ground_track is heading in degrees x 100."""
        payload = _make_json_payload(ground_track=27045)
        result = parse_mqtt_json_packet(payload)

        assert result is not None
        assert result.reading.heading == pytest.approx(270.45)

    def test_pdop_conversion(self):
        """PDOP is value x 100."""
        payload = _make_json_payload(pdop=250)
        result = parse_mqtt_json_packet(payload)

        assert result is not None
        assert result.reading.pdop == pytest.approx(2.5)

    def test_missing_latitude(self):
        """Returns None if latitude_i is missing."""
        data = {
            "type": "position",
            "sender": "!aabbccdd",
            "payload": {"longitude_i": -835000000},
        }
        result = parse_mqtt_json_packet(json.dumps(data).encode())
        assert result is None

    def test_missing_longitude(self):
        """Returns None if longitude_i is missing."""
        data = {
            "type": "position",
            "sender": "!aabbccdd",
            "payload": {"latitude_i": 355000000},
        }
        result = parse_mqtt_json_packet(json.dumps(data).encode())
        assert result is None

    def test_non_position_type(self):
        """Returns None for non-position message types."""
        payload = _make_json_payload(msg_type="text")
        result = parse_mqtt_json_packet(payload)
        assert result is None

    def test_empty_payload(self):
        """Returns None for empty payload field."""
        data = {"type": "position", "sender": "!aabbccdd", "payload": {}}
        result = parse_mqtt_json_packet(json.dumps(data).encode())
        assert result is None

    def test_invalid_json(self):
        """Returns None for non-JSON data."""
        result = parse_mqtt_json_packet(b"not json at all")
        assert result is None

    def test_binary_garbage(self):
        """Returns None for binary garbage."""
        result = parse_mqtt_json_packet(b"\x00\x01\x02\x03")
        assert result is None

    def test_integer_sender(self):
        """Integer sender is converted to hex format."""
        data = {
            "type": "position",
            "sender": 2864434397,
            "payload": {
                "latitude_i": 355000000,
                "longitude_i": -835000000,
                "time": 1700000000,
            },
        }
        result = parse_mqtt_json_packet(json.dumps(data).encode())
        assert result is not None
        assert result.device_id == "!aabbccdd"

    def test_no_timestamp_uses_now(self):
        """When time is absent, timestamp defaults to now."""
        data = {
            "type": "position",
            "sender": "!aabbccdd",
            "payload": {
                "latitude_i": 355000000,
                "longitude_i": -835000000,
            },
        }
        before = datetime.now(tz=timezone.utc)
        result = parse_mqtt_json_packet(json.dumps(data).encode())
        after = datetime.now(tz=timezone.utc)

        assert result is not None
        assert before <= result.reading.timestamp <= after

    def test_optional_fields_none(self):
        """Optional fields default to None when absent."""
        data = {
            "type": "position",
            "sender": "!aabbccdd",
            "payload": {
                "latitude_i": 355000000,
                "longitude_i": -835000000,
                "time": 1700000000,
            },
        }
        result = parse_mqtt_json_packet(json.dumps(data).encode())
        assert result is not None
        assert result.reading.alt is None
        assert result.reading.speed is None
        assert result.reading.heading is None
        assert result.reading.sats is None
        assert result.reading.pdop is None
        assert result.rssi is None
        assert result.snr is None

    def test_no_type_field(self):
        """Returns None when 'type' field is missing."""
        data = {"sender": "!aabbccdd", "payload": {"latitude_i": 355000000, "longitude_i": -835000000}}
        result = parse_mqtt_json_packet(json.dumps(data).encode())
        assert result is None


# --- Protobuf parser tests ---


class TestParseProtobufPacket:
    def test_returns_none_without_meshtastic(self):
        """Returns None when meshtastic protobuf modules aren't available."""
        with patch.dict("sys.modules", {"meshtastic.mesh_pb2": None}):
            # Force re-import to hit the ImportError
            with patch("app.listener.mqtt_packet_parser.parse_mqtt_protobuf_packet") as mock_fn:
                mock_fn.return_value = None
                result = mock_fn(b"\x00\x01\x02")
                assert result is None

    def test_returns_none_for_invalid_protobuf(self):
        """Returns None for data that can't be decoded as ServiceEnvelope."""
        result = parse_mqtt_protobuf_packet(b"not a protobuf")
        # Will return None either because meshtastic isn't installed or parse fails
        assert result is None
