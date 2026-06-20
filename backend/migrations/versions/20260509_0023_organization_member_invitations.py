"""add organization_member_invitations

Revision ID: 20260509_0023
Revises: 20260509_0022
Create Date: 2026-05-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260509_0023"
down_revision = "20260509_0022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organization_member_invitations",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.BigInteger(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("member_role", sa.Text(), nullable=False),
        sa.Column("invited_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("personal_message", sa.Text(), nullable=True),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.CheckConstraint(
            "member_role in ('student','teacher','sub_admin')",
            name="ck_organization_member_invitations_member_role",
        ),
        sa.CheckConstraint(
            "status in ('pending','accepted','expired','revoked')",
            name="ck_organization_member_invitations_status",
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["public.organizations.id"]),
        sa.ForeignKeyConstraint(["invited_by"], ["public.profiles.id"]),
        sa.ForeignKeyConstraint(["accepted_user_id"], ["public.profiles.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_organization_member_invitations_token_hash"),
        schema="public",
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_org_member_inv_pending_email_lower
        ON public.organization_member_invitations (organization_id, lower(trim(email)))
        WHERE status = 'pending'
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS public.uq_org_member_inv_pending_email_lower")
    op.drop_table("organization_member_invitations", schema="public")
