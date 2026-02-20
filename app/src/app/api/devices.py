"""Device management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.deps import get_current_user, get_pack_id
from app.auth.models import UserInfo
from engine.models.dog import CollarDevice

router = APIRouter(prefix="/devices", tags=["devices"])


class AssignDeviceRequest(BaseModel):
    dog_id: str


@router.get("")
async def list_devices(
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> list[CollarDevice]:
    from app.main import get_storage

    storage = get_storage()
    return await storage.devices.list_for_pack(pack_id)


@router.get("/nearby")
async def nearby_devices(
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> list[dict]:
    """Return Meshtastic devices seen via MQTT in the last 10 minutes."""
    from app.processor import get_nearby_devices

    return get_nearby_devices(pack_id)


@router.post("/{device_id}/assign")
async def assign_device(
    device_id: str,
    req: AssignDeviceRequest,
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> dict:
    """Assign a device to a dog profile."""
    from app.main import get_storage

    storage = get_storage()
    device = await storage.devices.get_for_pack(device_id, pack_id)
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    dog = await storage.dogs.get_for_pack(req.dog_id, pack_id)
    if dog is None:
        raise HTTPException(status_code=404, detail="Dog not found")
    # Update dog profile with device_id
    from engine.models.dog import DogProfile

    updated_dog = DogProfile(**{**dog.model_dump(), "device_id": device_id})
    await storage.dogs.put(dog.id, updated_dog, pack_id)
    return {"status": "assigned", "device_id": device_id, "dog_id": req.dog_id}
