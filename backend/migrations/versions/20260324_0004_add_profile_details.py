"""add profile details

Revision ID: 20260324_0004
Revises: 20260324_0003
Create Date: 2026-03-24 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260324_0004'
down_revision = '20260324_0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('profiles', sa.Column('first_name', sa.Text(), nullable=True), schema='public')
    op.add_column('profiles', sa.Column('last_name', sa.Text(), nullable=True), schema='public')
    op.add_column('profiles', sa.Column('job_title', sa.Text(), nullable=True), schema='public')
    op.add_column('profiles', sa.Column('interests', postgresql.JSONB(astext_type=sa.Text()), nullable=True), schema='public')


def downgrade() -> None:
    op.drop_column('profiles', 'interests', schema='public')
    op.drop_column('profiles', 'job_title', schema='public')
    op.drop_column('profiles', 'last_name', schema='public')
    op.drop_column('profiles', 'first_name', schema='public')
