"""Alert endpoints."""

from fastapi import APIRouter, HTTPException

from engine.models.alert import Alert

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
async def list_alerts() -> list[Alert]:
    from app.main import get_storage

    storage = get_storage()
    return await storage.alerts.list_all()


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str) -> Alert:
    from app.main import get_storage

    storage = get_storage()
    alert = await storage.alerts.get(alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    # Create a new Alert with acknowledged=True (frozen model)
    updated = Alert(**{**alert.model_dump(), "acknowledged": True})
    await storage.alerts.put(alert_id, updated)
    return updated
