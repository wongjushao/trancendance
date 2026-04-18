from sqlalchemy.exc import SQLAlchemyError

from backend.common.models.entities import NotificationPreference


UPDATABLE_FIELDS: set[str] = {
    "email_enabled",
    "push_enabled",
    "assignment_reminders",
    "course_updates",
    "message_notifications",
    "marketing_emails",
}


def get_preferences(session, user_id: str):
    return (
        session.query(NotificationPreference)
        .filter(NotificationPreference.user_id == user_id)
        .first()
    )


def get_or_create_preferences(session, user_id: str) -> NotificationPreference:
    prefs = get_preferences(session, user_id)
    if prefs is None:
        prefs = NotificationPreference(user_id=user_id)
        session.add(prefs)
        session.flush()
    return prefs


def apply_updates(prefs: NotificationPreference, updates: dict[str, bool]) -> None:
    for field, value in updates.items():
        setattr(prefs, field, value)


def commit(session) -> None:
    try:
        session.commit()
    except SQLAlchemyError:
        session.rollback()
        raise
