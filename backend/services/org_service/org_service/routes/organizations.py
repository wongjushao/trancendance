# backend/services/org_service/org_service/routes/organizations.py

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from email.utils import parseaddr

from flask import current_app, jsonify, request
from flask_restx import Namespace, Resource, fields
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import func

from backend.common.models import (
    Organization,
    OrganizationMember,
    OrganizationMemberInvitation,
    OrganizationVerificationRequest,
    Profile,
    OrganizationDomain,  # Add this
    Course,  # Add this
    CourseClass,  # Add this
    ClassMember,  # Add this
    LessonProgress,  # Add this
    CourseReview,  # Add this
)
from backend.services.org_service.org_service.utils.email import (
    build_org_verification_url,
    deliver_organization_member_invitation_email,
    deliver_organization_verification_email,
)
from backend.services.org_service.org_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt


organizations_ns = Namespace("organizations", path="/", description="Organization endpoints")
VERIFICATION_TOKEN_TTL_HOURS = 24
MEMBER_INVITE_TOKEN_TTL_DAYS = 7

INVITER_TO_ALLOWED_TARGETS = {
    "admin": {"student", "teacher", "sub_admin"},
    "sub_admin": {"student", "teacher"},
    "teacher": {"student", "teacher"},
}

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


def ensure_profile_row(session, user_id: uuid.UUID) -> Profile:
    profile = session.query(Profile).filter(Profile.id == user_id).first()
    if profile is None:
        profile = Profile(id=user_id)
        session.add(profile)
        session.flush()
    return profile


def invite_inviter_display_name(profile: Profile | None) -> str:
    if profile is None:
        return "A teammate"
    first = (profile.first_name or "").strip()
    last = (profile.last_name or "").strip()
    combo = " ".join(part for part in (first, last) if part)
    return combo if combo else "A teammate"


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
    @organizations_ns.response(202, "Verification request created (email sent when SMTP is configured and delivery succeeds)")
    @organizations_ns.response(400, "Invalid request body")
    @organizations_ns.response(401, "Unauthorized")
    @organizations_ns.response(409, "Pending verification request already exists")
    def post(self):
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

        requested_by, requester_email = get_authenticated_user()
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
            email_outcome = deliver_organization_verification_email(admin_email, name, verification_url)

            session.commit()
            session.refresh(verification_request)
            body = serialize_verification_request(verification_request)
            body["email_sent"] = email_outcome["sent"]
            body["email_delivery_mode"] = email_outcome["delivery_mode"]
            requester_email_norm = normalize_email(requester_email)
            if (
                not email_outcome["sent"]
                and requester_email_norm
                and requester_email_norm == admin_email
            ):
                body["verification_url"] = verification_url

            return jsonify(body), 202
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


