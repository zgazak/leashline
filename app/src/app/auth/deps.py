"""FastAPI auth dependencies — Clerk JWT verification or dev-mode bypass."""

from __future__ import annotations

import logging

from fastapi import Depends, HTTPException, Query, Request

from app.auth.models import UserInfo

logger = logging.getLogger(__name__)


def _get_auth_config():
    from app.main import get_config

    return get_config().auth


async def get_current_user(request: Request) -> UserInfo:
    """Validate JWT and return UserInfo. In dev_mode, returns a synthetic user."""
    auth_cfg = _get_auth_config()

    if not auth_cfg.enabled or auth_cfg.dev_mode:
        return UserInfo(
            user_id=auth_cfg.dev_user_id,
            session_id="dev-session",
            email="dev@leashline.local",
        )

    # Extract Bearer token
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")

    try:
        from clerk_backend_api import Clerk
        from clerk_backend_api.jwks_helpers import authenticate_request

        clerk = Clerk(bearer_auth=auth_cfg.clerk.secret_key)
        request_state = authenticate_request(
            clerk,
            request,
        )

        if not request_state.is_signed_in:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        claims = request_state.payload
        return UserInfo(
            user_id=claims.get("sub", ""),
            session_id=claims.get("sid"),
            email=claims.get("email"),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("JWT verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Authentication failed") from e


async def get_optional_user(request: Request) -> UserInfo | None:
    """Same as get_current_user but returns None instead of 401."""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


async def verify_token_param(
    request: Request,
    token: str = Query(default=""),
) -> UserInfo:
    """For SSE endpoints where EventSource can't send headers.

    Validates a JWT passed as ?token= query parameter.
    """
    auth_cfg = _get_auth_config()

    if not auth_cfg.enabled or auth_cfg.dev_mode:
        return UserInfo(
            user_id=auth_cfg.dev_user_id,
            session_id="dev-session",
            email="dev@leashline.local",
        )

    if not token:
        raise HTTPException(status_code=401, detail="Missing token parameter")

    # Inject token as Authorization header for Clerk's authenticate_request
    from starlette.datastructures import MutableHeaders

    scope = dict(request.scope)
    headers = MutableHeaders(scope=scope)
    headers["Authorization"] = f"Bearer {token}"

    try:
        from clerk_backend_api import Clerk
        from clerk_backend_api.jwks_helpers import authenticate_request

        clerk = Clerk(bearer_auth=auth_cfg.clerk.secret_key)
        # Create a new request with the injected header
        modified_request = Request(scope, request.receive, request._send)
        request_state = authenticate_request(clerk, modified_request)

        if not request_state.is_signed_in:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        claims = request_state.payload
        return UserInfo(
            user_id=claims.get("sub", ""),
            session_id=claims.get("sid"),
            email=claims.get("email"),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("SSE token verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Authentication failed") from e


async def get_pack_id(user: UserInfo = Depends(get_current_user)) -> str:
    """Look up the user's pack. Returns 'local' when auth is disabled."""
    auth_cfg = _get_auth_config()

    if not auth_cfg.enabled:
        return "local"

    from app.main import get_storage

    storage = get_storage()
    pack_id = await storage.packs.get_user_pack_id(user.user_id)
    if not pack_id:
        raise HTTPException(status_code=403, detail="User does not belong to a pack")
    return pack_id


async def get_pack_id_from_token(user: UserInfo = Depends(verify_token_param)) -> str:
    """Same as get_pack_id but uses token param (for SSE endpoints)."""
    auth_cfg = _get_auth_config()

    if not auth_cfg.enabled:
        return "local"

    from app.main import get_storage

    storage = get_storage()
    pack_id = await storage.packs.get_user_pack_id(user.user_id)
    if not pack_id:
        raise HTTPException(status_code=403, detail="User does not belong to a pack")
    return pack_id
