"""Connection management endpoints."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.listener.connection_state import BLEScanResult, ConnectionState

router = APIRouter(prefix="/connection", tags=["connection"])


class SwitchRequest(BaseModel):
    connection_type: str
    serial_port: str = "/dev/ttyUSB0"
    tcp_host: str = "localhost"
    tcp_port: int = 4403
    ble_address: str | None = None
    broker_host: str = "localhost"
    broker_port: int = 1883
    mqtt_username: str | None = None
    mqtt_password: str | None = None
    mqtt_topic: str = "msh/+/2/json/#"
    mqtt_tls: bool = False


@router.get("/status")
async def connection_status() -> ConnectionState:
    from app.main import get_connection_manager

    mgr = get_connection_manager()
    return mgr.state


@router.post("/switch")
async def connection_switch(req: SwitchRequest) -> ConnectionState:
    from app.main import get_connection_manager

    mgr = get_connection_manager()
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(
            None,
            lambda: mgr.connect(
                connection_type=req.connection_type,
                serial_port=req.serial_port,
                tcp_host=req.tcp_host,
                tcp_port=req.tcp_port,
                ble_address=req.ble_address,
                broker_host=req.broker_host,
                broker_port=req.broker_port,
                mqtt_username=req.mqtt_username,
                mqtt_password=req.mqtt_password,
                mqtt_topic=req.mqtt_topic,
                mqtt_tls=req.mqtt_tls,
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return mgr.state


@router.get("/scan")
async def connection_scan() -> list[BLEScanResult]:
    from app.main import get_connection_manager

    mgr = get_connection_manager()
    loop = asyncio.get_running_loop()
    try:
        results = await loop.run_in_executor(None, mgr.scan_ble)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"BLE scan failed: {e}")
    return results
