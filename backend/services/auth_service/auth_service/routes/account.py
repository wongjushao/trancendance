import os
import logging
import uuid

from flask import request, jsonify, current_app
from flask_restx import Namespace, Resource
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from supabase import create_client

from backend.common.models.entities import Profile
from backend.services.auth_service.auth_service.utils.supabase_jwt import extract_bearer_token

account_ns = Namespace("account", path="/api/auth-service", description="Account management endpoints")
logger = logging.getLogger(__name__)

def update_password():
    """Update user password and track status"""
    try:
        db_session = current_app.config.get("DB_SESSION")
        token = extract_bearer_token()
        if not token:
            return jsonify({"error": "Unauthorized"}), 401
        
        data = request.get_json(silent=True) or {}
        new_password = data.get("password")
        current_password = data.get("current_password")
        is_google_user = data.get("is_google_user", False)
        
        if not new_password:
            return jsonify({"error": "New password is required"}), 400
        
        # Get Supabase clients
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        supabase_anon_key = os.environ.get("SUPABASE_ANON_KEY")
        
        supabase_admin = create_client(supabase_url, supabase_service_key)
        
        # First, get the user from the token
        try:
            # Try to get user from the token directly
            user_response = supabase_admin.auth.get_user(token)
            if not user_response or not user_response.user:
                return jsonify({"error": "Invalid or expired token"}), 401
            user = user_response.user
            user_id = user.id
            user_email = user.email
        except Exception as e:
            logger.error(f"Error getting user from token: {str(e)}")
            return jsonify({"error": "Invalid or expired token"}), 401
        
        # For Google users, check if they have password set already
        if is_google_user:
            session = db_session()
            try:
                profile = session.query(Profile).filter(Profile.id == user_id).first()
                has_password = profile.has_password if profile else False
                
                # If they already have a password, verify current password
                if has_password and current_password:
                    # Create a new anonymous client for password verification
                    supabase_client = create_client(supabase_url, supabase_anon_key)
                    try:
                        # Try to sign in with email and current password
                        sign_in_response = supabase_client.auth.sign_in_with_password({
                            "email": user_email,
                            "password": current_password
                        })
                        
                        if not sign_in_response or not sign_in_response.user:
                            return jsonify({"error": "Current password is incorrect"}), 401
                            
                    except Exception as e:
                        logger.error(f"Password verification error: {str(e)}")
                        return jsonify({"error": "Current password is incorrect"}), 401
                        
            except Exception as e:
                logger.error(f"Error checking password status: {str(e)}")
            finally:
                session.close()
        
        # Update password using admin client
        try:
            supabase_admin.auth.admin.update_user_by_id(user_id, {"password": new_password})
        except Exception as e:
            logger.error(f"Error updating password: {str(e)}")
            return jsonify({"error": "Failed to update password"}), 500
        
        # Update has_password status in profile
        session = db_session()
        try:
            profile = session.query(Profile).filter(Profile.id == user_id).first()
            if profile:
                profile.has_password = True
                session.commit()
        except Exception as e:
            logger.error(f"Error updating password status: {str(e)}")
        finally:
            session.close()
        
        return jsonify({"success": True, "message": "Password updated successfully"}), 200
        
    except Exception as e:
        logger.error(f"Error in update_password: {str(e)}")
        return jsonify({"error": str(e)}), 500


def get_password_status():
    """Check if user has a password set"""
    try:
        db_session = current_app.config.get("DB_SESSION")
        token = extract_bearer_token()
        if not token:
            return jsonify({"error": "Unauthorized"}), 401
        
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        supabase_admin = create_client(supabase_url, supabase_service_key)
        
        # Get user from token
        try:
            user_response = supabase_admin.auth.get_user(token)
            if not user_response or not user_response.user:
                return jsonify({"error": "Invalid or expired token"}), 401
            user = user_response.user
            user_id = user.id
        except Exception as e:
            logger.error(f"Error getting user from token: {str(e)}")
            return jsonify({"error": "Invalid or expired token"}), 401
        
        session = db_session()
        try:
            profile = session.query(Profile).filter(Profile.id == user_id).first()
            has_password = profile.has_password if profile else False
            
            # Also check if user is from Google
            is_google_user = False
            if user.app_metadata:
                is_google_user = user.app_metadata.get('provider') == 'google'
            if not is_google_user and user.identities:
                is_google_user = any(identity.provider == 'google' for identity in user.identities)
            
            return jsonify({
                "has_password": has_password,
                "is_google_user": is_google_user
            }), 200
        except Exception as e:
            logger.error(f"Error getting password status: {str(e)}")
            return jsonify({"error": str(e)}), 500
        finally:
            session.close()
            
    except Exception as e:
        logger.error(f"Error in get_password_status: {str(e)}")
        return jsonify({"error": str(e)}), 500


