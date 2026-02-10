"""SQLite storage implementation using aiosqlite."""

from __future__ import annotations

import json
from pathlib import Path
from typing import TypeVar

import aiosqlite
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

SCHEMA = """
CREATE TABLE IF NOT EXISTS dogs (
    id TEXT PRIMARY KEY,
    pack_id TEXT NOT NULL DEFAULT 'local',
    data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    pack_id TEXT NOT NULL DEFAULT 'local',
    data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS geofences (
    id TEXT PRIMARY KEY,
    pack_id TEXT NOT NULL DEFAULT 'local',
    data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS positions (
    id TEXT PRIMARY KEY,
    pack_id TEXT NOT NULL DEFAULT 'local',
    data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    pack_id TEXT NOT NULL DEFAULT 'local',
    data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS packs (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pack_members (
    pack_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (pack_id, user_id)
);
CREATE TABLE IF NOT EXISTS pack_invites (
    code TEXT PRIMARY KEY,
    data TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dogs_pack ON dogs(pack_id);
CREATE INDEX IF NOT EXISTS idx_devices_pack ON devices(pack_id);
CREATE INDEX IF NOT EXISTS idx_geofences_pack ON geofences(pack_id);
CREATE INDEX IF NOT EXISTS idx_positions_pack ON positions(pack_id);
CREATE INDEX IF NOT EXISTS idx_alerts_pack ON alerts(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_members_user ON pack_members(user_id);
"""


class SqliteRepository:
    """A generic JSON-in-SQLite repository for Pydantic models."""

    def __init__(self, db: aiosqlite.Connection, table: str, model_cls: type[T]) -> None:
        self._db = db
        self._table = table
        self._model_cls = model_cls

    async def get(self, key: str) -> T | None:
        cursor = await self._db.execute(f"SELECT data FROM {self._table} WHERE id = ?", (key,))  # noqa: S608
        row = await cursor.fetchone()
        if row is None:
            return None
        return self._model_cls.model_validate_json(row[0])

    async def list_all(self) -> list[T]:
        cursor = await self._db.execute(f"SELECT data FROM {self._table}")  # noqa: S608
        rows = await cursor.fetchall()
        return [self._model_cls.model_validate_json(row[0]) for row in rows]

    async def put(self, key: str, value: T) -> None:
        data = value.model_dump_json()
        await self._db.execute(
            f"INSERT OR REPLACE INTO {self._table} (id, data) VALUES (?, ?)",  # noqa: S608
            (key, data),
        )
        await self._db.commit()

    async def delete(self, key: str) -> None:
        await self._db.execute(f"DELETE FROM {self._table} WHERE id = ?", (key,))  # noqa: S608
        await self._db.commit()


class TenantRepository(SqliteRepository):
    """Repository with pack_id (tenant) isolation."""

    async def list_for_pack(self, pack_id: str) -> list[T]:
        cursor = await self._db.execute(
            f"SELECT data FROM {self._table} WHERE pack_id = ?",  # noqa: S608
            (pack_id,),
        )
        rows = await cursor.fetchall()
        return [self._model_cls.model_validate_json(row[0]) for row in rows]

    async def get_for_pack(self, key: str, pack_id: str) -> T | None:
        cursor = await self._db.execute(
            f"SELECT data FROM {self._table} WHERE id = ? AND pack_id = ?",  # noqa: S608
            (key, pack_id),
        )
        row = await cursor.fetchone()
        if row is None:
            return None
        return self._model_cls.model_validate_json(row[0])

    async def put(self, key: str, value: T, pack_id: str = "local") -> None:  # type: ignore[override]
        data = value.model_dump_json()
        await self._db.execute(
            f"INSERT OR REPLACE INTO {self._table} (id, pack_id, data) VALUES (?, ?, ?)",  # noqa: S608
            (key, pack_id, data),
        )
        await self._db.commit()

    async def delete_for_pack(self, key: str, pack_id: str) -> None:
        await self._db.execute(
            f"DELETE FROM {self._table} WHERE id = ? AND pack_id = ?",  # noqa: S608
            (key, pack_id),
        )
        await self._db.commit()


