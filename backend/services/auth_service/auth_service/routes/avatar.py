# backend/services/auth_service/auth_service/routes/avatar.py
from __future__ import annotations

import os
import uuid
from flask import Blueprint, jsonify, request, current_app
from werkzeug.utils import secure_filename
from supabase import create_client
from sqlalchemy.exc import SQLAlchemyError

from backend.common.models import Profile
from backend.services.auth_service.auth_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt

avatar_bp = Blueprint("avatar", __name__)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename: str) -> bool:
    """Check if file has an allowed extension."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@avatar_bp.post("/upload-avatar")
def upload_avatar():
    """Upload avatar image for the current user."""
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return jsonify({"error": "Database is not configured"}), 503

    # Extract and verify token using the same helper as register.py
    token = extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing authorization header"}), 401

    user_id, email = verify_supabase_jwt(token)
    if not user_id:
        return jsonify({"error": "Invalid token"}), 401

    # Check if file was uploaded
    if 'avatar' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['avatar']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    # Validate file
    if not allowed_file(file.filename):
        return jsonify({"error": f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

    # Check file size
    file.seek(0, 2)  # Seek to end of file
    file_size = file.tell()
    file.seek(0)  # Seek back to beginning
    
    if file_size > MAX_FILE_SIZE:
        return jsonify({"error": f"File size exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit"}), 400

    try:
        # Get Supabase client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_service_key:
            return jsonify({"error": "Backend Supabase configuration missing"}), 500
        
        supabase_admin = create_client(supabase_url, supabase_service_key)
        
        # Generate secure filename
        filename = secure_filename(file.filename)
        file_ext = filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{user_id}/{uuid.uuid4().hex}.{file_ext}"
        
        # Read file content
        file_content = file.read()
        
        # Upload to Supabase Storage
        response = supabase_admin.storage.from_('avatars').upload(
            unique_filename,
            file_content,
            file_options={"content-type": file.content_type or "image/jpeg"}
        )
        
        if not response:
            raise Exception("Failed to upload file to storage")
        
        # Get public URL
        public_url = supabase_admin.storage.from_('avatars').get_public_url(unique_filename)
        
        # Update profile in database
        session = db_session()
        try:
            profile = session.query(Profile).filter(Profile.id == user_id).first()
            if profile:
                profile.avatar_url = public_url
                session.commit()
                session.refresh(profile)
            else:
                return jsonify({"error": "Profile not found"}), 404
            
            return jsonify({
                "message": "Avatar uploaded successfully",
                "avatar_url": public_url
            }), 200
            
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500