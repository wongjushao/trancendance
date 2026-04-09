"""add lesson progress

Revision ID: 20260405_0007
Revises: 20260325_0006
Create Date: 2026-04-05 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260405_0007"
down_revision = "20260325_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lesson_progress",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lesson_id", sa.BigInteger(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'not_started'")),
        sa.Column("progress_percent", sa.Integer(), nullable=True),
        sa.Column("last_accessed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["public.profiles.id"], name="fk_lesson_progress_user_id"),
        sa.ForeignKeyConstraint(["lesson_id"], ["public.lessons.id"], name="fk_lesson_progress_lesson_id"),
        sa.UniqueConstraint("user_id", "lesson_id", name="uq_lesson_progress_user_lesson"),
        schema="public",
    )

    op.create_check_constraint(
        "ck_lesson_progress_status",
        "lesson_progress",
        "status in ('not_started','in_progress','completed')",
        schema="public",
    )
    op.create_check_constraint(
        "ck_lesson_progress_progress_percent",
        "lesson_progress",
        "progress_percent is null or (progress_percent >= 0 and progress_percent <= 100)",
        schema="public",
    )

    # Helpful indexes
    op.create_index(
        "ix_lesson_progress_user_id",
        "lesson_progress",
        ["user_id"],
        unique=False,
        schema="public",
    )
    op.create_index(
        "ix_lesson_progress_lesson_id",
        "lesson_progress",
        ["lesson_id"],
        unique=False,
        schema="public",
    )

    op.execute("ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'lesson_progress'
              AND policyname = 'Lesson progress: users can read own'
          ) THEN
            CREATE POLICY "Lesson progress: users can read own"
              ON public.lesson_progress
              FOR SELECT
              USING (auth.uid() = user_id);
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'lesson_progress'
              AND policyname = 'Lesson progress: users can insert own'
          ) THEN
            CREATE POLICY "Lesson progress: users can insert own"
              ON public.lesson_progress
              FOR INSERT
              WITH CHECK (auth.uid() = user_id);
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'lesson_progress'
              AND policyname = 'Lesson progress: users can update own'
          ) THEN
            CREATE POLICY "Lesson progress: users can update own"
              ON public.lesson_progress
              FOR UPDATE
              USING (auth.uid() = user_id)
              WITH CHECK (auth.uid() = user_id);
          END IF;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute('DROP POLICY IF EXISTS "Lesson progress: users can update own" ON public.lesson_progress')
    op.execute('DROP POLICY IF EXISTS "Lesson progress: users can insert own" ON public.lesson_progress')
    op.execute('DROP POLICY IF EXISTS "Lesson progress: users can read own" ON public.lesson_progress')

    op.drop_index("ix_lesson_progress_lesson_id", table_name="lesson_progress", schema="public")
    op.drop_index("ix_lesson_progress_user_id", table_name="lesson_progress", schema="public")

    op.drop_constraint(
        "ck_lesson_progress_progress_percent",
        "lesson_progress",
        type_="check",
        schema="public",
    )
    op.drop_constraint(
        "ck_lesson_progress_status",
        "lesson_progress",
        type_="check",
        schema="public",
    )

    op.drop_table("lesson_progress", schema="public")
