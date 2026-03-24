"""add onboarded to profiles

Revision ID: 20260324_0003
Revises: 20260301_0002
Create Date: 2026-03-24 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260324_0003'
down_revision = '20260301_0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('profiles', sa.Column('onboarded', sa.Boolean(), server_default=sa.text('false'), nullable=False), schema='public')


def downgrade() -> None:
    op.drop_column('profiles', 'onboarded', schema='public')
