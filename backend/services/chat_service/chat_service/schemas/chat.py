from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RoomActionSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    room_id: int = Field(..., gt=0)


class SendMessageSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    room_id: int = Field(..., gt=0)
    content: str = Field(..., min_length=1, max_length=4000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message content cannot be empty")
        return value


class MessageHistoryQuerySchema(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=100)
