# Leashline

Leashline is a **local-first dog escape detection system** designed for areas with poor cellular coverage.

It uses LoRa/Meshtastic radio tracking with polygon geofencing on a local base station. A GPS collar transmits positions over LoRa to a nearby receiver connected to your computer. Leashline ingests those packets, runs geofence and escape detection, and streams real-time alerts.

No cloud. No subscription. No cellular required.

**Status:** early alpha.

## How It Works

```
GPS collar (LoRa) ──radio──> Base station ──serial/TCP/BLE──> Leashline server
                                                                    │
                                                        ┌───────────┼───────────┐
                                                        ▼           ▼           ▼
                                                    Geofence    Escape      SSE stream
                                                     check     detection    to frontend
                                                                               │
                                                                          Web app (map,
                                                                          alerts, tracking)
```

1. A Meshtastic GPS collar broadcasts position packets over LoRa
2. A base station receiver picks them up (connected via USB serial, TCP, or BLE)
3. Leashline's listener parses the packets into track points
4. The detection engine checks each point against polygon geofences
5. Alerts fire on boundary approach, breach, confirmed escape, and return
6. Positions and alerts stream to the web frontend via SSE

**On-the-go workflow:** At home, the base station connects via USB. If your dog escapes, unplug the node, grab it, and switch to BLE from the web app on your phone — no Meshtastic app needed.

## Requirements

- Python >= 3.11
- [uv](https://docs.astral.sh/uv/) package manager
- Node.js >= 18 (for the web frontend)

## Getting Started

```bash
# Clone and sync dependencies
git clone https://github.com/zgazak/leashline.git
cd leashline
make sync

# Run the server
make run

# Run tests
make test-engine        # engine unit tests (geo, detection)
make test-app           # app tests
make test-coverage      # both + coverage badges
```

The server starts on `http://localhost:8000` by default.

### Web Frontend

```bash
# Install frontend dependencies
make web-install

# Set up your Mapbox token (free at mapbox.com)
cp web/.env.example web/.env.local
# Edit web/.env.local and add your NEXT_PUBLIC_MAPBOX_TOKEN

# Start the dev server
make web-dev
```

The web app runs on `http://localhost:3000`. It shows a live map with dog positions, geofence boundaries, alerts, and connection management. If no Mapbox token is set, the map area displays setup instructions.

### Configuration

Copy and edit the default config, or run with defaults:

```bash
# Run with a custom config
uv run python -m app.main --config resources/src/resources/config/local.yaml

# Override host/port
uv run python -m app.main --host 127.0.0.1 --port 9000
```

Config is a YAML file with sections for the server, Meshtastic connection, and detection thresholds. See `resources/src/resources/config/local.yaml` for the full template.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET/POST/DELETE | `/dogs` | Dog profile CRUD |
| GET/POST/DELETE | `/geofences` | Polygon geofence CRUD |
| GET | `/positions/latest` | Latest position per device |
| GET | `/positions/{device_id}` | Position history |
| GET | `/alerts` | List alerts |
| POST | `/alerts/{id}/acknowledge` | Acknowledge an alert |
| GET | `/devices` | List known Meshtastic devices |
| POST | `/devices/{id}/assign` | Assign a device to a dog |
| GET | `/connection/status` | Current connection state |
| POST | `/connection/switch` | Switch connection type (serial/TCP/BLE) |
| GET | `/connection/scan` | Scan for nearby BLE Meshtastic devices |
| GET | `/stream/positions` | SSE stream of real-time positions |
| GET | `/stream/alerts` | SSE stream of real-time alerts |
| GET | `/stream/connection` | SSE stream of connection state changes |

## Project Structure

```
leashline/
├── engine/                  # Pure detection algorithms (zero I/O)
│   └── src/engine/
│       ├── models/          # Pydantic v2 data models
│       ├── geo/             # Point-in-polygon, haversine, boundary proximity
│       └── detection/       # Motion, scatter, sampling, escape detection
├── app/                     # FastAPI server
│   └── src/app/
│       ├── api/             # REST + SSE endpoints (incl. connection mgmt)
│       ├── core/            # Config, async event bus
│       ├── storage/         # SQLite via aiosqlite
│       ├── listener/        # Meshtastic listener + connection manager
│       └── processor.py     # Detection pipeline
├── web/                     # Next.js frontend (map, alerts, connection UI)
│   └── src/
│       ├── app/             # App Router pages
│       ├── components/      # Map, sidebar, alerts, connection switcher
│       ├── hooks/           # SSE subscription hooks
│       └── lib/             # API client, TypeScript types
├── resources/               # YAML config files
└── leashline/               # PyPI package stub
```

The engine is intentionally pure — no I/O, no database, no network. It takes positions in and returns verdicts out. This makes it easy to test and reason about independently from the app layer.

## Hardware

You need two things: a GPS collar tracker and a base station receiver.

| Component | Role | Example | Approx Cost |
|-----------|------|---------|-------------|
| GPS collar | Transmits position over LoRa | [Spec5 Trace](https://specfive.com/products/specfive-trace-gps-tracker-for-dogs-teams) | ~$130 |
| Base station | Receives packets, connects to your computer via USB | [RAK WisMesh Pocket](https://store.rakwireless.com/products/wisblock-meshtastic-starter-kit) or any Meshtastic node | ~$40 |
| Outdoor antenna | Improves range (antenna height matters most) | Any 915 MHz omni + SMA coax | ~$60–100 |

All devices must be on the same Meshtastic frequency (US915 for North America). The collar only transmits; all intelligence runs on your computer.

The base station connects to Leashline via USB serial (at home) or BLE (on the go). You can switch connection types live from the web app — no restart needed.

This is not a consumer product. It's a local radio system built from commodity hardware.

## Safety

This system is **awareness tooling**, not a safety guarantee. Always supervise dogs appropriately. Terrain, obstructions, and physics still apply — LoRa range is not infinite.

## License

MIT
