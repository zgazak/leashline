"""DynamoDB storage backend using single-table design.

Table schema (single table, e.g. "leashline"):
    PK (partition key)    SK (sort key)         Purpose
    ─────────────────────────────────────────────────────
    PACK#{pack_id}        DOG#{id}              Dog profiles
    PACK#{pack_id}        DEVICE#{id}           Collar devices
    PACK#{pack_id}        GEOFENCE#{id}         Geofences
    PACK#{pack_id}        POSITION#{id}         Track points
    PACK#{pack_id}        ALERT#{id}            Alerts
    PACK#{pack_id}        PUSHSUB#{id}          Push subscriptions
    PACK#{pack_id}        TELEMETRY#{id}        Device telemetry
    PACK#{pack_id}        NOISEPROFILE#{id}     GPS noise profiles
    PACK#{pack_id}        #META                 Pack metadata
    PACK#{pack_id}        MEMBER#{user_id}      Pack members
    INVITE#{code}         INVITE#{code}         Pack invites

GSI "gsi1" for user→pack lookup:
    gsi1pk=USER#{user_id}  →  returns the MEMBER item with PK=PACK#{pack_id}
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import TypeVar

import aioboto3
from botocore.config import Config as BotoConfig
from pydantic import BaseModel

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

GSI_NAME = "gsi1"


@lru_cache(maxsize=1)
def _get_session() -> aioboto3.Session:
    return aioboto3.Session()


def _client_kwargs(
    config: BotoConfig, endpoint_url: str | None = None
) -> dict:
    kw: dict = {"config": config}
    if endpoint_url:
        kw["endpoint_url"] = endpoint_url
    return kw


class DynamoTenantRepository:
    """Tenant-scoped repository backed by a DynamoDB single-table.

    Stores Pydantic models as JSON strings in a ``data`` attribute,
    keyed by PK=PACK#{pack_id} and SK={PREFIX}#{entity_id}.
    """

    def __init__(
        self,
        session: aioboto3.Session,
        config: BotoConfig,
        table_name: str,
        prefix: str,
        model_cls: type[T],
        endpoint_url: str | None = None,
    ) -> None:
        self._session = session
        self._ckw = _client_kwargs(config, endpoint_url)
        self._table = table_name
        self._prefix = prefix
        self._model_cls = model_cls

    # ── Tenant-scoped operations ─────────────────────────────────────

    async def list_for_pack(self, pack_id: str) -> list[T]:
        items: list[T] = []
        async with self._session.client("dynamodb", **self._ckw) as client:
            params: dict = {
                "TableName": self._table,
                "KeyConditionExpression": "PK = :pk AND begins_with(SK, :prefix)",
                "ExpressionAttributeValues": {
                    ":pk": {"S": f"PACK#{pack_id}"},
                    ":prefix": {"S": f"{self._prefix}#"},
                },
            }
            while True:
                resp = await client.query(**params)
                for item in resp.get("Items", []):
                    items.append(self._model_cls.model_validate_json(item["data"]["S"]))
                if "LastEvaluatedKey" not in resp:
                    break
                params["ExclusiveStartKey"] = resp["LastEvaluatedKey"]
        return items

    async def get_for_pack(self, key: str, pack_id: str) -> T | None:
        async with self._session.client("dynamodb", **self._ckw) as client:
            resp = await client.get_item(
                TableName=self._table,
                Key={
                    "PK": {"S": f"PACK#{pack_id}"},
                    "SK": {"S": f"{self._prefix}#{key}"},
                },
            )
            item = resp.get("Item")
            if not item:
                return None
            return self._model_cls.model_validate_json(item["data"]["S"])

    async def put(self, key: str, value: T, pack_id: str = "local") -> None:  # type: ignore[override]
        async with self._session.client("dynamodb", **self._ckw) as client:
            await client.put_item(
                TableName=self._table,
                Item={
                    "PK": {"S": f"PACK#{pack_id}"},
                    "SK": {"S": f"{self._prefix}#{key}"},
                    "data": {"S": value.model_dump_json()},
                },
            )

    async def delete_for_pack(self, key: str, pack_id: str) -> None:
        async with self._session.client("dynamodb", **self._ckw) as client:
            await client.delete_item(
                TableName=self._table,
                Key={
                    "PK": {"S": f"PACK#{pack_id}"},
                    "SK": {"S": f"{self._prefix}#{key}"},
                },
            )

    # ── Non-tenant convenience methods (default to "local" pack) ─────

    async def get(self, key: str) -> T | None:
        return await self.get_for_pack(key, "local")

    async def list_all(self) -> list[T]:
        items: list[T] = []
        async with self._session.client("dynamodb", **self._ckw) as client:
            params: dict = {
                "TableName": self._table,
                "FilterExpression": "begins_with(SK, :prefix)",
                "ExpressionAttributeValues": {":prefix": {"S": f"{self._prefix}#"}},
            }
            while True:
                resp = await client.scan(**params)
                for item in resp.get("Items", []):
                    items.append(self._model_cls.model_validate_json(item["data"]["S"]))
                if "LastEvaluatedKey" not in resp:
                    break
                params["ExclusiveStartKey"] = resp["LastEvaluatedKey"]
        return items

    async def delete(self, key: str) -> None:
        await self.delete_for_pack(key, "local")


class DynamoPackRepository:
    """Pack management repository using DynamoDB single-table design.

    Pack metadata:  PK=PACK#{pack_id}, SK=#META
    Members:        PK=PACK#{pack_id}, SK=MEMBER#{user_id}, gsi1pk=USER#{user_id}
    Invites:        PK=INVITE#{code},  SK=INVITE#{code}
    """

    def __init__(
        self,
        session: aioboto3.Session,
        config: BotoConfig,
        table_name: str,
        endpoint_url: str | None = None,
    ) -> None:
        self._session = session
        self._ckw = _client_kwargs(config, endpoint_url)
        self._table = table_name

    # ── Packs ────────────────────────────────────────────────────────

    async def get_pack(self, pack_id: str):
        from app.models.pack import Pack

        async with self._session.client("dynamodb", **self._ckw) as client:
            resp = await client.get_item(
                TableName=self._table,
                Key={"PK": {"S": f"PACK#{pack_id}"}, "SK": {"S": "#META"}},
            )
            item = resp.get("Item")
            if not item:
                return None
            return Pack.model_validate_json(item["data"]["S"])

    async def put_pack(self, pack) -> None:
        async with self._session.client("dynamodb", **self._ckw) as client:
            await client.put_item(
                TableName=self._table,
                Item={
                    "PK": {"S": f"PACK#{pack.id}"},
                    "SK": {"S": "#META"},
                    "data": {"S": pack.model_dump_json()},
                },
            )

    # ── Members ──────────────────────────────────────────────────────

    async def get_member(self, pack_id: str, user_id: str):
        from app.models.pack import PackMember

        async with self._session.client("dynamodb", **self._ckw) as client:
            resp = await client.get_item(
                TableName=self._table,
                Key={
                    "PK": {"S": f"PACK#{pack_id}"},
                    "SK": {"S": f"MEMBER#{user_id}"},
                },
            )
            item = resp.get("Item")
            if not item:
                return None
            return PackMember.model_validate_json(item["data"]["S"])

    async def list_members(self, pack_id: str):
        from app.models.pack import PackMember

        members: list = []
        async with self._session.client("dynamodb", **self._ckw) as client:
            params: dict = {
                "TableName": self._table,
                "KeyConditionExpression": "PK = :pk AND begins_with(SK, :prefix)",
                "ExpressionAttributeValues": {
                    ":pk": {"S": f"PACK#{pack_id}"},
                    ":prefix": {"S": "MEMBER#"},
                },
            }
            while True:
                resp = await client.query(**params)
                for item in resp.get("Items", []):
                    members.append(PackMember.model_validate_json(item["data"]["S"]))
                if "LastEvaluatedKey" not in resp:
                    break
                params["ExclusiveStartKey"] = resp["LastEvaluatedKey"]
        return members

    async def get_user_pack_id(self, user_id: str) -> str | None:
        async with self._session.client("dynamodb", **self._ckw) as client:
            resp = await client.query(
                TableName=self._table,
                IndexName=GSI_NAME,
                KeyConditionExpression="gsi1pk = :pk",
                ExpressionAttributeValues={":pk": {"S": f"USER#{user_id}"}},
                Limit=1,
            )
            items = resp.get("Items", [])
            if not items:
                return None
            # PK is "PACK#{pack_id}" — extract the pack_id
            return items[0]["PK"]["S"].removeprefix("PACK#")

    async def put_member(self, member) -> None:
        async with self._session.client("dynamodb", **self._ckw) as client:
            await client.put_item(
                TableName=self._table,
                Item={
                    "PK": {"S": f"PACK#{member.pack_id}"},
                    "SK": {"S": f"MEMBER#{member.user_id}"},
                    "data": {"S": member.model_dump_json()},
                    "gsi1pk": {"S": f"USER#{member.user_id}"},
                },
            )

    async def delete_member(self, pack_id: str, user_id: str) -> None:
        async with self._session.client("dynamodb", **self._ckw) as client:
            await client.delete_item(
                TableName=self._table,
                Key={
                    "PK": {"S": f"PACK#{pack_id}"},
                    "SK": {"S": f"MEMBER#{user_id}"},
                },
            )

    # ── Invites ──────────────────────────────────────────────────────

    async def get_invite(self, code: str):
        from app.models.pack import PackInvite

        async with self._session.client("dynamodb", **self._ckw) as client:
            resp = await client.get_item(
                TableName=self._table,
                Key={
                    "PK": {"S": f"INVITE#{code}"},
                    "SK": {"S": f"INVITE#{code}"},
                },
            )
            item = resp.get("Item")
            if not item:
                return None
            return PackInvite.model_validate_json(item["data"]["S"])

    async def put_invite(self, invite) -> None:
        async with self._session.client("dynamodb", **self._ckw) as client:
            await client.put_item(
                TableName=self._table,
                Item={
                    "PK": {"S": f"INVITE#{invite.code}"},
                    "SK": {"S": f"INVITE#{invite.code}"},
                    "data": {"S": invite.model_dump_json()},
                },
            )


class DynamoStorage:
    """Aggregates all repositories backed by a single DynamoDB table.

    Drop-in replacement for SqliteStorage — same interface for all
    TenantRepository and PackRepository operations.
    """

    def __init__(
        self,
        session: aioboto3.Session,
        config: BotoConfig,
        table_name: str,
        endpoint_url: str | None = None,
    ) -> None:
        from engine.models.alert import Alert
        from engine.models.dog import CollarDevice, DogProfile
        from engine.models.geofence import Geofence
        from engine.models.noise import NoiseProfile
        from engine.models.position import TrackPoint

        from app.models.telemetry import DeviceTelemetry
        from app.notifications.models import PushSubscription

        self.dogs = DynamoTenantRepository(session, config, table_name, "DOG", DogProfile, endpoint_url)
        self.devices = DynamoTenantRepository(session, config, table_name, "DEVICE", CollarDevice, endpoint_url)
        self.geofences = DynamoTenantRepository(session, config, table_name, "GEOFENCE", Geofence, endpoint_url)
        self.positions = DynamoTenantRepository(session, config, table_name, "POSITION", TrackPoint, endpoint_url)
        self.alerts = DynamoTenantRepository(session, config, table_name, "ALERT", Alert, endpoint_url)
        self.push_subscriptions = DynamoTenantRepository(session, config, table_name, "PUSHSUB", PushSubscription, endpoint_url)
        self.telemetry = DynamoTenantRepository(session, config, table_name, "TELEMETRY", DeviceTelemetry, endpoint_url)
        self.noise_profiles = DynamoTenantRepository(session, config, table_name, "NOISEPROFILE", NoiseProfile, endpoint_url)
        self.packs = DynamoPackRepository(session, config, table_name, endpoint_url)
        self._session = session
        self._config = config
        self._table = table_name
        self._endpoint_url = endpoint_url

    async def find_pack_by_device_id(self, device_id: str) -> str | None:
        """Look up which pack owns a device by scanning dog profiles across all packs."""
        from engine.models.dog import DogProfile

        async with self._session.client("dynamodb", **_client_kwargs(self._config, self._endpoint_url)) as client:
            params: dict = {
                "TableName": self._table,
                "FilterExpression": "begins_with(SK, :prefix)",
                "ExpressionAttributeValues": {":prefix": {"S": "DOG#"}},
            }
            while True:
                resp = await client.scan(**params)
                for item in resp.get("Items", []):
                    dog = DogProfile.model_validate_json(item["data"]["S"])
                    if dog.device_id == device_id:
                        return item["PK"]["S"].removeprefix("PACK#")
                if "LastEvaluatedKey" not in resp:
                    break
                params["ExclusiveStartKey"] = resp["LastEvaluatedKey"]
        return None

    @classmethod
    async def create(
        cls,
        table_prefix: str,
        region: str,
        endpoint_url: str | None = None,
    ) -> DynamoStorage:
        """Create the storage instance and verify the table exists."""
        session = _get_session()
        config = BotoConfig(region_name=region)
        table_name = table_prefix
        ckw = _client_kwargs(config, endpoint_url)

        try:
            async with session.client("dynamodb", **ckw) as client:
                await client.describe_table(TableName=table_name)
            logger.info("DynamoDB table '%s' verified in %s", table_name, region)
        except Exception:
            logger.warning(
                "DynamoDB table '%s' not found — create it before deploying. "
                "Required: PK (S), SK (S), GSI '%s' on gsi1pk (S).",
                table_name,
                GSI_NAME,
            )

        return cls(session, config, table_name, endpoint_url)

    async def close(self) -> None:
        pass  # aioboto3 sessions don't need explicit cleanup
