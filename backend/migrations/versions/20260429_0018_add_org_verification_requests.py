"""add organization verification requests

Revision ID: 20260429_0018
Revises: 20260429_0017
Create Date: 2026-04-29 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260429_0018"
down_revision = "20260429_0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organization_verification_requests",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("org_name", sa.Text(), nullable=False),
        sa.Column("admin_email", sa.Text(), nullable=False),
        sa.Column("requested_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("organization_id", sa.BigInteger(), nullable=True),
        sa.CheckConstraint(
            "status in ('pending','verified','expired','cancelled')",
            name="ck_org_verification_requests_status",
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["public.organizations.id"]),
        sa.ForeignKeyConstraint(["requested_by"], ["public.profiles.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_org_verification_requests_token_hash"),
        schema="public",
    )
    op.create_index(
        "ix_org_verification_requests_admin_email",
        "organization_verification_requests",
        ["admin_email"],
        unique=False,
        schema="public",
    )
    op.create_index(
        "ix_org_verification_requests_status",
        "organization_verification_requests",
        ["status"],
        unique=False,
        schema="public",
    )
    op.create_index(
        "ix_org_verification_requests_pending_lookup",
        "organization_verification_requests",
        ["org_name", "admin_email", "status"],
        unique=False,
        schema="public",
    )


def downgrade() -> None:
    op.drop_index("ix_org_verification_requests_pending_lookup", table_name="organization_verification_requests", schema="public")
    op.drop_index("ix_org_verification_requests_status", table_name="organization_verification_requests", schema="public")
    op.drop_index("ix_org_verification_requests_admin_email", table_name="organization_verification_requests", schema="public")
    op.drop_table("organization_verification_requests", schema="public")
