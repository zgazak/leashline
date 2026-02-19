"""Tests for DynamoDB storage backend using moto server."""

from __future__ import annotations

import os
import threading

import aioboto3
import boto3
import pytest
from botocore.config import Config as BotoConfig
from moto.server import ThreadedMotoServer

from app.storage.dynamodb import DynamoStorage, GSI_NAME

REGION = "us-east-1"
TABLE_NAME = "leashline-test"


@pytest.fixture(scope="module")
def moto_server():
    """Start a moto server for the entire test module."""
    server = ThreadedMotoServer(port=0, verbose=False)
    server.start()
    host, port = server.get_host_and_port()
    endpoint_url = f"http://{host}:{port}"

    # Create the table using sync boto3
    client = boto3.client(
        "dynamodb",
        endpoint_url=endpoint_url,
        region_name=REGION,
        aws_access_key_id="testing",
        aws_secret_access_key="testing",
    )
    client.create_table(
        TableName=TABLE_NAME,
        KeySchema=[
            {"AttributeName": "PK", "KeyType": "HASH"},
            {"AttributeName": "SK", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "PK", "AttributeType": "S"},
            {"AttributeName": "SK", "AttributeType": "S"},
            {"AttributeName": "gsi1pk", "AttributeType": "S"},
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": GSI_NAME,
                "KeySchema": [
                    {"AttributeName": "gsi1pk", "KeyType": "HASH"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
        BillingMode="PAY_PER_REQUEST",
    )

    yield endpoint_url

    server.stop()


@pytest.fixture
async def storage(moto_server):
    """Create a DynamoStorage instance pointing at moto server."""
    session = aioboto3.Session(
        aws_access_key_id="testing",
        aws_secret_access_key="testing",
        region_name=REGION,
    )
    config = BotoConfig(region_name=REGION)
    s = DynamoStorage(session, config, TABLE_NAME, endpoint_url=moto_server)

    yield s

    # Clean up all items after each test
    async with session.client("dynamodb", endpoint_url=moto_server, config=config) as client:
        paginator_params = {"TableName": TABLE_NAME}
        while True:
            resp = await client.scan(**paginator_params)
            for item in resp.get("Items", []):
                await client.delete_item(
                    TableName=TABLE_NAME,
                    Key={"PK": item["PK"], "SK": item["SK"]},
                )
            if "LastEvaluatedKey" not in resp:
                break
            paginator_params["ExclusiveStartKey"] = resp["LastEvaluatedKey"]


# ── TenantRepository tests ──────────────────────────────────────────


async def test_put_and_get_for_pack(storage):
    from engine.models.dog import DogProfile

    dog = DogProfile(id="dog1", name="Rex")
    await storage.dogs.put("dog1", dog, pack_id="pack-abc")

    result = await storage.dogs.get_for_pack("dog1", "pack-abc")
    assert result is not None
    assert result.id == "dog1"
    assert result.name == "Rex"


async def test_get_for_pack_not_found(storage):
    result = await storage.dogs.get_for_pack("nonexistent", "pack-abc")
    assert result is None


async def test_get_wrong_pack(storage):
    from engine.models.dog import DogProfile

    dog = DogProfile(id="dog1", name="Rex")
    await storage.dogs.put("dog1", dog, pack_id="pack-abc")

    result = await storage.dogs.get_for_pack("dog1", "pack-other")
    assert result is None


async def test_list_for_pack(storage):
    from engine.models.dog import DogProfile

    await storage.dogs.put("d1", DogProfile(id="d1", name="Rex"), pack_id="p1")
    await storage.dogs.put("d2", DogProfile(id="d2", name="Bella"), pack_id="p1")
    await storage.dogs.put("d3", DogProfile(id="d3", name="Max"), pack_id="p2")

    p1_dogs = await storage.dogs.list_for_pack("p1")
    assert len(p1_dogs) == 2
    names = {d.name for d in p1_dogs}
    assert names == {"Rex", "Bella"}

    p2_dogs = await storage.dogs.list_for_pack("p2")
    assert len(p2_dogs) == 1
    assert p2_dogs[0].name == "Max"


async def test_delete_for_pack(storage):
    from engine.models.dog import DogProfile

    await storage.dogs.put("d1", DogProfile(id="d1", name="Rex"), pack_id="p1")
    await storage.dogs.delete_for_pack("d1", "p1")

    result = await storage.dogs.get_for_pack("d1", "p1")
    assert result is None


async def test_put_overwrites(storage):
    from engine.models.dog import DogProfile

    await storage.dogs.put("d1", DogProfile(id="d1", name="Rex"), pack_id="p1")
    await storage.dogs.put("d1", DogProfile(id="d1", name="Rex Updated"), pack_id="p1")

    result = await storage.dogs.get_for_pack("d1", "p1")
    assert result.name == "Rex Updated"


async def test_non_tenant_get_and_delete(storage):
    """Non-tenant methods use 'local' as default pack_id."""
    from engine.models.dog import DogProfile

    await storage.dogs.put("d1", DogProfile(id="d1", name="Rex"))
    result = await storage.dogs.get("d1")
    assert result is not None
    assert result.name == "Rex"

    await storage.dogs.delete("d1")
    result = await storage.dogs.get("d1")
    assert result is None


async def test_list_all_scans(storage):
    from engine.models.dog import DogProfile

    await storage.dogs.put("d1", DogProfile(id="d1", name="Rex"), pack_id="p1")
    await storage.dogs.put("d2", DogProfile(id="d2", name="Bella"), pack_id="p2")

    all_dogs = await storage.dogs.list_all()
    assert len(all_dogs) == 2


# ── Multiple entity types in same table ─────────────────────────────


async def test_different_entity_types_isolated(storage):
    from engine.models.dog import DogProfile
    from engine.models.geofence import Geofence

    await storage.dogs.put("id1", DogProfile(id="id1", name="Rex"), pack_id="p1")
    await storage.geofences.put(
        "id1",
        Geofence(id="id1", name="Yard", vertices=[]),
        pack_id="p1",
    )

    dogs = await storage.dogs.list_for_pack("p1")
    fences = await storage.geofences.list_for_pack("p1")
    assert len(dogs) == 1
    assert len(fences) == 1
    assert dogs[0].name == "Rex"
    assert fences[0].name == "Yard"


# ── PackRepository tests ────────────────────────────────────────────


async def test_pack_crud(storage):
    from app.models.pack import Pack

    pack = Pack(id="p1", name="The Smiths", mqtt_topic_prefix="leashline/p1", created_by="user1")
    await storage.packs.put_pack(pack)

    result = await storage.packs.get_pack("p1")
    assert result is not None
    assert result.name == "The Smiths"
    assert result.mqtt_topic_prefix == "leashline/p1"


async def test_pack_not_found(storage):
    result = await storage.packs.get_pack("nonexistent")
    assert result is None


async def test_member_crud(storage):
    from app.models.pack import PackMember

    member = PackMember(pack_id="p1", user_id="u1", role="owner")
    await storage.packs.put_member(member)

    result = await storage.packs.get_member("p1", "u1")
    assert result is not None
    assert result.role == "owner"

    members = await storage.packs.list_members("p1")
    assert len(members) == 1

    await storage.packs.delete_member("p1", "u1")
    result = await storage.packs.get_member("p1", "u1")
    assert result is None


async def test_get_user_pack_id(storage):
    from app.models.pack import PackMember

    await storage.packs.put_member(PackMember(pack_id="p1", user_id="u1", role="owner"))

    pack_id = await storage.packs.get_user_pack_id("u1")
    assert pack_id == "p1"


async def test_get_user_pack_id_not_found(storage):
    pack_id = await storage.packs.get_user_pack_id("nonexistent")
    assert pack_id is None


async def test_invite_crud(storage):
    from app.models.pack import PackInvite

    invite = PackInvite(code="ABC123", pack_id="p1", created_by="u1")
    await storage.packs.put_invite(invite)

    result = await storage.packs.get_invite("ABC123")
    assert result is not None
    assert result.pack_id == "p1"


async def test_invite_not_found(storage):
    result = await storage.packs.get_invite("NOPE")
    assert result is None


# ── DynamoStorage.create ────────────────────────────────────────────


async def test_storage_create(moto_server):
    """DynamoStorage.create should verify the table exists."""
    import app.storage.dynamodb as mod

    original = mod._get_session

    # Override _get_session to use test credentials
    mod._get_session = lambda: aioboto3.Session(
        aws_access_key_id="testing",
        aws_secret_access_key="testing",
        region_name=REGION,
    )
    # Clear lru_cache since we replaced the function
    try:
        s = await DynamoStorage.create(TABLE_NAME, REGION, endpoint_url=moto_server)
        assert s.dogs is not None
        assert s.packs is not None
    finally:
        mod._get_session = original


async def test_storage_close(storage):
    """close() should not raise."""
    await storage.close()
