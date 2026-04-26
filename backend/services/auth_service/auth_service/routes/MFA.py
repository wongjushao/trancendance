import logging
import pyotp
import secrets
import os
from datetime import datetime

from flask import request, current_app, jsonify
from flask_restx import Namespace, Resource
from backend.common.models.entities import Profile, UserMFA
from ..utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt

mfa_ns = Namespace("mfa", path="/api/auth-service", description="Multi-factor authentication endpoints")
logger = logging.getLogger(__name__)


def get_mfa_status():
    """Return current user's MFA status."""
    db_session = current_app.config.get("DB_SESSION")
    
    # Extract token and get user
    token = extract_bearer_token()
    if not token:
        return {"error": "No authorization token"}, 401
    
    # FIX: handle tuple return
    try:
        result = verify_supabase_jwt(token)
        
        # Handle tuple return (user_id, email)
        if isinstance(result, tuple):
            user_id = result[0]
        elif isinstance(result, dict):
            user_id = result.get("user_id")
        else:
            return {"error": "Invalid token"}, 401
            
        if not user_id:
            return {"error": "Invalid token"}, 401
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        return {"error": "Token verification failed"}, 401
    
    session = db_session()
    try:
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        mfa = session.query(UserMFA).filter(UserMFA.user_id == user_id).first()
        
        # Log the values for debugging
        logger.info(f"MFA status check for user {user_id}: enabled_mfa={profile.enabled_mfa if profile else None}, totp_secret={bool(mfa and mfa.totp_secret) if mfa else None}")
        
        # IMPORTANT: MFA is only considered enabled if BOTH:
        # 1. profile.enabled_mfa is True
        # 2. mfa.totp_secret exists (TOTP is configured)
        enabled_mfa = bool(
            profile and 
            profile.enabled_mfa and 
            mfa and 
            mfa.totp_secret
        )
        totp_configured = bool(mfa and mfa.totp_secret)
        backup_codes_configured = bool(mfa and isinstance(mfa.backup_codes, list) and len(mfa.backup_codes) > 0)
        updated_at = mfa.updated_at.isoformat() if mfa and mfa.updated_at else None
        
        return {
            "enabled_mfa": enabled_mfa,
            "totp_configured": totp_configured,
            "backup_codes_configured": backup_codes_configured,
            "updated_at": updated_at
        }
    except Exception as e:
        logger.error(f"MFA status error: {str(e)}")
        return {"error": "Failed to get MFA status"}, 500
    finally:
        session.close()


def setup_mfa():
    """Start MFA setup for Google Authenticator.
    
    Creates/updates a `user_mfa` row with a fresh `totp_secret` and returns an
    `otpauth://` provisioning URI (and the raw secret) for QR rendering.
    
    Note: This does NOT enable MFA yet. Call `/mfa/verify` with a valid code.
    """
    db_session = current_app.config.get("DB_SESSION")
    
    # Extract token and get user
    try:
        token = extract_bearer_token()
        if not token:
            return jsonify({"error": "No authorization token provided"}), 401
        
        user_id, email = verify_supabase_jwt(token)
        if not user_id:
            return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return jsonify({"error": "Invalid token"}), 401
    
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
        mfa.updated_at = datetime.utcnow()
        session.commit()
        
        issuer = os.getenv("MFA_ISSUER", "Trancendance")
        account_name = email or str(user_id)
        
        otp = pyotp.TOTP(secret)
        provisioning_uri = otp.provisioning_uri(name=account_name, issuer_name=issuer)
        
        return jsonify({
            "secret": secret,
            "provisioning_uri": provisioning_uri,
            "issuer": issuer,
            "account_name": account_name
        })
    except Exception as e:
        logger.error(f"Error setting up MFA: {e}")
        session.rollback()
        return jsonify({"error": "Internal server error"}), 500
    finally:
        session.close()


def verify_mfa_setup():
    """Verify TOTP code and enable MFA.
    
    Body JSON: {"code": "123456"}
    """
    db_session = current_app.config.get("DB_SESSION")
    
    # Extract token and get user
    try:
        token = extract_bearer_token()
        if not token:
            return jsonify({"error": "No authorization token provided"}), 401
        
        user_id, email = verify_supabase_jwt(token)
        if not user_id:
            return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return jsonify({"error": "Invalid token"}), 401
    
    payload = request.get_json(silent=True) or {}
    code = payload.get("code")
    
    if not code:
        return jsonify({"error": "Verification code is required"}), 400
    
    session = db_session()
    try:
        mfa = session.query(UserMFA).filter(UserMFA.user_id == user_id).first()
        if not mfa or not mfa.totp_secret:
            return jsonify({"error": "MFA setup not initiated"}), 400
        
        totp = pyotp.TOTP(mfa.totp_secret)
        # Allow a small time drift
        if not totp.verify(code, valid_window=1):
            return jsonify({"error": "Invalid verification code. Please try again."}), 400
        
        # Generate one-time backup codes
        backup_codes = [secrets.token_urlsafe(8) for _ in range(10)]
        mfa.backup_codes = backup_codes
        mfa.updated_at = datetime.utcnow()
        
        # Update profile to enable MFA
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        if profile:
            profile.enabled_mfa = True
        
        session.commit()
        
        return jsonify({
            "success": True,
            "backup_codes": backup_codes,
            "message": "MFA enabled successfully"
        })
    except Exception as e:
        logger.error(f"Error verifying MFA: {e}")
        session.rollback()
        return jsonify({"error": "Internal server error"}), 500
    finally:
        session.close()


