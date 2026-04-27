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
