# backend/services/org_service/org_service/routes/courses.py
import uuid
import os
from datetime import datetime, timezone

from flask import current_app, jsonify, request
from flask_restx import Namespace, Resource, fields
from sqlalchemy import func, or_, and_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from werkzeug.utils import secure_filename
from supabase import create_client
from backend.services.org_service.org_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt

from backend.common.models import (
    Assignment,
    Class as ContentClass,
    ClassMember,
    Course,
    CourseClass,
    CourseMember,
    CourseReview,
    Lesson,
    LessonProgress,
    Module,
    Organization,
    OrganizationMember,
    Profile,
    Submission,
    ClassSchedule,
)
from backend.services.org_service.org_service.routes.organizations import get_authenticated_user


courses_ns = Namespace("courses", path="/", description="Course endpoints")

ALLOWED_LEVELS = {"beginner", "intermediate", "advanced"}
ALLOWED_VISIBILITIES = {"public", "org", "private"}
ALLOWED_STATUSES = {"draft", "published", "archived"}
COURSE_CREATOR_ROLES = {"admin", "sub_admin", "teacher", "instructor"}

ALLOWED_FILE_EXTENSIONS = {'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'zip', 'txt'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

course_create_model = courses_ns.model(
    "CourseCreateRequest",
    {
        "organization_id": fields.Integer(required=True, description="Organization that owns the course", example=1),
        "title": fields.String(required=True, description="Course title", example="Intro to React"),
        "description": fields.String(required=True, description="Course description", example="Learn React from basics."),
        "category": fields.String(required=True, description="Course category", example="Development"),
        "level": fields.String(
            required=False,
            description="Course difficulty level",
            enum=sorted(ALLOWED_LEVELS),
            example="beginner",
        ),
        "thumbnail": fields.String(
            required=False,
            description="Course thumbnail image URL",
            example="https://example.com/course-thumbnail.png",
        ),
        "learning_objectives": fields.List(
            fields.String,
            required=False,
            description="What learners should be able to do after completing the course",
            example=["Understand React components", "Use React hooks"],
        ),
        "prerequisites": fields.List(
            fields.String,
            required=False,
            description="Free-text prerequisites for the course",
            example=["Basic JavaScript", "HTML and CSS fundamentals"],
        ),
        "tags": fields.List(
            fields.String,
            required=False,
            description="Searchable course tags",
            example=["react", "frontend", "javascript"],
        ),
        "visibility": fields.String(
            required=False,
            description="Who can discover or access the course",
            enum=sorted(ALLOWED_VISIBILITIES),
            example="private",
        ),
        "status": fields.String(
            required=False,
            description="Course publication status",
            enum=sorted(ALLOWED_STATUSES),
            example="draft",
        ),
    },
)

# Submission models for documentation
submission_upload_model = courses_ns.model(
    "SubmissionUpload",
    {
        "assignment_id": fields.Integer(required=True, description="Assignment ID"),
        "text_content": fields.String(required=False, description="Text response"),
        "file_url": fields.String(required=False, description="File URL (after upload)"),
    }
)

# Response models for Courses Page
course_list_model = courses_ns.model(
    "CourseListResponse",
    {
        "id": fields.Integer,
        "title": fields.String,
        "description": fields.String,
        "visibility": fields.String,
        "status": fields.String,
        "organization_id": fields.Integer,
        "organization_name": fields.String,
        "created_by": fields.String,
        "created_at": fields.String,
        "instructor_name": fields.String,
        "instructor_avatar": fields.String,
        "enrolled": fields.Boolean,
        "progress": fields.Integer,
        "total_lessons": fields.Integer,
        "completed_lessons": fields.Integer,
    }
)


# ========== HELPER FUNCTIONS ==========

def get_user_organization_ids(session, user_id: uuid.UUID) -> list:
    """Get all organization IDs where user is a member (non-pending)."""
    memberships = session.query(OrganizationMember.organization_id).filter(
        OrganizationMember.user_id == user_id,
        OrganizationMember.member_role != "pending"
    ).all()
    return [m[0] for m in memberships]


def get_course_progress(session, course_id: int, user_id: uuid.UUID, class_member_id: int = None) -> dict:
    """Get user's progress in a course for a specific offering."""
    # Get all lessons in the course
    lessons = session.query(Lesson).join(
        ContentClass, ContentClass.id == Lesson.class_id
    ).join(
        Module, Module.id == ContentClass.module_id
    ).filter(
        Module.course_id == course_id
    ).all()
    
    total_lessons = len(lessons)
    lesson_ids = [l.id for l in lessons]
    
    # Get completed lessons - filter by class_member_id if provided
    completed = 0
    if lesson_ids:
        query = session.query(LessonProgress).filter(
            LessonProgress.user_id == user_id,
            LessonProgress.lesson_id.in_(lesson_ids),
            LessonProgress.status == "completed"
        )
        if class_member_id:
            query = query.filter(LessonProgress.class_member_id == class_member_id)
        completed = query.count()
    
    progress = int((completed / total_lessons) * 100) if total_lessons > 0 else 0
    
    return {
        "total_lessons": total_lessons,
        "completed_lessons": completed,
        "progress": progress
    }

def get_instructor_info(session, user_id: uuid.UUID) -> dict:
    """Get instructor name and avatar."""
    profile = session.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        return {"name": "Instructor", "avatar": None}
    
    name = None
    if profile.first_name and profile.last_name:
        name = f"{profile.first_name} {profile.last_name}"
    elif profile.first_name:
        name = profile.first_name
    elif profile.username:
        name = profile.username
    
    return {
        "name": name or "Instructor",
        "avatar": profile.avatar_url
    }


def serialize_course(course: Course) -> dict:
    return {
        "id": course.id,
        "organization_id": course.organization_id,
        "title": course.title,
        "description": course.description,
        "category": course.category,
        "level": course.level,
        "thumbnail": course.thumbnail,
        "learning_objectives": course.learning_objectives or [],
        "prerequisites": course.prerequisites or [],
        "tags": course.tags or [],
        "visibility": course.visibility,
        "status": course.status,
        "created_by": str(course.created_by),
        "created_at": course.created_at.isoformat() if course.created_at else None,
    }


def normalize_text(value) -> str:
    return str(value or "").strip()


def normalize_string_list(value, field_name: str) -> tuple[list[str], str | None]:
    if value is None:
        return [], None
    if not isinstance(value, list):
        return [], f"Field '{field_name}' must be an array of strings"

    normalized = []
    for item in value:
        if not isinstance(item, str):
            return [], f"Field '{field_name}' must be an array of strings"
        item = item.strip()
        if item:
            normalized.append(item)

    return normalized, None


def _can_view_course(session, course: Course, user_id: uuid.UUID | None) -> bool:
    if course.status == "published":
        return True
    if user_id is None:
        return False
    if user_id == course.created_by:
        return True
    membership = (
        session.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == course.organization_id,
            OrganizationMember.user_id == user_id,
        )
        .first()
    )
    return membership is not None and membership.member_role in COURSE_CREATOR_ROLES


def _profile_brief(p: Profile | None) -> dict | None:
    if p is None:
        return None
    return {
        "id": str(p.id),
        "first_name": p.first_name,
        "last_name": p.last_name,
        "username": p.username,
        "avatar_url": p.avatar_url,
        "email": "",
    }


def _format_duration(total_seconds: int) -> str:
    duration_hours = total_seconds // 3600
    duration_minutes = (total_seconds % 3600) // 60
    if duration_hours > 0:
        tail = f"{duration_minutes} min" if duration_minutes > 0 else ""
        return f"{duration_hours} hour{'s' if duration_hours > 1 else ''} {tail}".strip()
    return f"{duration_minutes} minutes"


review_upsert_model = courses_ns.model(
    "CourseReviewUpsertRequest",
    {
        "rating": fields.Integer(required=True, description="1–5 stars", example=5),
        "review": fields.String(required=False, description="Optional review text"),
    },
)


# ========== COURSE CRUD ENDPOINTS ==========

