# backend/services/auth_service/auth_service/routes/auth.py
from __future__ import annotations

import os
import uuid
import re

from flask import jsonify, request, current_app
from flask_restx import Namespace, Resource
from supabase import create_client

from backend.services.auth_service.auth_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt

auth_ns = Namespace("auth", path="/api/auth-service", description="Authentication endpoints")

def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password strength."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number"
    if not re.search(r"[^A-Za-z0-9]", password):
        return False, "Password must contain at least one special character"
    return True, ""


def update_password():
    """Update user's password."""
    token = extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing authorization header"}), 401
    
    user_id, email = verify_supabase_jwt(token)
    if not user_id:
        return jsonify({"error": "Invalid or expired token"}), 401
    
    data = request.get_json(silent=True) or {}
    new_password = data.get("password")
    
    if not new_password:
        return jsonify({"error": "Password is required"}), 400
    
    # Validate password strength
    is_valid, error_message = validate_password_strength(new_password)
    if not is_valid:
        return jsonify({"error": error_message}), 400
    
    try:
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_service_key:
            return jsonify({"error": "Backend Supabase configuration missing"}), 500
        
        # Use service role client to update password
        supabase_admin = create_client(supabase_url, supabase_service_key)
        
        # Update user password
        response = supabase_admin.auth.admin.update_user_by_id(
            str(user_id),
            {"password": new_password}
        )
        
        return jsonify({
            "message": "Password updated successfully"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_ns.route("/update-password")
class UpdatePasswordResource(Resource):
    def put(self):
        return update_password()

def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password strength."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number"
    if not re.search(r"[^A-Za-z0-9]", password):
        return False, "Password must contain at least one special character"
    return True, ""


def verify_reset_token():
    """Verify a password reset token without changing the password."""
    data = request.get_json(silent=True) or {}
    token = data.get("token")
    token_hash = data.get("token_hash")
    
    if not token and not token_hash:
        return jsonify({"error": "Token or token_hash is required"}), 400
    
    try:
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_service_key:
            return jsonify({"error": "Backend Supabase configuration missing"}), 500
        
        supabase_admin = create_client(supabase_url, supabase_service_key)
        
        # For Supabase password reset, we can verify by attempting to get user info
        # or we can check the token validity through the auth API
        try:
            # Try to get user from token (if it's a valid session token)
            user_response = supabase_admin.auth.get_user(token)
            if user_response and user_response.user:
                return jsonify({
                    "valid": True,
                    "user_id": str(user_response.user.id),
                    "email": user_response.user.email
                }), 200
        except:
            pass
        
        # If not a session token, it might be a recovery token
        # Supabase doesn't have a direct API to verify recovery tokens,
        # so we'll check if we can exchange it
        try:
            # Attempt to verify OTP (this is the correct way to verify recovery tokens)
            verify_response = supabase_admin.auth.verify_otp({
                "token_hash": token_hash or token,
                "type": "recovery"
            })
            
            if verify_response and verify_response.user:
                return jsonify({
                    "valid": True,
                    "user_id": str(verify_response.user.id),
                    "email": verify_response.user.email
                }), 200
        except Exception as e:
            error_msg = str(e).lower()
            if "expired" in error_msg:
                return jsonify({
                    "valid": False,
                    "error": "This password reset link has expired. Please request a new one."
                }), 400
            elif "invalid" in error_msg:
                return jsonify({
                    "valid": False,
                    "error": "This password reset link is invalid. Please request a new one."
                }), 400
        
        return jsonify({
            "valid": False,
            "error": "Invalid or expired reset token"
        }), 400
        
    except Exception as e:
        logger.error(f"Error verifying reset token: {str(e)}")
        return jsonify({"error": str(e)}), 500


def reset_password():
    """Reset password using recovery token (no authentication required)."""
    data = request.get_json(silent=True) or {}
    token = data.get("token")
    token_hash = data.get("token_hash")
    new_password = data.get("password")
    
    if not new_password:
        return jsonify({"error": "New password is required"}), 400
    
    # Validate password strength
    is_valid, error_message = validate_password_strength(new_password)
    if not is_valid:
        return jsonify({"error": error_message}), 400
    
    if not token and not token_hash:
        return jsonify({"error": "Token or token_hash is required"}), 400
    
    try:
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_service_key:
            return jsonify({"error": "Backend Supabase configuration missing"}), 500
        
        supabase_admin = create_client(supabase_url, supabase_service_key)
        
        # First, verify and get the user via OTP
        verify_response = supabase_admin.auth.verify_otp({
            "token_hash": token_hash or token,
            "type": "recovery"
        })
        
        if not verify_response or not verify_response.user:
            return jsonify({"error": "Invalid or expired reset token"}), 400
        
        user_id = verify_response.user.id
        
        # Update the user's password
        supabase_admin.auth.admin.update_user_by_id(
            str(user_id),
            {"password": new_password}
        )
        
        return jsonify({
            "success": True,
            "message": "Password updated successfully"
        }), 200
        
    except Exception as e:
        logger.error(f"Error resetting password: {str(e)}")
        error_msg = str(e).lower()
        if "expired" in error_msg:
            return jsonify({"error": "This password reset link has expired. Please request a new one."}), 400
        elif "invalid" in error_msg:
            return jsonify({"error": "This password reset link is invalid. Please request a new one."}), 400
        return jsonify({"error": str(e)}), 500


# Add these to your routes (add to the auth_ns namespace)

@auth_ns.route("/verify-reset-token")
class VerifyResetTokenResource(Resource):
    def post(self):
        return verify_reset_token()


@auth_ns.route("/reset-password")
class ResetPasswordResource(Resource):
    def post(self):
        return reset_password()

@auth_ns.route("/auth/me")
class CurrentUserResource(Resource):
    def get(self):
        """Get current authenticated user info"""
        token = extract_bearer_token()
        if token is None:
            return jsonify({"error": "Missing authorization header"}), 401
        
        user_id, email = verify_supabase_jwt(token)
        if not user_id:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        return jsonify({
            "id": str(user_id),
            "email": email
        }), 200