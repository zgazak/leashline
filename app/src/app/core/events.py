"""In-process async event bus backed by asyncio.Queue."""

from __future__ import annotations

import asyncio
from typing import Any


class EventBus:
    """Simple pub/sub event bus using asyncio queues.

    Supports multiple subscribers per topic. Each subscriber gets its own queue.
    """

    def __init__(self) -> None:
        self._subscribers: dict[str, list[asyncio.Queue[Any]]] = {}

    def subscribe(self, topic: str) -> asyncio.Queue[Any]:
        """Create a new subscription queue for a topic."""
        q: asyncio.Queue[Any] = asyncio.Queue()
        self._subscribers.setdefault(topic, []).append(q)
        return q

    def unsubscribe(self, topic: str, queue: asyncio.Queue[Any]) -> None:
        """Remove a subscription queue."""
        subs = self._subscribers.get(topic, [])
        if queue in subs:
            subs.remove(queue)

    async def publish(self, topic: str, data: Any) -> None:
        """Publish data to all subscribers of a topic."""
        for q in self._subscribers.get(topic, []):
            await q.put(data)

    def publish_nowait(self, topic: str, data: Any) -> None:
        """Non-blocking publish (for use from sync/threaded code)."""
        for q in self._subscribers.get(topic, []):
            q.put_nowait(data)