@courses_ns.route("/courses")
class CourseListResource(Resource):
    @courses_ns.response(200, "Courses retrieved")
    @courses_ns.response(401, "Unauthorized")
    def get(self):
        """Get courses, optionally filtered by organization_id."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        # Get query parameters
        organization_id = request.args.get("organization_id", type=int)
        status_filter = request.args.get("status")
        limit = request.args.get("limit", 50, type=int)
        offset = request.args.get("offset", 0, type=int)

        session = db_session()
        try:
            query = session.query(Course)

            # Apply organization filter
            if organization_id:
                query = query.filter(Course.organization_id == organization_id)

                # Check if user has access to this organization
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == organization_id,
                    OrganizationMember.user_id == user_id
                ).first()
                
                if not membership:
                    return jsonify({"error": "You do not have access to this organization"}), 403

            # Apply status filter
            if status_filter:
                query = query.filter(Course.status == status_filter)
            else:
                # By default, exclude archived unless explicitly requested
                query = query.filter(Course.status != "archived")

            # Get total count before pagination
            total = query.count()

            # Apply pagination and ordering
            courses = query.order_by(Course.created_at.desc()).offset(offset).limit(limit).all()

            # Get organization names and instructor info
            org_ids = list(set([c.organization_id for c in courses]))
            org_map = {}
            if org_ids:
                orgs = session.query(Organization).filter(Organization.id.in_(org_ids)).all()
                org_map = {org.id: org.name for org in orgs}

            courses_list = []
            for course in courses:
                instructor = get_instructor_info(session, course.created_by)
                
                courses_list.append({
                    "id": course.id,
                    "title": course.title,
                    "description": course.description,
                    "category": course.category,
                    "level": course.level,
                    "thumbnail": course.thumbnail,
                    "visibility": course.visibility,
                    "status": course.status,
                    "organization_id": course.organization_id,
                    "organization_name": org_map.get(course.organization_id, ""),
                    "created_by": str(course.created_by),
                    "created_at": course.created_at.isoformat() if course.created_at else None,
                    "instructor_name": instructor["name"],
                    "instructor_avatar": instructor["avatar"],
                    "rating": 0,  # Would need calculation
                    "students_count": 0,  # Would need calculation
                })

            return jsonify({
                "courses": courses_list,
                "total": total,
                "limit": limit,
                "offset": offset
            }), 200

        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    @courses_ns.expect(course_create_model, validate=False)
    @courses_ns.response(201, "Course created")
    @courses_ns.response(400, "Invalid request body")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(403, "Insufficient organization permissions")
    @courses_ns.response(404, "Organization not found")
    def post(self):
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        title = normalize_text(payload.get("title"))
        description = normalize_text(payload.get("description"))
        category = normalize_text(payload.get("category"))
        level = normalize_text(payload.get("level") or "intermediate").lower()
        visibility = normalize_text(payload.get("visibility") or "private").lower()
        status = normalize_text(payload.get("status") or "draft").lower()
        thumbnail = normalize_text(
            payload.get("thumbnail")
            or payload.get("thumbnail_url")
            or payload.get("course_thumbnail")
            or payload.get("course_thumbnail_url")
        )
        organization_id = payload.get("organization_id")

        learning_objectives, error = normalize_string_list(
            payload.get("learning_objectives", payload.get("objectives")),
            "learning_objectives",
        )
        if error:
            return jsonify({"error": error}), 400

        prerequisites, error = normalize_string_list(payload.get("prerequisites"), "prerequisites")
        if error:
            return jsonify({"error": error}), 400

        tags, error = normalize_string_list(payload.get("tags"), "tags")
        if error:
            return jsonify({"error": error}), 400

        if not title:
            return jsonify({"error": "Field 'title' is required"}), 400
        if not description:
            return jsonify({"error": "Field 'description' is required"}), 400
        if not category:
            return jsonify({"error": "Field 'category' is required"}), 400
        if not organization_id:
            return jsonify({"error": "Field 'organization_id' is required"}), 400

        try:
            organization_id = int(organization_id)
        except (TypeError, ValueError):
            return jsonify({"error": "Field 'organization_id' must be an integer"}), 400

        if level not in ALLOWED_LEVELS:
            return jsonify({"error": "Field 'level' must be one of: beginner, intermediate, advanced"}), 400
        if visibility not in ALLOWED_VISIBILITIES:
            return jsonify({"error": "Field 'visibility' must be one of: public, org, private"}), 400
        if status not in ALLOWED_STATUSES:
            return jsonify({"error": "Field 'status' must be one of: draft, published, archived"}), 400

        session = db_session()
        try:
            organization = session.query(Organization).filter(Organization.id == organization_id).first()
            if organization is None:
                return jsonify({"error": "Organization not found"}), 404

            membership = (
                session.query(OrganizationMember)
                .filter(
                    OrganizationMember.organization_id == organization_id,
                    OrganizationMember.user_id == user_id,
                )
                .first()
            )
            if membership is None or membership.member_role not in COURSE_CREATOR_ROLES:
                return jsonify({"error": "You do not have permission to create courses for this organization"}), 403

            course = Course(
                organization_id=organization_id,
                title=title,
                description=description,
                category=category,
                level=level,
                thumbnail=thumbnail or None,
                learning_objectives=learning_objectives,
                prerequisites=prerequisites,
                tags=tags,
                visibility=visibility,
                status=status,
                created_by=user_id,
            )
            session.add(course)
            session.commit()
            session.refresh(course)

            return jsonify(serialize_course(course)), 201
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@courses_ns.route("/courses/<int:course_id>/detail")
class CourseDetailResource(Resource):
    @courses_ns.response(200, "Course detail payload")
    @courses_ns.response(404, "Not found")
    def get(self, course_id: int):
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()

        session = db_session()
        try:
            course = session.query(Course).filter(Course.id == course_id).first()
            if course is None or not _can_view_course(session, course, user_id):
                return jsonify({"error": "Course not found"}), 404

            organization = session.query(Organization).filter(Organization.id == course.organization_id).first()
            instructor = session.query(Profile).filter(Profile.id == course.created_by).first()

            learning_objectives = list(course.learning_objectives or [])
            prerequisites = list(course.prerequisites or [])
            tags = list(course.tags or [])

            modules_rows = (
                session.query(Module)
                .filter(Module.course_id == course_id)
                .order_by(func.coalesce(Module.order_index, 999999), Module.id)
                .all()
            )

            # ========== ADD THIS SECTION - FETCH OFFERINGS WITH SCHEDULES ==========
            offerings = session.query(CourseClass).filter(CourseClass.course_id == course_id).all()
            
            # Process offerings to include schedules
            offerings_with_schedules = []
            for offering in offerings:
                # Get schedules for this offering
                schedules = session.query(ClassSchedule).filter(
                    ClassSchedule.course_class_id == offering.id
                ).order_by(ClassSchedule.day_of_week).all()
                
                offerings_with_schedules.append({
                    "id": offering.id,
                    "course_id": offering.course_id,
                    "name": offering.name,
                    "description": offering.description,
                    "instructor_id": str(offering.instructor_id) if offering.instructor_id else None,
                    "start_date": offering.start_date.isoformat() if offering.start_date else None,
                    "end_date": offering.end_date.isoformat() if offering.end_date else None,
                    "max_students": offering.max_students,
                    "status": offering.status,
                    "is_published": offering.is_published,
                    "created_at": offering.created_at.isoformat() if offering.created_at else None,
                    "schedules": [
                        {
                            "id": s.id,
                            "day_of_week": s.day_of_week,
                            "start_time": s.start_time.isoformat() if s.start_time else None,
                            "end_time": s.end_time.isoformat() if s.end_time else None,
                        }
                        for s in schedules
                    ]
                })
            # ========== END OF ADDED SECTION ==========

            offering_ids = [o.id for o in offerings]

            class_member = None
            if user_id and offering_ids:
                class_member = (
                    session.query(ClassMember)
                    .filter(
                        ClassMember.user_id == user_id,
                        ClassMember.course_class_id.in_(offering_ids),
                    )
                    .order_by(ClassMember.enrolled_at.desc())
                    .first()
                )

            progress_by_lesson: dict[int, LessonProgress] = {}
            if class_member:
                for lp in session.query(LessonProgress).filter(LessonProgress.class_member_id == class_member.id).all():
                    progress_by_lesson[lp.lesson_id] = lp

            course_class_id_ctx = class_member.course_class_id if class_member else None
            if course_class_id_ctx is None and user_id == course.created_by and offerings:
                preferred = next(
                    (o for o in offerings if o.is_published and o.status in ("upcoming", "ongoing")),
                    None,
                )
                course_class_id_ctx = preferred.id if preferred else offerings[0].id

            total_duration_seconds = 0
            total_lessons = 0
            completed_lessons = 0
            modules_out: list[dict] = []

            for mod in modules_rows:
                classes_out: list[dict] = []
                for cc in (
                    session.query(ContentClass)
                    .filter(ContentClass.module_id == mod.id)
                    .order_by(func.coalesce(ContentClass.order_index, 999999), ContentClass.id)
                    .all()
                ):
                    lessons_out: list[dict] = []
                    for lesson in (
                        session.query(Lesson)
                        .filter(Lesson.class_id == cc.id)
                        .order_by(func.coalesce(Lesson.order_index, 999999), Lesson.id)
                        .all()
                    ):
                        if lesson.duration_seconds:
                            total_duration_seconds += lesson.duration_seconds
                        total_lessons += 1
                        lp = progress_by_lesson.get(lesson.id)
                        is_completed = lp is not None and lp.status == "completed"
                        if is_completed:
                            completed_lessons += 1
                        lessons_out.append(
                            {
                                "id": lesson.id,
                                "title": lesson.title,
                                "content_type": lesson.content_type or "",
                                "duration_seconds": lesson.duration_seconds,
                                "order_index": lesson.order_index or 0,
                                "is_free_preview": lesson.is_free_preview,
                                "is_completed": is_completed,
                            }
                        )
                    classes_out.append(
                        {
                            "id": cc.id,
                            "title": cc.title,
                            "order_index": cc.order_index or 0,
                            "lessons": lessons_out,
                        }
                    )
                modules_out.append(
                    {
                        "id": mod.id,
                        "title": mod.title,
                        "order_index": mod.order_index or 0,
                        "classes": classes_out,
                    }
                )

            duration_string = _format_duration(total_duration_seconds)
            progress_percent = round((completed_lessons / total_lessons) * 100) if total_lessons > 0 else 0
            is_enrolled = class_member is not None

            student_count = (
                session.query(func.count(ClassMember.id))
                .join(CourseClass, CourseClass.id == ClassMember.course_class_id)
                .filter(CourseClass.course_id == course_id)
                .scalar()
            )
            student_count = int(student_count or 0)

            reviews_rows = (
                session.query(CourseReview)
                .filter(CourseReview.course_id == course_id)
                .order_by(CourseReview.created_at.desc())
                .all()
            )
            reviewer_ids = {r.user_id for r in reviews_rows}
            profiles = {}
            if reviewer_ids:
                for p in session.query(Profile).filter(Profile.id.in_(reviewer_ids)).all():
                    profiles[p.id] = p

            all_reviews: list[dict] = []
            for r in reviews_rows:
                u = _profile_brief(profiles.get(r.user_id))
                if u is None:
                    u = {
                        "id": str(r.user_id),
                        "first_name": None,
                        "last_name": None,
                        "username": None,
                        "avatar_url": None,
                        "email": "",
                    }
                all_reviews.append(
                    {
                        "id": r.id,
                        "rating": r.rating,
                        "review": r.review,
                        "created_at": r.created_at.isoformat() if r.created_at else None,
                        "user": u,
                    }
                )

            avg_rating = (
                sum(x["rating"] for x in all_reviews) / len(all_reviews) if all_reviews else 0.0
            )
            distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            for r in all_reviews:
                star = r["rating"]
                if star in distribution:
                    distribution[star] += 1

            user_review = None
            if user_id:
                own = next((row for row in reviews_rows if row.user_id == user_id), None)
                if own is not None:
                    user_review = next((x for x in all_reviews if x["id"] == own.id), None)

            assignments_out: list[dict] = []
            if user_id and is_enrolled:
                all_assignments = session.query(Assignment).filter(Assignment.course_id == course_id).all()
                ass_ids = [a.id for a in all_assignments]
                subs_by_ass: dict[int, Submission] = {}
                if ass_ids:
                    for s in (
                        session.query(Submission)
                        .filter(
                            Submission.user_id == user_id,
                            Submission.assignment_id.in_(ass_ids),
                        )
                        .all()
                    ):
                        subs_by_ass[s.assignment_id] = s
                now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
                for a in all_assignments:
                    sub = subs_by_ass.get(a.id)
                    due_dt = a.due_at
                    status = "pending"
                    if sub:
                        status = "graded" if sub.grade is not None else "submitted"
                    elif due_dt and due_dt < now_naive:
                        status = "overdue"
                    assignments_out.append(
                        {
                            "id": a.id,
                            "title": a.title,
                            "due_at": a.due_at.isoformat() if a.due_at else None,
                            "points": a.points,
                            "status": status,
                            "grade": sub.grade if sub else None,
                        }
                    )

            students_out: list[dict] = []
            if user_id and user_id == course.created_by and course_class_id_ctx and total_lessons >= 0:
                members = (
                    session.query(ClassMember)
                    .filter(ClassMember.course_class_id == course_class_id_ctx)
                    .all()
                )
                if members:
                    mids = [m.id for m in members]
                    uid_list = [m.user_id for m in members]
                    prof_map = {p.id: p for p in session.query(Profile).filter(Profile.id.in_(uid_list)).all()}
                    completed_by_member: dict[int, int] = {mid: 0 for mid in mids}
                    if mids:
                        for lp in session.query(LessonProgress).filter(LessonProgress.class_member_id.in_(mids)).all():
                            if lp.status == "completed" and lp.class_member_id is not None:
                                completed_by_member[lp.class_member_id] = (
                                    completed_by_member.get(lp.class_member_id, 0) + 1
                                )
                    for m in members:
                        p = prof_map.get(m.user_id)
                        done = completed_by_member.get(m.id, 0)
                        prog = round((done / total_lessons) * 100) if total_lessons > 0 else 0
                        name = "Unknown"
                        if p:
                            if p.first_name:
                                name = f"{p.first_name} {p.last_name or ''}".strip()
                            elif p.username:
                                name = p.username
                        students_out.append(
                            {
                                "id": str(m.user_id),
                                "name": name,
                                "email": "",
                                "avatar": (p.avatar_url if p else "") or "",
                                "progress": prog,
                            }
                        )

            instructor_name = "Unknown Instructor"
            if instructor:
                if instructor.first_name:
                    instructor_name = f"{instructor.first_name} {instructor.last_name or ''}".strip()
                elif instructor.username:
                    instructor_name = instructor.username

            course_payload = {
                "id": course.id,
                "title": course.title,
                "description": course.description,
                "instructor_id": str(course.created_by),
                "instructor_name": instructor_name,
                "instructor_avatar": instructor.avatar_url if instructor else None,
                "instructor_bio": (instructor.bio if instructor else None)
                or (instructor.job_title if instructor else None),
                "thumbnail": course.thumbnail,
                "level": course.level,
                "category": course.category,
                "students_count": student_count,
                "rating": avg_rating,
                "reviews_count": len(all_reviews),
                "duration": duration_string,
                "enrolled": is_enrolled,
                "progress": progress_percent,
                "visibility": course.visibility,
                "status": course.status,
                "organization_id": course.organization_id,
                "organization_name": organization.name if organization else "",
                "learning_objectives": learning_objectives,
                "prerequisites": prerequisites,
                "tags": tags,
            }

            # ========== UPDATE THE RETURN STATEMENT TO INCLUDE course_classes ==========
            return jsonify(
                {
                    "course": course_payload,
                    "modules": modules_out,
                    "course_classes": offerings_with_schedules,  # ADD THIS LINE
                    "assignments": assignments_out,
                    "students": students_out,
                    "reviews": all_reviews,
                    "review_stats": {
                        "average": avg_rating,
                        "total": len(all_reviews),
                        "distribution": distribution,
                    },
                    "user_review": user_review,
                    "class_member_id": class_member.id if class_member else None,
                    "course_class_id": class_member.course_class_id if class_member else None,
                }
            ), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@courses_ns.route("/courses/<int:course_id>/enroll")
class CourseEnrollResource(Resource):
    @courses_ns.response(200, "Enrolled")
    @courses_ns.response(400, "Bad request")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(404, "No offering")
    def post(self, course_id: int):
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            course = session.query(Course).filter(Course.id == course_id).first()
            if course is None:
                return jsonify({"error": "Course not found"}), 404

            offering = (
                session.query(CourseClass)
                .filter(
                    CourseClass.course_id == course_id,
                    CourseClass.is_published.is_(True),
                    CourseClass.status.in_(("upcoming", "ongoing")),
                )
                .order_by(CourseClass.id)
                .first()
            )
            if offering is None:
                return jsonify({"error": "No available course offerings at this time"}), 404

            current_n = (
                session.query(func.count(ClassMember.id))
                .filter(ClassMember.course_class_id == offering.id)
                .scalar()
            )
            current_n = int(current_n or 0)
            if offering.max_students is not None and current_n >= offering.max_students:
                return jsonify({"error": "This course offering is full"}), 400

            existing = (
                session.query(ClassMember)
                .filter(
                    ClassMember.course_class_id == offering.id,
                    ClassMember.user_id == user_id,
                )
                .first()
            )
            if existing:
                return jsonify({"message": "Already enrolled", "course_class_id": offering.id}), 200

            session.add(
                ClassMember(
                    course_class_id=offering.id,
                    user_id=user_id,
                    role="student",
                )
            )
            session.commit()
            return jsonify({"message": "Enrolled", "course_class_id": offering.id}), 200
        except IntegrityError:
            session.rollback()
            return jsonify({"error": "Enrollment failed"}), 400
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@courses_ns.route("/courses/<int:course_id>/reviews")
class CourseReviewUpsertResource(Resource):
    @courses_ns.expect(review_upsert_model, validate=False)
    @courses_ns.response(200, "Saved")
    @courses_ns.response(400, "Bad request")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(403, "Must be enrolled")
    def post(self, course_id: int):
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        rating = payload.get("rating")
        review_text = payload.get("review")
        try:
            rating_int = int(rating)
        except (TypeError, ValueError):
            return jsonify({"error": "rating must be an integer 1–5"}), 400
        if rating_int < 1 or rating_int > 5:
            return jsonify({"error": "rating must be between 1 and 5"}), 400
        if review_text is not None and not isinstance(review_text, str):
            return jsonify({"error": "review must be a string"}), 400
        review_text = (review_text or "").strip() or None

        session = db_session()
        try:
            course = session.query(Course).filter(Course.id == course_id).first()
            if course is None:
                return jsonify({"error": "Course not found"}), 404

            offering_ids = [r.id for r in session.query(CourseClass).filter(CourseClass.course_id == course_id).all()]
            if not offering_ids:
                return jsonify({"error": "No course offering for this course"}), 403

            enrolled = (
                session.query(ClassMember)
                .filter(
                    ClassMember.user_id == user_id,
                    ClassMember.course_class_id.in_(offering_ids),
                )
                .first()
            )
            if enrolled is None:
                return jsonify({"error": "You must be enrolled in this course to review"}), 403

            row = (
                session.query(CourseReview)
                .filter(CourseReview.course_id == course_id, CourseReview.user_id == user_id)
                .first()
            )
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            if row:
                row.rating = rating_int
                row.review = review_text
                row.updated_at = now
            else:
                session.add(
                    CourseReview(
                        course_id=course_id,
                        user_id=user_id,
                        rating=rating_int,
                        review=review_text,
                    )
                )
            session.commit()
            return jsonify({"message": "Review saved"}), 200
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


# ========== SUBMISSION ENDPOINTS ==========

@courses_ns.route("/submissions")
class SubmissionResource(Resource):
    @courses_ns.expect(submission_upload_model, validate=False)
    @courses_ns.response(200, "Submission saved")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(404, "Assignment not found")
    def post(self):
        """Create or update a submission for an assignment."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503
        
        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401
        
        payload = request.get_json(silent=True) or {}
        assignment_id = payload.get("assignment_id")
        text_content = payload.get("text_content")
        file_url = payload.get("file_url")
        
        if not assignment_id:
            return jsonify({"error": "assignment_id is required"}), 400
        
        if not text_content and not file_url:
            return jsonify({"error": "Either text_content or file_url is required"}), 400
        
        session = db_session()
        try:
            # Verify assignment exists
            assignment = session.query(Assignment).filter(Assignment.id == assignment_id).first()
            if not assignment:
                return jsonify({"error": "Assignment not found"}), 404
            
            # FIXED: Check if user is enrolled in the course offering
            course_class_id = assignment.course_class_id
            if not course_class_id:
                # Find the first available offering for this course
                course_class = session.query(CourseClass).filter(
                    CourseClass.course_id == assignment.course_id,
                    CourseClass.status.in_(['upcoming', 'ongoing'])
                ).first()
                if course_class:
                    course_class_id = course_class.id
            
            is_enrolled = False
            if course_class_id:
                is_enrolled = session.query(ClassMember).filter(
                    ClassMember.user_id == user_id,
                    ClassMember.course_class_id == course_class_id,
                    ClassMember.role == "student"
                ).first() is not None
            else:
                # Fallback: check if user is enrolled in any offering of this course
                is_enrolled = session.query(ClassMember).join(
                    CourseClass, ClassMember.course_class_id == CourseClass.id
                ).filter(
                    ClassMember.user_id == user_id,
                    CourseClass.course_id == assignment.course_id,
                    ClassMember.role == "student"
                ).first() is not None
            
            if not is_enrolled:
                return jsonify({"error": "You are not enrolled in this course"}), 403
            
            # Check for existing submission
            existing = session.query(Submission).filter(
                Submission.assignment_id == assignment_id,
                Submission.user_id == user_id
            ).first()
            
            if existing:
                # Update existing
                existing.content_url = file_url or existing.content_url
                existing.text_content = text_content or existing.text_content
                existing.submitted_at = datetime.now(timezone.utc)
                session.commit()
                session.refresh(existing)
                return jsonify({
                    "message": "Submission updated",
                    "submission": {
                        "id": existing.id,
                        "assignment_id": existing.assignment_id,
                        "content_url": existing.content_url,
                        "text_content": existing.text_content,
                        "submitted_at": existing.submitted_at.isoformat(),
                        "grade": existing.grade,
                        "feedback": existing.feedback
                    }
                }), 200
            else:
                # Create new
                new_submission = Submission(
                    assignment_id=assignment_id,
                    user_id=user_id,
                    content_url=file_url,
                    text_content=text_content,
                    submitted_at=datetime.now(timezone.utc)
                )
                session.add(new_submission)
                session.commit()
                session.refresh(new_submission)
                return jsonify({
                    "message": "Submission created",
                    "submission": {
                        "id": new_submission.id,
                        "assignment_id": new_submission.assignment_id,
                        "content_url": new_submission.content_url,
                        "text_content": new_submission.text_content,
                        "submitted_at": new_submission.submitted_at.isoformat(),
                        "grade": new_submission.grade,
                        "feedback": new_submission.feedback
                    }
                }), 201
                
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@courses_ns.route("/submissions/upload")
class SubmissionUploadResource(Resource):
    @courses_ns.response(200, "File uploaded")
    @courses_ns.response(400, "Invalid file")
    @courses_ns.response(401, "Unauthorized")
    def post(self):
        """Upload a file for a submission."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503
        
        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401
        
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        assignment_id = request.form.get('assignment_id')
        if not assignment_id:
            return jsonify({"error": "assignment_id is required"}), 400
        
        # Validate file type
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        if file_ext not in ALLOWED_FILE_EXTENSIONS:
            return jsonify({"error": f"File type not allowed. Allowed: {', '.join(ALLOWED_FILE_EXTENSIONS)}"}), 400
        
        # Validate file size
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        if file_size > MAX_FILE_SIZE:
            return jsonify({"error": f"File size exceeds 50MB limit"}), 400
        
        try:
            supabase_url = os.environ.get("SUPABASE_URL")
            supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            
            if not supabase_url or not supabase_service_key:
                return jsonify({"error": "Storage configuration missing"}), 500
            
            supabase_admin = create_client(supabase_url, supabase_service_key)
            
            # Ensure submissions bucket exists
            try:
                supabase_admin.storage.get_bucket('submissions')
            except:
                supabase_admin.storage.create_bucket('submissions', {'public': True})
            
            # Generate unique filename
            filename = secure_filename(file.filename)
            unique_filename = f"{user_id}/{assignment_id}/{uuid.uuid4().hex}.{file_ext}"
            
            file_content = file.read()
            
            response = supabase_admin.storage.from_('submissions').upload(
                unique_filename,
                file_content,
                file_options={"content-type": file.content_type or "application/octet-stream"}
            )
            
            if not response:
                raise Exception("Failed to upload file")
            
            public_url = supabase_admin.storage.from_('submissions').get_public_url(unique_filename)
            
            return jsonify({
                "success": True,
                "file_url": public_url,
                "file_name": filename,
                "file_size": file_size
            }), 200
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500


# ========== COURSES PAGE ENDPOINTS ==========

@courses_ns.route("/users/me/enrolled-courses")
class UserEnrolledCoursesResource(Resource):
    @courses_ns.response(200, "Success")
    @courses_ns.response(401, "Unauthorized")
    def get(self):
        """Get all courses the current user is enrolled in."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503
        
        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401
        
        session = db_session()
        try:
            # Get all class members for this user with their offering info
            class_members = session.query(ClassMember).filter(
                ClassMember.user_id == user_id,
                ClassMember.role == "student"
            ).all()
            
            if not class_members:
                return jsonify({"courses": [], "total": 0}), 200
            
            # Get unique course IDs with their offering info
            course_offering_map = {}
            for cm in class_members:
                course_class = session.query(CourseClass).filter(
                    CourseClass.id == cm.course_class_id
                ).first()
                if course_class:
                    course = session.query(Course).filter(
                        Course.id == course_class.course_id
                    ).first()
                    if course:
                        if course.id not in course_offering_map:
                            course_offering_map[course.id] = {
                                "course": course,
                                "class_member_id": cm.id,
                                "offering_id": course_class.id
                            }
            
            result_courses = []
            for course_id, data in course_offering_map.items():
                course = data["course"]
                class_member_id = data["class_member_id"]
                
                # Get progress for this specific offering
                progress_data = get_course_progress(session, course.id, user_id, class_member_id)
                instructor = get_instructor_info(session, course.created_by)
                org = session.query(Organization).filter(Organization.id == course.organization_id).first()
                
                result_courses.append({
                    "id": course.id,
                    "title": course.title,
                    "description": course.description,
                    "visibility": course.visibility,
                    "status": course.status,
                    "organization_id": course.organization_id,
                    "organization_name": org.name if org else None,
                    "created_by": str(course.created_by),
                    "created_at": course.created_at.isoformat() if course.created_at else None,
                    "instructor_name": instructor["name"],
                    "instructor_avatar": instructor["avatar"],
                    "enrolled": True,
                    "progress": progress_data["progress"],
                    "total_lessons": progress_data["total_lessons"],
                    "completed_lessons": progress_data["completed_lessons"],
                })
            
            return jsonify({
                "courses": result_courses,
                "total": len(result_courses)
            }), 200
            
        except SQLAlchemyError as exc:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@courses_ns.route("/users/me/discover-courses")
