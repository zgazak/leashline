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
    data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS geofences (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS positions (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
);
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


class SqliteStorage:
    """Aggregates all repositories backed by a single SQLite database."""

    def __init__(self, db: aiosqlite.Connection) -> None:
        from engine.models.alert import Alert
        from engine.models.dog import CollarDevice, DogProfile
        from engine.models.geofence import Geofence
        from engine.models.position import TrackPoint

        self.dogs = SqliteRepository(db, "dogs", DogProfile)
        self.devices = SqliteRepository(db, "devices", CollarDevice)
        self.geofences = SqliteRepository(db, "geofences", Geofence)
        self.positions = SqliteRepository(db, "positions", TrackPoint)
        self.alerts = SqliteRepository(db, "alerts", Alert)
        self._db = db

    @classmethod
    async def create(cls, db_path: str = "leashline.db") -> SqliteStorage:
        """Open (or create) the database and initialize schema."""
        db = await aiosqlite.connect(db_path)
        await db.executescript(SCHEMA)
        return cls(db)

    async def close(self) -> None:
        await self._db.close()
