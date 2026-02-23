"""Detection diagnostics endpoint."""

from fastapi import APIRouter, Depends

from app.auth.deps import get_current_user, get_pack_id
from app.auth.models import UserInfo
from engine.models.detection_status import DetectionStatus

router = APIRouter(prefix="/detection", tags=["detection"])


@router.get("/status")
async def detection_status(
    user: UserInfo = Depends(get_current_user),
    pack_id: str = Depends(get_pack_id),
) -> dict[str, DetectionStatus]:
    """Return current detection pipeline status for all tracked dogs."""
    from app.processor import get_detector

    detector = get_detector()
    if detector is None:
        return {}
    return detector.get_all_detection_statuses()
