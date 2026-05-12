# services/org_service/org_service/routes/users.py
import uuid

from flask import current_app, jsonify, request
from flask_restx import Namespace, Resource, fields
from sqlalchemy.exc import SQLAlchemyError

from backend.common.models import (
    ChatRoom,
    ChatRoomMember,
    ClassMember,
    Course,
    CourseClass,
    Organization,
    OrganizationMember,
    Profile,
)
from backend.services.org_service.org_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt

users_ns = Namespace("users", path="/", description="User management endpoints")

user_enroll_model = users_ns.model(
    "UserEnrollRequest",
    {
        "email": fields.String(required=True, description="Student email address", example="student@example.com"),
        "course_class_id": fields.Integer(required=True, description="Course offering ID", example=1),
    },
)


def get_authenticated_user():
    """Get authenticated user ID and email from token."""
    token = extract_bearer_token()
    if not token:
        return None, None

    user_id, email = verify_supabase_jwt(token)
    if not user_id:
        return None, None

    return user_id, email


@users_ns.route("/users/enroll")
class UserEnrollResource(Resource):
    @users_ns.expect(user_enroll_model, validate=False)
    @users_ns.response(200, "Student enrolled successfully")
    def post(self):
        """Enroll a student by email, auto-add to organization if needed."""
        import os
        from supabase import create_client

        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        # Verify authentication
        requester_id, requester_email = get_authenticated_user()
        if requester_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        # Get request body
        payload = request.get_json(silent=True) or {}
        email = (payload.get("email") or "").strip().lower()
        course_class_id = payload.get("course_class_id")

        if not email:
            return jsonify({"error": "Email is required"}), 400
        if not course_class_id:
            return jsonify({"error": "course_class_id is required"}), 400

        session = db_session()
        try:
            # Get the course offering details
            course_class = (
                session.query(CourseClass)
                .filter(CourseClass.id == course_class_id)
                .first()
            )
            if not course_class:
                return jsonify({"error": "Course offering not found"}), 404

            # Get the course to find its organization
            course = session.query(Course).filter(Course.id == course_class.course_id).first()
            if not course:
                return jsonify({"error": "Course not found"}), 404

            organization_id = course.organization_id
            if not organization_id:
                return jsonify({"error": "Course has no associated organization"}), 400

            # Search for user by email using Supabase Admin API
            supabase_url = os.environ.get("SUPABASE_URL")
            supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

            if not supabase_url or not supabase_service_key:
                return jsonify({"error": "Supabase configuration missing"}), 500

            supabase_admin = create_client(supabase_url, supabase_service_key)

            # Find user with matching email
            users_response = supabase_admin.auth.admin.list_users()
            users_list = users_response.users if hasattr(users_response, 'users') else users_response
            
            found_user = None
            for user in users_list:
                user_email = user.email if hasattr(user, 'email') else user.get('email')
                if user_email and user_email.lower() == email:
                    found_user = user
                    break

            if not found_user:
                return jsonify({"error": f"No user found with email: {email}"}), 200

            student_id = found_user.id if hasattr(found_user, 'id') else found_user.get('id')
            try:
                student_uuid = uuid.UUID(str(student_id))
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid user id for enrolled student"}), 500
            student_id = student_uuid

            # Get profile to check if exists
            profile = session.query(Profile).filter(Profile.id == student_id).first()
            if not profile:
                profile = Profile(id=student_id)
                session.add(profile)
                session.flush()

            # Step 1: Add user to organization if not already a member
            existing_org_member = (
                session.query(OrganizationMember)
                .filter(
                    OrganizationMember.organization_id == organization_id,
                    OrganizationMember.user_id == student_id,
                )
                .first()
            )

            added_to_org = False
            if not existing_org_member:
                new_org_member = OrganizationMember(
                    organization_id=organization_id,
                    user_id=student_id,
                    member_role="member",
                )
                session.add(new_org_member)
                session.flush()
                added_to_org = True
                print(f"Added user {student_id} to organization {organization_id}")

            # Step 2: Check if already enrolled in the course offering
            existing_enrollment = (
                session.query(ClassMember)
                .filter(
                    ClassMember.course_class_id == course_class_id,
                    ClassMember.user_id == student_id,
                )
                .first()
            )

            if existing_enrollment:
                return jsonify({"error": "Student is already enrolled in this course offering"}), 409

            # Step 3: Enroll the user in the course offering
            new_enrollment = ClassMember(
                course_class_id=course_class_id,
                user_id=student_id,
                role="student",
            )
            session.add(new_enrollment)
            session.flush()

            # Ensure course chat room exists and add the new student + org admins
            chat_room = (
                session.query(ChatRoom)
                .filter(
                    ChatRoom.type == "course",
                    ChatRoom.related_course_id == course.id,
                )
                .first()
            )
            if not chat_room:
                chat_room = ChatRoom(type="course", related_course_id=course.id)
                session.add(chat_room)
                session.flush()

            def _ensure_chat_member(room_id: int, uid: uuid.UUID) -> None:
                exists = (
                    session.query(ChatRoomMember)
                    .filter(
                        ChatRoomMember.room_id == room_id,
                        ChatRoomMember.user_id == uid,
                    )
                    .first()
                )
                if not exists:
                    session.add(ChatRoomMember(room_id=room_id, user_id=uid))

            _ensure_chat_member(chat_room.id, student_id)

            org_admins = (
                session.query(OrganizationMember)
                .filter(
                    OrganizationMember.organization_id == organization_id,
                    OrganizationMember.member_role == "admin",
                )
                .all()
            )
            for row in org_admins:
                _ensure_chat_member(chat_room.id, row.user_id)

            session.commit()

            # Get user details for response
            user_details = {
                "id": str(student_id),
                "email": email,
                "username": profile.username,
                "first_name": profile.first_name,
                "last_name": profile.last_name,
                "added_to_organization": added_to_org,
            }

            return jsonify({
                "success": True,
                "message": f"Student {profile.first_name or profile.username or email} has been enrolled",
                "user": user_details,
            }), 200

        except Exception as e:
            session.rollback()
            print(f"Error enrolling student: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": f"Failed to enroll student: {str(e)}"}), 500
        finally:
            session.close()

