from datetime import date, time
from typing import TYPE_CHECKING

from sqlalchemy import Date, Enum, ForeignKey, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin
from app.models.enums import BandSize, GigStatus

if TYPE_CHECKING:
    from app.models.member import Member


class Gig(Base, CreatedAtMixin):
    __tablename__ = "gigs"

    id: Mapped[int] = mapped_column(primary_key=True)
    venue: Mapped[str] = mapped_column(String(160), nullable=False)
    date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    pay: Mapped[str] = mapped_column(String(160), nullable=False)
    contact: Mapped[str] = mapped_column(String(240), nullable=False)
    band_size: Mapped[BandSize] = mapped_column(
        Enum(
            BandSize,
            native_enum=False,
            values_callable=lambda values: [value.value for value in values],
        ),
        nullable=False,
    )
    status: Mapped[GigStatus] = mapped_column(
        Enum(
            GigStatus,
            native_enum=False,
            values_callable=lambda values: [value.value for value in values],
        ),
        default=GigStatus.BOOKED,
        nullable=False,
    )
    schedule: Mapped[list["GigScheduleItem"]] = relationship(
        back_populates="gig",
        cascade="all, delete-orphan",
        order_by="GigScheduleItem.position",
    )
    assignments: Mapped[list["GigAssignment"]] = relationship(
        back_populates="gig", cascade="all, delete-orphan"
    )


class GigAssignment(Base):
    __tablename__ = "gig_assignments"

    gig_id: Mapped[int] = mapped_column(
        ForeignKey("gigs.id", ondelete="CASCADE"), primary_key=True
    )
    member_id: Mapped[int] = mapped_column(
        ForeignKey("members.id", ondelete="CASCADE"), primary_key=True
    )
    gig: Mapped[Gig] = relationship(back_populates="assignments")
    member: Mapped["Member"] = relationship(back_populates="assignments")


class GigScheduleItem(Base):
    __tablename__ = "gig_schedule_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    gig_id: Mapped[int] = mapped_column(
        ForeignKey("gigs.id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[str] = mapped_column(String(80), nullable=False)
    time: Mapped[time] = mapped_column(Time, nullable=False)
    gig: Mapped[Gig] = relationship(back_populates="schedule")
