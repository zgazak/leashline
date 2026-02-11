"""Push notification subscription endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.deps import get_current_user, get_pack_id
from app.auth.models import UserInfo
from app.notifications.models import PushSubscription, PushSubscriptionKeys

router = APIRouter(prefix="/notifications", tags=["notifications"])


class SubscribeRequest(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys


@router.get("/vapid-key")
async def get_vapid_key(
    user: UserInfo = Depends(get_current_user),
) -> dict:
    from app.main import get_config

    config = get_config()
    if not config.notifications.enabled:
        raise HTTPException(status_code=404, detail="Push notifications not enabled")

    return {"public_key": config.notifications.vapid.public_key}


@router.post("/subscribe", status_code=201)
async def subscribe(
    req: SubscribeRequest,
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> PushSubscription:
    from app.main import get_config, get_storage

    config = get_config()
    if not config.notifications.enabled:
        raise HTTPException(status_code=404, detail="Push notifications not enabled")

    storage = get_storage()

    # Dedup: check for existing subscription with same endpoint
    existing = await storage.push_subscriptions.list_for_pack(pack_id)
    for sub in existing:
        if sub.endpoint == req.endpoint:
            # Update keys in case they rotated
            updated = sub.model_copy(update={"keys": req.keys})
            await storage.push_subscriptions.put(sub.id, updated, pack_id)
            return updated

    sub = PushSubscription(
        id=uuid.uuid4().hex[:12],
        endpoint=req.endpoint,
        keys=req.keys,
    )
    await storage.push_subscriptions.put(sub.id, sub, pack_id)
    return sub


@router.delete("/subscribe", status_code=204)
async def unsubscribe(
    req: SubscribeRequest,
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> None:
    from app.main import get_storage

    storage = get_storage()
    existing = await storage.push_subscriptions.list_for_pack(pack_id)
    for sub in existing:
        if sub.endpoint == req.endpoint:
            await storage.push_subscriptions.delete_for_pack(sub.id, pack_id)
            return