class DiscoverCoursesResource(Resource):
    @courses_ns.response(200, "Success")
    @courses_ns.response(401, "Unauthorized")
    def get(self):
        """Get courses the user can discover (not enrolled)."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503
        
        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401
        
        search_query = request.args.get("q", "").strip()
        
        session = db_session()
        try:
            # Get enrolled course IDs from class_members
            enrolled_course_ids = set()
            class_members = session.query(ClassMember).filter(
                ClassMember.user_id == user_id,
                ClassMember.role == "student"
            ).all()
            
            for cm in class_members:
                course_class = session.query(CourseClass).filter(
                    CourseClass.id == cm.course_class_id
                ).first()
                if course_class:
                    enrolled_course_ids.add(course_class.course_id)
            
            # Get user's organization IDs
            user_org_ids = get_user_organization_ids(session, user_id)
            
            # Build query for discoverable courses
            query = session.query(Course).filter(
                Course.status == "published",
                Course.created_by != user_id
            )
            
            # Exclude enrolled courses
            if enrolled_course_ids:
                query = query.filter(~Course.id.in_(enrolled_course_ids))
            
            # Apply visibility rules
            if user_org_ids:
                query = query.filter(
                    or_(
                        Course.visibility == "public",
                        and_(
                            Course.visibility == "org",
                            Course.organization_id.in_(user_org_ids)
                        )
                    )
                )
            else:
                query = query.filter(Course.visibility == "public")
            
            # Apply search filter
            if search_query:
                query = query.filter(
                    or_(
                        Course.title.ilike(f"%{search_query}%"),
                        Course.description.ilike(f"%{search_query}%")
                    )
                )
            
            courses = query.order_by(Course.created_at.desc()).limit(50).all()
            
            result_courses = []
            for course in courses:
                instructor = get_instructor_info(session, course.created_by)
                org = session.query(Organization).filter(Organization.id == course.organization_id).first()
                
                result_courses.append({
                    "id": course.id,
                    "title": course.title,
                    "description": course.description,
                    "visibility": course.visibility,
                    "organization_id": course.organization_id,
                    "organization_name": org.name if org else None,
                    "created_by": str(course.created_by),
                    "created_at": course.created_at.isoformat() if course.created_at else None,
                    "instructor_name": instructor["name"],
                    "instructor_avatar": instructor["avatar"],
                    "enrolled": False,
                })
            
            return jsonify({
                "courses": result_courses,
                "total": len(result_courses)
            }), 200
            
        except SQLAlchemyError as exc:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@courses_ns.route("/users/me/created-courses")
class UserCreatedCoursesResource(Resource):
    @courses_ns.response(200, "Success")
    @courses_ns.response(401, "Unauthorized")
    def get(self):
        """Get courses created by the current user."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503
        
        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401
        
        include_archived = request.args.get("include_archived", "false").lower() == "true"
        
        session = db_session()
        try:
            # Build query for courses created by this user
            query = session.query(Course).filter(Course.created_by == user_id)
            
            # Filter by status
            if include_archived:
                query = query.filter(Course.status.in_(["draft", "published", "archived"]))
            else:
                query = query.filter(Course.status.in_(["draft", "published"]))
            
            courses = query.order_by(Course.created_at.desc()).all()
            
            result_courses = []
            for course in courses:
                org = session.query(Organization).filter(Organization.id == course.organization_id).first()
                
                # Get student count for this course
                course_classes = session.query(CourseClass).filter(CourseClass.course_id == course.id).all()
                class_ids = [cc.id for cc in course_classes]
                student_count = 0
                if class_ids:
                    student_count = session.query(ClassMember).filter(
                        ClassMember.course_class_id.in_(class_ids),
                        ClassMember.role == "student"
                    ).count()
                
                result_courses.append({
                    "id": course.id,
                    "title": course.title,
                    "description": course.description,
                    "visibility": course.visibility,
                    "status": course.status,
                    "organization_id": course.organization_id,
                    "organization_name": org.name if org else None,
                    "created_by": str(course.created_by),
                    "created_at": course.created_at.isoformat() if course.created_at else None,
                    "instructor_name": "You",
                    "instructor_avatar": None,
                    "enrolled": False,
                    "students_count": student_count,  # Add student count for teacher view
                })
            
            return jsonify({
                "courses": result_courses,
                "total": len(result_courses)
            }), 200
            
        except SQLAlchemyError as exc:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


    @courses_ns.response(200, "Success")
    @courses_ns.response(401, "Unauthorized")
    def get(self):
        """Get courses created by the current user."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503
        
        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401
        
        include_archived = request.args.get("include_archived", "false").lower() == "true"
        
        session = db_session()
        try:
            status_filter = ["draft", "published"]
            if include_archived:
                status_filter.append("archived")
            
            courses = session.query(Course).filter(
                Course.created_by == user_id,
                Course.status.in_(status_filter)
            ).order_by(Course.created_at.desc()).all()
            
            result_courses = []
            for course in courses:
                org = session.query(Organization).filter(Organization.id == course.organization_id).first()
                
                result_courses.append({
                    "id": course.id,
                    "title": course.title,
                    "description": course.description,
                    "visibility": course.visibility,
                    "status": course.status,
                    "organization_id": course.organization_id,
                    "organization_name": org.name if org else None,
                    "created_by": str(course.created_by),
                    "created_at": course.created_at.isoformat() if course.created_at else None,
                    "instructor_name": "You",
                    "instructor_avatar": None,
                    "enrolled": False,
                })
            
            return jsonify({
                "courses": result_courses,
                "total": len(result_courses)
            }), 200
            
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@courses_ns.route("/courses/upload-thumbnail")
class CourseThumbnailUploadResource(Resource):
    @courses_ns.response(200, "Thumbnail uploaded successfully")
    @courses_ns.response(400, "Invalid file")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(403, "Permission denied")
    def post(self):
        """Upload a thumbnail image for a course."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        # Get authenticated user
        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        # Validate file type
        ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in ALLOWED_EXTENSIONS:
            return jsonify({"error": f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

        # Validate file size (max 5MB)
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({"error": f"File size exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit"}), 400

        try:
            # Get Supabase client
            supabase_url = os.environ.get("SUPABASE_URL")
            supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            
            if not supabase_url or not supabase_service_key:
                return jsonify({"error": "Storage configuration missing"}), 500
            
            supabase_admin = create_client(supabase_url, supabase_service_key)
            
            # Ensure course-thumbnails bucket exists
            try:
                supabase_admin.storage.get_bucket('course-thumbnails')
            except:
                supabase_admin.storage.create_bucket('course-thumbnails', {'public': True})
            
            # Generate unique filename
            filename = secure_filename(file.filename)
            unique_filename = f"courses/{user_id}/{uuid.uuid4().hex}.{file_ext}"
            
            file_content = file.read()
            
            response = supabase_admin.storage.from_('course-thumbnails').upload(
                unique_filename,
                file_content,
                file_options={"content-type": file.content_type or "image/jpeg"}
            )
            
            if not response:
                raise Exception("Failed to upload file")
            
            public_url = supabase_admin.storage.from_('course-thumbnails').get_public_url(unique_filename)
            
            return jsonify({
                "success": True,
                "thumbnail_url": public_url,
                "file_name": filename,
                "file_size": file_size
            }), 200
            
        except Exception as e:
            print(f"Thumbnail upload error: {str(e)}")
            return jsonify({"error": str(e)}), 500

@courses_ns.route("/courses/<int:course_id>")
class CourseUpdateResource(Resource):
    @courses_ns.expect(course_create_model, validate=False)
    @courses_ns.response(200, "Course updated")
    @courses_ns.response(400, "Invalid request body")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(403, "Permission denied")
    @courses_ns.response(404, "Course not found")
    def put(self, course_id: int):
        """Update an existing course."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        title = normalize_text(payload.get("title"))
        description = normalize_text(payload.get("description"))
        category = normalize_text(payload.get("category"))
        level = normalize_text(payload.get("level") or "intermediate").lower()
        visibility = normalize_text(payload.get("visibility") or "private").lower()
        thumbnail = normalize_text(payload.get("thumbnail") or "")
        
        learning_objectives, error = normalize_string_list(
            payload.get("learning_objectives", payload.get("objectives")),
            "learning_objectives",
        )
        if error:
            return jsonify({"error": error}), 400

        prerequisites, error = normalize_string_list(payload.get("prerequisites"), "prerequisites")
        if error:
            return jsonify({"error": error}), 400

        tags, error = normalize_string_list(payload.get("tags"), "tags")
        if error:
            return jsonify({"error": error}), 400

        # Validate fields
        if not title:
            return jsonify({"error": "Field 'title' is required"}), 400
        if not description:
            return jsonify({"error": "Field 'description' is required"}), 400
        if not category:
            return jsonify({"error": "Field 'category' is required"}), 400
        
        if level not in ALLOWED_LEVELS:
            return jsonify({"error": "Field 'level' must be one of: beginner, intermediate, advanced"}), 400
        if visibility not in ALLOWED_VISIBILITIES:
            return jsonify({"error": "Field 'visibility' must be one of: public, org, private"}), 400

        session = db_session()
        try:
            course = session.query(Course).filter(Course.id == course_id).first()
            if course is None:
                return jsonify({"error": "Course not found"}), 404

            # Check if user has permission to edit
            membership = (
                session.query(OrganizationMember)
                .filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                )
                .first()
            )
            
            if course.created_by != user_id and (membership is None or membership.member_role not in COURSE_CREATOR_ROLES):
                return jsonify({"error": "You do not have permission to edit this course"}), 403

            # Update course fields
            course.title = title
            course.description = description
            course.category = category
            course.level = level
            course.visibility = visibility
            course.thumbnail = thumbnail or None
            course.learning_objectives = learning_objectives
            course.prerequisites = prerequisites
            course.tags = tags
            
            session.commit()
            session.refresh(course)

            return jsonify(serialize_course(course)), 200
            
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

# ========== LESSON PROGRESS ENDPOINTS ==========

@courses_ns.route("/class-members/<int:course_class_id>/user/<user_id>")
class ClassMemberByUserResource(Resource):
    @courses_ns.response(200, "Class member found")
    @courses_ns.response(404, "Class member not found")
    def get(self, course_class_id: int, user_id: str):
        """Get class member by course class ID and user ID."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        authenticated_user_id, _email = get_authenticated_user()
        if authenticated_user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        try:
            user_uuid = uuid.UUID(user_id)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid user ID format"}), 400

        session = db_session()
        try:
            class_member = session.query(ClassMember).filter(
                ClassMember.course_class_id == course_class_id,
                ClassMember.user_id == user_uuid
            ).first()

            if not class_member:
                return jsonify({"error": "Class member not found"}), 404

            return jsonify({
                "id": class_member.id,
                "course_class_id": class_member.course_class_id,
                "user_id": str(class_member.user_id),
                "role": class_member.role,
                "enrolled_at": class_member.enrolled_at.isoformat() if class_member.enrolled_at else None,
            }), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@courses_ns.route("/lesson-progress")
class LessonProgressResource(Resource):
    @courses_ns.response(200, "Lesson progress retrieved")
    @courses_ns.response(401, "Unauthorized")
    def get(self):
        """Get lesson progress by lesson_id and class_member_id."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        lesson_id = request.args.get("lesson_id", type=int)
        class_member_id = request.args.get("class_member_id", type=int)

        if not lesson_id or not class_member_id:
            return jsonify({"error": "lesson_id and class_member_id are required"}), 400

        session = db_session()
        try:
            progress = session.query(LessonProgress).filter(
                LessonProgress.lesson_id == lesson_id,
                LessonProgress.class_member_id == class_member_id,
                LessonProgress.user_id == user_id
            ).first()

            if not progress:
                return jsonify({
                    "status": "not_started",
                    "progress_percent": 0,
                    "completed_at": None
                }), 200

            return jsonify({
                "id": progress.id,
                "lesson_id": progress.lesson_id,
                "class_member_id": progress.class_member_id,
                "status": progress.status,
                "progress_percent": progress.progress_percent,
                "last_accessed_at": progress.last_accessed_at.isoformat() if progress.last_accessed_at else None,
                "completed_at": progress.completed_at.isoformat() if progress.completed_at else None,
            }), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    @courses_ns.response(200, "Lesson progress updated")
    @courses_ns.response(401, "Unauthorized")
    def post(self):
        """Create or update lesson progress."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        lesson_id = payload.get("lesson_id")
        class_member_id = payload.get("class_member_id")
        status = payload.get("status")
        progress_percent = payload.get("progress_percent")
        completed_at = payload.get("completed_at")

        if not lesson_id or not class_member_id:
            return jsonify({"error": "lesson_id and class_member_id are required"}), 400

        if status not in ["not_started", "in_progress", "completed"]:
            return jsonify({"error": "status must be not_started, in_progress, or completed"}), 400

        session = db_session()
        try:
            # Verify class member belongs to the user
            class_member = session.query(ClassMember).filter(
                ClassMember.id == class_member_id,
                ClassMember.user_id == user_id
            ).first()

            if not class_member:
                return jsonify({"error": "Invalid class member"}), 403

            # Check if progress record exists
            existing = session.query(LessonProgress).filter(
                LessonProgress.lesson_id == lesson_id,
                LessonProgress.class_member_id == class_member_id,
                LessonProgress.user_id == user_id
            ).first()

            now = datetime.now(timezone.utc)

            if existing:
                # Update existing
                existing.status = status
                existing.progress_percent = progress_percent
                existing.last_accessed_at = now
                if status == "completed" and not existing.completed_at:
                    existing.completed_at = now
                session.commit()
                session.refresh(existing)
                return jsonify({
                    "message": "Progress updated",
                    "progress": {
                        "id": existing.id,
                        "status": existing.status,
                        "progress_percent": existing.progress_percent
                    }
                }), 200
            else:
                # Create new
                new_progress = LessonProgress(
                    user_id=user_id,
                    lesson_id=lesson_id,
                    class_member_id=class_member_id,
                    status=status,
                    progress_percent=progress_percent or 0,
                    last_accessed_at=now,
                    completed_at=now if status == "completed" else None
                )
                session.add(new_progress)
                session.commit()
                session.refresh(new_progress)
                return jsonify({
                    "message": "Progress created",
                    "progress": {
                        "id": new_progress.id,
                        "status": new_progress.status,
                        "progress_percent": new_progress.progress_percent
                    }
                }), 201

        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

# ========== COURSE PREVIEW ENDPOINTS ==========

@courses_ns.route("/courses/<int:course_id>/enrollment/status")
class CourseEnrollmentStatusResource(Resource):
    @courses_ns.response(200, "Enrollment status retrieved")
    @courses_ns.response(401, "Unauthorized")
    def get(self, course_id: int):
        """Check if current user is enrolled in a course."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Check if user has any class_member entry for this course
            enrolled = session.query(ClassMember).join(
                CourseClass, CourseClass.id == ClassMember.course_class_id
            ).filter(
                CourseClass.course_id == course_id,
                ClassMember.user_id == user_id,
                ClassMember.role == "student"
            ).first() is not None

            return jsonify({"enrolled": enrolled}), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@courses_ns.route("/courses/<int:course_id>/preview-lessons")
class CoursePreviewLessonsResource(Resource):
    @courses_ns.response(200, "Preview lessons retrieved")
    def get(self, course_id: int):
        """Get preview lessons (first 2 lessons) for a course."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database not configured"}), 503

        session = db_session()
        try:
            # Get first module
            first_module = session.query(Module).filter(
                Module.course_id == course_id
            ).order_by(Module.order_index.asc()).first()

            if not first_module:
                return jsonify({"lessons": []}), 200

            # Get first class
            first_class = session.query(ContentClass).filter(
                ContentClass.module_id == first_module.id
            ).order_by(ContentClass.order_index.asc()).first()

            if not first_class:
                return jsonify({"lessons": []}), 200

            # Get first 2 lessons (published only, free preview OR any if unpublished course?)
            lessons = session.query(Lesson).filter(
                Lesson.class_id == first_class.id
            ).order_by(Lesson.order_index.asc()).limit(2).all()

            return jsonify({
                "lessons": [
                    {
                        "id": l.id,
                        "title": l.title,
                        "content_type": l.content_type,
                        "order_index": l.order_index
                    }
                    for l in lessons
                ]
            }), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@courses_ns.route("/courses/<int:course_id>/modules")
