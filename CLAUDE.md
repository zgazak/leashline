# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Leashline is a dog escape detection system using LoRa/Meshtastic radio tracking and geofencing. GPS collars transmit over LoRa to a base station hub, which relays via WiFi (home) or BLE (mobile) to an MQTT broker. The API subscribes, runs detection, and streams alerts to a PWA.

Multi-user via Clerk auth and "packs" (households). Each pack gets its own MQTT topic namespace (`leashline/{pack_id}/...`).

## Build & Development

Uses **uv** as the package manager with a workspace monorepo. Python >=3.11. Hatchling build backend.

```bash
# Sync dependencies (recreates .venv and uv.lock)
make sync

# Run the app
make run                    # uv run python -m app.main

# Run tests
make test-app               # pytest app/tests with coverage
make test-engine            # pytest engine/tests with coverage
make test-coverage          # both of the above + badge generation

# Build for distribution
make build                  # clean + python -m build
make publish                # build + twine upload
```

To run a single test file or test directly:
```bash
uv run python -m pytest path/to/test_file.py -v
uv run python -m pytest path/to/test_file.py::test_name -v
```

Web frontend:
```bash
cd web && npm install && npm run dev    # dev server on :3000
cd web && npm run build                 # production build
```

## Architecture

```
leashline/
├── engine/                  # Pure algorithms (zero I/O)
│   └── src/engine/
│       ├── models/          # Pydantic v2 frozen models
│       ├── geo/             # Geospatial: PiP, haversine, boundary proximity
│       └── detection/       # Motion, scatter, sampling, escape detection
├── app/                     # FastAPI server
│   └── src/app/
│       ├── api/             # REST + SSE endpoints (pack-scoped)
│       │   ├── dogs.py, geofences.py, positions.py, alerts.py, devices.py
│       │   ├── packs.py     # Pack CRUD, invite, join
│       │   ├── stream.py    # SSE with pack filtering + token auth
│       │   └── connection.py
│       ├── auth/            # Clerk JWT verification
│       │   ├── models.py    # UserInfo
│       │   └── deps.py      # get_current_user, get_pack_id, verify_token_param
│       ├── models/          # App-layer models (NOT in engine)
│       │   └── pack.py      # Pack, PackMember, PackInvite
│       ├── core/            # Config (YAML + AuthConfig), EventBus (asyncio.Queue)
│       ├── storage/         # SQLite via aiosqlite
│       │   └── sqlite.py    # SqliteRepository, TenantRepository, PackRepository
│       ├── listener/        # Meshtastic serial/TCP/BLE + MQTT listeners
│       │   └── mqtt_listener.py  # Extracts pack_id from topic, publishes envelopes
│       └── processor.py     # Detection pipeline (envelope-aware, pack-scoped)
├── web/                     # Next.js 14 frontend (PWA)
│   └── src/
│       ├── app/             # App Router: layout, page, providers, sign-in, sign-up
│       ├── components/      # Map, Sidebar, AlertList, DogList, PackSetup, PackSettings
│       ├── hooks/           # usePositions, useAlerts, useConnection, useSSE (token-aware)
│       └── lib/             # auth-api.ts, api-provider.tsx, api.ts, types.ts
├── resources/               # YAML config files
│   └── src/resources/config/
└── leashline/               # PyPI package stub
```

### Data flow

```
LoRa collar → Hub (WiFi/BLE) → MQTT broker
    → API subscribes to leashline/+/2/json/#
    → MQTT listener extracts pack_id from topic
    → EventBus envelope: {"pack_id": str, "data": TrackPoint}
    → Processor: stores position (pack-scoped), runs detection (pack-scoped)
    → Alerts published as envelopes → SSE streams filter by pack_id
    → Frontend PWA
```

### Key design decisions
- **Engine has zero I/O** — pure functions, testable without DB/network/hardware
- **Pack isolation is app-layer only** — no pack_id in engine models
- **TenantRepository** — `list_for_pack()`, `put(key, value, pack_id)`, `get_for_pack()`, `delete_for_pack()`
- **Envelope pattern on EventBus** — `{"pack_id": str, "data": model}` for multi-tenant routing
- **SSE over WebSocket** — unidirectional server→client, simpler proxy support
- **SSE auth via query param** — `?token=JWT` because EventSource can't send headers
- **SQLite for local mode** — single-writer, zero infrastructure
- **In-process EventBus** — asyncio.Queue, no message broker needed
- **Thread bridge for Meshtastic** — meshtastic lib is sync; bridge via `run_coroutine_threadsafe`
- **Conditional Clerk** — frontend wraps with ClerkProvider only when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set; backend returns synthetic dev user when `auth.enabled: false`

### Auth flow
- Backend: `get_current_user` FastAPI dependency validates Clerk JWT (or returns dev user)
- `get_pack_id` dependency looks up user's pack from `pack_members` table (or returns `"local"`)
- Frontend: `Providers` component conditionally wraps with `ClerkProvider` + `ClerkApiProvider`
- `useApi()` context hook returns authenticated or unauthenticated API client
- SSE hooks pass JWT as `?token=` query param

### MQTT topic convention
```
leashline/{pack_id}/2/json/LongFast/!devicehexid
```
API subscribes to wildcard: `leashline/+/2/json/#`
Legacy local topics (`msh/+/2/json/#`) map to pack_id `"local"`.

## Workspace packages

The root `pyproject.toml` defines a uv workspace with members: `app`, `engine`, `resources`. Each has its own `pyproject.toml` and `src/` layout.

Workspace deps require `[tool.uv.sources]` in the dependent's `pyproject.toml` (e.g., `engine = { workspace = true }`).

## Hardware

- **WiFi hub (home):** Heltec WiFi LoRa 32 V4 — connects to WiFi, publishes to MQTT directly. Always-on, no phone needed.
- **BLE hub (mobile):** RAK WisMesh Pocket or similar — bridges via phone's Meshtastic app to MQTT.
- **Dog collar:** Spec5 Trace or similar LoRa GPS tracker.
- Both hubs publish to the same `leashline/{pack_id}/...` MQTT namespace.
