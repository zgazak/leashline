"""Pack management endpoints."""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.deps import get_current_user
from app.auth.models import UserInfo
from app.models.pack import Pack, PackInvite, PackMember

router = APIRouter(prefix="/packs", tags=["packs"])


class CreatePackRequest(BaseModel):
    name: str


class InviteResponse(BaseModel):
    code: str
    expires_at: datetime


class JoinPackRequest(BaseModel):
    code: str


@router.post("", status_code=201)
async def create_pack(
    req: CreatePackRequest,
    user: UserInfo = Depends(get_current_user),
) -> Pack:
    from app.main import get_storage

    storage = get_storage()

    # Check if user already has a pack
    existing = await storage.packs.get_user_pack_id(user.user_id)
    if existing:
        raise HTTPException(status_code=409, detail="User already belongs to a pack")

    pack_id = uuid.uuid4().hex[:12]
    pack = Pack(
        id=pack_id,
        name=req.name,
        mqtt_topic_prefix=f"leashline/{pack_id}",
        created_by=user.user_id,
    )
    await storage.packs.put_pack(pack)

    # Create owner membership
    member = PackMember(
        pack_id=pack_id,
        user_id=user.user_id,
        role="owner",
    )
    await storage.packs.put_member(member)

    return pack


@router.get("/me")
async def get_my_pack(
    user: UserInfo = Depends(get_current_user),
) -> dict:
    from app.main import get_storage

    storage = get_storage()
    pack_id = await storage.packs.get_user_pack_id(user.user_id)
    if not pack_id:
        raise HTTPException(status_code=404, detail="No pack found")

    pack = await storage.packs.get_pack(pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")

    members = await storage.packs.list_members(pack_id)
    return {"pack": pack, "members": members}


@router.post("/invite")
async def create_invite(
    user: UserInfo = Depends(get_current_user),
) -> InviteResponse:
    from app.main import get_storage

    storage = get_storage()
    pack_id = await storage.packs.get_user_pack_id(user.user_id)
    if not pack_id:
        raise HTTPException(status_code=403, detail="No pack found")

    code = secrets.token_urlsafe(6)[:8]
    now = datetime.now(timezone.utc)
    invite = PackInvite(
        code=code,
        pack_id=pack_id,
        created_by=user.user_id,
        created_at=now,
        expires_at=now + timedelta(days=7),
    )
    await storage.packs.put_invite(invite)

    return InviteResponse(code=code, expires_at=invite.expires_at)


@router.get("/invite/{code}")
async def preview_invite(code: str) -> dict:
    """Public endpoint — preview an invite without auth."""
    from app.main import get_storage

    storage = get_storage()
    invite = await storage.packs.get_invite(code)
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    if invite.used_by:
        raise HTTPException(status_code=410, detail="Invite already used")

    if datetime.now(timezone.utc) > invite.expires_at:
        raise HTTPException(status_code=410, detail="Invite expired")

    pack = await storage.packs.get_pack(invite.pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")

    return {"pack_name": pack.name, "expires_at": invite.expires_at.isoformat()}


@router.post("/join")
async def join_pack(
    req: JoinPackRequest,
    user: UserInfo = Depends(get_current_user),
) -> Pack:
    from app.main import get_storage

    storage = get_storage()

    # Check if user already has a pack
    existing = await storage.packs.get_user_pack_id(user.user_id)
    if existing:
        raise HTTPException(status_code=409, detail="User already belongs to a pack")

    invite = await storage.packs.get_invite(req.code)
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    if invite.used_by:
        raise HTTPException(status_code=410, detail="Invite already used")

    if datetime.now(timezone.utc) > invite.expires_at:
        raise HTTPException(status_code=410, detail="Invite expired")

    pack = await storage.packs.get_pack(invite.pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")

    # Mark invite as used
    used_invite = PackInvite(**{**invite.model_dump(), "used_by": user.user_id})
    await storage.packs.put_invite(used_invite)

    # Create membership
    member = PackMember(
        pack_id=pack.id,
        user_id=user.user_id,
        role="member",
    )
    await storage.packs.put_member(member)

    return pack


@router.delete("/members/{target_user_id}", status_code=204)
async def remove_member(
    target_user_id: str,
    user: UserInfo = Depends(get_current_user),
):
    from app.main import get_storage

    storage = get_storage()
    pack_id = await storage.packs.get_user_pack_id(user.user_id)
    if not pack_id:
        raise HTTPException(status_code=403, detail="No pack found")

    # Only owners can remove members
    caller_member = await storage.packs.get_member(pack_id, user.user_id)
    if not caller_member or caller_member.role != "owner":
        raise HTTPException(status_code=403, detail="Only pack owner can remove members")

    if target_user_id == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    await storage.packs.delete_member(pack_id, target_user_id)
