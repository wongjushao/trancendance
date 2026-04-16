"""add user_mfa

Revision ID: 20260415_0013
Revises: 20260411_0012
Create Date: 2026-04-15

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260415_0013"
down_revision = "20260411_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_mfa",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("totp_secret", sa.Text(), nullable=True),
        sa.Column("backup_codes", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["public.profiles.id"],
            name="fk_user_mfa_user_id_profiles",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_user_mfa"),
        sa.UniqueConstraint("user_id", name="uq_user_mfa_user_id"),
        schema="public",
    )


def downgrade() -> None:
    op.drop_table("user_mfa", schema="public")
