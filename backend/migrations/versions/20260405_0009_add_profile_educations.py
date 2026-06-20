"""add profile_educations

Revision ID: 20260405_0009
Revises: 20260405_0008
Create Date: 2026-04-05

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260405_0009"
down_revision = "20260405_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "profile_educations",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("profile_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("institution_name", sa.Text(), nullable=False),
        sa.Column("degree", sa.Text(), nullable=True),
        sa.Column("field_of_study", sa.Text(), nullable=True),
        sa.Column("start_year", sa.Integer(), nullable=True),
        sa.Column("end_year", sa.Integer(), nullable=True),
        sa.Column("is_current", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("order_index", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["profile_id"],
            ["public.profiles.id"],
            name="fk_profile_educations_profile_id_profiles",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_profile_educations"),
        schema="public",
    )

    # Helpful index for lookups and ordering within a profile.
    op.create_index(
        "ix_profile_educations_profile_id_order_index",
        "profile_educations",
        ["profile_id", "order_index"],
        unique=False,
        schema="public",
    )


def downgrade() -> None:
    op.drop_index(
        "ix_profile_educations_profile_id_order_index",
        table_name="profile_educations",
        schema="public",
    )
    op.drop_table("profile_educations", schema="public")