@organizations_ns.route("/orgs/<int:org_id>/invite")
class OrganizationMemberInviteCreateResource(Resource):
    """Create a tracked organization invite and send (or capture) invitation email."""

    @organizations_ns.response(201, "Invitation created")
    def post(self, org_id: int):
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        inviter_id, _inv_email = get_authenticated_user()
        if inviter_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        recipient = normalize_email(payload.get("email"))
        desired_role = (payload.get("role") or "").strip().lower()
        personal_message_raw = payload.get("personal_message")
        personal_message_msg = payload.get("message")
        note = ""
        if isinstance(personal_message_raw, str) and personal_message_raw.strip():
            note = personal_message_raw.strip()
        elif isinstance(personal_message_msg, str) and personal_message_msg.strip():
            note = personal_message_msg.strip()

        if not recipient:
            return jsonify({"error": "Field 'email' must be a valid address"}), 400
        if desired_role not in {"student", "teacher", "sub_admin"}:
            return jsonify({"error": "Field 'role' must be student, teacher, or sub_admin"}), 400

        session = db_session()
        expires_at = datetime.now(timezone.utc) + timedelta(days=MEMBER_INVITE_TOKEN_TTL_DAYS)

        try:
            membership = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == inviter_id,
            ).first()
            if membership is None or membership.member_role not in INVITER_TO_ALLOWED_TARGETS:
                return jsonify({"error": "You are not allowed to send invitations for this organization"}), 403

            allowed_roles = INVITER_TO_ALLOWED_TARGETS[membership.member_role]
            if desired_role not in allowed_roles:
                return jsonify({"error": "You cannot assign this role to an invite"}), 403

            organization = session.query(Organization).filter(Organization.id == org_id).first()
            if organization is None:
                return jsonify({"error": "Organization not found"}), 404

            inviter_profile = ensure_profile_row(session, inviter_id)

            plain_token = secrets.token_urlsafe(32)

            invite_row = OrganizationMemberInvitation(
                organization_id=org_id,
                email=recipient,
                member_role=desired_role,
                invited_by=inviter_id,
                personal_message=note or None,
                token_hash=hash_token(plain_token),
                expires_at=expires_at,
            )

            session.add(invite_row)
            session.flush()
            session.commit()
            session.refresh(invite_row)

            inviter_name = invite_inviter_display_name(inviter_profile)

            outcome = deliver_organization_member_invitation_email(
                recipient,
                organization.name,
                desired_role,
                inviter_name,
                plain_token,
                note or None,
            )

            resp = {
                "id": invite_row.id,
                "organization_id": org_id,
                "organization_name": organization.name,
                "email": recipient,
                "member_role": desired_role,
                "expires_at": invite_row.expires_at.isoformat() if invite_row.expires_at else None,
                "status": invite_row.status,
                "email_sent": outcome["sent"],
                "email_delivery": outcome["delivery_mode"],
            }
            mock = outcome.get("mock_envelope")
            if mock is not None:
                resp["mock_email"] = mock
            return jsonify(resp), 201

        except IntegrityError:
            session.rollback()
            return jsonify({"error": "A pending invitation for this email already exists"}), 409
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@organizations_ns.route("/member-invitations")
class OrganizationMemberInvitationDetailsResource(Resource):
    def get(self):
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        token_raw = request.args.get("token")
        if not token_raw:
            return jsonify({"error": "Query parameter token is required"}), 400

        session = db_session()
        now = datetime.now(timezone.utc)
        try:
            invite_row = session.query(OrganizationMemberInvitation).filter(
                OrganizationMemberInvitation.token_hash == hash_token(str(token_raw))
            ).first()
            if invite_row is None:
                return jsonify({"error": "Invitation not found"}), 404

            if invite_row.status == "pending" and invite_row.expires_at <= now:
                invite_row.status = "expired"
                session.commit()

            if invite_row.status != "pending":
                return jsonify({"error": f"This invitation is {invite_row.status}"}), 410

            org = session.query(Organization).filter(Organization.id == invite_row.organization_id).first()
            inviter_profile = session.query(Profile).filter(Profile.id == invite_row.invited_by).first()

            return (
                jsonify(
                    {
                        "email": invite_row.email,
                        "member_role": invite_row.member_role,
                        "organization_id": invite_row.organization_id,
                        "organization_name": org.name if org else None,
                        "invited_by_name": invite_inviter_display_name(inviter_profile),
                        "personal_message": invite_row.personal_message,
                        "expires_at": invite_row.expires_at.isoformat() if invite_row.expires_at else None,
                        "status": invite_row.status,
                    }
                ),
                200,
            )
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@organizations_ns.route("/member-invitations/accept")
class OrganizationMemberInvitationAcceptResource(Resource):
    def post(self):
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        uid, bearer_email = get_authenticated_user()
        if uid is None:
            return jsonify({"error": "Unauthorized"}), 401

        bearer_email_normalized = normalize_email(bearer_email)
        if bearer_email_normalized is None:
            return jsonify({"error": "Bearer token does not include an email"}), 401

        payload = request.get_json(silent=True) or {}
        token_raw = payload.get("token") or request.args.get("token")
        if not token_raw:
            return jsonify({"error": "Field token is required"}), 400

        session = db_session()
        now = datetime.now(timezone.utc)
        try:
            invite_row = session.query(OrganizationMemberInvitation).filter(
                OrganizationMemberInvitation.token_hash == hash_token(str(token_raw))
            ).first()

            if invite_row is None:
                return jsonify({"error": "Invitation not found"}), 404

            if invite_row.status == "pending" and invite_row.expires_at <= now:
                invite_row.status = "expired"

            if invite_row.status != "pending":
                session.commit()
                return jsonify({"error": f"This invitation is {invite_row.status}"}), 410

            if bearer_email_normalized != invite_row.email:
                return jsonify({"error": "Signed-in email does not match the invitation"}), 403

            org = session.query(Organization).filter(Organization.id == invite_row.organization_id).first()
            if org is None:
                return jsonify({"error": "Organization not found"}), 404

            ensure_profile_row(session, uid)

            member_row = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == invite_row.organization_id,
                OrganizationMember.user_id == uid,
            ).first()

            assigned_role = invite_row.member_role

            if member_row:
                member_row.member_role = assigned_role
            else:
                session.add(
                    OrganizationMember(
                        organization_id=invite_row.organization_id,
                        user_id=uid,
                        member_role=assigned_role,
                    )
                )

            invite_row.status = "accepted"
            invite_row.accepted_at = now
            invite_row.accepted_user_id = uid
            session.commit()

            return jsonify(
                {
                    "organization_id": org.id,
                    "organization_name": org.name,
                    "member_role": assigned_role,
                    "email": bearer_email_normalized,
                }
            ), 200

        except IntegrityError as exc:
            session.rollback()
            return jsonify({"error": "Could not finalize membership", "detail": str(getattr(exc, "orig", exc))}), 409
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

