"""add domain to organization

Revision ID: 20260324_0005
Revises: 20260324_0004
Create Date: 2026-03-25 1:22:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260324_0005'
down_revision = '20260324_0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('organizations', sa.Column('domain', sa.Text(), nullable=True), schema='public')


def downgrade() -> None:
    op.drop_column('organizations', 'domain', schema='public')
