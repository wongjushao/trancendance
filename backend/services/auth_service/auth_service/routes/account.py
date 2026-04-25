import os
import logging

from flask import request, jsonify, current_app
from flask_restx import Namespace, Resource
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
