from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import BandSize, GigStatus


class ScheduleItemCreate(BaseModel):
    label: str = Field(min_length=1, max_length=80)
    time: time


class ScheduleItemRead(ScheduleItemCreate):
    model_config = ConfigDict(from_attributes=True)


class GigCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    venue: str = Field(min_length=1, max_length=160)
    date: date
    pay: str = Field(min_length=1, max_length=160)
    contact: str = Field(min_length=1, max_length=240)
    band_size: BandSize
    required_member_ids: list[int] = Field(default_factory=list)
    schedule: list[ScheduleItemCreate] = Field(default_factory=list)

    @field_validator("required_member_ids")
    @classmethod
    def required_members_are_unique(cls, member_ids: list[int]) -> list[int]:
        if len(member_ids) != len(set(member_ids)):
            raise ValueError("A member can only be selected once.")
        return member_ids


class GigSummary(BaseModel):
    id: int
    venue: str
    date: date
    visibility: Literal["summary"] = "summary"


class GigDetail(BaseModel):
    id: int
    venue: str
    date: date
    pay: str
    contact: str
    band_size: BandSize
    status: GigStatus
    schedule: list[ScheduleItemRead]
    required_members: list[str]
    created_at: datetime
    visibility: Literal["full"] = "full"
