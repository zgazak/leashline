"""Telemetry query endpoints."""

from fastapi import APIRouter, Depends

from app.auth.deps import get_current_user, get_pack_id
from app.auth.models import UserInfo
from app.models.telemetry import DeviceTelemetry

router = APIRouter(prefix="/telemetry", tags=["telemetry"])


@router.get("/latest")
async def latest_telemetry(
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> dict[str, DeviceTelemetry]:
    """Return the latest telemetry for each device in the pack."""
    from app.main import get_storage

    storage = get_storage()
    all_telemetry = await storage.telemetry.list_for_pack(pack_id)
    # Keyed by device_id — storage already keeps only latest per device
    return {t.device_id: t for t in all_telemetry}


@router.get("/{device_id}")
async def device_telemetry(
    device_id: str,
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> DeviceTelemetry | None:
    """Return the latest telemetry for a specific device."""
    from app.main import get_storage

    storage = get_storage()
    return await storage.telemetry.get_for_pack(device_id, pack_id)
