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
    @users_ns.response(400, "Invalid request")
    @users_ns.response(401, "Unauthorized")
    @users_ns.response(404, "User or course not found")
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

            # FIX: list_users() returns a list directly (not an object with .users)
            try:
                # Try the newer method
                users_response = supabase_admin.auth.admin.list_users()
                # The response might be a list or an object with .data
                if hasattr(users_response, 'users'):
                    users_list = users_response.users
                elif hasattr(users_response, 'data'):
                    users_list = users_response.data
                else:
                    users_list = users_response if isinstance(users_response, list) else []
            except AttributeError:
                # Fallback: try to get from users attribute
                try:
                    users_list = supabase_admin.auth.admin.list_users().users
                except:
                    # Try a different approach
                    users_list = supabase_admin.auth.admin.list_users()
                    if hasattr(users_list, '__iter__') and not isinstance(users_list, dict):
                        pass  # It's already a list
                    else:
                        users_list = []

            # Find user with matching email
            found_user = None
            for user in users_list:
                user_email = user.email if hasattr(user, 'email') else user.get('email') if isinstance(user, dict) else None
                if user_email and user_email.lower() == email:
                    found_user = user
                    break

            if not found_user:
                return jsonify({"error": f"No user found with email: {email}"}), 404

            # Get user ID (handles both object and dict)
            student_id = found_user.id if hasattr(found_user, 'id') else found_user.get('id')
            try:
                student_uuid = uuid.UUID(str(student_id))
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid user id for enrolled student"}), 500
            student_id = student_uuid

            # Get profile to check if exists
            profile = session.query(Profile).filter(Profile.id == student_id).first()
            if not profile:
                # Create minimal profile if it doesn't exist
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

            if not existing_org_member:
                # Add user as a member of the organization
                new_org_member = OrganizationMember(
                    organization_id=organization_id,
                    user_id=student_id,
                    member_role="member",  # Default role for new members
                )
                session.add(new_org_member)
                session.flush()
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
                "added_to_organization": existing_org_member is None,
            }

            return jsonify({
                "success": True,
                "message": f"Student {profile.first_name or profile.username or email} has been enrolled",
                "user": user_details,
            }), 200

        except SQLAlchemyError as exc:
            session.rollback()
            print(f"Database error: {str(exc)}")
            return jsonify({"error": str(exc)}), 500
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