# Add this to services/org_service/org_service/routes/users.py

@users_ns.route("/users/batch-emails")
class BatchUserEmailsResource(Resource):
    def post(self):
        """Get emails for multiple user IDs."""
        import os
        from supabase import create_client

        # Verify authentication
        requester_id, requester_email = get_authenticated_user()
        if requester_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        user_ids = payload.get("user_ids", [])

        if not user_ids:
            return jsonify({"users": {}}), 200

        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_service_key:
            return jsonify({"error": "Supabase configuration missing"}), 500

        supabase_admin = create_client(supabase_url, supabase_service_key)

        # Get all users
        users_response = supabase_admin.auth.admin.list_users()
        
        # Handle different response formats
        if hasattr(users_response, 'users'):
            users_list = users_response.users
        elif hasattr(users_response, 'data'):
            users_list = users_response.data
        else:
            users_list = users_response if isinstance(users_response, list) else []

        # Build email map
        email_map = {}
        for user in users_list:
            user_id = str(user.id) if hasattr(user, 'id') else user.get('id')
            user_email = user.email if hasattr(user, 'email') else user.get('email')
            if user_id in user_ids:
                email_map[user_id] = user_email

        return jsonify({"users": email_map}), 200

@users_ns.route("/users/me/role")
class UserRoleResource(Resource):
    def get(self):
        """Get current user's role and organization context."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503
        
        user_id, email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401
        
        session = db_session()
        try:
            # Get user's organization memberships
            memberships = session.query(
                OrganizationMember.organization_id,
                OrganizationMember.member_role,
                Organization.name.label("organization_name")
            ).join(
                Organization, Organization.id == OrganizationMember.organization_id
            ).filter(
                OrganizationMember.user_id == user_id,
                OrganizationMember.member_role != "pending"
            ).all()
            
            if not memberships:
                return jsonify({
                    "role": "student",
                    "organization_id": None,
                    "organization_name": None,
                    "has_organization": False,
                    "memberships": []
                }), 200
            
            # Determine highest role
            role_priority = {
                "admin": 4,
                "sub_admin": 3,
                "teacher": 2,
                "student": 1
            }
            
            highest_role = "student"
            primary_org_id = None
            primary_org_name = None
            all_memberships = []
            
            for membership in memberships:
                org_id = membership.organization_id
                org_role = membership.member_role
                org_name = membership.organization_name
                
                all_memberships.append({
                    "organization_id": org_id,
                    "organization_name": org_name,
                    "role": org_role
                })
                
                if role_priority.get(org_role, 0) > role_priority.get(highest_role, 0):
                    highest_role = org_role
                    primary_org_id = org_id
                    primary_org_name = org_name
            
            # Normalize role for frontend
            if highest_role == "sub_admin":
                highest_role = "admin"
            
            return jsonify({
                "role": highest_role,
                "organization_id": primary_org_id,
                "organization_name": primary_org_name,
                "has_organization": len(memberships) > 0,
                "memberships": all_memberships
            }), 200
            
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@users_ns.route("/users/me/enrolled-courses")
class UserEnrolledCoursesResource(Resource):
    @users_ns.response(200, "Enrolled courses retrieved")
    @users_ns.response(401, "Unauthorized")
    def get(self):
        """Get courses the current user is enrolled in."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Query class_members to find courses the user is enrolled in
            enrolled = (
                session.query(
                    CourseClass.course_id,
                    Course.title,
                    Course.thumbnail,
                    Course.level,
                    ClassMember.enrolled_at,
                    ClassMember.completed_at,
                    Course.course_class_id
                )
                .join(CourseClass, CourseClass.id == ClassMember.course_class_id)
                .join(Course, Course.id == CourseClass.course_id)
                .filter(ClassMember.user_id == user_id)
                .order_by(ClassMember.enrolled_at.desc())
                .all()
            )
            
            courses = []
            for course in enrolled:
                courses.append({
                    "id": course.course_id,
                    "title": course.title,
                    "thumbnail": course.thumbnail,
                    "level": course.level,
                    "enrolled_at": course.enrolled_at.isoformat() if course.enrolled_at else None,
                    "completed_at": course.completed_at.isoformat() if course.completed_at else None,
                    "class_id": course.course_class_id,
                    "status": "completed" if course.completed_at else "active"
                })
            
            return jsonify({"courses": courses}), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@users_ns.route("/users/me/discover-courses")
