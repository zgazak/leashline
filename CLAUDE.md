# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Leashline is a local-first dog escape detection system using LoRa/Meshtastic radio tracking and geofencing. It runs on a local base station, not the cloud.

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
│       ├── api/             # REST + SSE endpoints
│       ├── core/            # Config (YAML), EventBus (asyncio.Queue)
│       ├── storage/         # SQLite via aiosqlite
│       ├── listener/        # Meshtastic serial/TCP listener
│       └── processor.py     # Detection pipeline (EventBus → Engine → Alerts)
├── resources/               # YAML config files
│   └── src/resources/config/
├── leashline/               # PyPI package stub
└── web/                     # Next.js frontend (Phase 2, not yet built)
```

**Data flow**: Meshtastic device (USB/serial) → Listener (thread) → async EventBus → Detection Processor → SQLite + SSE stream → Frontend

### Key design decisions
- **Engine has zero I/O** — pure functions, testable without DB/network/hardware
- **SSE over WebSocket** — unidirectional server→client, simpler proxy support
- **SQLite for local mode** — single-writer, zero infrastructure
- **In-process EventBus** — asyncio.Queue, no message broker needed
- **Thread bridge for Meshtastic** — meshtastic lib is sync; bridge via `run_coroutine_threadsafe`

## Workspace packages

The root `pyproject.toml` defines a uv workspace with members: `app`, `engine`, `resources`. Each has its own `pyproject.toml` and `src/` layout.
