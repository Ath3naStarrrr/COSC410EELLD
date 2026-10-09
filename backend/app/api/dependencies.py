from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException

from app.services.gigs import GigViewer, ViewerRole


@dataclass(frozen=True)
class DemoActor:
    viewer: GigViewer


def get_actor(
    role: Annotated[str | None, Header(alias="X-Demo-Role")] = None,
    member_id: Annotated[int | None, Header(alias="X-Demo-Member-Id")] = None,
) -> DemoActor:
    if role == ViewerRole.MANAGER.value:
        return DemoActor(viewer=GigViewer(role=ViewerRole.MANAGER))
    if role == ViewerRole.MEMBER.value and member_id is not None:
        return DemoActor(
            viewer=GigViewer(role=ViewerRole.MEMBER, member_id=member_id)
        )
    raise HTTPException(status_code=401, detail="Choose a demo role to continue.")


def require_manager(actor: Annotated[DemoActor, Depends(get_actor)]) -> DemoActor:
    if actor.viewer.role is not ViewerRole.MANAGER:
        raise HTTPException(status_code=403, detail="Manager access is required.")
    return actor
