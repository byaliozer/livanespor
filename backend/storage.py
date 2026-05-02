"""
Emergent Object Storage helper.
- init once at startup (session-scoped storage_key)
- upload bytes, retrieve bytes
- DB is source of truth; no delete/rename API (soft-delete in DB only)
"""
import os
import logging
import uuid
from typing import Optional, Tuple

import httpx

logger = logging.getLogger(__name__)

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
APP_NAME = os.environ.get("APP_STORAGE_PREFIX", "livanespor")

_storage_key: Optional[str] = None


async def init_storage() -> Optional[str]:
    """Initialize (or re-initialize) session storage_key. Safe to call multiple times."""
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY not set; object storage disabled")
        return None
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY})
            resp.raise_for_status()
            _storage_key = resp.json()["storage_key"]
            logger.info("Object storage initialized.")
            return _storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None


async def _reinit_and_retry(method, *args, **kwargs):
    """On 403 re-init the key and retry once."""
    global _storage_key
    _storage_key = None
    await init_storage()
    return await method(*args, **kwargs)


async def put_bytes(path: str, data: bytes, content_type: str = "image/png") -> dict:
    """Upload bytes. Returns {'path': ..., 'size': ..., 'etag': ...}."""
    key = await init_storage()
    if not key:
        raise RuntimeError("Object storage not available (missing EMERGENT_LLM_KEY)")
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            content=data,
        )
        if resp.status_code == 403:
            # Refresh key and try once more
            global _storage_key
            _storage_key = None
            key = await init_storage()
            if not key:
                raise RuntimeError("Storage re-init failed")
            resp = await client.put(
                f"{STORAGE_URL}/objects/{path}",
                headers={"X-Storage-Key": key, "Content-Type": content_type},
                content=data,
            )
        resp.raise_for_status()
        return resp.json()


async def get_bytes(path: str) -> Tuple[bytes, str]:
    """Fetch object. Returns (content, content_type)."""
    key = await init_storage()
    if not key:
        raise RuntimeError("Object storage not available")
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
        )
        if resp.status_code == 403:
            global _storage_key
            _storage_key = None
            key = await init_storage()
            resp = await client.get(
                f"{STORAGE_URL}/objects/{path}",
                headers={"X-Storage-Key": key},
            )
        resp.raise_for_status()
        return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def new_path(purpose: str = "media", ext: str = "png") -> str:
    """Build a unique storage path: livanespor/<purpose>/<yyyymm>/<uuid>.<ext>"""
    from datetime import datetime, timezone
    ym = datetime.now(timezone.utc).strftime("%Y%m")
    return f"{APP_NAME}/{purpose}/{ym}/{uuid.uuid4().hex}.{ext}"
