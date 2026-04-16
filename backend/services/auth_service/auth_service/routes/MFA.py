# backend/services/auth_service/auth_service/routes/MFA.py
from flask import Blueprint, request, current_app, jsonify
import pyotp
import secrets
import os
import logging
from datetime import datetime
from backend.common.models.entities import Profile, UserMFA

profile_bp = Blueprint("profile", __name__)
logger = logging.getLogger(__name__)


@profile_bp.get("/mfa/status")
def get_mfa_status():
    """Return current user's MFA status.
    
    Response shape:
    - enabled_mfa: bool (from profiles.enabled_mfa)
    - totp_configured: bool (totp_secret present)
    - backup_codes_configured: bool (backup_codes array non-empty)
    - updated_at: ISO timestamp or null
    """
    db_session = current_app.config.get("DB_SESSION")
    
    # Extract token and get user
    from backend.services.auth_service.auth_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt
    
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "No authorization token provided"}), 401
    
    user_id, _ = verify_supabase_jwt(token)
    if not user_id:
        return jsonify({"error": "Invalid or expired token"}), 401
    
    session = db_session()
    try:
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        mfa = session.query(UserMFA).filter(UserMFA.user_id == user_id).first()
        
        enabled_mfa = bool(getattr(profile, "enabled_mfa", False))
        totp_configured = bool(mfa and mfa.totp_secret)
        backup_codes_configured = bool(mfa and isinstance(mfa.backup_codes, list) and len(mfa.backup_codes) > 0)
        
        updated_at = mfa.updated_at if mfa else None
        
        return jsonify({
            "enabled_mfa": enabled_mfa,
            "totp_configured": totp_configured,
            "backup_codes_configured": backup_codes_configured,
            "updated_at": updated_at.isoformat() if updated_at else None,
        })
    finally:
        session.close()


@profile_bp.post("/mfa/setup")
def setup_mfa():
    """Start MFA setup for Google Authenticator.
    
    Creates/updates a `user_mfa` row with a fresh `totp_secret` and returns an
    `otpauth://` provisioning URI (and the raw secret) for QR rendering.
    
    Note: This does NOT enable MFA yet. Call `/mfa/verify` with a valid code.
    """
    db_session = current_app.config.get("DB_SESSION")
    
    from backend.services.auth_service.auth_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt
    
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "No authorization token provided"}), 401
    
    user_id, email = verify_supabase_jwt(token)
    if not user_id:
        return jsonify({"error": "Invalid or expired token"}), 401
    
    session = db_session()
    try:
        # Find or create MFA record
        mfa = session.query(UserMFA).filter(UserMFA.user_id == user_id).first()
        
        # New secret every time setup is requested (until verified)
        secret = pyotp.random_base32()
        
        if not mfa:
            mfa = UserMFA(user_id=user_id)
            session.add(mfa)
        
        mfa.totp_secret = secret
        mfa.backup_codes = None  # Clear old backup codes until verification
        session.commit()
        
        issuer = os.getenv("MFA_ISSUER", "Trancendance")
        account_name = email or str(user_id)
        
        otp = pyotp.TOTP(secret)
        provisioning_uri = otp.provisioning_uri(name=account_name, issuer_name=issuer)
        
        return jsonify({
            "secret": secret,
            "provisioning_uri": provisioning_uri,
            "issuer": issuer,
            "account_name": account_name,
        })
    finally:
        session.close()