class UserDiscoverCoursesResource(Resource):
    @users_ns.response(200, "Discover courses retrieved")
    @users_ns.response(401, "Unauthorized")
    def get(self):
        """Get courses available for discovery (not enrolled in)."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Get IDs of courses the user is already enrolled in
            enrolled_ids = (
                session.query(CourseClass.course_id)
                .join(ClassMember, ClassMember.course_class_id == CourseClass.id)
                .filter(ClassMember.user_id == user_id)
                .distinct()
                .subquery()
            )
            
            # Get published courses the user is not enrolled in
            discoverable = (
                session.query(
                    Course.id,
                    Course.title,
                    Course.description,
                    Course.thumbnail,
                    Course.level,
                    Course.category,
                    Course.organization_id,
                )
                .filter(Course.status == 'published')
                .filter(Course.id.notin_(enrolled_ids))
                .order_by(Course.created_at.desc())
                .limit(20)
                .all()
            )
            
            courses = []
            for course in discoverable:
                courses.append({
                    "id": course.id,
                    "title": course.title,
                    "description": course.description,
                    "thumbnail": course.thumbnail,
                    "level": course.level,
                    "category": course.category,
                    "organization_id": course.organization_id,
                })
            
            return jsonify({"courses": courses}), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

# Add to org_service/routes/users.py

@users_ns.route("/users/<string:user_id>/enrolled-courses/count")
class UserEnrolledCoursesCountResource(Resource):
    def get(self, user_id: str):
        """Get count of courses a student is enrolled in."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503
        
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            return jsonify({"error": "Invalid user ID"}), 400
        
        session = db_session()
        try:
            count = session.query(ClassMember).filter(
                ClassMember.user_id == user_uuid,
                ClassMember.role == "student"
            ).count()
            
            return jsonify({"count": count}), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

# Add to org_service/routes/users.py

@users_ns.route("/users/<string:user_id>/created-courses/count")
class UserCreatedCoursesCountResource(Resource):
    def get(self, user_id: str):
        """Get count of courses a teacher/instructor has created."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503
        
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            return jsonify({"error": "Invalid user ID"}), 400
        
        session = db_session()
        try:
            count = session.query(Course).filter(Course.created_by == user_uuid).count()
            return jsonify({"count": count}), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@users_ns.route("/users/<string:user_id>/organizations")
class UserOrganizationsResource(Resource):
    def get(self, user_id: str):
        """Get all organizations a user belongs to."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database not configured"}), 503
        
        current_user_id, _email = get_authenticated_user()
        if current_user_id is None:
            return jsonify({"error": "Unauthorized"}), 401
        
        session = db_session()
        try:
            # Get organization memberships
            memberships = session.query(OrganizationMember).filter(
                OrganizationMember.user_id == user_id
            ).all()
            
            organizations = []
            for membership in memberships:
                org = session.query(Organization).filter(
                    Organization.id == membership.organization_id
                ).first()
                if org:
                    organizations.append({
                        "id": org.id,
                        "name": org.name,
                        "description": org.description,
                        "slug": org.slug,
                        "role": membership.member_role,
                        "joined_at": membership.created_at.isoformat() if membership.created_at else None,
                    })
            
            return jsonify({"organizations": organizations}), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