class CourseModulesResource(Resource):
    def get(self, course_id: int):
        """Get course modules with optional lessons."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database not configured"}), 503

        include_lessons = request.args.get("include_lessons", "false").lower() == "true"
        
        session = db_session()
        try:
            query = session.query(Module).filter(Module.course_id == course_id).order_by(Module.order_index.asc())
            modules = query.all()
            
            result = []
            for module in modules:
                module_data = {
                    "id": module.id,
                    "title": module.title,
                    "order_index": module.order_index,
                    "classes": []
                }
                
                if include_lessons:
                    classes = session.query(ContentClass).filter(
                        ContentClass.module_id == module.id
                    ).order_by(ContentClass.order_index.asc()).all()
                    
                    for class_item in classes:
                        lessons = session.query(Lesson).filter(
                            Lesson.class_id == class_item.id
                        ).order_by(Lesson.order_index.asc()).all()
                        
                        module_data["classes"].append({
                            "id": class_item.id,
                            "title": class_item.title,
                            "order_index": class_item.order_index,
                            "lessons": [
                                {
                                    "id": l.id,
                                    "title": l.title,
                                    "order_index": l.order_index,
                                    "content_type": l.content_type,
                                    "duration_seconds": l.duration_seconds
                                }
                                for l in lessons
                            ]
                        })
                
                result.append(module_data)
            
            return jsonify(result), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

# ========== COURSE CLASS STUDENTS ENDPOINTS ==========

@courses_ns.route("/course-classes/<int:course_class_id>/students")
class CourseClassStudentsResource(Resource):
    @courses_ns.response(200, "Students retrieved")
    @courses_ns.response(401, "Unauthorized")
    def get(self, course_class_id: int):
        """Get all students enrolled in a course class."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Check if user is instructor or admin
            course_class = session.query(CourseClass).filter(CourseClass.id == course_class_id).first()
            if not course_class:
                return jsonify({"error": "Course class not found"}), 404

            course = session.query(Course).filter(Course.id == course_class.course_id).first()
            if not course:
                return jsonify({"error": "Course not found"}), 404

            # Check permission
            is_instructor = course_class.instructor_id == user_id
            is_creator = course.created_by == user_id
            
            if not is_instructor and not is_creator:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin'])
                ).first()
                if not membership:
                    return jsonify({"error": "Permission denied"}), 403

            # Get all students
            students = session.query(ClassMember).filter(
                ClassMember.course_class_id == course_class_id,
                ClassMember.role == "student"
            ).all()

            # Get user profiles
            user_ids = [s.user_id for s in students]
            profiles = {}
            if user_ids:
                for profile in session.query(Profile).filter(Profile.id.in_(user_ids)).all():
                    profiles[profile.id] = profile

            result = []
            for student in students:
                profile = profiles.get(student.user_id)
                result.append({
                    "id": student.id,
                    "user_id": str(student.user_id),
                    "enrolled_at": student.enrolled_at.isoformat() if student.enrolled_at else None,
                    "role": student.role,
                    "user": {
                        "id": str(profile.id) if profile else None,
                        "first_name": profile.first_name if profile else None,
                        "last_name": profile.last_name if profile else None,
                        "username": profile.username if profile else None,
                        "email": "",  # Email from auth, not stored in profiles
                        "avatar_url": profile.avatar_url if profile else None,
                    }
                })

            return jsonify({"students": result}), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@courses_ns.route("/course-classes/<int:course_class_id>/students/<user_id>")
