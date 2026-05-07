"""chat_room_members last_read_message_id for DM read receipts

Revision ID: 20260508_0021
Revises: 20260507_0020
Create Date: 2026-05-08 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260508_0021'
down_revision = '20260507_0020'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'chat_room_members',
        sa.Column('last_read_message_id', sa.BigInteger(), nullable=True),
        schema='public',
    )
    op.create_foreign_key(
        'fk_chat_room_members_last_read_message_id',
        'chat_room_members',
        'messages',
        ['last_read_message_id'],
        ['id'],
        source_schema='public',
        referent_schema='public',
        ondelete='SET NULL',
    )
