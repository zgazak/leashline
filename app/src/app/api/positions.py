"""Position query endpoints."""

from fastapi import APIRouter, Depends

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