class CourseClassStudentResource(Resource):
    @courses_ns.response(200, "Student removed")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(403, "Permission denied")
    @courses_ns.response(404, "Student not found")
    def delete(self, course_class_id: int, user_id: str):
        """Remove a student from a course class."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database not configured"}), 503

        current_user_id, _email = get_authenticated_user()
        if current_user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        try:
            target_user_id = uuid.UUID(user_id)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid user ID"}), 400

        session = db_session()
        try:
            # Check permission
            course_class = session.query(CourseClass).filter(CourseClass.id == course_class_id).first()
            if not course_class:
                return jsonify({"error": "Course class not found"}), 404

            course = session.query(Course).filter(Course.id == course_class.course_id).first()
            if not course:
                return jsonify({"error": "Course not found"}), 404

            is_instructor = course_class.instructor_id == current_user_id
            is_creator = course.created_by == current_user_id
            
            if not is_instructor and not is_creator:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == current_user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin'])
                ).first()
                if not membership:
                    return jsonify({"error": "Permission denied"}), 403

            # Remove student
            result = session.query(ClassMember).filter(
                ClassMember.course_class_id == course_class_id,
                ClassMember.user_id == target_user_id,
                ClassMember.role == "student"
            ).delete()

            if result == 0:
                return jsonify({"error": "Student not found"}), 404

            session.commit()
            return jsonify({"message": "Student removed successfully"}), 200
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@courses_ns.route("/upload")
class FileUploadResource(Resource):
    @courses_ns.response(200, "File uploaded successfully")
    @courses_ns.response(400, "Invalid file")
    @courses_ns.response(401, "Unauthorized")
    def post(self):
        """Upload a file to Supabase storage."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        bucket = request.form.get('bucket', 'general')
        folder = request.form.get('folder', '')

        # Validate file size (default 50MB)
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        MAX_FILE_SIZE = 50 * 1024 * 1024
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({"error": f"File size exceeds 50MB limit"}), 400

        try:
            supabase_url = os.environ.get("SUPABASE_URL")
            supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            
            if not supabase_url or not supabase_service_key:
                return jsonify({"error": "Storage configuration missing"}), 500
            
            supabase_admin = create_client(supabase_url, supabase_service_key)
            
            # Ensure bucket exists
            try:
                supabase_admin.storage.get_bucket(bucket)
            except:
                supabase_admin.storage.create_bucket(bucket, {'public': True})
            
            # Generate unique filename
            filename = secure_filename(file.filename)
            file_ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
            unique_filename = f"{folder}/{user_id}/{uuid.uuid4().hex}.{file_ext}" if folder else f"{user_id}/{uuid.uuid4().hex}.{file_ext}"
            
            file_content = file.read()
            
            response = supabase_admin.storage.from_(bucket).upload(
                unique_filename,
                file_content,
                file_options={"content-type": file.content_type or "application/octet-stream"}
            )
            
            if not response:
                raise Exception("Failed to upload file")
            
            public_url = supabase_admin.storage.from_(bucket).get_public_url(unique_filename)
            
            return jsonify({
                "success": True,
                "file_url": public_url,
                "file_name": filename,
                "file_size": file_size
            }), 200
            
        except Exception as e:
            print(f"Upload error: {str(e)}")
            return jsonify({"error": str(e)}), 500

# Add to org_service/routes/courses.py

@courses_ns.route("/organizations/<int:org_id>/published-courses")
class OrganizationPublishedCoursesResource(Resource):
    def get(self, org_id: int):
        """Get published courses for an organization (public view)."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503
        
        limit = request.args.get("limit", 6, type=int)
        session = db_session()
        
        try:
            courses = session.query(Course).filter(
                Course.organization_id == org_id,
                Course.status == "published"
            ).order_by(Course.created_at.desc()).limit(limit).all()
            
            result = []
            for course in courses:
                # Get instructor info
                instructor = session.query(Profile).filter(Profile.id == course.created_by).first()
                instructor_name = "Instructor"
                if instructor:
                    if instructor.first_name and instructor.last_name:
                        instructor_name = f"{instructor.first_name} {instructor.last_name}"
                    elif instructor.first_name:
                        instructor_name = instructor.first_name
                    elif instructor.username:
                        instructor_name = instructor.username
                
                # Get student count
                course_classes = session.query(CourseClass).filter(CourseClass.course_id == course.id).all()
                class_ids = [cc.id for cc in course_classes]
                student_count = 0
                if class_ids:
                    student_count = session.query(ClassMember).filter(
                        ClassMember.course_class_id.in_(class_ids),
                        ClassMember.role == "student"
                    ).count()
                
                # Get average rating
                reviews = session.query(CourseReview).filter(CourseReview.course_id == course.id).all()
                avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else 0
                
                result.append({
                    "id": course.id,
                    "title": course.title,
                    "description": course.description,
                    "thumbnail": course.thumbnail,
                    "level": course.level,
                    "category": course.category,
                    "instructor_name": instructor_name,
                    "students_count": student_count,
                    "rating": round(avg_rating, 1),
                    "created_at": course.created_at.isoformat(),
                })
            
            return jsonify({"courses": result}), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@courses_ns.route("/organizations/<int:org_id>/courses")
class OrganizationCoursesResource(Resource):
    @courses_ns.param('include_stats', 'Include enrollment and lesson counts', type=bool, default=False)
    def get(self, org_id: int):
        """Get all courses for an organization with optional statistics."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        token = extract_bearer_token()
        user_id, _email = None, None
        if token:
            user_id, _email = verify_supabase_jwt(token)
        
        include_stats = request.args.get('include_stats', 'false').lower() == 'true'
        
        session = db_session()
        try:
            # Check if organization exists
            org = session.query(Organization).filter(Organization.id == org_id).first()
            if not org:
                return jsonify({"error": "Organization not found"}), 404
            
            # Get all courses for this organization
            courses = session.query(Course).filter(
                Course.organization_id == org_id
            ).order_by(Course.created_at.desc()).all()
            
            result_courses = []
            for course in courses:
                # Get instructor info
                instructor = session.query(Profile).filter(Profile.id == course.created_by).first()
                instructor_name = "Unknown"
                if instructor:
                    if instructor.first_name and instructor.last_name:
                        instructor_name = f"{instructor.first_name} {instructor.last_name}"
                    elif instructor.first_name:
                        instructor_name = instructor.first_name
                    elif instructor.username:
                        instructor_name = instructor.username
                
                course_data = {
                    "id": course.id,
                    "title": course.title,
                    "description": course.description,
                    "thumbnail": course.thumbnail,
                    "status": course.status,
                    "visibility": course.visibility,
                    "level": course.level,
                    "category": course.category,
                    "created_at": course.created_at.isoformat(),
                    "instructor_name": instructor_name,
                }
                
                if include_stats:
                    # Get enrollment count
                    course_classes = session.query(CourseClass).filter(CourseClass.course_id == course.id).all()
                    class_ids = [cc.id for cc in course_classes]
                    enrolled_count = 0
                    if class_ids:
                        enrolled_count = session.query(ClassMember).filter(
                            ClassMember.course_class_id.in_(class_ids),
                            ClassMember.role == "student"
                        ).count()
                    
                    # Get lesson count
                    modules = session.query(Module).filter(Module.course_id == course.id).all()
                    lesson_count = 0
                    for module in modules:
                        classes = session.query(ContentClass).filter(ContentClass.module_id == module.id).all()
                        for class_item in classes:
                            lesson_count += session.query(Lesson).filter(Lesson.class_id == class_item.id).count()
                    
                    course_data["enrolled_count"] = enrolled_count
                    course_data["lesson_count"] = lesson_count
                
                result_courses.append(course_data)
            
            return jsonify({
                "courses": result_courses,
                "total": len(result_courses)
            }), 200
            
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

# Add this after the CourseEnrollResource and before CourseReviewUpsertResource (around line 450-500)

@courses_ns.route("/course-classes/<int:course_class_id>")
class CourseClassResource(Resource):
    @courses_ns.response(200, "Course class retrieved")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(403, "Permission denied")
    @courses_ns.response(404, "Course class not found")
    def get(self, course_class_id: int):
        """Get a specific course offering by ID."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            course_class = session.query(CourseClass).filter(CourseClass.id == course_class_id).first()
            if not course_class:
                return jsonify({"error": "Course offering not found"}), 404

            # Check if user has permission to view this offering
            course = session.query(Course).filter(Course.id == course_class.course_id).first()
            if not course:
                return jsonify({"error": "Course not found"}), 404

            # Allow if user is instructor, course creator, org admin, or enrolled student
            is_instructor = course_class.instructor_id == user_id
            is_creator = course.created_by == user_id
            is_org_admin = False
            
            if not is_instructor and not is_creator:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin'])
                ).first()
                is_org_admin = membership is not None
            
            # Check if user is enrolled as student
            is_enrolled = session.query(ClassMember).filter(
                ClassMember.course_class_id == course_class_id,
                ClassMember.user_id == user_id,
                ClassMember.role == "student"
            ).first() is not None

            if not (is_instructor or is_creator or is_org_admin or is_enrolled):
                return jsonify({"error": "Permission denied"}), 403

            # Get schedules for this offering
            schedules = session.query(ClassSchedule).filter(
                ClassSchedule.course_class_id == course_class_id
            ).order_by(ClassSchedule.day_of_week).all()

            # Get member count
            member_count = session.query(ClassMember).filter(
                ClassMember.course_class_id == course_class_id
            ).count()

            return jsonify({
                "id": course_class.id,
                "course_id": course_class.course_id,
                "name": course_class.name,
                "description": course_class.description,
                "instructor_id": str(course_class.instructor_id) if course_class.instructor_id else None,
                "start_date": course_class.start_date.isoformat() if course_class.start_date else None,
                "end_date": course_class.end_date.isoformat() if course_class.end_date else None,
                "max_students": course_class.max_students,
                "status": course_class.status,
                "is_published": course_class.is_published,
                "created_at": course_class.created_at.isoformat() if course_class.created_at else None,
                "schedules": [
                    {
                        "id": s.id,
                        "day_of_week": s.day_of_week,
                        "start_time": s.start_time.isoformat() if s.start_time else None,
                        "end_time": s.end_time.isoformat() if s.end_time else None,
                    }
                    for s in schedules
                ],
                "member_count": member_count,
            }), 200

        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    @courses_ns.expect(courses_ns.model('CourseClassUpdate', {
        'name': fields.String(required=False, description="Offering name"),
        'description': fields.String(required=False, description="Offering description"),
        'start_date': fields.String(required=False, description="Start date (YYYY-MM-DD)"),
        'end_date': fields.String(required=False, description="End date (YYYY-MM-DD)"),
        'max_students': fields.Integer(required=False, description="Maximum number of students"),
        'status': fields.String(required=False, description="Status", enum=['upcoming', 'ongoing', 'completed', 'cancelled']),
    }))
    @courses_ns.response(200, "Course class updated")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(403, "Permission denied")
    @courses_ns.response(404, "Course class not found")
    def put(self, course_class_id: int):
        """Update a course offering."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}

        session = db_session()
        try:
            course_class = session.query(CourseClass).filter(CourseClass.id == course_class_id).first()
            if not course_class:
                return jsonify({"error": "Course offering not found"}), 404

            # Check permission
            course = session.query(Course).filter(Course.id == course_class.course_id).first()
            if not course:
                return jsonify({"error": "Course not found"}), 404

            is_instructor = course_class.instructor_id == user_id
            is_creator = course.created_by == user_id
            
            if not is_instructor and not is_creator:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin'])
                ).first()
                if not membership:
                    return jsonify({"error": "Permission denied"}), 403

            # Update fields
            if 'name' in payload:
                course_class.name = payload['name']
            if 'description' in payload:
                course_class.description = payload['description'] or None
            if 'start_date' in payload:
                course_class.start_date = payload['start_date'] if payload['start_date'] else None
            if 'end_date' in payload:
                course_class.end_date = payload['end_date'] if payload['end_date'] else None
            if 'max_students' in payload:
                course_class.max_students = payload['max_students'] if payload['max_students'] else None
            if 'status' in payload:
                if payload['status'] not in ['upcoming', 'ongoing', 'completed', 'cancelled']:
                    return jsonify({"error": "Invalid status"}), 400
                course_class.status = payload['status']

            session.commit()
            session.refresh(course_class)

            return jsonify({
                "id": course_class.id,
                "course_id": course_class.course_id,
                "name": course_class.name,
                "description": course_class.description,
                "instructor_id": str(course_class.instructor_id) if course_class.instructor_id else None,
                "start_date": course_class.start_date.isoformat() if course_class.start_date else None,
                "end_date": course_class.end_date.isoformat() if course_class.end_date else None,
                "max_students": course_class.max_students,
                "status": course_class.status,
                "is_published": course_class.is_published,
                "created_at": course_class.created_at.isoformat() if course_class.created_at else None,
            }), 200

        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    @courses_ns.response(200, "Course class deleted")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(403, "Permission denied")
    @courses_ns.response(404, "Course class not found")
    def delete(self, course_class_id: int):
        """Delete a course offering."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            course_class = session.query(CourseClass).filter(CourseClass.id == course_class_id).first()
            if not course_class:
                return jsonify({"error": "Course offering not found"}), 404

            # Check permission
            course = session.query(Course).filter(Course.id == course_class.course_id).first()
            if not course:
                return jsonify({"error": "Course not found"}), 404

            is_instructor = course_class.instructor_id == user_id
            is_creator = course.created_by == user_id
            
            if not is_instructor and not is_creator:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin'])
                ).first()
                if not membership:
                    return jsonify({"error": "Permission denied"}), 403

            # Delete schedules first (cascade should handle this, but explicit for safety)
            session.query(ClassSchedule).filter(
                ClassSchedule.course_class_id == course_class_id
            ).delete()

            # Delete class members
            session.query(ClassMember).filter(
                ClassMember.course_class_id == course_class_id
            ).delete()

            # Delete the offering
            session.delete(course_class)
            session.commit()

            return jsonify({"message": "Course offering deleted successfully"}), 200

        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

# Add to backend/services/org_service/org_service/routes/courses.py

@courses_ns.route("/course-classes/<int:course_class_id>/schedules")
class CourseClassSchedulesResource(Resource):
    @courses_ns.expect(courses_ns.model('ScheduleCreate', {
        'day_of_week': fields.Integer(required=True, description="Day of week (0-6)", example=1),
        'start_time': fields.String(required=True, description="Start time (HH:MM)", example="09:00"),
        'end_time': fields.String(required=True, description="End time (HH:MM)", example="11:00"),
    }))
    @courses_ns.response(201, "Schedule created")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(403, "Permission denied")
    @courses_ns.response(404, "Course class not found")
    def post(self, course_class_id: int):
        """Create a new schedule for a course offering."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        day_of_week = payload.get('day_of_week')
        start_time = payload.get('start_time')
        end_time = payload.get('end_time')

        if day_of_week is None:
            return jsonify({"error": "day_of_week is required"}), 400
        if not start_time:
            return jsonify({"error": "start_time is required"}), 400
        if not end_time:
            return jsonify({"error": "end_time is required"}), 400

        try:
            day_of_week = int(day_of_week)
            if day_of_week < 0 or day_of_week > 6:
                raise ValueError
        except ValueError:
            return jsonify({"error": "day_of_week must be between 0 and 6"}), 400

        session = db_session()
        try:
            # Check permission
            course_class = session.query(CourseClass).filter(CourseClass.id == course_class_id).first()
            if not course_class:
                return jsonify({"error": "Course offering not found"}), 404

            course = session.query(Course).filter(Course.id == course_class.course_id).first()
            if not course:
                return jsonify({"error": "Course not found"}), 404

            is_instructor = course_class.instructor_id == user_id
            is_creator = course.created_by == user_id
            
            if not is_instructor and not is_creator:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin'])
                ).first()
                if not membership:
                    return jsonify({"error": "Permission denied"}), 403

            # Create schedule
            new_schedule = ClassSchedule(
                course_class_id=course_class_id,
                day_of_week=day_of_week,
                start_time=start_time,
                end_time=end_time,
            )
            session.add(new_schedule)
            session.commit()
            session.refresh(new_schedule)

            return jsonify({
                "id": new_schedule.id,
                "course_class_id": new_schedule.course_class_id,
                "day_of_week": new_schedule.day_of_week,
                "start_time": new_schedule.start_time.isoformat() if new_schedule.start_time else None,
                "end_time": new_schedule.end_time.isoformat() if new_schedule.end_time else None,
            }), 201

        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@courses_ns.route("/class-schedules/<int:schedule_id>")
