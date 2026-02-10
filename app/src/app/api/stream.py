"""SSE streaming endpoints for real-time positions and alerts."""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

router = APIRouter(prefix="/stream", tags=["stream"])


@router.get("/positions")
async def stream_positions():
    """SSE stream of real-time position updates."""
    from app.main import get_event_bus

    bus = get_event_bus()
    queue = bus.subscribe("positions")

    async def event_generator():
        try:
            while True:
                data = await queue.get()
                yield {"event": "position", "data": json.dumps(data.model_dump(), default=str)}
        except asyncio.CancelledError:
            bus.unsubscribe("positions", queue)

    return EventSourceResponse(event_generator())


@router.get("/alerts")
async def stream_alerts():
    """SSE stream of real-time alert events."""
    from app.main import get_event_bus

    bus = get_event_bus()
    queue = bus.subscribe("alerts")

    async def event_generator():
        try:
            while True:
                data = await queue.get()
                yield {"event": "alert", "data": json.dumps(data.model_dump(), default=str)}
        except asyncio.CancelledError:
            bus.unsubscribe("alerts", queue)

    return EventSourceResponse(event_generator())


@router.get("/connection")
async def stream_connection():
    """SSE stream of connection state changes."""
    from app.main import get_event_bus

    bus = get_event_bus()
    queue = bus.subscribe("connection")

    async def event_generator():
        try:
            while True:
                data = await queue.get()
                yield {"event": "connection", "data": json.dumps(data.model_dump(), default=str)}
        except asyncio.CancelledError:
            bus.unsubscribe("connection", queue)

    return EventSourceResponse(event_generator())
