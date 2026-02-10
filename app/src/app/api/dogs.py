"""Dog profile CRUD endpoints."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth.deps import get_current_user, get_pack_id
from app.auth.models import UserInfo
from engine.models.dog import DogProfile

router = APIRouter(prefix="/dogs", tags=["dogs"])


class CreateDogRequest(BaseModel):
    name: str
    device_id: str | None = None
    geofence_ids: list[str] = Field(default_factory=list)
    notes: str = ""


class UpdateDogRequest(BaseModel):
    name: str | None = None
    device_id: str | None = None
    geofence_ids: list[str] | None = None
    notes: str | None = None


@router.get("")
async def list_dogs(
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> list[DogProfile]:
    from app.main import get_storage

    storage = get_storage()
    return await storage.dogs.list_for_pack(pack_id)


@router.post("", status_code=201)
async def create_dog(
    req: CreateDogRequest,
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> DogProfile:
    from app.main import get_storage

    storage = get_storage()
    import uuid

    dog = DogProfile(
        id=uuid.uuid4().hex[:8],
        name=req.name,
        device_id=req.device_id,
        geofence_ids=req.geofence_ids,
        notes=req.notes,
        created_at=datetime.utcnow(),
    )
    await storage.dogs.put(dog.id, dog, pack_id)
    return dog


@router.get("/{dog_id}")
async def get_dog(
    dog_id: str,
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> DogProfile:
    from app.main import get_storage

    storage = get_storage()
    dog = await storage.dogs.get_for_pack(dog_id, pack_id)
    if dog is None:
        raise HTTPException(status_code=404, detail="Dog not found")
    return dog


@router.delete("/{dog_id}", status_code=204)
async def delete_dog(
    dog_id: str,
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
):
    from app.main import get_storage

    storage = get_storage()
    await storage.dogs.delete_for_pack(dog_id, pack_id)