class ClassScheduleResource(Resource):
    @courses_ns.expect(courses_ns.model('ScheduleUpdate', {
        'day_of_week': fields.Integer(required=False, description="Day of week (0-6)"),
        'start_time': fields.String(required=False, description="Start time (HH:MM)"),
        'end_time': fields.String(required=False, description="End time (HH:MM)"),
    }))
    @courses_ns.response(200, "Schedule updated")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(403, "Permission denied")
    @courses_ns.response(404, "Schedule not found")
    def put(self, schedule_id: int):
        """Update a class schedule."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}

        session = db_session()
        try:
            schedule = session.query(ClassSchedule).filter(ClassSchedule.id == schedule_id).first()
            if not schedule:
                return jsonify({"error": "Schedule not found"}), 404

            # Check permission
            course_class = session.query(CourseClass).filter(CourseClass.id == schedule.course_class_id).first()
            if not course_class:
                return jsonify({"error": "Course offering not found"}), 404

            course = session.query(Course).filter(Course.id == course_class.course_id).first()
            if not course:
                return jsonify({"error": "Course not found"}), 404

            is_instructor = course_class.instructor_id == user_id
            is_creator = course.created_by == user_id
            
            if not is_instructor and not is_creator:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin'])
                ).first()
                if not membership:
                    return jsonify({"error": "Permission denied"}), 403

            # Update fields
            if 'day_of_week' in payload:
                day_of_week = int(payload['day_of_week'])
                if day_of_week < 0 or day_of_week > 6:
                    return jsonify({"error": "day_of_week must be between 0 and 6"}), 400
                schedule.day_of_week = day_of_week
            if 'start_time' in payload:
                schedule.start_time = payload['start_time']
            if 'end_time' in payload:
                schedule.end_time = payload['end_time']

            session.commit()
            session.refresh(schedule)

            return jsonify({
                "id": schedule.id,
                "course_class_id": schedule.course_class_id,
                "day_of_week": schedule.day_of_week,
                "start_time": schedule.start_time.isoformat() if schedule.start_time else None,
                "end_time": schedule.end_time.isoformat() if schedule.end_time else None,
            }), 200

        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    @courses_ns.response(200, "Schedule deleted")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(403, "Permission denied")
    @courses_ns.response(404, "Schedule not found")
    def delete(self, schedule_id: int):
        """Delete a class schedule."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            schedule = session.query(ClassSchedule).filter(ClassSchedule.id == schedule_id).first()
            if not schedule:
                return jsonify({"error": "Schedule not found"}), 404

            # Check permission
            course_class = session.query(CourseClass).filter(CourseClass.id == schedule.course_class_id).first()
            if not course_class:
                return jsonify({"error": "Course offering not found"}), 404

            course = session.query(Course).filter(Course.id == course_class.course_id).first()
            if not course:
                return jsonify({"error": "Course not found"}), 404

            is_instructor = course_class.instructor_id == user_id
            is_creator = course.created_by == user_id
            
            if not is_instructor and not is_creator:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin'])
                ).first()
                if not membership:
                    return jsonify({"error": "Permission denied"}), 403

            session.delete(schedule)
            session.commit()

            return jsonify({"message": "Schedule deleted successfully"}), 200

        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

# ========== SUBMISSIONS ENDPOINT ==========

@courses_ns.route("/assignments/<int:assignment_id>/submissions")
class AssignmentSubmissionsResource(Resource):
    @courses_ns.response(200, "Submissions retrieved")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(403, "Permission denied")
    def get(self, assignment_id: int):
        """Get all submissions for an assignment."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        limit = request.args.get("limit", 50, type=int)

        session = db_session()
        try:
            assignment = session.query(Assignment).filter(Assignment.id == assignment_id).first()
            if not assignment:
                return jsonify({"error": "Assignment not found"}), 404

            # Check permission - user must be course creator OR instructor of the offering
            course = session.query(Course).filter(Course.id == assignment.course_id).first()
            if not course:
                return jsonify({"error": "Course not found"}), 404
                
            is_creator = course.created_by == user_id
            is_instructor = False
            
            # Check if user is instructor for this assignment's course class
            if assignment.course_class_id:
                course_class = session.query(CourseClass).filter(
                    CourseClass.id == assignment.course_class_id
                ).first()
                if course_class and course_class.instructor_id == user_id:
                    is_instructor = True
            
            # Check if user is org admin
            is_org_admin = False
            if not is_creator and not is_instructor:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin'])
                ).first()
                if membership:
                    is_org_admin = True
            
            if not (is_creator or is_instructor or is_org_admin):
                return jsonify({"error": "Permission denied"}), 403

            # Get submissions with user profiles
            submissions = session.query(Submission).filter(
                Submission.assignment_id == assignment_id
            ).order_by(Submission.submitted_at.desc()).limit(limit).all()

            # Get user profiles for all submissions
            user_ids = [s.user_id for s in submissions]
            profiles = {}
            if user_ids:
                for profile in session.query(Profile).filter(Profile.id.in_(user_ids)).all():
                    profiles[profile.id] = profile

            result = []
            for submission in submissions:
                profile = profiles.get(submission.user_id)
                
                # Build user info
                user_info = {
                    "id": str(submission.user_id),
                    "email": "",  # Email from auth service, not stored in profiles
                    "first_name": None,
                    "last_name": None,
                    "username": None,
                    "avatar_url": None,
                }
                
                if profile:
                    user_info["first_name"] = profile.first_name
                    user_info["last_name"] = profile.last_name
                    user_info["username"] = profile.username
                    user_info["avatar_url"] = profile.avatar_url
                
                result.append({
                    "id": submission.id,
                    "assignment_id": submission.assignment_id,
                    "user_id": str(submission.user_id),
                    "user": user_info,
                    "content_url": submission.content_url,
                    "text_content": submission.text_content,
                    "grade": submission.grade,
                    "feedback": submission.feedback,
                    "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
                    "status": "graded" if submission.grade is not None else "submitted",
                })

            return jsonify({"submissions": result}), 200

        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@courses_ns.route("/course-classes")
class CourseClassCreateResource(Resource):
    @courses_ns.expect(courses_ns.model('CourseClassCreate', {
        'course_id': fields.Integer(required=True, description="Course ID"),
        'name': fields.String(required=True, description="Offering name"),
        'description': fields.String(required=False, description="Offering description"),
        'instructor_id': fields.String(required=False, description="Instructor user ID"),
        'start_date': fields.String(required=False, description="Start date (YYYY-MM-DD)"),
        'end_date': fields.String(required=False, description="End date (YYYY-MM-DD)"),
        'max_students': fields.Integer(required=False, description="Maximum number of students"),
        'status': fields.String(required=False, description="Status", enum=['upcoming', 'ongoing', 'completed', 'cancelled']),
    }))
    @courses_ns.response(201, "Course class created")
    @courses_ns.response(400, "Invalid request")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(403, "Permission denied")
    @courses_ns.response(404, "Course not found")
    def post(self):
        """Create a new course offering."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        
        course_id = payload.get('course_id')
        name = payload.get('name')
        description = payload.get('description')
        instructor_id = payload.get('instructor_id')
        start_date = payload.get('start_date')
        end_date = payload.get('end_date')
        max_students = payload.get('max_students')
        status = payload.get('status', 'upcoming')

        if not course_id:
            return jsonify({"error": "course_id is required"}), 400
        if not name:
            return jsonify({"error": "name is required"}), 400

        session = db_session()
        try:
            # Check if course exists and user has permission
            course = session.query(Course).filter(Course.id == course_id).first()
            if not course:
                return jsonify({"error": "Course not found"}), 404

            # Check permission
            is_creator = course.created_by == user_id
            if not is_creator:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin', 'teacher'])
                ).first()
                if not membership:
                    return jsonify({"error": "You do not have permission to create offerings for this course"}), 403

            # Validate instructor_id if provided
            if instructor_id:
                instructor = session.query(Profile).filter(Profile.id == instructor_id).first()
                if not instructor:
                    return jsonify({"error": "Instructor not found"}), 404

            # Create the offering
            new_class = CourseClass(
                course_id=course_id,
                name=name,
                description=description or None,
                instructor_id=instructor_id or None,
                start_date=start_date if start_date else None,
                end_date=end_date if end_date else None,
                max_students=max_students if max_students else None,
                status=status,
                is_published=False,
            )
            session.add(new_class)
            session.commit()
            session.refresh(new_class)

            return jsonify({
                "id": new_class.id,
                "course_id": new_class.course_id,
                "name": new_class.name,
                "description": new_class.description,
                "instructor_id": str(new_class.instructor_id) if new_class.instructor_id else None,
                "start_date": new_class.start_date.isoformat() if new_class.start_date else None,
                "end_date": new_class.end_date.isoformat() if new_class.end_date else None,
                "max_students": new_class.max_students,
                "status": new_class.status,
                "is_published": new_class.is_published,
                "created_at": new_class.created_at.isoformat() if new_class.created_at else None,
            }), 201

        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@courses_ns.route("/assignments/<int:assignment_id>")
