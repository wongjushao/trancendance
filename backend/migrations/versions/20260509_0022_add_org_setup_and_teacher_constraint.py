# backend/migrations/versions/20260509_0022_add_org_setup_and_teacher_constraint.py
"""add org setup complete and unique teacher/admin constraint

Revision ID: 20260509_0022
Revises: 20260508_0021
Create Date: 2026-05-09 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = '20260509_0022'
down_revision = '20260508_0021'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    org_cols = [c["name"] for c in inspector.get_columns("organizations", schema="public")]

    # Column may already exist if applied manually or from a partial failed run
    if "is_setup_complete" not in org_cols:
        op.add_column(
            "organizations",
            sa.Column("is_setup_complete", sa.Boolean(), server_default=sa.text("false"), nullable=False),
            schema="public",
        )

    # Unique partial index: at most one teaching/admin row per (user_id, organization_id)
    # IF NOT EXISTS keeps re-runs safe; avoid CONCURRENTLY so this runs inside Alembic's transaction
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_organization_members_unique_teaching
        ON public.organization_members (user_id, organization_id)
        WHERE member_role IN ('teacher', 'admin', 'sub_admin')
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS public.uq_organization_members_unique_teaching")

    bind = op.get_bind()
    inspector = inspect(bind)
    org_cols = [c["name"] for c in inspector.get_columns("organizations", schema="public")]
    if "is_setup_complete" in org_cols:
        op.drop_column("organizations", "is_setup_complete", schema="public")