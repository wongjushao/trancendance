"""refactor org domain mapping

Revision ID: 20260325_0006
Revises: 20260324_0005
Create Date: 2026-03-25 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260325_0006'
down_revision = '20260324_0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add slug to organizations
    op.add_column('organizations', sa.Column('slug', sa.Text(), nullable=True), schema='public')
    op.create_unique_constraint('uq_organizations_slug', 'organizations', ['slug'], schema='public')

    # 2. Add a unique constraint (Recommended for auto-joining logic)
    op.create_unique_constraint('uq_organizations_domain', 'organizations', ['domain'], schema='public')

def downgrade() -> None:
    op.drop_table('organization_domains', schema='public')
    op.add_column('organizations', sa.Column('domain', sa.Text(), nullable=True), schema='public')
    op.drop_constraint('uq_organizations_slug', 'organizations', type_='unique', schema='public')
    op.drop_column('organizations', 'slug', schema='public')
