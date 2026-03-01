from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260301_0002"
down_revision = "20260225_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("birthday", sa.Date(), nullable=True), schema="public")
    op.add_column("profiles", sa.Column("invite_code", sa.Text(), nullable=True), schema="public")
    op.add_column(
        "profiles",
        sa.Column("invited_by", postgresql.UUID(as_uuid=True), nullable=True),
        schema="public",
    )

    op.create_unique_constraint(
        "uq_profiles_invite_code",
        "profiles",
        ["invite_code"],
        schema="public",
    )
    op.create_foreign_key(
        "fk_profiles_invited_by_profiles",
        "profiles",
        "profiles",
        ["invited_by"],
        ["id"],
        source_schema="public",
        referent_schema="public",
    )


def downgrade() -> None:
    op.drop_constraint("fk_profiles_invited_by_profiles", "profiles", schema="public", type_="foreignkey")
    op.drop_constraint("uq_profiles_invite_code", "profiles", schema="public", type_="unique")

    op.drop_column("profiles", "invited_by", schema="public")
    op.drop_column("profiles", "invite_code", schema="public")
    op.drop_column("profiles", "birthday", schema="public")
