"""Noise profile query endpoints."""

from fastapi import APIRouter, Depends

from app.auth.deps import get_current_user, get_pack_id
from app.auth.models import UserInfo
from engine.models.noise import NoiseProfile

router = APIRouter(prefix="/noise-profiles", tags=["noise-profiles"])


@router.get("/latest")
async def latest_noise_profiles(
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> dict[str, NoiseProfile]:
    """Return the latest noise profile for each device in the pack."""
    from app.main import get_storage

    storage = get_storage()
    all_profiles = await storage.noise_profiles.list_for_pack(pack_id)
    return {p.device_id: p for p in all_profiles}


@router.get("/{device_id}")
async def device_noise_profile(
    device_id: str,
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> NoiseProfile | None:
    """Return the noise profile for a specific device."""
    from app.main import get_storage

    storage = get_storage()
    return await storage.noise_profiles.get_for_pack(device_id, pack_id)
