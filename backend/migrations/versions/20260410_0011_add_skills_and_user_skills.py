"""add skills and user_skills

Revision ID: 20260410_0011
Revises: 20260405_0010
Create Date: 2026-04-10

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260410_0011"
down_revision = "20260405_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "skills",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_skills"),
        sa.UniqueConstraint("name", name="uq_skills_name"),
        schema="public",
    )

    op.create_table(
        "user_skills",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("skill_id", sa.BigInteger(), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("years", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["public.profiles.id"],
            name="fk_user_skills_user_id_profiles",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["skill_id"],
            ["public.skills.id"],
            name="fk_user_skills_skill_id_skills",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", "skill_id", name="pk_user_skills"),
        sa.CheckConstraint("level >= 1 and level <= 5", name="ck_user_skills_level"),
        sa.CheckConstraint("years >= 0", name="ck_user_skills_years"),
        schema="public",
    )

    op.create_index(
        "ix_user_skills_user_id",
        "user_skills",
        ["user_id"],
        unique=False,
        schema="public",
    )
    op.create_index(
        "ix_user_skills_skill_id",
        "user_skills",
        ["skill_id"],
        unique=False,
        schema="public",
    )


def downgrade() -> None:
    op.drop_index("ix_user_skills_skill_id", table_name="user_skills", schema="public")
    op.drop_index("ix_user_skills_user_id", table_name="user_skills", schema="public")
    op.drop_table("user_skills", schema="public")
    op.drop_table("skills", schema="public")
