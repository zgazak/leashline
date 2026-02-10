"""Geofence CRUD endpoints."""

import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

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
async def list_geofences() -> list[Geofence]:
    from app.main import get_storage

    storage = get_storage()
    return await storage.geofences.list_all()


@router.post("", status_code=201)
async def create_geofence(req: CreateGeofenceRequest) -> Geofence:
    from app.main import get_storage

    storage = get_storage()
    fence = Geofence(
        id=uuid.uuid4().hex[:8],
        name=req.name,
        vertices=req.vertices,
        buffer_meters=req.buffer_meters,
    )
    await storage.geofences.put(fence.id, fence)
    return fence


@router.get("/{geofence_id}")
async def get_geofence(geofence_id: str) -> Geofence:
    from app.main import get_storage

    storage = get_storage()
    fence = await storage.geofences.get(geofence_id)
    if fence is None:
        raise HTTPException(status_code=404, detail="Geofence not found")
    return fence


@router.delete("/{geofence_id}", status_code=204)
async def delete_geofence(geofence_id: str):
    from app.main import get_storage

    storage = get_storage()
    await storage.geofences.delete(geofence_id)
