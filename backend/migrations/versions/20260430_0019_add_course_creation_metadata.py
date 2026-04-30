"""add course creation metadata

Revision ID: 20260430_0019
Revises: 20260429_0018
Create Date: 2026-04-30 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260430_0019"
down_revision = "20260429_0018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column("learning_objectives", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        schema="public",
    )
    op.add_column(
        "courses",
        sa.Column("prerequisites", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        schema="public",
    )
    op.add_column(
        "courses",
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        schema="public",
    )
    op.create_check_constraint(
        "ck_courses_visibility",
        "courses",
        "visibility in ('public','org','private')",
        schema="public",
    )


def downgrade() -> None:
    op.drop_constraint("ck_courses_visibility", "courses", type_="check", schema="public")
    op.drop_column("courses", "tags", schema="public")
    op.drop_column("courses", "prerequisites", schema="public")
    op.drop_column("courses", "learning_objectives", schema="public")