def verify_login_mfa():
    """Verify MFA code during login."""
    logger.info("=== MFA Login Verification Started ===")
    
    # Get token from header
    token = extract_bearer_token()
    if not token:
        logger.error("No bearer token provided")
        return {"success": False, "message": "No authorization token"}, 401
    
    # Verify token and get user - FIX: handle tuple return
    try:
        result = verify_supabase_jwt(token)
        logger.info(f"Token verification result type: {type(result)}")
        logger.info(f"Token verification result: {result}")
        
        # Handle tuple return (user_id, email)
        if isinstance(result, tuple):
            user_id = result[0]
            email = result[1] if len(result) > 1 else None
        elif isinstance(result, dict):
            user_id = result.get("user_id")
            email = result.get("email")
        else:
            logger.error(f"Unexpected token verification result type: {type(result)}")
            return {"success": False, "message": "Invalid token format"}, 401
        
        if not user_id:
            logger.error("No user_id in token verification result")
            return {"success": False, "message": "Invalid token"}, 401
            
        logger.info(f"Verifying MFA for user: {user_id} ({email})")
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        return {"success": False, "message": "Token verification failed"}, 401
    
    # Get request body
    payload = request.get_json(silent=True) or {}
    code = payload.get("code")
    
    if not code:
        logger.error("No verification code provided")
        return {"success": False, "message": "Verification code required"}, 400
    
    # Check if MFA is enabled
    db_session = current_app.config.get("DB_SESSION")
    session = db_session()
    
    try:
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        if not profile or not profile.enabled_mfa:
            logger.warning(f"MFA not enabled for user: {user_id}")
            return {"success": False, "message": "MFA not enabled for this user"}, 400
        
        mfa = session.query(UserMFA).filter(UserMFA.user_id == user_id).first()
        if not mfa or not mfa.totp_secret:
            logger.warning(f"MFA not configured for user: {user_id}")
            return {"success": False, "message": "MFA not properly configured"}, 400
        
        # Check TOTP code
        totp = pyotp.TOTP(mfa.totp_secret)
        is_valid = totp.verify(code, valid_window=1)
        
        # Also check against backup codes
        is_backup_code = False
        if not is_valid and mfa.backup_codes:
            for i, backup_code in enumerate(mfa.backup_codes):
                if backup_code == code:
                    is_backup_code = True
                    # Remove used backup code
                    mfa.backup_codes.pop(i)
                    session.commit()
                    logger.info(f"Backup code used for user: {user_id}")
                    break
        
        if is_valid or is_backup_code:
            logger.info(f"MFA verification successful for user: {user_id}")
            return {
                "success": True,
                "message": "MFA verified successfully"
            }
        else:
            logger.warning(f"MFA verification failed for user: {user_id}")
            return {
                "success": False,
                "message": "Invalid verification code"
            }, 401
            
    except Exception as e:
        logger.error(f"MFA verification error: {str(e)}")
        session.rollback()
        return {"success": False, "message": "Verification failed"}, 500
    finally:
        session.close()


def disable_mfa():
    """Disable MFA for the current user.
    
    Clears profiles.enabled_mfa and removes TOTP secret + backup codes.
    """
    db_session = current_app.config.get("DB_SESSION")
    
    # Extract token and get user
    try:
        token = extract_bearer_token()
        if not token:
            return jsonify({"error": "No authorization token provided"}), 401
        
        user_id, email = verify_supabase_jwt(token)
        if not user_id:
            return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return jsonify({"error": "Invalid token"}), 401
    
    session = db_session()
    try:
        # Disable MFA in profile
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        if profile:
            profile.enabled_mfa = False
        
        # Clear MFA data
        mfa = session.query(UserMFA).filter(UserMFA.user_id == user_id).first()
        if mfa:
            mfa.totp_secret = None
            mfa.backup_codes = None
            mfa.updated_at = datetime.utcnow()
        
        session.commit()
        
        return jsonify({
            "success": True,
            "message": "MFA disabled successfully"
        })
    except Exception as e:
        logger.error(f"Error disabling MFA: {e}")
        session.rollback()
        return jsonify({"error": "Internal server error"}), 500
    finally:
        session.close()


@mfa_ns.route("/mfa/status")
class MfaStatusResource(Resource):
    def get(self):
        return get_mfa_status()


@mfa_ns.route("/mfa/setup")
class MfaSetupResource(Resource):
    def post(self):
        return setup_mfa()


@mfa_ns.route("/mfa/verify")
class MfaVerifyResource(Resource):
    def post(self):
        return verify_mfa_setup()


@mfa_ns.route("/mfa/verify-login")
class MfaVerifyLoginResource(Resource):
    def post(self):
        return verify_login_mfa()


@mfa_ns.route("/mfa/disable")
class MfaDisableResource(Resource):
    def post(self):
        return disable_mfa()
