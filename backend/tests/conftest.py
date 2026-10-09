from collections.abc import AsyncIterator, Iterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_session
from app.main import app
from app.models.base import Base
from app.models.member import Member


@pytest.fixture
def test_session_factory() -> Iterator[sessionmaker[Session]]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    with factory() as session:
        session.add_all(
            [
                Member(name="Band Member 1"),
                Member(name="Band Member 2"),
                Member(name="Band Member 3"),
            ]
        )
        session.commit()
    yield factory
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
async def client(
    test_session_factory: sessionmaker[Session],
) -> AsyncIterator[AsyncClient]:
    def get_test_session() -> Iterator[Session]:
        with test_session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = get_test_session
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def manager_headers() -> dict[str, str]:
    return {"X-Demo-Role": "manager"}


@pytest.fixture
def member_headers() -> dict[str, str]:
    return {"X-Demo-Role": "member", "X-Demo-Member-Id": "1"}
