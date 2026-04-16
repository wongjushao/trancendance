# backend/services/auth_service/auth_service/routes/MFA.py
from __future__ import annotations

import base64
import os
import secrets
from datetime import datetime

import pyotp

from flask import jsonify, current_app, request
from sqlalchemy.exc import SQLAlchemyError

from backend.common.models import Profile, UserMFA
from backend.services.auth_service.auth_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt

from backend.services.auth_service.auth_service.routes.profile import profile_bp


@profile_bp.get("/mfa/status")
def get_MFA_status():
	"""Return current user's MFA status.

	Response shape:
	- enabled_mfa: bool (from profiles.enabled_mfa)
	- totp_configured: bool (totp_secret present)
	- backup_codes_configured: bool (backup_codes array non-empty)
	- updated_at: ISO timestamp or null
	"""

	db_session = current_app.config.get("DB_SESSION")
	if db_session is None:
		return jsonify({"error": "Database is not configured"}), 503

	token = extract_bearer_token()
	if token is None:
		return jsonify({"error": "Missing authorization header"}), 401

	user_id, _email = verify_supabase_jwt(token)
	if not user_id:
		return jsonify({"error": "Invalid token"}), 401

	session = db_session()
	try:
		profile = session.query(Profile).filter(Profile.id == user_id).first()
		if not profile:
			return jsonify({"error": "Profile not found"}), 404

		mfa = session.query(UserMFA).filter(UserMFA.user_id == user_id).first()

		enabled_mfa = bool(getattr(profile, "enabled_mfa", False))
		totp_configured = bool(mfa and mfa.totp_secret)
		backup_codes_configured = bool(mfa and isinstance(mfa.backup_codes, list) and len(mfa.backup_codes) > 0)

		updated_at: datetime | None = mfa.updated_at if mfa else None

		return (
			jsonify(
				{
					"enabled_mfa": enabled_mfa,
					"totp_configured": totp_configured,
					"backup_codes_configured": backup_codes_configured,
					"updated_at": updated_at.isoformat() if updated_at else None,
				}
			),
			200,
		)
	except SQLAlchemyError as exc:
		return jsonify({"error": str(exc)}), 500
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
	if db_session is None:
		return jsonify({"error": "Database is not configured"}), 503

	token = extract_bearer_token()
	if token is None:
		return jsonify({"error": "Missing authorization header"}), 401

	user_id, email = verify_supabase_jwt(token)
	if not user_id:
		return jsonify({"error": "Invalid token"}), 401

	session = db_session()
	try:
		profile = session.query(Profile).filter(Profile.id == user_id).first()
		if not profile:
			return jsonify({"error": "Profile not found"}), 404

		mfa = session.query(UserMFA).filter(UserMFA.user_id == user_id).first()
		if not mfa:
			mfa = UserMFA(user_id=user_id)
			session.add(mfa)

		# New secret every time setup is requested (until verified).
		secret = pyotp.random_base32()
		mfa.totp_secret = secret
		mfa.enabled = False
		mfa.updated_at = datetime.utcnow()

		issuer = os.getenv("MFA_ISSUER", "Trancendance")
		account_name = email or str(user_id)

		otp = pyotp.TOTP(secret)
		provisioning_uri = otp.provisioning_uri(name=account_name, issuer_name=issuer)

		session.commit()
		return (
			jsonify(
				{
					"provisioning_uri": provisioning_uri,
					"secret": secret,
					"issuer": issuer,
					"account_name": account_name,
				}
			),
			200,
		)
	except SQLAlchemyError as exc:
		session.rollback()
		return jsonify({"error": str(exc)}), 500
	finally:
		session.close()


@profile_bp.post("/mfa/verify")
def verify_mfa_setup():
	"""Verify TOTP code and enable MFA.

	Body JSON: {"code": "123456"}
	"""

	db_session = current_app.config.get("DB_SESSION")
	if db_session is None:
		return jsonify({"error": "Database is not configured"}), 503

	token = extract_bearer_token()
	if token is None:
		return jsonify({"error": "Missing authorization header"}), 401

	user_id, _email = verify_supabase_jwt(token)
	if not user_id:
		return jsonify({"error": "Invalid token"}), 401

	payload = request.get_json(silent=True) or {}
	code = payload.get("code")
	if not isinstance(code, str) or not code.strip():
		return jsonify({"error": "Missing code"}), 400

	session = db_session()
	try:
		profile = session.query(Profile).filter(Profile.id == user_id).first()
		if not profile:
			return jsonify({"error": "Profile not found"}), 404

		mfa = session.query(UserMFA).filter(UserMFA.user_id == user_id).first()
		if not mfa or not mfa.totp_secret:
			return jsonify({"error": "MFA setup not initiated"}), 400

		totp = pyotp.TOTP(mfa.totp_secret)
		# Allow a small time drift.
		if not totp.verify(code.strip(), valid_window=1):
			return jsonify({"error": "Invalid code"}), 400

		# Generate one-time backup codes.
		backup_codes = [secrets.token_urlsafe(8) for _ in range(10)]

		mfa.enabled = True
		mfa.backup_codes = backup_codes
		mfa.updated_at = datetime.utcnow()
		profile.enabled_mfa = True

		session.commit()
		return jsonify({"enabled_mfa": True, "backup_codes": backup_codes}), 200
	except SQLAlchemyError as exc:
		session.rollback()
		return jsonify({"error": str(exc)}), 500
	finally:
		session.close()