class PackRepository:
    """Repository for pack, pack_members, and pack_invites tables."""

    def __init__(self, db: aiosqlite.Connection) -> None:
        self._db = db

    # --- Packs ---

    async def get_pack(self, pack_id: str):
        from app.models.pack import Pack

        cursor = await self._db.execute("SELECT data FROM packs WHERE id = ?", (pack_id,))
        row = await cursor.fetchone()
        if row is None:
            return None
        return Pack.model_validate_json(row[0])

    async def put_pack(self, pack):
        data = pack.model_dump_json()
        await self._db.execute(
            "INSERT OR REPLACE INTO packs (id, data) VALUES (?, ?)",
            (pack.id, data),
        )
        await self._db.commit()

    # --- Members ---

    async def get_member(self, pack_id: str, user_id: str):
        from app.models.pack import PackMember

        cursor = await self._db.execute(
            "SELECT data FROM pack_members WHERE pack_id = ? AND user_id = ?",
            (pack_id, user_id),
        )
        row = await cursor.fetchone()
        if row is None:
            return None
        return PackMember.model_validate_json(row[0])

    async def list_members(self, pack_id: str):
        from app.models.pack import PackMember

        cursor = await self._db.execute(
            "SELECT data FROM pack_members WHERE pack_id = ?",
            (pack_id,),
        )
        rows = await cursor.fetchall()
        return [PackMember.model_validate_json(row[0]) for row in rows]

    async def get_user_pack_id(self, user_id: str) -> str | None:
        cursor = await self._db.execute(
            "SELECT pack_id FROM pack_members WHERE user_id = ?",
            (user_id,),
        )
        row = await cursor.fetchone()
        if row is None:
            return None
        return row[0]

    async def put_member(self, member):
        data = member.model_dump_json()
        await self._db.execute(
            "INSERT OR REPLACE INTO pack_members (pack_id, user_id, data) VALUES (?, ?, ?)",
            (member.pack_id, member.user_id, data),
        )
        await self._db.commit()

    async def delete_member(self, pack_id: str, user_id: str) -> None:
        await self._db.execute(
            "DELETE FROM pack_members WHERE pack_id = ? AND user_id = ?",
            (pack_id, user_id),
        )
        await self._db.commit()

    # --- Invites ---

    async def get_invite(self, code: str):
        from app.models.pack import PackInvite

        cursor = await self._db.execute(
            "SELECT data FROM pack_invites WHERE code = ?",
            (code,),
        )
        row = await cursor.fetchone()
        if row is None:
            return None
        return PackInvite.model_validate_json(row[0])

    async def put_invite(self, invite):
        data = invite.model_dump_json()
        await self._db.execute(
            "INSERT OR REPLACE INTO pack_invites (code, data) VALUES (?, ?)",
            (invite.code, data),
        )
        await self._db.commit()


class SqliteStorage:
    """Aggregates all repositories backed by a single SQLite database."""

    def __init__(self, db: aiosqlite.Connection) -> None:
        from engine.models.alert import Alert
        from engine.models.dog import CollarDevice, DogProfile
        from engine.models.geofence import Geofence
        from engine.models.position import TrackPoint

        self.dogs = TenantRepository(db, "dogs", DogProfile)
        self.devices = TenantRepository(db, "devices", CollarDevice)
        self.geofences = TenantRepository(db, "geofences", Geofence)
        self.positions = TenantRepository(db, "positions", TrackPoint)
        self.alerts = TenantRepository(db, "alerts", Alert)
        self.packs = PackRepository(db)
        self._db = db

    @classmethod
    async def create(cls, db_path: str = "leashline.db") -> SqliteStorage:
        """Open (or create) the database and initialize schema."""
        db = await aiosqlite.connect(db_path)
        await db.executescript(SCHEMA)
        return cls(db)

    async def close(self) -> None:
        await self._db.close()