class AssignmentResource(Resource):
    @courses_ns.response(200, "Assignment retrieved")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(404, "Assignment not found")
    def get(self, assignment_id: int):
        """Get a specific assignment by ID."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            assignment = session.query(Assignment).filter(Assignment.id == assignment_id).first()
            if not assignment:
                return jsonify({"error": "Assignment not found"}), 404

            # Check if user has access (instructor, creator, or enrolled student)
            course = session.query(Course).filter(Course.id == assignment.course_id).first()
            
            is_creator = course and course.created_by == user_id
            is_instructor = False
            is_enrolled = False
            
            if assignment.course_class_id:
                course_class = session.query(CourseClass).filter(CourseClass.id == assignment.course_class_id).first()
                if course_class:
                    is_instructor = course_class.instructor_id == user_id
                    is_enrolled = session.query(ClassMember).filter(
                        ClassMember.course_class_id == assignment.course_class_id,
                        ClassMember.user_id == user_id,
                        ClassMember.role == "student"
                    ).first() is not None
            
            if not is_creator and not is_instructor and not is_enrolled:
                return jsonify({"error": "Permission denied"}), 403

            return jsonify({
                "id": assignment.id,
                "title": assignment.title,
                "description": assignment.description,
                "course_id": assignment.course_id,
                "course_class_id": assignment.course_class_id,
                "lesson_id": assignment.lesson_id,
                "due_at": assignment.due_at.isoformat() if assignment.due_at else None,
                "points": assignment.points,
                "created_at": assignment.created_at.isoformat() if assignment.created_at else None,
            }), 200

        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@courses_ns.route("/submissions/<int:submission_id>")
class SubmissionDetailResource(Resource):
    def get(self, submission_id: int):
        """Get a specific submission."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            submission = session.query(Submission).filter(Submission.id == submission_id).first()
            if not submission:
                return jsonify({"error": "Submission not found"}), 404

            # Check if user owns this submission or is the instructor
            assignment = session.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
            if not assignment:
                return jsonify({"error": "Assignment not found"}), 404

            course = session.query(Course).filter(Course.id == assignment.course_id).first()
            is_owner = submission.user_id == user_id
            is_instructor = course and course.created_by == user_id

            # Check if user is instructor for the course offering
            if assignment.course_class_id and not is_instructor:
                course_class = session.query(CourseClass).filter(
                    CourseClass.id == assignment.course_class_id
                ).first()
                if course_class and course_class.instructor_id == user_id:
                    is_instructor = True

            # Check if user is org admin
            is_org_admin = False
            if not is_owner and not is_instructor and course:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin'])
                ).first()
                if membership:
                    is_org_admin = True

            if not (is_owner or is_instructor or is_org_admin):
                return jsonify({"error": "Access denied"}), 403

            # Get user profile for response
            profile = session.query(Profile).filter(Profile.id == submission.user_id).first()
            user_info = {
                "id": str(submission.user_id),
                "first_name": profile.first_name if profile else None,
                "last_name": profile.last_name if profile else None,
                "username": profile.username if profile else None,
                "avatar_url": profile.avatar_url if profile else None,
            }

            return jsonify({
                "id": submission.id,
                "assignment_id": submission.assignment_id,
                "user_id": str(submission.user_id),
                "user": user_info,
                "content_url": submission.content_url,
                "text_content": submission.text_content,
                "grade": submission.grade,
                "feedback": submission.feedback,
                "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
            }), 200

        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    @courses_ns.expect(courses_ns.model('SubmissionUpdate', {
        'grade': fields.Integer(required=False, description="Grade for the submission"),
        'feedback': fields.String(required=False, description="Feedback for the student"),
        'text_content': fields.String(required=False, description="Text content"),
        'content_url': fields.String(required=False, description="File URL"),
    }))
    @courses_ns.response(200, "Submission updated")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(403, "Permission denied")
    @courses_ns.response(404, "Submission not found")
    def put(self, submission_id: int):
        """Update a submission (for grading or resubmission)."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}

        session = db_session()
        try:
            submission = session.query(Submission).filter(Submission.id == submission_id).first()
            if not submission:
                return jsonify({"error": "Submission not found"}), 404

            # Check permissions
            assignment = session.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
            if not assignment:
                return jsonify({"error": "Assignment not found"}), 404

            course = session.query(Course).filter(Course.id == assignment.course_id).first()
            if not course:
                return jsonify({"error": "Course not found"}), 404

            is_owner = submission.user_id == user_id
            is_instructor = course.created_by == user_id

            # Check if user is instructor for the course offering
            if assignment.course_class_id and not is_instructor:
                course_class = session.query(CourseClass).filter(
                    CourseClass.id == assignment.course_class_id
                ).first()
                if course_class and course_class.instructor_id == user_id:
                    is_instructor = True

            # Check if user is org admin
            is_org_admin = False
            if not is_owner and not is_instructor:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin'])
                ).first()
                if membership:
                    is_org_admin = True

            if not (is_owner or is_instructor or is_org_admin):
                return jsonify({"error": "Permission denied"}), 403

            # Update fields based on user role
            if is_instructor or is_org_admin:
                # Instructors and admins can update grade and feedback
                if 'grade' in payload:
                    submission.grade = payload['grade']
                if 'feedback' in payload:
                    submission.feedback = payload['feedback']

            if is_owner:
                # Students can update content (for resubmission)
                if 'text_content' in payload:
                    submission.text_content = payload['text_content'] or None
                if 'content_url' in payload:
                    submission.content_url = payload['content_url'] or None
                submission.submitted_at = datetime.now(timezone.utc)
                # Clear grade when resubmitting (only if not being graded in same request)
                if 'grade' not in payload and 'feedback' not in payload:
                    submission.grade = None
                    submission.feedback = None

            session.commit()
            session.refresh(submission)

            return jsonify({
                "id": submission.id,
                "assignment_id": submission.assignment_id,
                "content_url": submission.content_url,
                "text_content": submission.text_content,
                "grade": submission.grade,
                "feedback": submission.feedback,
                "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
            }), 200

        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    def delete(self, submission_id: int):
        """Delete a submission (for resubmit)."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            submission = session.query(Submission).filter(Submission.id == submission_id).first()
            if not submission:
                return jsonify({"error": "Submission not found"}), 404

            if submission.user_id != user_id:
                return jsonify({"error": "You can only delete your own submissions"}), 403

            session.delete(submission)
            session.commit()
            return jsonify({"message": "Submission deleted"}), 200
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@courses_ns.route("/courses/<int:course_id>/offerings")
class CourseOfferingsResource(Resource):
    @courses_ns.response(200, "Course offerings retrieved")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(404, "Course not found")
    def get(self, course_id: int):
        """Get all course offerings/classes for a course."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Check if course exists
            course = session.query(Course).filter(Course.id == course_id).first()
            if not course:
                return jsonify({"error": "Course not found"}), 404

            # Get all course classes (offerings) for this course
            offerings = session.query(CourseClass).filter(
                CourseClass.course_id == course_id
            ).order_by(CourseClass.created_at.desc()).all()

            result = []
            for offering in offerings:
                # Get enrolled student count
                student_count = session.query(ClassMember).filter(
                    ClassMember.course_class_id == offering.id,
                    ClassMember.role == "student"
                ).count()

                result.append({
                    "id": offering.id,
                    "name": offering.name,
                    "description": offering.description,
                    "status": offering.status,
                    "max_students": offering.max_students,
                    "start_date": offering.start_date.isoformat() if offering.start_date else None,
                    "end_date": offering.end_date.isoformat() if offering.end_date else None,
                    "instructor_id": str(offering.instructor_id) if offering.instructor_id else None,
                    "is_published": offering.is_published,
                    "created_at": offering.created_at.isoformat() if offering.created_at else None,
                    "student_count": student_count,
                })

            return jsonify({"offerings": result}), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

# ========== DRAG AND DROP REORDER ENDPOINTS ==========

@courses_ns.route("/modules/reorder")
class ModulesReorderResource(Resource):
    @courses_ns.expect(courses_ns.model('ModulesReorderRequest', {
        'updates': fields.List(fields.Raw, required=True, description='List of module updates with id and order_index')
    }))
    @courses_ns.response(200, "Modules reordered successfully")
    @courses_ns.response(400, "Invalid request")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(403, "Permission denied")
    def post(self):
        """Reorder modules for a course."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        updates = payload.get("updates", [])

        if not updates:
            return jsonify({"error": "No updates provided"}), 400

        session = db_session()
        try:
            # Verify user has permission to modify these modules
            module_ids = [u.get("id") for u in updates if u.get("id")]
            if module_ids:
                # Get course_id from first module to check permissions
                first_module = session.query(Module).filter(Module.id == module_ids[0]).first()
                if first_module:
                    course = session.query(Course).filter(Course.id == first_module.course_id).first()
                    if course and course.created_by != user_id:
                        membership = session.query(OrganizationMember).filter(
                            OrganizationMember.organization_id == course.organization_id,
                            OrganizationMember.user_id == user_id,
                            OrganizationMember.member_role.in_(['admin', 'sub_admin', 'teacher'])
                        ).first()
                        if not membership:
                            return jsonify({"error": "You don't have permission to reorder modules"}), 403

            # Perform updates in a transaction
            for update in updates:
                module_id = update.get("id")
                order_index = update.get("order_index")
                
                if module_id is None or order_index is None:
                    continue
                    
                session.query(Module).filter(Module.id == module_id).update({
                    "order_index": order_index
                })
            
            session.commit()
            return jsonify({"message": "Modules reordered successfully"}), 200
            
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@courses_ns.route("/classes/reorder")
class ClassesReorderResource(Resource):
    @courses_ns.expect(courses_ns.model('ClassesReorderRequest', {
        'updates': fields.List(fields.Raw, required=True, description='List of class updates with id, module_id, and order_index')
    }))
    @courses_ns.response(200, "Classes reordered successfully")
    @courses_ns.response(400, "Invalid request")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(403, "Permission denied")
    def post(self):
        """Reorder classes, possibly moving between modules."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        updates = payload.get("updates", [])

        if not updates:
            return jsonify({"error": "No updates provided"}), 400

        session = db_session()
        try:
            # Verify permissions by checking the course
            first_update = updates[0] if updates else None
            if first_update:
                first_class = session.query(ContentClass).filter(ContentClass.id == first_update.get("id")).first()
                if first_class:
                    module = session.query(Module).filter(Module.id == first_class.module_id).first()
                    if module:
                        course = session.query(Course).filter(Course.id == module.course_id).first()
                        if course and course.created_by != user_id:
                            membership = session.query(OrganizationMember).filter(
                                OrganizationMember.organization_id == course.organization_id,
                                OrganizationMember.user_id == user_id,
                                OrganizationMember.member_role.in_(['admin', 'sub_admin', 'teacher'])
                            ).first()
                            if not membership:
                                return jsonify({"error": "You don't have permission to reorder classes"}), 403

            # Perform updates in a transaction
            for update in updates:
                class_id = update.get("id")
                module_id = update.get("module_id")
                order_index = update.get("order_index")
                
                if class_id is None or order_index is None:
                    continue
                
                update_data = {"order_index": order_index}
                if module_id is not None:
                    update_data["module_id"] = module_id
                    
                session.query(ContentClass).filter(ContentClass.id == class_id).update(update_data)
            
            session.commit()
            return jsonify({"message": "Classes reordered successfully"}), 200
            
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@courses_ns.route("/lessons/reorder")
class LessonsReorderResource(Resource):
    @courses_ns.expect(courses_ns.model('LessonsReorderRequest', {
        'updates': fields.List(fields.Raw, required=True, description='List of lesson updates with id, class_id, and order_index')
    }))
    @courses_ns.response(200, "Lessons reordered successfully")
    @courses_ns.response(400, "Invalid request")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(403, "Permission denied")
    def post(self):
        """Reorder lessons, possibly moving between classes."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        updates = payload.get("updates", [])

        if not updates:
            return jsonify({"error": "No updates provided"}), 400

        session = db_session()
        try:
            # Verify permissions by checking the course
            first_update = updates[0] if updates else None
            if first_update:
                first_lesson = session.query(Lesson).filter(Lesson.id == first_update.get("id")).first()
                if first_lesson:
                    class_item = session.query(ContentClass).filter(ContentClass.id == first_lesson.class_id).first()
                    if class_item:
                        module = session.query(Module).filter(Module.id == class_item.module_id).first()
                        if module:
                            course = session.query(Course).filter(Course.id == module.course_id).first()
                            if course and course.created_by != user_id:
                                membership = session.query(OrganizationMember).filter(
                                    OrganizationMember.organization_id == course.organization_id,
                                    OrganizationMember.user_id == user_id,
                                    OrganizationMember.member_role.in_(['admin', 'sub_admin', 'teacher'])
                                ).first()
                                if not membership:
                                    return jsonify({"error": "You don't have permission to reorder lessons"}), 403

            # Perform updates in a transaction
            for update in updates:
                lesson_id = update.get("id")
                class_id = update.get("class_id")
                order_index = update.get("order_index")
                
                if lesson_id is None or order_index is None:
                    continue
                
                update_data = {"order_index": order_index}
                if class_id is not None:
                    update_data["class_id"] = class_id
                    
                session.query(Lesson).filter(Lesson.id == lesson_id).update(update_data)
            
            session.commit()
            return jsonify({"message": "Lessons reordered successfully"}), 200
            
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

# ========== MODULE CRUD ENDPOINTS ==========