@profile_bp.post("/mfa/verify")
def verify_mfa_setup():
    """Verify TOTP code and enable MFA.
    
    Body JSON: {"code": "123456"}
    """
    db_session = current_app.config.get("DB_SESSION")
    
    from backend.services.auth_service.auth_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt
    
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "No authorization token provided"}), 401
    
    user_id, _ = verify_supabase_jwt(token)
    if not user_id:
        return jsonify({"error": "Invalid or expired token"}), 401
    
    payload = request.get_json(silent=True) or {}
    code = payload.get("code")
    
    if not code:
        return jsonify({"error": "Verification code is required"}), 400
    
    session = db_session()
    try:
        mfa = session.query(UserMFA).filter(UserMFA.user_id == user_id).first()
        if not mfa or not mfa.totp_secret:
            return jsonify({"error": "MFA setup not initialized"}), 400
        
        totp = pyotp.TOTP(mfa.totp_secret)
        # Allow a small time drift
        if not totp.verify(code, valid_window=1):
            return jsonify({"error": "Invalid verification code"}), 400
        
        # Generate one-time backup codes
        backup_codes = [secrets.token_urlsafe(8) for _ in range(10)]
        mfa.backup_codes = backup_codes
        
        # Update profile to enable MFA
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        if profile:
            profile.enabled_mfa = True
        
        session.commit()
        
        return jsonify({
            "enabled_mfa": True,
            "backup_codes": backup_codes,
        })
    finally:
        session.close()


@profile_bp.post("/mfa/verify-login")
def verify_login_mfa():
    """Verify MFA code during login.
    
    Called after successful password authentication OR OAuth authentication.
    Validates the TOTP code from the user's authenticator app.
    
    Body JSON: {"code": "123456"}
    """
    db_session = current_app.config.get("DB_SESSION")
    
    from backend.services.auth_service.auth_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt
    
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "No authorization token provided"}), 401
    
    user_id, _ = verify_supabase_jwt(token)
    if not user_id:
        return jsonify({"error": "Invalid or expired token"}), 401
    
    payload = request.get_json(silent=True) or {}
    code = payload.get("code")
    
    if not code:
        return jsonify({"error": "Verification code is required"}), 400
    
    session = db_session()
    try:
        mfa = session.query(UserMFA).filter(UserMFA.user_id == user_id).first()
        if not mfa or not mfa.totp_secret:
            return jsonify({"error": "MFA not configured for this user"}), 400
        
        # Check if MFA is enabled
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        if not profile or not profile.enabled_mfa:
            return jsonify({"error": "MFA is not enabled for this user"}), 400
        
        totp = pyotp.TOTP(mfa.totp_secret)
        
        # Also check against backup codes
        is_backup_code = False
        if mfa.backup_codes and code in mfa.backup_codes:
            is_backup_code = True
            # Remove used backup code
            mfa.backup_codes.remove(code)
            session.commit()
        
        if not (totp.verify(code, valid_window=1) or is_backup_code):
            # Log failed attempt (optional but recommended)
            logger.warning(f"Failed MFA verification attempt for user {user_id}")
            return jsonify({"error": "Invalid verification code"}), 401
        
        session.commit()
        
        return jsonify({
            "success": True,
            "message": "MFA verification successful",
        })
    finally:
        session.close()


@profile_bp.post("/mfa/disable")
def disable_mfa():
    """Disable MFA for the current user.
    
    Clears profiles.enabled_mfa and removes TOTP secret + backup codes.
    """
    db_session = current_app.config.get("DB_SESSION")
    
    from backend.services.auth_service.auth_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt
    
    token = extract_bearer_token()
    if not token:
        return jsonify({"error": "No authorization token provided"}), 401
    
    user_id, _ = verify_supabase_jwt(token)
    if not user_id:
        return jsonify({"error": "Invalid or expired token"}), 401
    
    session = db_session()
    try:
        # Disable MFA in profile
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        if not profile:
            return jsonify({"error": "Profile not found"}), 404
        
        profile.enabled_mfa = False
        
        # Clear MFA data
        mfa = session.query(UserMFA).filter(UserMFA.user_id == user_id).first()
        if mfa:
            mfa.totp_secret = None
            mfa.backup_codes = None
        
        session.commit()
        
        return jsonify({
            "success": True,
            "message": "MFA disabled successfully",
        })
    except Exception as e:
        session.rollback()
        logger.error(f"Error disabling MFA for user {user_id}: {str(e)}")
        return jsonify({"error": "Failed to disable MFA"}), 500
    finally:
        session.close()