# backend/services/org_service/org_service/routes/organizations.py

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from email.utils import parseaddr

from flask import current_app, jsonify, request
from flask_restx import Namespace, Resource, fields
from sqlalchemy.exc import SQLAlchemyError

from backend.common.models import Organization, OrganizationMember, OrganizationVerificationRequest, Profile
from backend.services.org_service.org_service.utils.email import (
    EmailConfigurationError,
    EmailDeliveryError,
    build_org_verification_url,
    send_org_verification_email,
)
from backend.services.org_service.org_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt


organizations_ns = Namespace("organizations", path="/", description="Organization endpoints")
VERIFICATION_TOKEN_TTL_HOURS = 24

organization_create_model = organizations_ns.model(
    "OrganizationCreateRequest",
    {
        "name": fields.String(required=True, description="Organization name", example="42 Kuala Lumpur"),
        "admin_email": fields.String(
            required=True,
            description="Email address of the organization admin who must verify the request",
            example="admin@example.com",
        ),
    },
)

organization_verify_model = organizations_ns.model(
    "OrganizationVerifyRequest",
    {
        "token": fields.String(
            required=True,
            description="Verification token from the organization verification email",
            example="paste-email-token-here",
        ),
    },
)


def serialize_organization(organization: Organization) -> dict:
    return {
        "id": organization.id,
        "name": organization.name,
        "description": organization.description,
        "created_by": str(organization.created_by),
        "created_at": organization.created_at.isoformat() if organization.created_at else None,
    }


def serialize_verification_request(verification_request: OrganizationVerificationRequest) -> dict:
    return {
        "id": verification_request.id,
        "org_name": verification_request.org_name,
        "admin_email": verification_request.admin_email,
        "requested_by": str(verification_request.requested_by),
        "status": verification_request.status,
        "expires_at": verification_request.expires_at.isoformat() if verification_request.expires_at else None,
        "created_at": verification_request.created_at.isoformat() if verification_request.created_at else None,
        "verified_at": verification_request.verified_at.isoformat() if verification_request.verified_at else None,
        "organization_id": verification_request.organization_id,
    }


def get_authenticated_user():
    token = extract_bearer_token()
    if not token:
        return None, None

    user_id, email = verify_supabase_jwt(token)
    if not user_id:
        return None, None

    try:
        return uuid.UUID(str(user_id)), email
    except (TypeError, ValueError):
        return None, None


def normalize_email(value: str | None) -> str | None:
    if not value:
        return None

    _, email = parseaddr(value)
    if not email or "@" not in email:
        return None
    return email.lower()


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@organizations_ns.route("/orgs")
class OrganizationListResource(Resource):
    def get(self):
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

        session = db_session()
        try:
            organizations = session.query(Organization).order_by(Organization.id.asc()).limit(100).all()
            return jsonify([serialize_organization(organization) for organization in organizations])
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    @organizations_ns.expect(organization_create_model, validate=False)
    @organizations_ns.response(202, "Verification request created and email sent")
    @organizations_ns.response(400, "Invalid request body")
    @organizations_ns.response(401, "Unauthorized")
    @organizations_ns.response(409, "Pending verification request already exists")
    def post(self):
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

        requested_by, _requester_email = get_authenticated_user()
        if requested_by is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        name = (payload.get("name") or "").strip()
        admin_email = normalize_email(payload.get("admin_email"))

        if not name:
            return jsonify({"error": "Field 'name' is required"}), 400
        if not admin_email:
            return jsonify({"error": "Field 'admin_email' must be a valid email address"}), 400

        session = db_session()
        token = secrets.token_urlsafe(32)
        token_hash = hash_token(token)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=VERIFICATION_TOKEN_TTL_HOURS)

        try:
            existing_request = (
                session.query(OrganizationVerificationRequest)
                .filter(
                    OrganizationVerificationRequest.org_name == name,
                    OrganizationVerificationRequest.admin_email == admin_email,
                    OrganizationVerificationRequest.status == "pending",
                    OrganizationVerificationRequest.expires_at > now,
                )
                .first()
            )

            if existing_request is not None:
                return jsonify({"error": "A pending verification request already exists"}), 409

            verification_request = OrganizationVerificationRequest(
                org_name=name,
                admin_email=admin_email,
                requested_by=requested_by,
                token_hash=token_hash,
                expires_at=expires_at,
            )
            session.add(verification_request)
            session.flush()

            verification_url = build_org_verification_url(token)
            send_org_verification_email(admin_email, name, verification_url)

            session.commit()
            session.refresh(verification_request)
            return jsonify(serialize_verification_request(verification_request)), 202
        except (EmailConfigurationError, EmailDeliveryError) as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@organizations_ns.route("/orgs/verify")
