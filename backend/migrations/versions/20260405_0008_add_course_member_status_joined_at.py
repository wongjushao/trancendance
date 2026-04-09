"""add joined_at and status to course_members

Revision ID: 20260405_0008
Revises: 20260405_0007
Create Date: 2026-04-05

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260405_0008"
down_revision = "20260405_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "course_members",
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("now()")),
        schema="public",
    )
    op.add_column(
        "course_members",
        sa.Column("status", sa.Text(), nullable=True, server_default=sa.text("'active'")),
        schema="public",
    )

    # Backfill then enforce NOT NULL.
    op.execute("UPDATE public.course_members SET joined_at = COALESCE(joined_at, now())")
    op.execute("UPDATE public.course_members SET status = COALESCE(status, 'active')")

    op.alter_column(
        "course_members",
        "joined_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
        schema="public",
    )
    op.alter_column(
        "course_members",
        "status",
        existing_type=sa.Text(),
        nullable=False,
        schema="public",
    )

    op.create_check_constraint(
        "ck_course_members_status",
        "course_members",
        "status in ('active','dropped','completed')",
        schema="public",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_course_members_status",
        "course_members",
        type_="check",
        schema="public",
    )

    op.drop_column("course_members", "status", schema="public")
    op.drop_column("course_members", "joined_at", schema="public")