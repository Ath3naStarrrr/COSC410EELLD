from dataclasses import dataclass
from enum import StrEnum

from sqlalchemy.orm import Session

from app.core.errors import GigNotVisibleError, UnknownMembersError
from app.models.gig import Gig, GigAssignment, GigScheduleItem
from app.repositories import gigs as gig_repository
from app.schemas.common import Page
from app.schemas.gigs import GigCreate, GigDetail, GigSummary, ScheduleItemRead
from app.schemas.members import MemberRead


class ViewerRole(StrEnum):
    MANAGER = "manager"
    MEMBER = "member"


@dataclass(frozen=True)
class GigViewer:
    role: ViewerRole
    member_id: int | None = None


def _detail(gig: Gig) -> GigDetail:
    return GigDetail(
        id=gig.id,
        venue=gig.venue,
        date=gig.date,
        pay=gig.pay,
        contact=gig.contact,
        band_size=gig.band_size,
        status=gig.status,
        schedule=[
            ScheduleItemRead(label=item.label, time=item.time)
            for item in sorted(gig.schedule, key=lambda item: item.position)
        ],
        required_members=sorted(
            assignment.member.name for assignment in gig.assignments
        ),
        created_at=gig.created_at,
    )


def list_gigs(
    session: Session,
    viewer: GigViewer,
    *,
    query: str | None,
    sort: str,
    page: int,
    page_size: int,
) -> Page[GigDetail | GigSummary]:
    gigs, total = gig_repository.list_upcoming_gigs(
        session,
        query=query,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    items: list[GigDetail | GigSummary] = []
    for gig in gigs:
        assigned = any(
            assignment.member_id == viewer.member_id for assignment in gig.assignments
        )
        if viewer.role is ViewerRole.MANAGER or assigned:
            items.append(_detail(gig))
        else:
            items.append(GigSummary(id=gig.id, venue=gig.venue, date=gig.date))
    return Page(items=items, total=total, page=page, page_size=page_size)


def get_gig(session: Session, viewer: GigViewer, gig_id: int) -> GigDetail:
    gig = gig_repository.get_gig(session, gig_id)
    if gig is None:
        raise GigNotVisibleError
    assigned = any(
        assignment.member_id == viewer.member_id for assignment in gig.assignments
    )
    if viewer.role is ViewerRole.MEMBER and not assigned:
        raise GigNotVisibleError
    return _detail(gig)


def create_gig(session: Session, payload: GigCreate) -> GigDetail:
    member_ids = set(payload.required_member_ids)
    members = gig_repository.get_members(session, member_ids)
    found_ids = {member.id for member in members}
    if found_ids != member_ids:
        raise UnknownMembersError(member_ids - found_ids)

    gig = Gig(
        venue=payload.venue,
        date=payload.date,
        pay=payload.pay,
        contact=payload.contact,
        band_size=payload.band_size,
    )
    gig.schedule = [
        GigScheduleItem(position=position, label=item.label, time=item.time)
        for position, item in enumerate(payload.schedule)
    ]
    gig.assignments = [GigAssignment(member=member) for member in members]
    session.add(gig)
    session.commit()
    session.refresh(gig)
    return _detail(gig)


def list_members(
    session: Session,
    *,
    query: str | None,
    sort: str,
    page: int,
    page_size: int,
) -> Page[MemberRead]:
    members, total = gig_repository.list_members(
        session,
        query=query,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    return Page(
        items=[MemberRead.model_validate(member) for member in members],
        total=total,
        page=page,
        page_size=page_size,
    )
