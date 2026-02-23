"""Position query endpoints."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.deps import get_current_user, get_pack_id
from app.auth.models import UserInfo
from engine.models.position import TrackPoint

router = APIRouter(prefix="/positions", tags=["positions"])


@router.get("/latest")
async def latest_positions(
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> dict[str, TrackPoint]:
    """Return the latest position for each known device."""
    from app.main import get_storage

    storage = get_storage()
    all_positions = await storage.positions.list_for_pack(pack_id)
    latest: dict[str, TrackPoint] = {}
    for tp in all_positions:
        if tp.device_id not in latest or tp.received_at > latest[tp.device_id].received_at:
            latest[tp.device_id] = tp
    return latest


@router.get("/history")
async def position_history_by_date(
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> list[TrackPoint]:
    """Return all positions for a given date, sorted by received_at."""
    try:
        day = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    from app.main import get_storage

    storage = get_storage()
    start = day.isoformat()
    end_str = (day + timedelta(days=1)).isoformat()
    return await storage.list_positions_for_date(pack_id, start, end_str)


@router.get("/{device_id}")
async def position_history(
    device_id: str,
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
    limit: int = 100,
) -> list[TrackPoint]:
    """Return position history for a device."""
    from app.main import get_storage

    storage = get_storage()
    all_positions = await storage.positions.list_for_pack(pack_id)
    filtered = [tp for tp in all_positions if tp.device_id == device_id]
    filtered.sort(key=lambda tp: tp.received_at, reverse=True)
    return filtered[:limit]
