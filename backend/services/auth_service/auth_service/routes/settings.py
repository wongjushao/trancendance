# backend/services/auth_service/auth_service/routes/settings.py
from flask_restx import Namespace, Resource
from flask import jsonify
from backend.common.models import Profile, UserMFA

# Try to import NotificationPreference, but don't fail if it doesn't exist
try:
    from backend.common.models import NotificationPreference
    NOTIFICATION_MODEL_EXISTS = True
except ImportError:
    NOTIFICATION_MODEL_EXISTS = False
    # Create a fallback class for type hints only
    class NotificationPreference:
        pass

from backend.services.auth_service.auth_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt

settings_ns = Namespace("settings", path="/api/auth-service", description="Aggregated settings")

@settings_ns.route("/settings-data")
class SettingsDataResource(Resource):
    def get(self):
        """Return all user settings in one request"""
        token = extract_bearer_token()
        if not token:
            return {"error": "Unauthorized"}, 401
        
        # For now, return a simple response to test if service is working
        return jsonify({
            "message": "Settings service is running",
            "status": "healthy"
        })

# Optional: Add a separate endpoint for notification preferences if needed
@settings_ns.route("/notification-preferences")
class NotificationPreferencesResource(Resource):
    def get(self):
        """Get user notification preferences"""
        token = extract_bearer_token()
        if not token:
            return {"error": "Unauthorized"}, 401
        
        # Return default preferences for now
        return jsonify({
            "email_enabled": True,
            "push_enabled": True,
            "assignment_reminders": True,
            "course_updates": True,
            "message_notifications": True,
            "marketing_emails": False
        })