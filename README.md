# Leashline

Leashline is a **dog escape detection system** using LoRa/Meshtastic radio tracking with polygon geofencing. GPS collars transmit positions over LoRa to a base station hub, which relays data to the Leashline API via WiFi (at home) or BLE (on the go). The API runs escape detection, stores positions, and streams real-time alerts to a PWA frontend.

Multi-user support via Clerk auth and "packs" (households) — each pack gets its own MQTT topic namespace, so multiple families can use the same deployment.

**Status:** early alpha.

## How It Works

```
Dog collar (LoRa GPS)
    │ LoRa radio
    ▼
WiFi hub (at home)  ──WiFi──>  Cloud MQTT broker
  or                              │
BLE hub (on the go) ──phone──>    │
                                  ▼
                          Leashline API
                    (subscribes to pack topics)
                       │          │          │
                   Geofence    Escape     SSE stream
                    check     detection   to frontend
                                              │
                                     PWA (map, alerts,
                                     tracking, pack mgmt)
```

1. A Meshtastic GPS collar broadcasts position packets over LoRa
2. A base station hub receives them and publishes to MQTT (via WiFi or phone BLE bridge)
3. The API subscribes to `leashline/{pack_id}/2/json/#` and parses track points
4. The detection engine checks each point against polygon geofences
5. Alerts fire on boundary approach, breach, confirmed escape, and return
6. Positions and alerts stream to the web frontend via SSE

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

The server starts on `http://localhost:8000` by default. With `auth.enabled: false` (the default), everything works without Clerk — a synthetic dev user and `"local"` pack are used automatically.

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

The web app runs on `http://localhost:3000`. It shows a live map with dog positions, geofence boundaries, alerts, and connection management.

To enable Clerk auth, add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `web/.env.local`, and set `auth.enabled: true` in `local.yaml`.

### Configuration

Copy and edit the default config, or run with defaults:

```bash
# Run with a custom config
uv run python -m app.main --config resources/src/resources/config/local.yaml

# Override host/port
uv run python -m app.main --host 127.0.0.1 --port 9000
```

Config is a YAML file with sections for the server, Meshtastic connection, MQTT, detection thresholds, and auth. See `resources/src/resources/config/local.yaml` for the full template.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET/POST/DELETE | `/dogs` | Dog profile CRUD (pack-scoped) |
| GET/POST/DELETE | `/geofences` | Polygon geofence CRUD (pack-scoped) |
| GET | `/positions/latest` | Latest position per device (pack-scoped) |
| GET | `/positions/{device_id}` | Position history (pack-scoped) |
| GET | `/alerts` | List alerts (pack-scoped) |
| POST | `/alerts/{id}/acknowledge` | Acknowledge an alert |
| GET | `/devices` | List known devices (pack-scoped) |
| POST | `/devices/{id}/assign` | Assign a device to a dog |
| GET | `/connection/status` | Current connection state |
| POST | `/connection/switch` | Switch connection type |
| GET | `/connection/scan` | Scan for nearby BLE devices |
| POST | `/packs` | Create a pack (household) |
| GET | `/packs/me` | Get current user's pack + members |
| POST | `/packs/invite` | Generate invite code |
| POST | `/packs/join` | Join pack with invite code |
| DELETE | `/packs/members/{user_id}` | Remove member (owner only) |
| GET | `/stream/positions?token=` | SSE positions (pack-filtered) |
| GET | `/stream/alerts?token=` | SSE alerts (pack-filtered) |
| GET | `/stream/connection?token=` | SSE connection state |

All pack-scoped endpoints require auth (when enabled). SSE endpoints use `?token=` query param since EventSource can't send headers.

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
│       ├── api/             # REST + SSE endpoints (pack-scoped)
│       ├── auth/            # Clerk JWT deps (get_current_user, get_pack_id)
│       ├── models/          # App-layer models (Pack, PackMember, PackInvite)
│       ├── core/            # Config, async event bus
│       ├── storage/         # SQLite with TenantRepository (pack_id isolation)
│       ├── listener/        # Meshtastic + MQTT listeners, connection manager
│       └── processor.py     # Detection pipeline (envelope-aware)
├── web/                     # Next.js frontend (PWA)
│   └── src/
│       ├── app/             # App Router pages (incl. sign-in/sign-up)
│       ├── components/      # Map, sidebar, alerts, PackSetup, PackSettings
│       ├── hooks/           # Auth-aware SSE subscription hooks
│       └── lib/             # API client, types, auth provider
├── resources/               # YAML config files
└── leashline/               # PyPI package stub
```

The engine is intentionally pure — no I/O, no database, no network. It takes positions in and returns verdicts out. Pack/tenant isolation lives entirely in the app layer.

## Hardware

### Two-hub setup

| Component | Role | Hardware | Connectivity |
|-----------|------|----------|-------------|
| **Dog collar** | GPS + LoRa transmitter | [Spec5 Trace](https://specfive.com/products/specfive-trace-gps-tracker-for-dogs-teams) (~$130) | LoRa only |
| **WiFi hub** (home) | Always-on base station | Heltec WiFi LoRa 32 V4 (~$20) | LoRa + WiFi → MQTT |
| **BLE hub** (mobile) | Portable for walks/chasing | RAK WisMesh Pocket (~$40) or any Meshtastic node | LoRa + BLE → phone → MQTT |
| **Outdoor antenna** | Improves range | Any 915 MHz omni + SMA coax (~$60–100) | — |

All LoRa devices must be on the same Meshtastic frequency (US915 for North America).

### WiFi hub setup (Heltec WiFi LoRa 32 V4)

The WiFi hub stays at home, connects to your WiFi, and publishes received LoRa positions directly to an MQTT broker — no phone required. Dogs can be home alone and still be tracked.

1. Flash [Meshtastic firmware](https://meshtastic.org/docs/getting-started/flashing-firmware/) onto the Heltec V4
2. Configure WiFi: set `network.wifi_ssid` and `network.wifi_psk` via Meshtastic CLI or app
3. Configure MQTT on the device:
   - `mqtt.enabled: true`
   - `mqtt.address`: your MQTT broker hostname
   - `mqtt.username` / `mqtt.password`: broker credentials
   - `mqtt.root`: set to your pack's MQTT topic prefix (shown in Pack Settings in the web app, e.g. `leashline/a1b2c3d4e5f6`)
4. Set device role to `ROUTER` or `CLIENT_MUTE` (relays packets without cluttering the mesh)
5. Plug in and leave it — it auto-reconnects to WiFi and MQTT

### BLE hub setup (mobile)

For walks or chasing an escaped dog. Your phone runs the Meshtastic app, connects to the BLE hub, and bridges packets to the same MQTT broker.

1. Pair the BLE device with the Meshtastic app on your phone
2. In the Meshtastic app, configure MQTT with the same broker and topic prefix
3. The app bridges LoRa → BLE → phone → internet → MQTT

Both hubs publish to the same MQTT topic namespace, so the Leashline API sees all positions regardless of which hub received them.

## Safety

This system is **awareness tooling**, not a safety guarantee. Always supervise dogs appropriately. Terrain, obstructions, and physics still apply — LoRa range is not infinite.

## License

MIT
