"""add enabled_mfa to profiles

Revision ID: 20260415_0014
Revises: 20260415_0013
Create Date: 2026-04-15

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260415_0014"
down_revision = "20260415_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "profiles",
        sa.Column("enabled_mfa", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        schema="public",
    )


def downgrade() -> None:
    op.drop_column("profiles", "enabled_mfa", schema="public")