# Add to backend/services/org_service/org_service/routes/organizations.py

# ========== ORGANIZATION MEMBERS ENDPOINTS ==========

@organizations_ns.route("/orgs/<int:org_id>/members")
class OrganizationMembersListResource(Resource):
    def get(self, org_id: int):
        """Get all members of an organization with their profiles."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        limit = request.args.get("limit", type=int)
        session = db_session()
        
        try:
            org = session.query(Organization).filter(Organization.id == org_id).first()
            if not org:
                return jsonify({"error": "Organization not found"}), 404

            viewer_membership = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user_id
            ).first()
            
            if not viewer_membership:
                return jsonify({"error": "You are not a member of this organization"}), 403

            query = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id
            )
            
            if limit:
                query = query.limit(limit)
            
            members = query.all()

            user_ids = [m.user_id for m in members]
            profiles = {}
            if user_ids:
                for profile in session.query(Profile).filter(Profile.id.in_(user_ids)).all():
                    profiles[profile.id] = profile

            members_list = []
            for member in members:
                profile = profiles.get(member.user_id)
                members_list.append({
                    "id": member.id,
                    "user_id": str(member.user_id),
                    "member_role": member.member_role,
                    "created_at": member.created_at.isoformat() if member.created_at else None,
                    "user": {
                        "id": str(profile.id) if profile else None,
                        "first_name": profile.first_name if profile else None,
                        "last_name": profile.last_name if profile else None,
                        "username": profile.username if profile else None,
                        "avatar_url": profile.avatar_url if profile else None,
                    } if profile else {
                        "id": str(member.user_id),
                        "first_name": None,
                        "last_name": None,
                        "username": None,
                        "avatar_url": None,
                    }
                })

            return jsonify({"members": members_list}), 200

        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

@organizations_ns.route("/orgs/<int:org_id>/members/<string:member_id>")
class OrganizationMemberDetailResource(Resource):
    @organizations_ns.response(200, "Member role updated")
    @organizations_ns.response(400, "Invalid role")
    @organizations_ns.response(401, "Unauthorized")
    @organizations_ns.response(403, "Permission denied")
    @organizations_ns.response(404, "Member not found")
    def put(self, org_id: int, member_id: str):
        """Update a member's role in the organization."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        admin_user_id, _email = get_authenticated_user()
        if admin_user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        new_role = payload.get("member_role")

        if not new_role:
            return jsonify({"error": "Field 'member_role' is required"}), 400

        allowed_roles = {"student", "teacher", "sub_admin", "admin"}
        if new_role not in allowed_roles:
            return jsonify({"error": f"Invalid role. Must be one of: {', '.join(allowed_roles)}"}), 400

        try:
            target_user_id = uuid.UUID(member_id)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid user ID format"}), 400

        session = db_session()
        try:
            # Check if organization exists
            org = session.query(Organization).filter(Organization.id == org_id).first()
            if not org:
                return jsonify({"error": "Organization not found"}), 404

            # Check if current user is admin
            admin_membership = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == admin_user_id,
                OrganizationMember.member_role.in_(['admin', 'sub_admin'])
            ).first()

            if not admin_membership:
                return jsonify({"error": "You do not have permission to update member roles"}), 403

            # Get the target member
            target_member = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == target_user_id
            ).first()

            if not target_member:
                return jsonify({"error": "Member not found"}), 404

            # Cannot modify the primary admin's role (if they are the only admin)
            if target_member.member_role == "admin" and new_role != "admin":
                # Check if this is the only admin
                admin_count = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == org_id,
                    OrganizationMember.member_role == "admin"
                ).count()
                
                if admin_count <= 1:
                    return jsonify({"error": "Cannot demote the only organization admin"}), 400

            # Update role
            target_member.member_role = new_role
            session.commit()

            # Get profile for response
            profile = session.query(Profile).filter(Profile.id == target_user_id).first()

            return jsonify({
                "user_id": str(target_member.user_id),
                "member_role": target_member.member_role,
                "message": f"Member role updated to {new_role}"
            }), 200

        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    @organizations_ns.response(200, "Member removed")
    @organizations_ns.response(401, "Unauthorized")
    @organizations_ns.response(403, "Permission denied")
    @organizations_ns.response(404, "Member not found")
    def delete(self, org_id: int, member_id: str):
        """Remove a member from the organization."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        admin_user_id, _email = get_authenticated_user()
        if admin_user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        try:
            target_user_id = uuid.UUID(member_id)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid user ID format"}), 400

        session = db_session()
        try:
            # Check if organization exists
            org = session.query(Organization).filter(Organization.id == org_id).first()
            if not org:
                return jsonify({"error": "Organization not found"}), 404

            # Check if current user is admin
            admin_membership = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == admin_user_id,
                OrganizationMember.member_role.in_(['admin', 'sub_admin'])
            ).first()

            if not admin_membership:
                return jsonify({"error": "You do not have permission to remove members"}), 403

            # Get the target member
            target_member = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == target_user_id
            ).first()

            if not target_member:
                return jsonify({"error": "Member not found"}), 404

            # Cannot remove the last admin
            if target_member.member_role == "admin":
                admin_count = session.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == org_id,
                    OrganizationMember.member_role == "admin"
                ).count()
                
                if admin_count <= 1:
                    return jsonify({"error": "Cannot remove the only organization admin"}), 400

            # Remove the member
            session.delete(target_member)
            session.commit()

            return jsonify({"message": "Member removed successfully"}), 200

        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


# ========== ORGANIZATION DOMAINS ENDPOINTS ==========

@organizations_ns.route("/orgs/<int:org_id>/domains")
class OrganizationDomainsResource(Resource):
    @organizations_ns.response(200, "Domains retrieved")
    @organizations_ns.response(401, "Unauthorized")
    @organizations_ns.response(404, "Organization not found")
    def get(self, org_id: int):
        """Get all domains for an organization."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Check if organization exists
            org = session.query(Organization).filter(Organization.id == org_id).first()
            if not org:
                return jsonify({"error": "Organization not found"}), 404

            # Check if user is a member (for domain visibility)
            membership = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user_id
            ).first()

            if not membership:
                return jsonify({"error": "You are not a member of this organization"}), 403

            # Get domains
            domains = session.query(OrganizationDomain).filter(
                OrganizationDomain.organization_id == org_id
            ).all()

            domains_list = [{
                "id": d.id,
                "organization_id": d.organization_id,
                "domain": d.domain,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            } for d in domains]

            return jsonify({"domains": domains_list}), 200

        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    @organizations_ns.expect(organizations_ns.model('DomainCreate', {
        'domain': fields.String(required=True, description="Email domain", example="example.com")
    }))
    @organizations_ns.response(201, "Domain added")
    @organizations_ns.response(400, "Invalid domain")
    @organizations_ns.response(401, "Unauthorized")
    @organizations_ns.response(403, "Permission denied")
    @organizations_ns.response(409, "Domain already exists")
    def post(self, org_id: int):
        """Add a domain to an organization."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        payload = request.get_json(silent=True) or {}
        domain = (payload.get("domain") or "").strip().lower()

        if not domain:
            return jsonify({"error": "Field 'domain' is required"}), 400

        # Validate domain format
        domain_regex = r'^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$'
        import re
        if not re.match(domain_regex, domain):
            return jsonify({"error": "Invalid domain format (e.g., example.com)"}), 400

        session = db_session()
        try:
            # Check if organization exists
            org = session.query(Organization).filter(Organization.id == org_id).first()
            if not org:
                return jsonify({"error": "Organization not found"}), 404

            # Check if user is admin
            membership = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user_id,
                OrganizationMember.member_role.in_(['admin', 'sub_admin'])
            ).first()

            if not membership:
                return jsonify({"error": "Only admins can add domains"}), 403

            # Check if domain already exists for this organization
            existing = session.query(OrganizationDomain).filter(
                OrganizationDomain.organization_id == org_id,
                OrganizationDomain.domain == domain
            ).first()

            if existing:
                return jsonify({"error": "Domain already exists for this organization"}), 409

            # Check if domain is already used by another organization
            domain_taken = session.query(OrganizationDomain).filter(
                OrganizationDomain.domain == domain
            ).first()

            if domain_taken:
                return jsonify({"error": f"Domain '{domain}' is already registered to another organization"}), 409

            # Create new domain
            new_domain = OrganizationDomain(
                organization_id=org_id,
                domain=domain
            )
            session.add(new_domain)
            session.commit()
            session.refresh(new_domain)

            return jsonify({
                "id": new_domain.id,
                "organization_id": new_domain.organization_id,
                "domain": new_domain.domain,
                "created_at": new_domain.created_at.isoformat() if new_domain.created_at else None,
                "message": "Domain added successfully"
            }), 201

        except IntegrityError:
            session.rollback()
            return jsonify({"error": "Domain already exists"}), 409
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@organizations_ns.route("/domains/<int:domain_id>")
class OrganizationDomainResource(Resource):
    @organizations_ns.response(200, "Domain removed")
    @organizations_ns.response(401, "Unauthorized")
    @organizations_ns.response(403, "Permission denied")
    @organizations_ns.response(404, "Domain not found")
    def delete(self, domain_id: int):
        """Remove a domain from an organization."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Get the domain
            domain = session.query(OrganizationDomain).filter(
                OrganizationDomain.id == domain_id
            ).first()

            if not domain:
                return jsonify({"error": "Domain not found"}), 404

            # Check if user is admin of the organization
            membership = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == domain.organization_id,
                OrganizationMember.user_id == user_id,
                OrganizationMember.member_role.in_(['admin', 'sub_admin'])
            ).first()

            if not membership:
                return jsonify({"error": "Only admins can remove domains"}), 403

            # Remove the domain
            session.delete(domain)
            session.commit()

            return jsonify({"message": "Domain removed successfully"}), 200

        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


