"""add user blocks

Revision ID: 20260507_0020
Revises: 20260430_0019
Create Date: 2026-05-07 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '20260507_0020'
down_revision = '20260430_0019'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'user_blocks',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('blocker_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('blocked_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['blocked_id'], ['public.profiles.id']),
        sa.ForeignKeyConstraint(['blocker_id'], ['public.profiles.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('blocker_id', 'blocked_id', name='uq_user_blocks_blocker_blocked'),
        schema='public',
    )
