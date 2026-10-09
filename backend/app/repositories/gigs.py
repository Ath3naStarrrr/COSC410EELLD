from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.gig import Gig, GigAssignment
from app.models.member import Member


def list_upcoming_gigs(
    session: Session,
    *,
    query: str | None,
    sort: str,
    page: int,
    page_size: int,
) -> tuple[list[Gig], int]:
    filters = [Gig.date >= date.today()]
    if query:
        filters.append(Gig.venue.ilike(f"%{query}%"))

    count = session.scalar(select(func.count()).select_from(Gig).where(*filters)) or 0
    statement = (
        select(Gig)
        .options(
            selectinload(Gig.schedule),
            selectinload(Gig.assignments).selectinload(GigAssignment.member),
        )
        .where(*filters)
    )
    sort_columns = {
        "date": Gig.date,
        "-date": Gig.date.desc(),
        "venue": Gig.venue,
        "-venue": Gig.venue.desc(),
    }
    statement = statement.order_by(sort_columns[sort], Gig.id)
    statement = statement.offset((page - 1) * page_size).limit(page_size)
    return list(session.scalars(statement).unique()), count


def get_gig(session: Session, gig_id: int) -> Gig | None:
    statement = (
        select(Gig)
        .options(
            selectinload(Gig.schedule),
            selectinload(Gig.assignments).selectinload(GigAssignment.member),
        )
        .where(Gig.id == gig_id)
    )
    return session.scalar(statement)


def get_members(session: Session, member_ids: set[int]) -> list[Member]:
    if not member_ids:
        return []
    return list(session.scalars(select(Member).where(Member.id.in_(member_ids))))


def list_members(
    session: Session,
    *,
    query: str | None,
    sort: str,
    page: int,
    page_size: int,
) -> tuple[list[Member], int]:
    statement = select(Member)
    count_statement = select(func.count()).select_from(Member)
    if query:
        statement = statement.where(Member.name.ilike(f"%{query}%"))
        count_statement = count_statement.where(Member.name.ilike(f"%{query}%"))

    count = session.scalar(count_statement) or 0
    sort_column = Member.name.desc() if sort == "-name" else Member.name
    statement = statement.order_by(sort_column, Member.id)
    statement = statement.offset((page - 1) * page_size).limit(page_size)
    return list(session.scalars(statement)), count
