# backend/services/auth_service/auth_service/routes/metadata.py
from __future__ import annotations

import os
import uuid

from flask import Blueprint, jsonify, request, current_app
from supabase import create_client

from backend.services.auth_service.auth_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt

metadata_bp = Blueprint("metadata", __name__)


@metadata_bp.put("/user-metadata")
def update_user_metadata():
    """Update user metadata in Supabase Auth."""
    token = extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing authorization header"}), 401
    
    user_id, email = verify_supabase_jwt(token)
    if not user_id:
        return jsonify({"error": "Invalid token"}), 401
    
    data = request.get_json(silent=True) or {}
    
    # Only allow updating specific metadata fields
    allowed_fields = ["full_name", "role", "interests", "location", "website", "bio"]
    filtered_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    try:
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_service_key:
            return jsonify({"error": "Backend Supabase configuration missing"}), 500
        
        # Use service role client (bypasses RLS, should only be used in backend)
        supabase_admin = create_client(supabase_url, supabase_service_key)
        
        # Update user metadata
        response = supabase_admin.auth.admin.update_user_by_id(
            str(user_id),
            {"user_metadata": filtered_data}
        )
        
        return jsonify({
            "message": "User metadata updated",
            "user_metadata": response.user.user_metadata
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500