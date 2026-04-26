"""add classes

Revision ID: 0015
Revises: 0014
Create Date: 2026-04-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '20260421_0015'
down_revision = '20260415_0014'
branch_labels = None
depends_on = None


def upgrade():
    # create classes table
    op.create_table('classes',
    sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
    sa.Column('module_id', sa.BigInteger(), nullable=False),
    sa.Column('title', sa.Text(), nullable=False),
    sa.Column('order_index', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['module_id'], ['public.modules.id'], ),
    sa.PrimaryKeyConstraint('id'),
    schema='public'
    )
    
    # modify lessons to point to class_id instead of module_id
    op.add_column('lessons', sa.Column('class_id', sa.BigInteger(), nullable=True), schema='public')
    op.drop_constraint('lessons_module_id_fkey', 'lessons', schema='public', type_='foreignkey')
    
    op.create_foreign_key(None, 'lessons', 'classes', ['class_id'], ['id'], source_schema='public', referent_schema='public')
    op.drop_column('lessons', 'module_id', schema='public')


def downgrade():
    # revert lessons
    op.add_column('lessons', sa.Column('module_id', sa.BigInteger(), nullable=True), schema='public')
    op.drop_constraint(None, 'lessons', schema='public', type_='foreignkey')
    op.create_foreign_key('lessons_module_id_fkey', 'lessons', 'modules', ['module_id'], ['id'], source_schema='public', referent_schema='public')
    op.drop_column('lessons', 'class_id', schema='public')
    
    # drop classes
    op.drop_table('classes', schema='public')
