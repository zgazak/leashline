"""Alert endpoints."""

from fastapi import APIRouter, Depends, HTTPException

from app.auth.deps import get_current_user, get_pack_id
from app.auth.models import UserInfo
from engine.models.alert import Alert

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
async def list_alerts(
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> list[Alert]:
    from app.main import get_storage

    storage = get_storage()
    return await storage.alerts.list_for_pack(pack_id)


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> Alert:
    from app.main import get_storage

    storage = get_storage()
    alert = await storage.alerts.get_for_pack(alert_id, pack_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    # Create a new Alert with acknowledged=True (frozen model)
    updated = Alert(**{**alert.model_dump(), "acknowledged": True})
    await storage.alerts.put(alert_id, updated, pack_id)
    return updated
