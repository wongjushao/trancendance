# backend/services/org_service/org_service/routes/profile.py
from __future__ import annotations

from datetime import datetime, timedelta
from flask import current_app, jsonify
from flask_restx import Namespace, Resource
from sqlalchemy import and_, or_
from sqlalchemy.exc import SQLAlchemyError

from backend.common.models import (
    ClassMember,
    Course,
    CourseClass,
    Friendship,
    Lesson,
    LessonProgress,
    Module,
    Profile,
    UserSkill,
)
from backend.services.org_service.org_service.routes.organizations import get_authenticated_user

profile_ns = Namespace("profile", path="/", description="Profile dashboard endpoints")


@profile_ns.route("/profile/stats")
class ProfileStatsResource(Resource):
    def get(self):
        """Get user statistics for profile page."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Get enrolled courses count via class_members
            enrolled_courses = (
                session.query(ClassMember.course_class_id)
                .join(CourseClass, CourseClass.id == ClassMember.course_class_id)
                .filter(ClassMember.user_id == user_id, ClassMember.role == "student")
                .distinct()
                .count()
            )

            # Get completed courses count
            completed_courses = 0
            class_members = (
                session.query(ClassMember)
                .join(CourseClass, CourseClass.id == ClassMember.course_class_id)
                .filter(ClassMember.user_id == user_id, ClassMember.role == "student")
                .all()
            )

            for cm in class_members:
                # Count total lessons in this course offering
                total_lessons = (
                    session.query(LessonProgress)
                    .filter(
                        LessonProgress.user_id == user_id,
                        LessonProgress.class_member_id == cm.id
                    )
                    .count()
                )
                completed_lessons = (
                    session.query(LessonProgress)
                    .filter(
                        LessonProgress.user_id == user_id,
                        LessonProgress.class_member_id == cm.id,
                        LessonProgress.status == "completed"
                    )
                    .count()
                )
                if total_lessons > 0 and completed_lessons == total_lessons:
                    completed_courses += 1

            # Get connections count (friends)
            connections = (
                session.query(Friendship)
                .filter(
                    and_(
                        Friendship.status == "accepted",
                        (Friendship.requester_id == user_id) | (Friendship.addressee_id == user_id)
                    )
                )
                .count()
            )

            # Get skills count
            skills_count = session.query(UserSkill).filter(UserSkill.user_id == user_id).count()

            return jsonify({
                "enrolled_courses": enrolled_courses,
                "completed_courses": completed_courses,
                "connections": connections,
                "skills_count": skills_count,
            }), 200

        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@profile_ns.route("/profile/achievements")
class AchievementsResource(Resource):
    def get(self):
        """Get user achievements and badges."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Achievement: Quick Learner (5 lessons in a week)
            seven_days_ago = datetime.utcnow() - timedelta(days=7)
            lessons_last_week = (
                session.query(LessonProgress)
                .filter(
                    LessonProgress.user_id == user_id,
                    LessonProgress.status == "completed",
                    LessonProgress.completed_at >= seven_days_ago
                )
                .count()
            )
            quick_learner_earned = lessons_last_week >= 5
            quick_learner_progress = min(100, int((lessons_last_week / 5) * 100)) if not quick_learner_earned else 100

            # Achievement: Course Warrior (complete 3 courses)
            completed_courses = 0
            class_members = (
                session.query(ClassMember)
                .join(CourseClass, CourseClass.id == ClassMember.course_class_id)
                .filter(ClassMember.user_id == user_id, ClassMember.role == "student")
                .all()
            )

            for cm in class_members:
                total_lessons = (
                    session.query(LessonProgress)
                    .filter(
                        LessonProgress.user_id == user_id,
                        LessonProgress.class_member_id == cm.id
                    )
                    .count()
                )
                completed = (
                    session.query(LessonProgress)
                    .filter(
                        LessonProgress.user_id == user_id,
                        LessonProgress.class_member_id == cm.id,
                        LessonProgress.status == "completed"
                    )
                    .count()
                )
                if total_lessons > 0 and completed == total_lessons:
                    completed_courses += 1

            course_warrior_earned = completed_courses >= 3
            course_warrior_progress = min(100, int((completed_courses / 3) * 100))

            achievements = [
                {
                    "id": "1",
                    "title": "Quick Learner",
                    "description": "Complete 5 lessons in a week",
                    "icon": "Zap",
                    "earned": quick_learner_earned,
                    "progress": quick_learner_progress,
                    "points": 100,
                },
                {
                    "id": "2",
                    "title": "Course Warrior",
                    "description": "Complete 3 full courses",
                    "icon": "Target",
                    "earned": course_warrior_earned,
                    "progress": course_warrior_progress,
                    "points": 500,
                },
            ]

            # Badges
            badges = [
                {
                    "id": "1",
                    "title": "First Course",
                    "description": "Completed first course",
                    "icon": "BookOpen",
                    "earned": completed_courses >= 1,
                },
            ]

            return jsonify({
                "achievements": achievements,
                "badges": badges,
            }), 200

        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@profile_ns.route("/profile/activity")
class ActivityResource(Resource):
    def get(self):
        """Get user recent activity timeline."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Get recent completed lessons
            recent_progress = (
                session.query(LessonProgress)
                .filter(
                    LessonProgress.user_id == user_id,
                    LessonProgress.status == "completed",
                    LessonProgress.completed_at.isnot(None)
                )
                .order_by(LessonProgress.completed_at.desc())
                .limit(10)
                .all()
            )

            activities = []
            for progress in recent_progress:
                lesson = session.query(Lesson).filter(Lesson.id == progress.lesson_id).first()
                lesson_title = lesson.title if lesson else f"Lesson {progress.lesson_id}"
                activities.append({
                    "id": str(progress.id),
                    "type": "lesson",
                    "action": "Completed",
                    "title": lesson_title,
                    "date": progress.completed_at.isoformat() if progress.completed_at else None,
                    "points": 25,
                })

            return jsonify({"activities": activities}), 200

        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@profile_ns.route("/profile/connections")
class ConnectionsResource(Resource):
    def get(self):
        """Get user's connections (friends) with their profiles."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Get accepted friendships
            friendships = (
                session.query(Friendship)
                .filter(
                    and_(
                        Friendship.status == "accepted",
                        (Friendship.requester_id == user_id) | (Friendship.addressee_id == user_id)
                    )
                )
                .all()
            )

            connections = []
            for friendship in friendships:
                friend_id = friendship.addressee_id if friendship.requester_id == user_id else friendship.requester_id
                profile = session.query(Profile).filter(Profile.id == friend_id).first()

                if profile:
                    connections.append({
                        "id": str(profile.id),
                        "name": profile.first_name or profile.username or "User",
                        "avatar": profile.avatar_url or "",
                        "mutualCourses": 0,
                        "status": "offline",
                        "courseProgress": 0,
                    })

            return jsonify({"connections": connections}), 200

        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