class OrganizationVerificationResource(Resource):
    @organizations_ns.expect(organization_verify_model, validate=False)
    @organizations_ns.response(200, "Organization verified and created")
    @organizations_ns.response(400, "Invalid or expired token")
    @organizations_ns.response(401, "Unauthorized")
    @organizations_ns.response(403, "Bearer email does not match invited admin")
    @organizations_ns.response(404, "Verification token not found")
    @organizations_ns.response(409, "Verification request is not pending")
    def post(self):
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

        admin_user_id, admin_email = get_authenticated_user()
        if admin_user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        admin_email = normalize_email(admin_email)
        if not admin_email:
            return jsonify({"error": "Bearer token does not include an email"}), 401

        payload = request.get_json(silent=True) or {}
        token = payload.get("token") or request.args.get("token")
        if not token:
            return jsonify({"error": "Field 'token' is required"}), 400

        session = db_session()
        now = datetime.now(timezone.utc)

        try:
            verification_request = (
                session.query(OrganizationVerificationRequest)
                .filter(OrganizationVerificationRequest.token_hash == hash_token(str(token)))
                .first()
            )

            if verification_request is None:
                return jsonify({"error": "Invalid verification token"}), 404
            
            if verification_request.status != "pending":
                return jsonify({"error": "Verification request is not pending"}), 409
            
            if verification_request.expires_at <= now:
                verification_request.status = "expired"
                session.commit()
                return jsonify({"error": "Verification token has expired"}), 400
            
            # Check if the logged-in user's email matches the invited admin email
            if verification_request.admin_email != admin_email:
                return jsonify({
                    "error": "Bearer user email does not match the invited admin email",
                    "expected_email": verification_request.admin_email
                }), 403

            # Check if organization already exists (by name)
            existing_organization = session.query(Organization).filter(
                Organization.name == verification_request.org_name
            ).first()

            if existing_organization:
                # Organization already exists, just add/update user membership
                organization = existing_organization
                
                # Check if user is already a member
                existing_member = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == organization.id,
                    OrganizationMember.user_id == admin_user_id
                ).first()
                
                if existing_member:
                    # Update existing member to admin
                    existing_member.member_role = "admin"
                else:
                    # Add user as admin member
                    session.add(
                        OrganizationMember(
                            organization_id=organization.id,
                            user_id=admin_user_id,
                            member_role="admin",
                        )
                    )
            else:
                # Create new organization
                organization = Organization(
                    name=verification_request.org_name,
                    created_by=admin_user_id,
                )
                session.add(organization)
                session.flush()

                # Add creator as admin member
                session.add(
                    OrganizationMember(
                        organization_id=organization.id,
                        user_id=admin_user_id,
                        member_role="admin",
                    )
                )

            # Update verification request
            verification_request.status = "verified"
            verification_request.verified_at = now
            verification_request.organization_id = organization.id

            # Ensure user profile exists and is marked as onboarded
            profile = session.query(Profile).filter(Profile.id == admin_user_id).first()
            if profile:
                if not profile.onboarded:
                    profile.onboarded = True
            else:
                # Create minimal profile if it doesn't exist
                profile = Profile(id=admin_user_id, onboarded=True)
                session.add(profile)

            session.commit()
            session.refresh(organization)
            session.refresh(verification_request)

            return jsonify(
                {
                    "organization": serialize_organization(organization),
                    "verification_request": serialize_verification_request(verification_request),
                    "message": f"Organization {organization.name} verified successfully! You are now an admin."
                }
            )
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@organizations_ns.route("/orgs/<int:org_id>/setup-status")
class OrganizationSetupStatusResource(Resource):
    @organizations_ns.response(200, "Setup status returned")
    @organizations_ns.response(401, "Unauthorized")
    def get(self, org_id: int):
        """Get organization setup completion status."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Check if user is admin of this organization
            membership = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user_id,
                OrganizationMember.member_role.in_(['admin', 'sub_admin'])
            ).first()

            if not membership:
                return jsonify({"error": "Not authorized to view setup status"}), 403

            org = session.query(Organization).filter(Organization.id == org_id).first()
            if not org:
                return jsonify({"error": "Organization not found"}), 404

            return jsonify({
                "is_setup_complete": org.is_setup_complete,
                "organization_id": org.id,
                "organization_name": org.name
            }), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    @organizations_ns.expect(organizations_ns.model('SetupComplete', {
        'is_setup_complete': fields.Boolean(required=True, description="Setup completion status")
    }))
    @organizations_ns.response(200, "Setup status updated")
    def put(self, org_id: int):
        """Mark organization setup as complete."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        is_complete = payload.get('is_setup_complete')

        if is_complete is None:
            return jsonify({"error": "Field 'is_setup_complete' is required"}), 400

        session = db_session()
        try:
            # Check if user is admin of this organization
            membership = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user_id,
                OrganizationMember.member_role.in_(['admin', 'sub_admin'])
            ).first()

            if not membership:
                return jsonify({"error": "Not authorized to update setup status"}), 403

            (session.query(Organization)
             .filter(Organization.id == org_id)
             .update({"is_setup_complete": is_complete}))

            session.commit()

            return jsonify({
                "message": "Setup status updated successfully",
                "is_setup_complete": is_complete
            }), 200
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@organizations_ns.route("/orgs/<int:org_id>/can-promote")
class OrganizationCanPromoteResource(Resource):
    @organizations_ns.response(200, "Can promote check returned")
    @organizations_ns.response(401, "Unauthorized")
    def get(self, org_id: int):
        """Check if a user can promote others to teacher/admin (i.e., is admin themselves)."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            membership = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user_id,
                OrganizationMember.member_role.in_(['admin', 'sub_admin'])
            ).first()

            return jsonify({
                "can_promote": membership is not None,
                "organization_id": org_id,
                "user_id": str(user_id)
            }), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

# Add this after your existing endpoints (around line 200-250)

@organizations_ns.route("/orgs/<int:org_id>")
class OrganizationResource(Resource):
    @organizations_ns.response(200, "Organization details retrieved")
    @organizations_ns.response(401, "Unauthorized")
    @organizations_ns.response(404, "Organization not found")
    def get(self, org_id: int):
        """Get organization details by ID."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            organization = session.query(Organization).filter(Organization.id == org_id).first()
            if not organization:
                return jsonify({"error": "Organization not found"}), 404

            return jsonify(serialize_organization(organization)), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    @organizations_ns.expect(organizations_ns.model('OrganizationUpdate', {
        'name': fields.String(required=False, description="Organization name"),
        'description': fields.String(required=False, description="Organization description"),
        'slug': fields.String(required=False, description="Organization slug"),
    }))
    @organizations_ns.response(200, "Organization updated")
    @organizations_ns.response(401, "Unauthorized")
    @organizations_ns.response(403, "Permission denied")
    @organizations_ns.response(404, "Organization not found")
    def put(self, org_id: int):
        """Update organization details (admin only)."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        
        session = db_session()
        try:
            # Check if organization exists
            organization = session.query(Organization).filter(Organization.id == org_id).first()
            if not organization:
                return jsonify({"error": "Organization not found"}), 404

            # Check if user is admin of this organization
            membership = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user_id,
                OrganizationMember.member_role.in_(['admin', 'sub_admin'])
            ).first()

            if not membership:
                return jsonify({"error": "You don't have permission to update this organization"}), 403

            # Update fields
            if 'name' in payload:
                organization.name = payload['name']
            if 'description' in payload:
                organization.description = payload['description'] or None
            if 'slug' in payload:
                # Validate slug format
                slug = payload['slug']
                if slug:
                    # Check if slug is unique
                    existing = session.query(Organization).filter(
                        Organization.slug == slug,
                        Organization.id != org_id
                    ).first()
                    if existing:
                        return jsonify({"error": "Slug already in use"}), 409
                    organization.slug = slug
                else:
                    organization.slug = None

            session.commit()
            session.refresh(organization)
            
            return jsonify(serialize_organization(organization)), 200
            
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@organizations_ns.route("/orgs/<int:org_id>/members/<user_id>")
class OrganizationMemberResource(Resource):
    @organizations_ns.response(200, "Member details retrieved")
    @organizations_ns.response(401, "Unauthorized")
    @organizations_ns.response(404, "Member not found")
    def get(self, org_id: int, user_id: str):
        """Get a specific member's role in the organization."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        current_user_id, _email = get_authenticated_user()
        if current_user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Check if organization exists
            organization = session.query(Organization).filter(Organization.id == org_id).first()
            if not organization:
                return jsonify({"error": "Organization not found"}), 404

            # Get member
            member = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user_id
            ).first()

            if not member:
                return jsonify({"error": "Member not found"}), 404

            return jsonify({
                "user_id": str(member.user_id),
                "member_role": member.member_role,
                "joined_at": member.created_at.isoformat() if member.created_at else None,
            }), 200
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()