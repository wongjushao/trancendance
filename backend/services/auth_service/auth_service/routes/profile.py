# backend/services/auth_service/auth_service/routes/profile.py
from __future__ import annotations

import uuid
from datetime import date

from flask import jsonify, request, current_app
from flask_restx import Namespace, Resource
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from backend.common.models import Profile, Skill, UserSkill
from backend.common.models.entities import ProfileEducation
from backend.services.auth_service.auth_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt

profile_ns = Namespace("profile", path="/api/auth-service", description="Profile endpoints")


def serialize_profile(profile: Profile) -> dict:
    """Serialize profile for API response."""
    return {
        "id": str(profile.id),
        "username": profile.username,
        "first_name": profile.first_name,
        "last_name": profile.last_name,
        "job_title": profile.job_title,
        "birthday": profile.birthday.isoformat() if profile.birthday else None,
        "invite_code": profile.invite_code,
        "invited_by": str(profile.invited_by) if profile.invited_by else None,
        "avatar_url": profile.avatar_url,
        "bio": profile.bio,
        "professional_summary": getattr(profile, "professional_summary", None),
        "department": getattr(profile, "department", None),
        "years_of_experience": getattr(profile, "years_of_experience", None),
        "timezone": profile.timezone,
        "language": profile.language,
        "social_links": profile.social_links,
        "interests": profile.interests,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
    }


def _parse_iso_date(value: object) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        # Accept `YYYY-MM-DD`
        return date.fromisoformat(value)
    raise ValueError("Invalid date format")


def _validate_educations_payload(value: object) -> list[dict] | None:
    if value is None:
        return None
    if not isinstance(value, list):
        raise ValueError("educations must be a list")
    for item in value:
        if not isinstance(item, dict):
            raise ValueError("each education item must be an object")
        if not item.get("institution_name"):
            raise ValueError("education.institution_name is required")
    return value


def _validate_interests_payload(value: object) -> list[str] | None:
    if value is None:
        return None
    if not isinstance(value, list):
        raise ValueError("interests must be a list")

    normalized: list[str] = []
    for item in value:
        if not isinstance(item, str):
            raise ValueError("each interest must be a string")
        interest = item.strip()
        if not interest:
            raise ValueError("interest must not be empty")
        normalized.append(interest)

    return normalized


def _validate_skills_payload(value: object) -> list[dict] | None:
    if value is None:
        return None
    if not isinstance(value, list):
        raise ValueError("skills must be a list")

    normalized: list[dict] = []
    seen_names: set[str] = set()

    for item in value:
        if isinstance(item, str):
            raw_name = item
            level = 1
            years = 0
        elif isinstance(item, dict):
            raw_name = item.get("name")
            level = item.get("level", 1)
            years = item.get("years", 0)
        else:
            raise ValueError("each skill must be a string or an object")

        if not isinstance(raw_name, str):
            raise ValueError("skill.name is required")

        name = raw_name.strip()
        if not name:
            raise ValueError("skill.name must not be empty")

        try:
            level_value = int(level)
            years_value = int(years)
        except (TypeError, ValueError) as exc:
            raise ValueError("skill level and years must be integers") from exc

        if level_value < 1 or level_value > 5:
            raise ValueError("skill level must be between 1 and 5")
        if years_value < 0:
            raise ValueError("skill years must be greater than or equal to 0")

        dedupe_key = name.lower()
        if dedupe_key in seen_names:
            continue

        seen_names.add(dedupe_key)
        normalized.append(
            {
                "name": name,
                "name_lower": dedupe_key,
                "level": level,
                "years": years,
            }
        )

    return normalized


