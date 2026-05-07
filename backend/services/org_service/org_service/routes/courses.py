from flask import current_app, jsonify, request
from flask_restx import Namespace, Resource, fields
from sqlalchemy.exc import SQLAlchemyError

from backend.common.models import Course, Organization, OrganizationMember
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