# ========== ORGANIZATION ANALYTICS ENDPOINT ==========

@organizations_ns.route("/organizations/<int:org_id>/analytics")
class OrganizationAnalyticsResource(Resource):
    @organizations_ns.response(200, "Analytics data retrieved")
    @organizations_ns.response(401, "Unauthorized")
    @organizations_ns.response(403, "Permission denied")
    @organizations_ns.response(404, "Organization not found")
    def get(self, org_id: int):
        """Get analytics data for an organization (admin only)."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Check if organization exists
            org = session.query(Organization).filter(Organization.id == org_id).first()
            if not org:
                return jsonify({"error": "Organization not found"}), 404

            # Check if user is admin
            membership = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user_id,
                OrganizationMember.member_role.in_(['admin', 'sub_admin'])
            ).first()

            if not membership:
                return jsonify({"error": "Only admins can view analytics"}), 403

            # Get member counts by role
            members_by_role = {}
            role_counts = session.query(
                OrganizationMember.member_role,
                func.count(OrganizationMember.id)
            ).filter(
                OrganizationMember.organization_id == org_id
            ).group_by(OrganizationMember.member_role).all()

            for role, count in role_counts:
                members_by_role[role] = count

            total_students = members_by_role.get("student", 0)
            total_teachers = members_by_role.get("teacher", 0) + members_by_role.get("admin", 0) + members_by_role.get("sub_admin", 0)
            total_members = sum(members_by_role.values())

            # Get course counts
            total_courses = session.query(Course).filter(
                Course.organization_id == org_id
            ).count()

            published_courses = session.query(Course).filter(
                Course.organization_id == org_id,
                Course.status == "published"
            ).count()

            # Calculate average rating across courses
            course_ids = [c.id for c in session.query(Course.id).filter(Course.organization_id == org_id).all()]
            
            avg_rating = 0
            if course_ids:
                rating_result = session.query(
                    func.avg(CourseReview.rating)
                ).filter(
                    CourseReview.course_id.in_(course_ids)
                ).scalar()
                avg_rating = float(rating_result) if rating_result else 0

            # Calculate completion rate (based on lesson progress)
            completion_rate = 0
            offering_ids = [o.id for o in session.query(CourseClass.id).filter(CourseClass.course_id.in_(course_ids)).all()]
            
            if offering_ids:
                class_member_ids = [cm.id for cm in session.query(ClassMember.id).filter(
                    ClassMember.course_class_id.in_(offering_ids),
                    ClassMember.role == "student"
                ).all()]
                
                if class_member_ids:
                    total_progress = session.query(LessonProgress).filter(
                        LessonProgress.class_member_id.in_(class_member_ids)
                    ).count()
                    completed_progress = session.query(LessonProgress).filter(
                        LessonProgress.class_member_id.in_(class_member_ids),
                        LessonProgress.status == "completed"
                    ).count()
                    completion_rate = (completed_progress / total_progress * 100) if total_progress > 0 else 0

            # Calculate monthly growth (new members in last 30 days)
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            new_members_last_30d = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.created_at >= thirty_days_ago
            ).count()
            
            monthly_growth = (new_members_last_30d / total_members * 100) if total_members > 0 else 0

            return jsonify({
                "totalStudents": total_students,
                "totalTeachers": total_teachers,
                "totalCourses": total_courses,
                "publishedCourses": published_courses,
                "averageRating": round(avg_rating, 1),
                "completionRate": round(completion_rate, 1),
                "monthlyGrowth": round(monthly_growth, 1),
                "pendingApprovals": 0,  # Can be implemented if needed
            }), 200

        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


# ========== DELETE ORGANIZATION ENDPOINT ==========

@organizations_ns.route("/orgs/<int:org_id>")
class OrganizationDeleteResource(Resource):
    @organizations_ns.response(200, "Organization deleted")
    @organizations_ns.response(401, "Unauthorized")
    @organizations_ns.response(403, "Permission denied")
    @organizations_ns.response(404, "Organization not found")
    def delete(self, org_id: int):
        """Delete an organization (admin only)."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Check if organization exists
            org = session.query(Organization).filter(Organization.id == org_id).first()
            if not org:
                return jsonify({"error": "Organization not found"}), 404

            # Check if user is admin
            membership = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user_id,
                OrganizationMember.member_role == "admin"
            ).first()

            if not membership:
                return jsonify({"error": "Only admin can delete the organization"}), 403

            # Check if this is the only admin
            admin_count = session.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.member_role == "admin"
            ).count()
            
            if admin_count > 1:
                # Transfer ownership or require other admins to be removed first
                return jsonify({"error": "Remove other admins before deleting the organization"}), 400

            # Delete all related data (cascade should handle most, but explicit for safety)
            # Delete organization members
            session.query(OrganizationMember).filter(OrganizationMember.organization_id == org_id).delete()
            
            # Delete organization domains
            session.query(OrganizationDomain).filter(OrganizationDomain.organization_id == org_id).delete()
            
            # Delete organization verification requests
            session.query(OrganizationVerificationRequest).filter(
                OrganizationVerificationRequest.organization_id == org_id
            ).delete()
            
            # Delete organization member invitations
            session.query(OrganizationMemberInvitation).filter(
                OrganizationMemberInvitation.organization_id == org_id
            ).delete()
            
            # Finally delete the organization
            session.delete(org)
            session.commit()

            return jsonify({"message": "Organization deleted successfully"}), 200

        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()