@account_ns.route("/update-password")
class AccountPasswordResource(Resource):
    def post(self):
        return update_password()


@account_ns.route("/password-status")
class PasswordStatusResource(Resource):
    def get(self):
        return get_password_status()


def _purge_user_app_data(session, user_id: uuid.UUID) -> None:
    """Remove app rows that reference this profile before auth.users deletion cascades."""
    uid = user_id
    statements = [
        "UPDATE public.profiles SET invited_by = NULL WHERE invited_by = :uid",
        """UPDATE public.chat_room_members AS crm SET last_read_message_id = NULL
           WHERE last_read_message_id IN (
             SELECT id FROM public.messages WHERE sender_id = :uid
           )""",
        "DELETE FROM public.messages WHERE sender_id = :uid",
        "DELETE FROM public.chat_room_members WHERE user_id = :uid",
        "DELETE FROM public.friendships WHERE requester_id = :uid OR addressee_id = :uid",
        "DELETE FROM public.user_blocks WHERE blocker_id = :uid OR blocked_id = :uid",
        "DELETE FROM public.notifications WHERE user_id = :uid",
        "DELETE FROM public.api_keys WHERE user_id = :uid",
        "DELETE FROM public.user_activity_logs WHERE user_id = :uid",
        "DELETE FROM public.user_consents WHERE user_id = :uid",
        "DELETE FROM public.data_exports WHERE user_id = :uid",
        "DELETE FROM public.audit_logs WHERE actor_id = :uid",
        "DELETE FROM public.admin_messages WHERE sender_id = :uid",
        "DELETE FROM public.submissions WHERE user_id = :uid",
        "DELETE FROM public.lesson_progress WHERE user_id = :uid",
        "DELETE FROM public.course_reviews WHERE user_id = :uid",
        "DELETE FROM public.certificates WHERE user_id = :uid",
        "DELETE FROM public.class_members WHERE user_id = :uid",
        "DELETE FROM public.course_members WHERE user_id = :uid",
        "DELETE FROM public.user_roles WHERE user_id = :uid",
        "DELETE FROM public.organization_members WHERE user_id = :uid",
        "DELETE FROM public.courses WHERE created_by = :uid OR organization_id IN ("
        "SELECT id FROM public.organizations WHERE created_by = :uid)",
        "DELETE FROM public.organization_domains WHERE organization_id IN ("
        "SELECT id FROM public.organizations WHERE created_by = :uid)",
        "DELETE FROM public.organization_members WHERE organization_id IN ("
        "SELECT id FROM public.organizations WHERE created_by = :uid)",
        "DELETE FROM public.user_roles WHERE organization_id IN ("
        "SELECT id FROM public.organizations WHERE created_by = :uid)",
        "DELETE FROM public.organizations WHERE created_by = :uid",
        "DELETE FROM public.organization_verification_requests WHERE requested_by = :uid",
    ]
    for sql in statements:
        session.execute(text(sql), {"uid": uid})
    session.commit()


def delete_account():
    """Permanently delete the authenticated user (Supabase Auth + dependent app data)."""
    db_session_factory = current_app.config.get("DB_SESSION")
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "Unauthorized"}), 401

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_service_key:
        return jsonify({"error": "Backend Supabase configuration missing"}), 500

    supabase_admin = create_client(supabase_url, supabase_service_key)

    try:
        user_response = supabase_admin.auth.get_user(token)
        if not user_response or not user_response.user:
            return jsonify({"error": "Invalid or expired token"}), 401
        user_id = user_response.user.id
    except Exception as e:
        logger.error("Error getting user from token: %s", str(e))
        return jsonify({"error": "Invalid or expired token"}), 401

    if db_session_factory is not None:
        session = db_session_factory()
        try:
            _purge_user_app_data(session, user_id)
        except SQLAlchemyError as exc:
            session.rollback()
            logger.exception("purge before delete_account")
            return jsonify(
                {"error": "Could not remove associated data before deleting the account.", "detail": str(exc)}
            ), 500
        finally:
            session.close()

    try:
        supabase_admin.auth.admin.delete_user(str(user_id))
    except Exception as e:
        logger.exception("Supabase delete_user failed")
        return jsonify({"error": "Failed to delete account", "detail": str(e)}), 500

    return jsonify({"success": True, "message": "Account deleted"}), 200


@account_ns.route("/delete-account")
class DeleteAccountResource(Resource):
    def delete(self):
        return delete_account()
