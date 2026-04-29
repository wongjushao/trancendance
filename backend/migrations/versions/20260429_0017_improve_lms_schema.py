"""improve lms schema

Revision ID: 20260429_0017
Revises: 20260424_0016
Create Date: 2026-04-29 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260429_0017"
down_revision = "20260424_0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'draft'")), schema="public")
    op.add_column("courses", sa.Column("thumbnail", sa.Text(), nullable=True), schema="public")
    op.add_column("courses", sa.Column("level", sa.Text(), nullable=False, server_default=sa.text("'intermediate'")), schema="public")
    op.add_column("courses", sa.Column("category", sa.Text(), nullable=False, server_default=sa.text("'Development'")), schema="public")
    op.create_check_constraint("ck_courses_status", "courses", "status in ('draft','published','archived')", schema="public")
    op.create_check_constraint("ck_courses_level", "courses", "level in ('beginner','intermediate','advanced')", schema="public")

    op.add_column("course_members", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True), schema="public")
    op.add_column("course_members", sa.Column("last_accessed_at", sa.DateTime(timezone=True), nullable=True), schema="public")

    op.add_column("modules", sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("true")), schema="public")
    op.add_column("classes", sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("true")), schema="public")
    op.create_unique_constraint("uq_modules_course_order", "modules", ["course_id", "order_index"], schema="public")
    op.create_unique_constraint("uq_classes_module_order", "classes", ["module_id", "order_index"], schema="public")

    op.add_column("lessons", sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("false")), schema="public")
    op.add_column("lessons", sa.Column("duration_seconds", sa.Integer(), nullable=True), schema="public")
    op.add_column("lessons", sa.Column("video_thumbnail", sa.Text(), nullable=True), schema="public")
    op.add_column("lessons", sa.Column("is_free_preview", sa.Boolean(), nullable=False, server_default=sa.text("false")), schema="public")
    op.create_unique_constraint("uq_lessons_class_order", "lessons", ["class_id", "order_index"], schema="public")
    op.create_check_constraint(
        "ck_lessons_duration_seconds",
        "lessons",
        "duration_seconds is null or duration_seconds >= 0",
        schema="public",
    )

    op.add_column("assignments", sa.Column("course_class_id", sa.BigInteger(), nullable=True), schema="public")
    op.add_column("assignments", sa.Column("points", sa.Integer(), nullable=False, server_default=sa.text("100")), schema="public")
    op.create_check_constraint("ck_assignments_points", "assignments", "points >= 0", schema="public")

    op.create_table(
        "course_classes",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("course_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("instructor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("max_students", sa.Integer(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'upcoming'")),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("status in ('upcoming','ongoing','completed','cancelled')", name="ck_course_classes_status"),
        sa.CheckConstraint("max_students is null or max_students > 0", name="ck_course_classes_max_students"),
        sa.CheckConstraint("start_date is null or end_date is null or start_date <= end_date", name="ck_course_classes_date_range"),
        sa.ForeignKeyConstraint(["course_id"], ["public.courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["instructor_id"], ["public.profiles.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema="public",
    )

    op.create_table(
        "class_schedules",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("course_class_id", sa.BigInteger(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.CheckConstraint("day_of_week >= 0 and day_of_week <= 6", name="ck_class_schedules_day_of_week"),
        sa.CheckConstraint("end_time > start_time", name="ck_class_schedules_time_range"),
        sa.ForeignKeyConstraint(["course_class_id"], ["public.course_classes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        schema="public",
    )

    op.create_table(
        "class_members",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("course_class_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.Text(), nullable=False, server_default=sa.text("'student'")),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("role in ('student','instructor','assistant')", name="ck_class_members_role"),
        sa.ForeignKeyConstraint(["course_class_id"], ["public.course_classes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["public.profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("course_class_id", "user_id", name="uq_class_members_course_class_user"),
        schema="public",
    )

    op.create_foreign_key(
        "fk_assignments_course_class_id",
        "assignments",
        "course_classes",
        ["course_class_id"],
        ["id"],
        source_schema="public",
        referent_schema="public",
        ondelete="CASCADE",
    )
    op.add_column("lesson_progress", sa.Column("class_member_id", sa.BigInteger(), nullable=True), schema="public")
    op.create_foreign_key(
        "fk_lesson_progress_class_member_id",
        "lesson_progress",
        "class_members",
        ["class_member_id"],
        ["id"],
        source_schema="public",
        referent_schema="public",
        ondelete="CASCADE",
    )
    op.create_unique_constraint(
        "uq_lesson_progress_class_member_lesson",
        "lesson_progress",
        ["class_member_id", "lesson_id"],
        schema="public",
    )

    op.create_table(
        "certificates",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("course_id", sa.BigInteger(), nullable=False),
        sa.Column("certificate_url", sa.Text(), nullable=True),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("certificate_id", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["public.profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["course_id"], ["public.courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("certificate_id", name="uq_certificates_certificate_id"),
        sa.UniqueConstraint("user_id", "course_id", name="uq_certificates_user_course"),
        schema="public",
    )

    op.create_table(
        "course_reviews",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("course_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("review", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("rating >= 1 and rating <= 5", name="ck_course_reviews_rating"),
        sa.ForeignKeyConstraint(["course_id"], ["public.courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["public.profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("course_id", "user_id", name="uq_course_reviews_course_user"),
        schema="public",
    )

    op.create_table(
        "course_prerequisites",
        sa.Column("course_id", sa.BigInteger(), nullable=False),
        sa.Column("prerequisite_course_id", sa.BigInteger(), nullable=False),
        sa.CheckConstraint("course_id <> prerequisite_course_id", name="ck_course_prerequisites_not_self"),
        sa.ForeignKeyConstraint(["course_id"], ["public.courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["prerequisite_course_id"], ["public.courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("course_id", "prerequisite_course_id", name="pk_course_prerequisites"),
        schema="public",
    )

    op.create_index("ix_course_classes_course_id", "course_classes", ["course_id"], unique=False, schema="public")
    op.create_index("ix_assignments_course_class_id", "assignments", ["course_class_id"], unique=False, schema="public")
    op.create_index("ix_lesson_progress_class_member_id", "lesson_progress", ["class_member_id"], unique=False, schema="public")
    op.create_index("ix_class_schedules_course_class_id", "class_schedules", ["course_class_id"], unique=False, schema="public")
    op.create_index("ix_class_members_user_id", "class_members", ["user_id"], unique=False, schema="public")
    op.create_index("ix_class_members_course_class_id", "class_members", ["course_class_id"], unique=False, schema="public")
    op.create_index("ix_certificates_user_id", "certificates", ["user_id"], unique=False, schema="public")
    op.create_index("ix_certificates_course_id", "certificates", ["course_id"], unique=False, schema="public")
    op.create_index("ix_course_reviews_course_id", "course_reviews", ["course_id"], unique=False, schema="public")


def downgrade() -> None:
    op.drop_index("ix_course_reviews_course_id", table_name="course_reviews", schema="public")
    op.drop_index("ix_certificates_course_id", table_name="certificates", schema="public")
    op.drop_index("ix_certificates_user_id", table_name="certificates", schema="public")
    op.drop_index("ix_class_members_course_class_id", table_name="class_members", schema="public")
    op.drop_index("ix_class_members_user_id", table_name="class_members", schema="public")
    op.drop_index("ix_class_schedules_course_class_id", table_name="class_schedules", schema="public")
    op.drop_index("ix_lesson_progress_class_member_id", table_name="lesson_progress", schema="public")
    op.drop_index("ix_assignments_course_class_id", table_name="assignments", schema="public")
    op.drop_index("ix_course_classes_course_id", table_name="course_classes", schema="public")

    op.drop_constraint("uq_lesson_progress_class_member_lesson", "lesson_progress", type_="unique", schema="public")
    op.drop_constraint("fk_lesson_progress_class_member_id", "lesson_progress", type_="foreignkey", schema="public")
    op.drop_column("lesson_progress", "class_member_id", schema="public")
    op.drop_constraint("fk_assignments_course_class_id", "assignments", type_="foreignkey", schema="public")

    op.drop_table("course_prerequisites", schema="public")
    op.drop_table("course_reviews", schema="public")
    op.drop_table("certificates", schema="public")
    op.drop_table("class_members", schema="public")
    op.drop_table("class_schedules", schema="public")
    op.drop_table("course_classes", schema="public")

    op.drop_constraint("ck_assignments_points", "assignments", type_="check", schema="public")
    op.drop_column("assignments", "points", schema="public")
    op.drop_column("assignments", "course_class_id", schema="public")

    op.drop_constraint("uq_lessons_class_order", "lessons", type_="unique", schema="public")
    op.drop_constraint("ck_lessons_duration_seconds", "lessons", type_="check", schema="public")
    op.drop_column("lessons", "is_free_preview", schema="public")
    op.drop_column("lessons", "video_thumbnail", schema="public")
    op.drop_column("lessons", "duration_seconds", schema="public")
    op.drop_column("lessons", "is_published", schema="public")

    op.drop_constraint("uq_classes_module_order", "classes", type_="unique", schema="public")
    op.drop_constraint("uq_modules_course_order", "modules", type_="unique", schema="public")
    op.drop_column("classes", "is_published", schema="public")
    op.drop_column("modules", "is_published", schema="public")

    op.drop_column("course_members", "last_accessed_at", schema="public")
    op.drop_column("course_members", "completed_at", schema="public")

    op.drop_constraint("ck_courses_level", "courses", type_="check", schema="public")
    op.drop_constraint("ck_courses_status", "courses", type_="check", schema="public")
    op.drop_column("courses", "category", schema="public")
    op.drop_column("courses", "level", schema="public")
    op.drop_column("courses", "thumbnail", schema="public")
    op.drop_column("courses", "status", schema="public")
