"""add admin messages

Revision ID: 0016
Revises: 0015
Create Date: 2026-04-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '20260424_0016'
down_revision = '20260421_0015'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'admin_messages',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('subject', sa.Text(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('status', sa.Text(), server_default=sa.text("'open'"), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['sender_id'], ['public.profiles.id']),
        sa.PrimaryKeyConstraint('id'),
        schema='public',
    )


def downgrade():
    op.drop_table('admin_messages', schema='public')