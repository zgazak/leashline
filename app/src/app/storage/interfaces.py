"""Storage repository protocol."""

from __future__ import annotations

from typing import Generic, Protocol, TypeVar, runtime_checkable

T = TypeVar("T")


@runtime_checkable
class Repository(Protocol[T]):
    """Generic key-value repository interface."""

    async def get(self, key: str) -> T | None: ...

    async def list_all(self) -> list[T]: ...

    async def put(self, key: str, value: T) -> None: ...

    async def delete(self, key: str) -> None: ...
