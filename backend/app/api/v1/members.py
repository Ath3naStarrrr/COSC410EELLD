from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.schemas.common import Page
from app.schemas.members import MemberRead
from app.services.gigs import list_members

router = APIRouter(prefix="/members", tags=["members"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", response_model=Page[MemberRead])
def read_members(
    session: SessionDep,
    q: str | None = None,
    sort: Literal["name", "-name"] = "name",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
) -> Page[MemberRead]:
    return list_members(
        session,
        query=q,
        sort=sort,
        page=page,
        page_size=page_size,
    )