@courses_ns.route("/modules")
class ModuleListResource(Resource):
    @courses_ns.expect(courses_ns.model('ModuleCreate', {
        'course_id': fields.Integer(required=True),
        'title': fields.String(required=True),
        'order_index': fields.Integer(required=True),
    }))
    @courses_ns.response(201, "Module created")
    def post(self):
        """Create a new module."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        course_id = payload.get("course_id")
        title = payload.get("title", "").strip()
        order_index = payload.get("order_index", 0)

        if not course_id:
            return jsonify({"error": "course_id is required"}), 400
        if not title:
            return jsonify({"error": "title is required"}), 400

        session = db_session()
        try:
            course = session.query(Course).filter(Course.id == course_id).first()
            if not course:
                return jsonify({"error": "Course not found"}), 404

            if course.created_by != user_id:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin', 'teacher'])
                ).first()
                if not membership:
                    return jsonify({"error": "Permission denied"}), 403

            new_module = Module(
                course_id=course_id,
                title=title,
                order_index=order_index,
                is_published=True
            )
            session.add(new_module)
            session.commit()
            session.refresh(new_module)

            return jsonify({
                "id": new_module.id,
                "course_id": new_module.course_id,
                "title": new_module.title,
                "order_index": new_module.order_index,
                "is_published": new_module.is_published
            }), 201
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@courses_ns.route("/modules/<int:module_id>")
class ModuleResource(Resource):
    @courses_ns.expect(courses_ns.model('ModuleUpdate', {
        'title': fields.String(required=False),
        'order_index': fields.Integer(required=False),
        'is_published': fields.Boolean(required=False),
    }))
    def put(self, module_id: int):
        """Update a module."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}

        session = db_session()
        try:
            module = session.query(Module).filter(Module.id == module_id).first()
            if not module:
                return jsonify({"error": "Module not found"}), 404

            course = session.query(Course).filter(Course.id == module.course_id).first()
            if course and course.created_by != user_id:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin', 'teacher'])
                ).first()
                if not membership:
                    return jsonify({"error": "Permission denied"}), 403

            if "title" in payload:
                module.title = payload["title"]
            if "order_index" in payload:
                module.order_index = payload["order_index"]
            if "is_published" in payload:
                module.is_published = payload["is_published"]

            session.commit()
            session.refresh(module)

            return jsonify({
                "id": module.id,
                "course_id": module.course_id,
                "title": module.title,
                "order_index": module.order_index,
                "is_published": module.is_published
            }), 200
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    def delete(self, module_id: int):
        """Delete a module."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            module = session.query(Module).filter(Module.id == module_id).first()
            if not module:
                return jsonify({"error": "Module not found"}), 404

            course = session.query(Course).filter(Course.id == module.course_id).first()
            if course and course.created_by != user_id:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin', 'teacher'])
                ).first()
                if not membership:
                    return jsonify({"error": "Permission denied"}), 403

            # Delete all classes and lessons in this module
            classes = session.query(ContentClass).filter(ContentClass.module_id == module_id).all()
            for class_item in classes:
                session.query(Lesson).filter(Lesson.class_id == class_item.id).delete()
                session.query(Assignment).filter(Assignment.course_class_id == class_item.id).delete()
            session.query(ContentClass).filter(ContentClass.module_id == module_id).delete()
            
            session.delete(module)
            session.commit()

            return jsonify({"message": "Module deleted successfully"}), 200
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()
    
# ========== CLASS CRUD ENDPOINTS ==========

@courses_ns.route("/classes")
class ClassListResource(Resource):
    @courses_ns.expect(courses_ns.model('ClassCreate', {
        'module_id': fields.Integer(required=True),
        'title': fields.String(required=True),
        'order_index': fields.Integer(required=True),
    }))
    def post(self):
        """Create a new class."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        module_id = payload.get("module_id")
        title = payload.get("title", "").strip()
        order_index = payload.get("order_index", 0)

        if not module_id:
            return jsonify({"error": "module_id is required"}), 400
        if not title:
            return jsonify({"error": "title is required"}), 400

        session = db_session()
        try:
            module = session.query(Module).filter(Module.id == module_id).first()
            if not module:
                return jsonify({"error": "Module not found"}), 404

            course = session.query(Course).filter(Course.id == module.course_id).first()
            if course and course.created_by != user_id:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin', 'teacher'])
                ).first()
                if not membership:
                    return jsonify({"error": "Permission denied"}), 403

            new_class = ContentClass(
                module_id=module_id,
                title=title,
                order_index=order_index,
                is_published=True
            )
            session.add(new_class)
            session.commit()
            session.refresh(new_class)

            return jsonify({
                "id": new_class.id,
                "module_id": new_class.module_id,
                "title": new_class.title,
                "order_index": new_class.order_index,
                "is_published": new_class.is_published
            }), 201
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@courses_ns.route("/classes/<int:class_id>")
class ClassResource(Resource):
    @courses_ns.expect(courses_ns.model('ClassUpdate', {
        'title': fields.String(required=False),
        'module_id': fields.Integer(required=False),
        'order_index': fields.Integer(required=False),
    }))
    def put(self, class_id: int):
        """Update a class."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}

        session = db_session()
        try:
            class_item = session.query(ContentClass).filter(ContentClass.id == class_id).first()
            if not class_item:
                return jsonify({"error": "Class not found"}), 404

            module = session.query(Module).filter(Module.id == class_item.module_id).first()
            if module:
                course = session.query(Course).filter(Course.id == module.course_id).first()
                if course and course.created_by != user_id:
                    membership = session.query(OrganizationMember).filter(
                        OrganizationMember.organization_id == course.organization_id,
                        OrganizationMember.user_id == user_id,
                        OrganizationMember.member_role.in_(['admin', 'sub_admin', 'teacher'])
                    ).first()
                    if not membership:
                        return jsonify({"error": "Permission denied"}), 403

            if "title" in payload:
                class_item.title = payload["title"]
            if "module_id" in payload:
                class_item.module_id = payload["module_id"]
            if "order_index" in payload:
                class_item.order_index = payload["order_index"]

            session.commit()
            session.refresh(class_item)

            return jsonify({
                "id": class_item.id,
                "module_id": class_item.module_id,
                "title": class_item.title,
                "order_index": class_item.order_index,
                "is_published": class_item.is_published
            }), 200
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()
    def delete(self, class_id: int):
        """Delete a class."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            class_item = session.query(ContentClass).filter(ContentClass.id == class_id).first()
            if not class_item:
                return jsonify({"error": "Class not found"}), 404

            module = session.query(Module).filter(Module.id == class_item.module_id).first()
            if module:
                course = session.query(Course).filter(Course.id == module.course_id).first()
                if course and course.created_by != user_id:
                    membership = session.query(OrganizationMember).filter(
                        OrganizationMember.organization_id == course.organization_id,
                        OrganizationMember.user_id == user_id,
                        OrganizationMember.member_role.in_(['admin', 'sub_admin', 'teacher'])
                    ).first()
                    if not membership:
                        return jsonify({"error": "Permission denied"}), 403

            # Delete all lessons in this class
            session.query(Lesson).filter(Lesson.class_id == class_id).delete()
            
            session.delete(class_item)
            session.commit()

            return jsonify({"message": "Class deleted successfully"}), 200
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

# ========== LESSON CRUD ENDPOINTS ==========

@courses_ns.route("/lessons")
class LessonListResource(Resource):
    @courses_ns.expect(courses_ns.model('LessonCreate', {
        'class_id': fields.Integer(required=True),
        'title': fields.String(required=True),
        'content_type': fields.String(required=True),
        'content_url': fields.String(required=False),
        'content_json': fields.Raw(required=False),
        'order_index': fields.Integer(required=True),
        'duration_seconds': fields.Integer(required=False),
        'is_free_preview': fields.Boolean(required=False),
    }))
    def post(self):
        """Create a new lesson."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        class_id = payload.get("class_id")
        title = payload.get("title", "").strip()
        content_type = payload.get("content_type")
        order_index = payload.get("order_index", 0)

        if not class_id:
            return jsonify({"error": "class_id is required"}), 400
        if not title:
            return jsonify({"error": "title is required"}), 400

        session = db_session()
        try:
            class_item = session.query(ContentClass).filter(ContentClass.id == class_id).first()
            if not class_item:
                return jsonify({"error": "Class not found"}), 404

            module = session.query(Module).filter(Module.id == class_item.module_id).first()
            if module:
                course = session.query(Course).filter(Course.id == module.course_id).first()
                if course and course.created_by != user_id:
                    membership = session.query(OrganizationMember).filter(
                        OrganizationMember.organization_id == course.organization_id,
                        OrganizationMember.user_id == user_id,
                        OrganizationMember.member_role.in_(['admin', 'sub_admin', 'teacher'])
                    ).first()
                    if not membership:
                        return jsonify({"error": "Permission denied"}), 403

            new_lesson = Lesson(
                class_id=class_id,
                title=title,
                content_type=content_type,
                content_url=payload.get("content_url"),
                content_json=payload.get("content_json"),
                order_index=order_index,
                duration_seconds=payload.get("duration_seconds"),
                is_free_preview=payload.get("is_free_preview", False),
                is_published=False
            )
            session.add(new_lesson)
            session.commit()
            session.refresh(new_lesson)

            return jsonify({
                "id": new_lesson.id,
                "class_id": new_lesson.class_id,
                "title": new_lesson.title,
                "content_type": new_lesson.content_type,
                "content_url": new_lesson.content_url,
                "content_json": new_lesson.content_json,
                "order_index": new_lesson.order_index,
                "duration_seconds": new_lesson.duration_seconds,
                "is_free_preview": new_lesson.is_free_preview,
                "is_published": new_lesson.is_published
            }), 201
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@courses_ns.route("/lessons/<int:lesson_id>")
class LessonResource(Resource):
    @courses_ns.expect(courses_ns.model('LessonUpdate', {
        'title': fields.String(required=False),
        'content_type': fields.String(required=False),
        'content_url': fields.String(required=False),
        'content_json': fields.Raw(required=False),
        'class_id': fields.Integer(required=False),
        'order_index': fields.Integer(required=False),
        'duration_seconds': fields.Integer(required=False),
        'is_free_preview': fields.Boolean(required=False),
        'is_published': fields.Boolean(required=False),
    }))
    def put(self, lesson_id: int):
        """Update a lesson."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}

        session = db_session()
        try:
            lesson = session.query(Lesson).filter(Lesson.id == lesson_id).first()
            if not lesson:
                return jsonify({"error": "Lesson not found"}), 404

            class_item = session.query(ContentClass).filter(ContentClass.id == lesson.class_id).first()
            if class_item:
                module = session.query(Module).filter(Module.id == class_item.module_id).first()
                if module:
                    course = session.query(Course).filter(Course.id == module.course_id).first()
                    if course and course.created_by != user_id:
                        membership = session.query(OrganizationMember).filter(
                            OrganizationMember.organization_id == course.organization_id,
                            OrganizationMember.user_id == user_id,
                            OrganizationMember.member_role.in_(['admin', 'sub_admin', 'teacher'])
                        ).first()
                        if not membership:
                            return jsonify({"error": "Permission denied"}), 403

            updatable_fields = ['title', 'content_type', 'content_url', 'content_json', 
                                'class_id', 'order_index', 'duration_seconds', 
                                'is_free_preview', 'is_published']
            for field in updatable_fields:
                if field in payload:
                    setattr(lesson, field, payload[field])

            session.commit()
            session.refresh(lesson)

            return jsonify({
                "id": lesson.id,
                "class_id": lesson.class_id,
                "title": lesson.title,
                "content_type": lesson.content_type,
                "content_url": lesson.content_url,
                "content_json": lesson.content_json,
                "order_index": lesson.order_index,
                "duration_seconds": lesson.duration_seconds,
                "is_free_preview": lesson.is_free_preview,
                "is_published": lesson.is_published
            }), 200
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    def delete(self, lesson_id: int):
        """Delete a lesson."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            lesson = session.query(Lesson).filter(Lesson.id == lesson_id).first()
            if not lesson:
                return jsonify({"error": "Lesson not found"}), 404

            # Delete associated assignments and submissions first
            assignments = session.query(Assignment).filter(Assignment.lesson_id == lesson_id).all()
            for assignment in assignments:
                session.query(Submission).filter(Submission.assignment_id == assignment.id).delete()
            session.query(Assignment).filter(Assignment.lesson_id == lesson_id).delete()
            
            session.delete(lesson)
            session.commit()

            return jsonify({"message": "Lesson deleted successfully"}), 200
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@courses_ns.route("/modules")
class ModuleListResource(Resource):
    @courses_ns.expect(courses_ns.model('ModuleCreate', {
        'course_id': fields.Integer(required=True),
        'title': fields.String(required=True),
        'order_index': fields.Integer(required=True),
    }))
    def post(self):
        """Create a new module."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        course_id = payload.get("course_id")
        title = payload.get("title", "").strip()
        order_index = payload.get("order_index", 0)

        if not course_id:
            return jsonify({"error": "course_id is required"}), 400
        if not title:
            return jsonify({"error": "title is required"}), 400

        session = db_session()
        try:
            course = session.query(Course).filter(Course.id == course_id).first()
            if not course:
                return jsonify({"error": "Course not found"}), 404

            if course.created_by != user_id:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin', 'teacher'])
                ).first()
                if not membership:
                    return jsonify({"error": "Permission denied"}), 403

            new_module = Module(
                course_id=course_id,
                title=title,
                order_index=order_index,
                is_published=True
            )
            session.add(new_module)
            session.commit()
            session.refresh(new_module)

            return jsonify({
                "id": new_module.id,
                "course_id": new_module.course_id,
                "title": new_module.title,
                "order_index": new_module.order_index,
                "is_published": new_module.is_published
            }), 201
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@courses_ns.route("/modules")
class ModuleListResource(Resource):
    @courses_ns.expect(courses_ns.model('ModuleCreate', {
        'title': fields.String(required=True),
        'order_index': fields.Integer(required=True),
    }))
    def post(self):
        """Create a new module."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        title = payload.get("title", "").strip()
        order_index = payload.get("order_index", 0)
        course_id = payload.get("course_id")

        if not course_id:
            return jsonify({"error": "course_id is required"}), 400
        if not title:
            return jsonify({"error": "title is required"}), 400

        session = db_session()
        try:
            course = session.query(Course).filter(Course.id == course_id).first()
            if not course:
                return jsonify({"error": "Course not found"}), 404

            if course.created_by != user_id:
                membership = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == course.organization_id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.member_role.in_(['admin', 'sub_admin', 'teacher'])
                ).first()
                if not membership:
                    return jsonify({"error": "Permission denied"}), 403

            new_module = Module(
                course_id=course_id,
                title=title,
                order_index=order_index,
                is_published=True
            )
            session.add(new_module)
            session.commit()
            session.refresh(new_module)

            return jsonify({
                "id": new_module.id,
                "course_id": new_module.course_id,
                "title": new_module.title,
                "order_index": new_module.order_index,
                "is_published": new_module.is_published
            }), 201
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@courses_ns.route("/courses/<int:course_id>/assignments")
class CourseAssignmentsResource(Resource):
    @courses_ns.response(200, "Assignments retrieved")
    @courses_ns.response(401, "Unauthorized")
    @courses_ns.response(404, "Course not found")
    def get(self, course_id: int):
        """Get all assignments for a course."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Check if course exists
            course = session.query(Course).filter(Course.id == course_id).first()
            if not course:
                return jsonify({"error": "Course not found"}), 404

            # Get all assignments for this course
            assignments = session.query(Assignment).filter(
                Assignment.course_id == course_id
            ).order_by(Assignment.created_at.desc()).all()

            result = []
            for assignment in assignments:
                result.append({
                    "id": assignment.id,
                    "title": assignment.title,
                    "description": assignment.description,
                    "due_at": assignment.due_at.isoformat() if assignment.due_at else None,
                    "points": assignment.points,
                    "course_id": assignment.course_id,
                    "course_class_id": assignment.course_class_id,
                    "lesson_id": assignment.lesson_id,
                    "created_at": assignment.created_at.isoformat() if assignment.created_at else None,
                })

            return jsonify({"assignments": result}), 200

        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()