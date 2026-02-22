"""Root / health check endpoint."""

import os

from fastapi import APIRouter
from importlib.metadata import version

router = APIRouter()


@router.get("/")
async def health_check():
    return {
        "status": "ok",
        "service": "leashline",
        "version": version("app"),
        "stage": os.environ.get("SST_STAGE", "local"),
    }
