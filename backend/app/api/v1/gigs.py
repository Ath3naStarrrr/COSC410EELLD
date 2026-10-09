from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session

from app.api.dependencies import DemoActor, get_actor, require_manager
from app.core.database import get_session
from app.core.errors import GigNotVisibleError, UnknownMembersError
from app.schemas.common import Page
from app.schemas.gigs import GigCreate, GigDetail, GigSummary
from app.services.gigs import create_gig, get_gig, list_gigs

router = APIRouter(prefix="/gigs", tags=["gigs"])
SessionDep = Annotated[Session, Depends(get_session)]
ActorDep = Annotated[DemoActor, Depends(get_actor)]
ManagerDep = Annotated[DemoActor, Depends(require_manager)]


@router.get("", response_model=Page[GigDetail | GigSummary])
def read_gigs(
    session: SessionDep,
    actor: ActorDep,
    q: str | None = None,
    sort: Literal["date", "-date", "venue", "-venue"] = "date",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
) -> Page[GigDetail | GigSummary]:
    return list_gigs(
        session,
        actor.viewer,
        query=q,
        sort=sort,
        page=page,
        page_size=page_size,
    )


@router.get("/{gig_id}", response_model=GigDetail, name="read_gig")
def read_gig(gig_id: int, session: SessionDep, actor: ActorDep) -> GigDetail:
    try:
        return get_gig(session, actor.viewer, gig_id)
    except GigNotVisibleError as error:
        raise HTTPException(status_code=404, detail="Gig not found.") from error


@router.post("", response_model=GigDetail, status_code=201)
def add_gig(
    payload: GigCreate,
    request: Request,
    response: Response,
    session: SessionDep,
    _: ManagerDep,
) -> GigDetail:
    try:
        gig = create_gig(session, payload)
    except UnknownMembersError as error:
        raise HTTPException(
            status_code=404, detail="A selected member was not found."
        ) from error
    response.headers["Location"] = str(request.url_for("read_gig", gig_id=gig.id))
    return gig
