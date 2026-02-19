"""SSE streaming endpoints for real-time positions and alerts."""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends
from sse_starlette.sse import EventSourceResponse

from app.auth.deps import get_pack_id_from_token, verify_token_param
from app.auth.models import UserInfo

router = APIRouter(prefix="/stream", tags=["stream"])


@router.get("/positions")
async def stream_positions(
    user: UserInfo = Depends(verify_token_param),
    pack_id: str = Depends(get_pack_id_from_token),
):
    """SSE stream of real-time position updates, filtered by pack."""
    from app.main import get_event_bus

    bus = get_event_bus()
    queue = bus.subscribe("positions_sse")

    async def event_generator():
        try:
            while True:
                envelope = await queue.get()
                # Support both envelope format {"pack_id": ..., "data": ...} and raw
                if isinstance(envelope, dict) and "pack_id" in envelope:
                    if envelope["pack_id"] != pack_id:
                        continue
                    data = envelope["data"]
                else:
                    data = envelope
                yield {"event": "position", "data": json.dumps(data.model_dump(), default=str)}
        except asyncio.CancelledError:
            bus.unsubscribe("positions_sse", queue)

    return EventSourceResponse(event_generator())


@router.get("/alerts")
async def stream_alerts(
    user: UserInfo = Depends(verify_token_param),
    pack_id: str = Depends(get_pack_id_from_token),
):
    """SSE stream of real-time alert events, filtered by pack."""
    from app.main import get_event_bus

    bus = get_event_bus()
    queue = bus.subscribe("alerts")

    async def event_generator():
        try:
            while True:
                envelope = await queue.get()
                if isinstance(envelope, dict) and "pack_id" in envelope:
                    if envelope["pack_id"] != pack_id:
                        continue
                    data = envelope["data"]
                else:
                    data = envelope
                yield {"event": "alert", "data": json.dumps(data.model_dump(), default=str)}
        except asyncio.CancelledError:
            bus.unsubscribe("alerts", queue)

    return EventSourceResponse(event_generator())


@router.get("/connection")
async def stream_connection(
    user: UserInfo = Depends(verify_token_param),
):
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
