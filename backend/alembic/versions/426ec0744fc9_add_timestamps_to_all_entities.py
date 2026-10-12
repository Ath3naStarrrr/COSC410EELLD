"""add timestamps to all entities

Revision ID: 426ec0744fc9
Revises: 0d8f41c2aab3
Create Date: 2026-10-09 17:48:19.342755

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "426ec0744fc9"
down_revision: str | Sequence[str] | None = "0d8f41c2aab3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    for table_name in ("gig_assignments", "gig_schedule_items", "members"):
        columns = {column["name"] for column in inspector.get_columns(table_name)}
        if "created_at" not in columns:
            op.add_column(
                table_name,
                sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            )
        op.execute(
            sa.text(
                f"UPDATE {table_name} SET created_at = CURRENT_TIMESTAMP "
                "WHERE created_at IS NULL"
            )
        )
        with op.batch_alter_table(table_name) as batch_op:
            batch_op.alter_column(
                "created_at",
                existing_type=sa.DateTime(timezone=True),
                nullable=False,
                server_default=None,
            )


def downgrade() -> None:
    op.drop_column("members", "created_at")
    op.drop_column("gig_schedule_items", "created_at")
    op.drop_column("gig_assignments", "created_at")
