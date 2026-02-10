"""Geofence CRUD endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth.deps import get_current_user, get_pack_id
from app.auth.models import UserInfo
from engine.models.geofence import Coordinate, Geofence

router = APIRouter(prefix="/geofences", tags=["geofences"])


class CreateGeofenceRequest(BaseModel):
    name: str
    vertices: list[Coordinate]
    buffer_meters: float = 0.0


class UpdateGeofenceRequest(BaseModel):
    name: str | None = None
    vertices: list[Coordinate] | None = None
    buffer_meters: float | None = None
    enabled: bool | None = None


@router.get("")
async def list_geofences(
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> list[Geofence]:
    from app.main import get_storage

    storage = get_storage()
    return await storage.geofences.list_for_pack(pack_id)


@router.post("", status_code=201)
async def create_geofence(
    req: CreateGeofenceRequest,
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> Geofence:
    from app.main import get_storage

    storage = get_storage()
    fence = Geofence(
        id=uuid.uuid4().hex[:8],
        name=req.name,
        vertices=req.vertices,
        buffer_meters=req.buffer_meters,
    )
    await storage.geofences.put(fence.id, fence, pack_id)
    return fence


@router.get("/{geofence_id}")
async def get_geofence(
    geofence_id: str,
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> Geofence:
    from app.main import get_storage

    storage = get_storage()
    fence = await storage.geofences.get_for_pack(geofence_id, pack_id)
    if fence is None:
        raise HTTPException(status_code=404, detail="Geofence not found")
    return fence


@router.delete("/{geofence_id}", status_code=204)
async def delete_geofence(
    geofence_id: str,
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
):
    from app.main import get_storage

    storage = get_storage()
    await storage.geofences.delete_for_pack(geofence_id, pack_id)
