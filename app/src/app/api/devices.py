"""Device management endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from engine.models.dog import CollarDevice

router = APIRouter(prefix="/devices", tags=["devices"])


class AssignDeviceRequest(BaseModel):
    dog_id: str


@router.get("")
async def list_devices() -> list[CollarDevice]:
    from app.main import get_storage

    storage = get_storage()
    return await storage.devices.list_all()


@router.post("/{device_id}/assign")
async def assign_device(device_id: str, req: AssignDeviceRequest) -> dict:
    """Assign a device to a dog profile."""
    from app.main import get_storage

    storage = get_storage()
    device = await storage.devices.get(device_id)
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    dog = await storage.dogs.get(req.dog_id)
    if dog is None:
        raise HTTPException(status_code=404, detail="Dog not found")
    # Update dog profile with device_id
    from engine.models.dog import DogProfile

    updated_dog = DogProfile(**{**dog.model_dump(), "device_id": device_id})
    await storage.dogs.put(dog.id, updated_dog)
    return {"status": "assigned", "device_id": device_id, "dog_id": req.dog_id}
