from __future__ import annotations

import uuid
from datetime import date, datetime, time

from sqlalchemy import (
    Boolean,
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    PrimaryKeyConstraint,
    Text,
    Time,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Profile(Base):
    __tablename__ = "profiles"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    # FK to auth.users.id is managed by Supabase; not declared here to avoid
    # DDL conflicts with the Supabase-managed auth schema.
    birthday: Mapped[date | None] = mapped_column(Date)
    invite_code: Mapped[str | None] = mapped_column(Text, unique=True)
    invited_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"))
    first_name: Mapped[str | None] = mapped_column(Text)
    last_name: Mapped[str | None] = mapped_column(Text)
    phone_number: Mapped[str | None] = mapped_column(Text)
    username: Mapped[str | None] = mapped_column(Text)
    job_title: Mapped[str | None] = mapped_column(Text)
    avatar_url: Mapped[str | None] = mapped_column(Text)
    bio: Mapped[str | None] = mapped_column(Text)
    professional_summary: Mapped[str | None] = mapped_column(Text)
    department: Mapped[str | None] = mapped_column(Text)
    years_of_experience: Mapped[str | None] = mapped_column(Text)
    timezone: Mapped[str | None] = mapped_column(Text)
    language: Mapped[str | None] = mapped_column(Text)
    social_links: Mapped[dict | None] = mapped_column(JSONB)
    interests: Mapped[list[str] | None] = mapped_column(JSONB)
    onboarded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=text("now()"), nullable=False)
    has_password: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    enabled_mfa: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class ApiKey(Base):
    __tablename__ = "api_keys"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    key_hash: Mapped[str] = mapped_column(Text, nullable=False)
    rate_limit_per_min: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("60"))
    expires_at: Mapped[datetime | None]
    last_used_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class Organization(Base):
    __tablename__ = "organizations"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str | None] = mapped_column(Text, unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))
    is_setup_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))

class OrganizationVerificationRequest(Base):
    __tablename__ = "organization_verification_requests"
    __table_args__ = (
        CheckConstraint(
            "status in ('pending','verified','expired','cancelled')",
            name="ck_org_verification_requests_status",
        ),
        UniqueConstraint("token_hash", name="uq_org_verification_requests_token_hash"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    org_name: Mapped[str] = mapped_column(Text, nullable=False)
    admin_email: Mapped[str] = mapped_column(Text, nullable=False)
    requested_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'pending'"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    organization_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("public.organizations.id"))


class OrganizationDomain(Base):
    __tablename__ = "organization_domains"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.organizations.id"), nullable=False)
    domain: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class OrganizationMember(Base):
    __tablename__ = "organization_members"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_organization_members_org_user"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.organizations.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    member_role: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'member'"))
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class OrganizationMemberInvitation(Base):
    __tablename__ = "organization_member_invitations"
    __table_args__ = (
        CheckConstraint(
            "member_role in ('student','teacher','sub_admin')",
            name="ck_organization_member_invitations_member_role",
        ),
        CheckConstraint(
            "status in ('pending','accepted','expired','revoked')",
            name="ck_organization_member_invitations_status",
        ),
        UniqueConstraint("token_hash", name="uq_organization_member_invitations_token_hash"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.organizations.id"), nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    member_role: Mapped[str] = mapped_column(Text, nullable=False)
    invited_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    personal_message: Mapped[str | None] = mapped_column(Text)
    token_hash: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'pending'"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"))


class Role(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    organization_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("public.organizations.id"))


