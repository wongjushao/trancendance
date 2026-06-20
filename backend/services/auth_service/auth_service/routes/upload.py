# backend/services/auth_service/auth_service/routes/upload.py
from __future__ import annotations

import os
import uuid
import logging
from flask import jsonify, request, current_app
from flask_restx import Namespace, Resource
from werkzeug.utils import secure_filename
from supabase import create_client

from backend.services.auth_service.auth_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt

logger = logging.getLogger(__name__)
upload_ns = Namespace("upload", path="/api/auth-service", description="File upload endpoints")

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'zip', 'txt'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@upload_ns.route("/upload-submission")
class SubmissionUploadResource(Resource):
    def post(self):
        """Upload a submission file."""
        token = extract_bearer_token()
        if token is None:
            return jsonify({"error": "Missing authorization header"}), 401
        
        user_id, email = verify_supabase_jwt(token)
        if not user_id:
            return jsonify({"error": "Invalid token"}), 401
        
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        assignment_id = request.form.get('assignment_id')
        if not assignment_id:
            return jsonify({"error": "assignment_id is required"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
        
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({"error": f"File size exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit"}), 400
        
        try:
            supabase_url = os.environ.get("SUPABASE_URL")
            supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            
            if not supabase_url or not supabase_service_key:
                return jsonify({"error": "Storage configuration missing"}), 500
            
            supabase_admin = create_client(supabase_url, supabase_service_key)
            
            # Ensure submissions bucket exists
            try:
                supabase_admin.storage.get_bucket('submissions')
            except:
                supabase_admin.storage.create_bucket('submissions', {'public': True})
            
            filename = secure_filename(file.filename)
            file_ext = filename.rsplit('.', 1)[1].lower()
            unique_filename = f"submissions/{user_id}/{assignment_id}/{uuid.uuid4().hex}.{file_ext}"
            
            file_content = file.read()
            
            response = supabase_admin.storage.from_('submissions').upload(
                unique_filename,
                file_content,
                file_options={"content-type": file.content_type or "application/octet-stream"}
            )
            
            if not response:
                raise Exception("Failed to upload file")
            
            public_url = supabase_admin.storage.from_('submissions').get_public_url(unique_filename)
            
            return jsonify({
                "success": True,
                "file_url": public_url,
                "file_name": filename,
                "file_size": file_size
            }), 200
            
        except Exception as e:
            logger.error(f"File upload error: {str(e)}")
            return jsonify({"error": str(e)}), 500