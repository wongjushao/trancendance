"""add professional fields to profiles

Revision ID: 20260405_0010
Revises: 20260405_0009
Create Date: 2026-04-05

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260405_0010"
down_revision = "20260405_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("professional_summary", sa.Text(), nullable=True), schema="public")
    op.add_column("profiles", sa.Column("department", sa.Text(), nullable=True), schema="public")
    op.add_column("profiles", sa.Column("years_of_experience", sa.Text(), nullable=True), schema="public")


def downgrade() -> None:
    op.drop_column("profiles", "years_of_experience", schema="public")
    op.drop_column("profiles", "department", schema="public")
    op.drop_column("profiles", "professional_summary", schema="public")
