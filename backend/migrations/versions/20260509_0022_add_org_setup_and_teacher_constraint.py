# backend/migrations/versions/20260509_0022_add_org_setup_and_teacher_constraint.py
"""add org setup complete and unique teacher/admin constraint

Revision ID: 20260509_0022
Revises: 20260508_0021
Create Date: 2026-05-09 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '20260509_0022'
down_revision = '20260508_0021'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_setup_complete to organizations
    op.add_column(
        'organizations',
        sa.Column('is_setup_complete', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        schema='public'
    )
    
    # Add a unique partial index to ensure users have only ONE teacher/admin role per organization
    # This allows users to have multiple student roles, but only one teaching/admin role
    op.execute("""
        CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS 
        uq_organization_members_unique_teaching
        ON public.organization_members (user_id, organization_id)
        WHERE member_role IN ('teacher', 'admin', 'sub_admin')
    """)


def downgrade() -> None:
    op.drop_index('uq_organization_members_unique_teaching', schema='public')
    op.drop_column('organizations', 'is_setup_complete', schema='public')