class Permission(Base):
    __tablename__ = "permissions"
    __table_args__ = (
        UniqueConstraint("code", name="uq_permissions_code"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(Text, nullable=False)


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (
        PrimaryKeyConstraint("role_id", "permission_id", name="pk_role_permissions"),
        {"schema": "public"},
    )

    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.roles.id"), nullable=False)
    permission_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.permissions.id"), nullable=False)


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (
        PrimaryKeyConstraint("user_id", "role_id", "organization_id", name="pk_user_roles"),
        {"schema": "public"},
    )

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.roles.id"), nullable=False)
    organization_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.organizations.id"), nullable=False)


class Course(Base):
    __tablename__ = "courses"
    __table_args__ = (
        CheckConstraint("visibility in ('public','org','private')", name="ck_courses_visibility"),
        CheckConstraint("status in ('draft','published','archived')", name="ck_courses_status"),
        CheckConstraint("level in ('beginner','intermediate','advanced')", name="ck_courses_level"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.organizations.id"), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    visibility: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'private'"))
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'draft'"))
    thumbnail: Mapped[str | None] = mapped_column(Text)
    level: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'intermediate'"))
    category: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'Development'"))
    learning_objectives: Mapped[list[str]] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    prerequisites: Mapped[list[str]] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    tags: Mapped[list[str]] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class CourseMember(Base):
    __tablename__ = "course_members"
    __table_args__ = (
        UniqueConstraint("course_id", "user_id", name="uq_course_members_course_user"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.courses.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'student'"))
    joined_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'active'"))
    completed_at: Mapped[datetime | None]
    last_accessed_at: Mapped[datetime | None]


class Module(Base):
    __tablename__ = "modules"
    __table_args__ = (
        UniqueConstraint("course_id", "order_index", name="uq_modules_course_order"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.courses.id"), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int | None] = mapped_column(Integer)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))


class Class(Base):
    __tablename__ = "classes"
    __table_args__ = (
        UniqueConstraint("module_id", "order_index", name="uq_classes_module_order"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    module_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.modules.id"), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int | None] = mapped_column(Integer)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))


class Lesson(Base):
    __tablename__ = "lessons"
    __table_args__ = (
        UniqueConstraint("class_id", "order_index", name="uq_lessons_class_order"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    class_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.classes.id"), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str | None] = mapped_column(Text)
    content_url: Mapped[str | None] = mapped_column(Text)
    content_json: Mapped[dict | None] = mapped_column(JSONB)
    order_index: Mapped[int | None] = mapped_column(Integer)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    video_thumbnail: Mapped[str | None] = mapped_column(Text)
    is_free_preview: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))


class Assignment(Base):
    __tablename__ = "assignments"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.courses.id"), nullable=False)
    course_class_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("public.course_classes.id", ondelete="CASCADE"))
    lesson_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("public.lessons.id"))
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    due_at: Mapped[datetime | None]
    points: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("100"))
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class CourseClass(Base):
    __tablename__ = "course_classes"
    __table_args__ = (
        CheckConstraint("status in ('upcoming','ongoing','completed','cancelled')", name="ck_course_classes_status"),
        CheckConstraint("max_students is null or max_students > 0", name="ck_course_classes_max_students"),
        CheckConstraint("start_date is null or end_date is null or start_date <= end_date", name="ck_course_classes_date_range"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.courses.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    instructor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"))
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    max_students: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'upcoming'"))
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class ClassSchedule(Base):
    __tablename__ = "class_schedules"
    __table_args__ = (
        CheckConstraint("day_of_week >= 0 and day_of_week <= 6", name="ck_class_schedules_day_of_week"),
        CheckConstraint("end_time > start_time", name="ck_class_schedules_time_range"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    course_class_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.course_classes.id", ondelete="CASCADE"), nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)


class ClassMember(Base):
    __tablename__ = "class_members"
    __table_args__ = (
        UniqueConstraint("course_class_id", "user_id", name="uq_class_members_course_class_user"),
        CheckConstraint("role in ('student','instructor','assistant')", name="ck_class_members_role"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    course_class_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.course_classes.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'student'"))
    enrolled_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))
    completed_at: Mapped[datetime | None]


class Certificate(Base):
    __tablename__ = "certificates"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_certificates_user_course"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)
    course_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.courses.id", ondelete="CASCADE"), nullable=False)
    certificate_url: Mapped[str | None] = mapped_column(Text)
    issued_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))
    certificate_id: Mapped[str | None] = mapped_column(Text, unique=True)


class CourseReview(Base):
    __tablename__ = "course_reviews"
    __table_args__ = (
        UniqueConstraint("course_id", "user_id", name="uq_course_reviews_course_user"),
        CheckConstraint("rating >= 1 and rating <= 5", name="ck_course_reviews_rating"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.courses.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    review: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class CoursePrerequisite(Base):
    __tablename__ = "course_prerequisites"
    __table_args__ = (
        PrimaryKeyConstraint("course_id", "prerequisite_course_id", name="pk_course_prerequisites"),
        CheckConstraint("course_id <> prerequisite_course_id", name="ck_course_prerequisites_not_self"),
        {"schema": "public"},
    )

    course_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.courses.id", ondelete="CASCADE"), nullable=False)
    prerequisite_course_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.courses.id", ondelete="CASCADE"), nullable=False)


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (
        UniqueConstraint("assignment_id", "user_id", name="uq_submissions_assignment_user"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    assignment_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.assignments.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    content_url: Mapped[str | None] = mapped_column(Text)
    text_content: Mapped[str | None] = mapped_column(Text)
    grade: Mapped[int | None] = mapped_column(Integer)
    feedback: Mapped[str | None] = mapped_column(Text)
    submitted_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    __table_args__ = (
        UniqueConstraint("class_member_id", "lesson_id", name="uq_lesson_progress_class_member_lesson"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    class_member_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("public.class_members.id", ondelete="CASCADE"))
    lesson_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.lessons.id"), nullable=False)
    # not_started / in_progress / completed
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'not_started'"))
    progress_percent: Mapped[int | None] = mapped_column(Integer)
    last_accessed_at: Mapped[datetime | None]
    completed_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (
        UniqueConstraint("requester_id", "addressee_id", name="uq_friendships_requester_addressee"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    requester_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    addressee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'pending'"))
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class ChatRoom(Base):
    __tablename__ = "chat_rooms"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(Text, nullable=False)
    related_course_id: Mapped[int | None] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class ChatRoomMember(Base):
    __tablename__ = "chat_room_members"
    __table_args__ = (
        PrimaryKeyConstraint("room_id", "user_id", name="pk_chat_room_members"),
        {"schema": "public"},
    )

    room_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.chat_rooms.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))
    last_read_message_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("public.messages.id", ondelete="SET NULL"),
        nullable=True,
    )


class Skill(Base):
    __tablename__ = "skills"
    __table_args__ = (
        UniqueConstraint("name", name="uq_skills_name"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)


class UserSkill(Base):
    __tablename__ = "user_skills"
    __table_args__ = (
        PrimaryKeyConstraint("user_id", "skill_id", name="pk_user_skills"),
        {"schema": "public"},
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    skill_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("public.skills.id", ondelete="CASCADE"),
        nullable=False,
    )
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    years: Mapped[int] = mapped_column(Integer, nullable=False)

class UserBlock(Base):
    __tablename__ = "user_blocks"
    __table_args__ = (
        UniqueConstraint("blocker_id", "blocked_id", name="uq_user_blocks_blocker_blocked"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    blocker_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    blocked_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))

class ProfileEducation(Base):
    __tablename__ = "profile_educations"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    institution_name: Mapped[str] = mapped_column(Text, nullable=False)
    degree: Mapped[str | None] = mapped_column(Text)
    field_of_study: Mapped[str | None] = mapped_column(Text)
    start_year: Mapped[int | None] = mapped_column(Integer)
    end_year: Mapped[int | None] = mapped_column(Integer)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    description: Mapped[str | None] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    room_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("public.chat_rooms.id"), nullable=False)
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    message_type: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'text'"))
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    type: Mapped[str | None] = mapped_column(Text)
    title: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str | None] = mapped_column(Text)
    link: Mapped[str | None] = mapped_column(Text)
    read_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    __table_args__ = {"schema": "public"}

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.profiles.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # channel controls
    email_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    push_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))

    # type controls
    assignment_reminders: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    course_updates: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    message_notifications: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    marketing_emails: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))

    updated_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class UserMFA(Base):
    __tablename__ = "user_mfa"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_mfa_user_id"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    totp_secret: Mapped[str | None] = mapped_column(Text)
    backup_codes: Mapped[list[str] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class UserActivityLog(Base):
    __tablename__ = "user_activity_logs"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    action: Mapped[str | None] = mapped_column(Text)
    entity_type: Mapped[str | None] = mapped_column(Text)
    entity_id: Mapped[int | None] = mapped_column(BigInteger)
    extra_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class UserConsent(Base):
    __tablename__ = "user_consents"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    type: Mapped[str | None] = mapped_column(Text)
    accepted_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class DataExport(Base):
    __tablename__ = "data_exports"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"))
    status: Mapped[str | None] = mapped_column(Text)
    file_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    actor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    action: Mapped[str | None] = mapped_column(Text)
    entity_type: Mapped[str | None] = mapped_column(Text)
    entity_id: Mapped[int | None] = mapped_column(BigInteger)
    ip_address: Mapped[str | None] = mapped_column(INET)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))

class AdminMessage(Base):
    __tablename__ = "admin_messages"
    __table_args__ = {"schema": "public"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=False)
    subject: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'open'"))
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=text("now()"))
