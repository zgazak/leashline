"""Push notification subscription models."""

from pydantic import BaseModel, Field


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscription(BaseModel):
    id: str = Field(description="Unique subscription identifier")
    endpoint: str = Field(description="Push service endpoint URL")
    keys: PushSubscriptionKeys
