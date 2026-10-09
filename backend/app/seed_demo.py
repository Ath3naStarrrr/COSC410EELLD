from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.member import Member


def seed_demo_members() -> None:
    with SessionLocal() as session:
        if session.scalar(select(Member.id).limit(1)) is None:
            session.add_all(
                [
                    Member(name="Band Member 1"),
                    Member(name="Band Member 2"),
                    Member(name="Band Member 3"),
                ]
            )
            session.commit()


if __name__ == "__main__":
    seed_demo_members()
