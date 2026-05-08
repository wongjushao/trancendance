import uuid
from datetime import datetime, timezone

from flask import current_app, jsonify, request
from flask_restx import Namespace, Resource, fields
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from backend.common.models import (
    Assignment,
    Class as ContentClass,
    ClassMember,
    Course,
    CourseClass,
    CourseReview,
    Lesson,
    LessonProgress,
    Module,
    Organization,
    OrganizationMember,
    Profile,
    Submission,
)
from backend.services.org_service.org_service.routes.organizations import get_authenticated_user


courses_ns = Namespace("courses", path="/", description="Course endpoints")

ALLOWED_LEVELS = {"beginner", "intermediate", "advanced"}
ALLOWED_VISIBILITIES = {"public", "org", "private"}
ALLOWED_STATUSES = {"draft", "published", "archived"}
COURSE_CREATOR_ROLES = {"admin", "sub_admin", "teacher", "instructor"}

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


@courses_ns.route("/courses")
class CourseListResource(Resource):
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


@courses_ns.route("/courses/<int:course_id>/detail")
class CourseDetailResource(Resource):
    @courses_ns.response(200, "Course detail payload")
    @courses_ns.response(404, "Not found")
    def get(self, course_id: int):
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

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

            offerings = session.query(CourseClass).filter(CourseClass.course_id == course_id).all()
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

            return jsonify(
                {
                    "course": course_payload,
                    "modules": modules_out,
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