def _validate_avatar_url_payload(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("avatar_url must be a string")
    url = value.strip()
    if not url:
        return ""
    if not (url.startswith("http://") or url.startswith("https://")):
        raise ValueError("avatar_url must start with http:// or https://")
    return url


def _normalize_username(value: object) -> str | None:
    if value is None:
        return None
    username = str(value).strip()
    return username or None


def _serialize_profile_skills(session, user_id) -> list[dict]:
    user_skills = (
        session.query(UserSkill, Skill)
        .join(Skill, Skill.id == UserSkill.skill_id)
        .filter(UserSkill.user_id == user_id)
        .order_by(Skill.name.asc(), Skill.id.asc())
        .all()
    )

    return [
        {
            "id": skill.id,
            "name": skill.name,
            "level": user_skill.level,
            "years": user_skill.years,
        }
        for user_skill, skill in user_skills
    ]


def _serialize_profile_educations(session, user_id) -> list[dict]:
    edus = (
        session.query(ProfileEducation)
        .filter(ProfileEducation.profile_id == user_id)
        .order_by(ProfileEducation.order_index.asc(), ProfileEducation.id.asc())
        .all()
    )

    return [
        {
            "id": e.id,
            "profile_id": str(e.profile_id),
            "institution_name": e.institution_name,
            "degree": e.degree,
            "field_of_study": e.field_of_study,
            "start_year": e.start_year,
            "end_year": e.end_year,
            "is_current": e.is_current,
            "description": e.description,
            "order_index": e.order_index,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in edus
    ]


def _serialize_full_profile(session, profile: Profile) -> dict:
    response = serialize_profile(profile)
    response["skills"] = _serialize_profile_skills(session, profile.id)
    response["educations"] = _serialize_profile_educations(session, profile.id)
    return response


def get_profile():
    """Get current user's profile."""
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

        return jsonify(_serialize_full_profile(session, profile)), 200
    except SQLAlchemyError as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()


def get_public_profile(identifier: str):
    """Get a visible profile by id, username, or full name. Requires a valid bearer token."""
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return jsonify({"error": "Database is not configured"}), 503

    token = extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing authorization header"}), 401

    user_id, _email = verify_supabase_jwt(token)
    if not user_id:
        return jsonify({"error": "Invalid token"}), 401

    lookup = (identifier or "").strip()
    if not lookup:
        return jsonify({"error": "Profile identifier is required"}), 400

    lookup_lower = lookup.lower()
    normalized_lookup_lower = lookup_lower.replace("-", " ")
    filters = [
        func.lower(Profile.username) == lookup_lower,
        func.lower(func.concat(func.coalesce(Profile.first_name, ""), " ", func.coalesce(Profile.last_name, "")))
        == normalized_lookup_lower,
    ]

    try:
        filters.append(Profile.id == uuid.UUID(lookup))
    except ValueError:
        pass

    session = db_session()
    try:
        profile = (
            session.query(Profile)
            .filter(or_(*filters))
            .order_by(Profile.created_at.asc())
            .first()
        )
        if not profile:
            return jsonify({"error": "Profile not found"}), 404

        return jsonify(_serialize_full_profile(session, profile)), 200
    except SQLAlchemyError as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()


def search_public_profiles():
    """Search visible user profiles by username or display name. Requires a valid bearer token."""
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return jsonify({"error": "Database is not configured"}), 503

    token = extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing authorization header"}), 401

    user_id, _email = verify_supabase_jwt(token)
    if not user_id:
        return jsonify({"error": "Invalid token"}), 401

    query = (request.args.get("q") or "").strip()
    if len(query) < 2:
        return jsonify({"profiles": []}), 200

    pattern = f"%{query.lower()}%"
    display_name = func.lower(
        func.concat(func.coalesce(Profile.first_name, ""), " ", func.coalesce(Profile.last_name, ""))
    )

    session = db_session()
    try:
        profiles = (
            session.query(Profile)
            .filter(
                Profile.id != user_id,
                or_(
                    func.lower(Profile.username).like(pattern),
                    func.lower(Profile.first_name).like(pattern),
                    func.lower(Profile.last_name).like(pattern),
                    display_name.like(pattern),
                ),
            )
            .order_by(Profile.first_name.asc(), Profile.last_name.asc(), Profile.username.asc())
            .limit(8)
            .all()
        )

        return jsonify({
            "profiles": [
                {
                    "id": str(profile.id),
                    "username": profile.username,
                    "first_name": profile.first_name,
                    "last_name": profile.last_name,
                    "display_name": (
                        f"{profile.first_name or ''} {profile.last_name or ''}".strip()
                        or profile.username
                        or "User"
                    ),
                    "avatar_url": profile.avatar_url,
                    "job_title": profile.job_title,
                    "department": profile.department,
                }
                for profile in profiles
            ]
        }), 200
    except SQLAlchemyError as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()


def update_profile():
    """Update current user's profile."""
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return jsonify({"error": "Database is not configured"}), 503

    token = extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing authorization header"}), 401
    
    current_app.logger.info(f"Token received: {token[:50]}...")

    user_id, email = verify_supabase_jwt(token)
    if not user_id:
        return jsonify({"error": "Invalid token"}), 401

    data = request.get_json(silent=True) or {}

    allowed_fields = [
        "username",
        "bio",
        "avatar_url",
        "professional_summary",
        "timezone",
        "language",
        "social_links",
        "interests",
        "first_name",
        "last_name",
        "job_title",
        "birthday",
        "department",
        "years_of_experience",
    ]
    
    session = db_session()
    try:
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        if not profile:
            return jsonify({"error": "Profile not found"}), 404

        updated = False

        interests_payload = None
        if "interests" in data:
            interests_payload = _validate_interests_payload(data.get("interests"))

        avatar_url_payload = None
        if "avatar_url" in data:
            avatar_url_payload = _validate_avatar_url_payload(data.get("avatar_url"))

        username_payload = None
        if "username" in data:
            username_payload = _normalize_username(data.get("username"))
            if username_payload:
                duplicate = (
                    session.query(Profile.id)
                    .filter(
                        Profile.id != user_id,
                        func.lower(Profile.username) == username_payload.lower(),
                    )
                    .first()
                )
                if duplicate:
                    return jsonify({"error": "Username is already taken"}), 409

        for field in allowed_fields:
            if field not in data or data[field] is None:
                continue

            if field == "birthday":
                profile.birthday = _parse_iso_date(data[field])
            elif field == "username":
                profile.username = username_payload
            elif field == "interests":
                profile.interests = interests_payload
            elif field == "avatar_url":
                profile.avatar_url = avatar_url_payload
            else:
                setattr(profile, field, data[field])
            updated = True

        educations_payload = None
        if "educations" in data:
            educations_payload = _validate_educations_payload(data.get("educations"))

        if educations_payload is not None:
            session.query(ProfileEducation).filter(ProfileEducation.profile_id == user_id).delete(
                synchronize_session=False
            )

            for edu in educations_payload:
                session.add(
                    ProfileEducation(
                        profile_id=user_id,
                        institution_name=edu.get("institution_name"),
                        degree=edu.get("degree"),
                        field_of_study=edu.get("field_of_study"),
                        start_year=edu.get("start_year"),
                        end_year=edu.get("end_year"),
                        is_current=bool(edu.get("is_current", False)),
                        description=edu.get("description"),
                        order_index=edu.get("order_index", 0),
                    )
                )
            updated = True

        skills_payload = None
        if "skills" in data:
            skills_payload = _validate_skills_payload(data.get("skills"))

        if skills_payload is not None:
            session.query(UserSkill).filter(UserSkill.user_id == user_id).delete(synchronize_session=False)

            if skills_payload:
                skill_names_lower = [item["name_lower"] for item in skills_payload]
                existing_skills = (
                    session.query(Skill)
                    .filter(func.lower(Skill.name).in_(skill_names_lower))
                    .all()
                )
                skills_by_name_lower = {skill.name.lower(): skill for skill in existing_skills}

                for item in skills_payload:
                    skill = skills_by_name_lower.get(item["name_lower"])
                    if skill is None:
                        skill = Skill(name=item["name"])
                        session.add(skill)
                        session.flush()
                        skills_by_name_lower[item["name_lower"]] = skill

                    session.add(
                        UserSkill(
                            user_id=user_id,
                            skill_id=skill.id,
                            level=item["level"],
                            years=item["years"],
                        )
                    )
            updated = True

        if updated:
            session.commit()
            session.refresh(profile)

        response = serialize_profile(profile)
        response["skills"] = _serialize_profile_skills(session, user_id)
        if educations_payload is not None:
            edus = (
                session.query(ProfileEducation)
                .filter(ProfileEducation.profile_id == user_id)
                .order_by(ProfileEducation.order_index.asc(), ProfileEducation.id.asc())
                .all()
            )
            response["educations"] = [
                {
                    "id": e.id,
                    "institution_name": e.institution_name,
                    "degree": e.degree,
                    "field_of_study": e.field_of_study,
                    "start_year": e.start_year,
                    "end_year": e.end_year,
                    "is_current": e.is_current,
                    "description": e.description,
                    "order_index": e.order_index,
                    "created_at": e.created_at.isoformat() if e.created_at else None,
                }
                for e in edus
            ]

        return jsonify(response), 200
    except ValueError as exc:
        session.rollback()
        return jsonify({"error": str(exc)}), 400
    except IntegrityError:
        session.rollback()
        return jsonify({"error": "Username is already taken"}), 409
    except SQLAlchemyError as exc:
        session.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()


def get_skills():
    """Get all skills. Requires valid bearer token."""
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
        skills = session.query(Skill).order_by(Skill.name.asc(), Skill.id.asc()).all()
        return (
            jsonify(
                {
                    "skills": [
                        {
                            "id": skill.id,
                            "name": skill.name,
                        }
                        for skill in skills
                    ]
                }
            ),
            200,
        )
    except SQLAlchemyError as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()


@profile_ns.route("/profile")
class ProfileResource(Resource):
    def get(self):
        return get_profile()

    def put(self):
        return update_profile()


@profile_ns.route("/profile/public/<path:identifier>")
class PublicProfileResource(Resource):
    def get(self, identifier: str):
        return get_public_profile(identifier)


@profile_ns.route("/profile/search")
class ProfileSearchResource(Resource):
    def get(self):
        return search_public_profiles()


@profile_ns.route("/skills")
class SkillsResource(Resource):
    def get(self):
        return get_skills()
