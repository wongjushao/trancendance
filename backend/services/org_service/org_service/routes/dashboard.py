# backend/services/org_service/org_service/routes/dashboard.py

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from flask import current_app, jsonify, request
from flask_restx import Namespace, Resource
from sqlalchemy import func, and_, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload

from backend.common.models import (
    Assignment,
    ClassMember,
    Course,
    CourseClass,
    CourseMember,
    CourseReview,
    Lesson,
    LessonProgress,
    Module,
    Organization,
    OrganizationMember,
    Profile,
    Submission,
    Friendship,
)
# Import Class with an alias to avoid confusion with Python's class keyword
from backend.common.models.entities import Class as ContentClass

from backend.services.org_service.org_service.routes.organizations import get_authenticated_user

dashboard_ns = Namespace("dashboard", path="/", description="Dashboard endpoints")

@dashboard_ns.route("/dashboard/student")
class StudentDashboardResource(Resource):
    def get(self):
        """Get aggregated student dashboard data."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Get enrolled courses via class_members
            class_members = (
                session.query(ClassMember, CourseClass, Course)
                .join(CourseClass, CourseClass.id == ClassMember.course_class_id)
                .join(Course, Course.id == CourseClass.course_id)
                .filter(ClassMember.user_id == user_id, ClassMember.role == "student")
                .all()
            )

            if not class_members:
                return jsonify({
                    "enrolled_courses": [],
                    "stats": {
                        "total_courses": 0,
                        "completed_courses": 0,
                        "average_progress": 0,
                        "streak_days": 0,
                        "pending_tasks": 0,
                    },
                    "upcoming_deadlines": [],
                    "recent_activity": [],
                }), 200

            # Build course data
            courses_data = []
            total_progress_sum = 0
            completed_courses = 0
            class_member_ids = []

            # Store class member objects for later use
            class_member_objects = []

            for cm, course_class, course in class_members:
                class_member_ids.append(cm.id)
                class_member_objects.append(cm)
                
                if not course or course.created_by == user_id:
                    continue

                # Count total lessons in course using ContentClass
                total_lessons = (
                    session.query(Lesson)
                    .join(ContentClass, ContentClass.id == Lesson.class_id)
                    .join(Module, Module.id == ContentClass.module_id)
                    .filter(Module.course_id == course.id)
                    .count()
                )

                # Count completed lessons
                completed_lessons = (
                    session.query(LessonProgress)
                    .filter(
                        LessonProgress.user_id == user_id,
                        LessonProgress.class_member_id == cm.id,
                        LessonProgress.status == "completed"
                    )
                    .count()
                )

                progress = int((completed_lessons / total_lessons) * 100) if total_lessons > 0 else 0
                total_progress_sum += progress
                if progress == 100:
                    completed_courses += 1

                # Get instructor name
                instructor = session.query(Profile).filter(Profile.id == course.created_by).first()
                instructor_name = "Instructor"
                if instructor:
                    if instructor.first_name and instructor.last_name:
                        instructor_name = f"{instructor.first_name} {instructor.last_name}"
                    elif instructor.first_name:
                        instructor_name = instructor.first_name
                    elif instructor.username:
                        instructor_name = instructor.username

                org = (
                    session.query(Organization)
                    .filter(Organization.id == course.organization_id)
                    .first()
                )

                courses_data.append({
                    "id": course.id,
                    "title": course.title,
                    "description": course.description or "",
                    "thumbnail": course.thumbnail or "",
                    "instructor_name": instructor_name,
                    "progress": progress,
                    "completed_lessons": completed_lessons,
                    "total_lessons": total_lessons,
                    "last_accessed_at": cm.enrolled_at.isoformat() if cm.enrolled_at else None,
                    "rating": 0,
                    "certificate_earned": False,
                    "status": course.status,
                    "organization_name": org.name if org else None,
                })

            avg_progress = int(total_progress_sum / len(courses_data)) if courses_data else 0

            # Get course IDs for assignments
            course_ids = list({c["id"] for c in courses_data})

            # Get upcoming assignments
            upcoming_deadlines = []
            if course_ids:
                assignments = (
                    session.query(Assignment, Course)
                    .join(Course, Course.id == Assignment.course_id)
                    .filter(
                        Assignment.course_id.in_(course_ids),
                        Assignment.due_at >= datetime.now(timezone.utc)
                    )
                    .order_by(Assignment.due_at.asc())
                    .limit(5)
                    .all()
                )

                for assignment, course in assignments:
                    upcoming_deadlines.append({
                        "id": assignment.id,
                        "title": assignment.title,
                        "type": "assignment",
                        "courseName": course.title,
                        "due_at": assignment.due_at.isoformat() if assignment.due_at else None,
                    })

            # Get recent activity
            seven_days_ago = datetime.now(timezone.utc)- timedelta(days=7)
            recent_activity = []
            
            if class_member_ids:
                recent_progress = (
                    session.query(LessonProgress, Lesson)
                    .join(Lesson, Lesson.id == LessonProgress.lesson_id)
                    .filter(
                        LessonProgress.user_id == user_id,
                        LessonProgress.class_member_id.in_(class_member_ids),
                        LessonProgress.status == "completed",
                        LessonProgress.completed_at >= seven_days_ago
                    )
                    .order_by(LessonProgress.completed_at.desc())
                    .limit(10)
                    .all()
                )

                for progress, lesson in recent_progress:
                    # Find course for this lesson
                    content_class = session.query(ContentClass).filter(ContentClass.id == lesson.class_id).first()
                    if content_class:
                        module = session.query(Module).filter(Module.id == content_class.module_id).first()
                        if module:
                            course = session.query(Course).filter(Course.id == module.course_id).first()
                            recent_activity.append({
                                "id": str(progress.id),
                                "type": "lesson",
                                "title": lesson.title,
                                "courseName": course.title if course else "Course",
                                "completed_at": progress.completed_at.isoformat() if progress.completed_at else None,
                                "status": "completed",
                            })

            return jsonify({
                "enrolled_courses": courses_data,
                "stats": {
                    "total_courses": len(courses_data),
                    "completed_courses": completed_courses,
                    "average_progress": avg_progress,
                    "streak_days": 0,
                    "pending_tasks": len(upcoming_deadlines),
                },
                "upcoming_deadlines": upcoming_deadlines,
                "recent_activity": recent_activity[:5],
            }), 200

        except Exception as exc:
            session.rollback()
            print(f"Error in student dashboard: {exc}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@dashboard_ns.route("/dashboard/admin")
class AdminDashboardResource(Resource):
    def get(self):
        """Get aggregated admin dashboard data for an organization."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        # Get organization_id from query params
        organization_id = request.args.get("organization_id", type=int)
        if not organization_id:
            return jsonify({"error": "organization_id is required"}), 400

        session = db_session()
        try:
            # First, verify user is an admin of this organization
            org_member = (
                session.query(OrganizationMember)
                .filter(
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.organization_id == organization_id,
                    OrganizationMember.member_role.in_(["admin", "sub_admin"])
                )
                .first()
            )

            if not org_member:
                return jsonify({"error": "Unauthorized: Admin access required"}), 403

            # Get all courses in this organization
            courses = (
                session.query(Course)
                .filter(Course.organization_id == organization_id)
                .all()
            )

            total_courses = len(courses)
            published_courses = len([c for c in courses if c.status == "published"])
            
            if not courses:
                return jsonify({
                    "stats": {
                        "total_students": 0,
                        "active_students": 0,
                        "total_courses": 0,
                        "published_courses": 0,
                        "average_rating": 0,
                        "completion_rate": 0,
                        "pending_approvals": 0,
                    },
                    "top_courses": [],
                }), 200

            course_ids = [course.id for course in courses]

            # Get all course classes for these courses
            course_classes = (
                session.query(CourseClass)
                .filter(CourseClass.course_id.in_(course_ids))
                .all()
            )
            
            class_ids_by_course = {}
            all_class_ids = []
            
            for cc in course_classes:
                all_class_ids.append(cc.id)
                if cc.course_id not in class_ids_by_course:
                    class_ids_by_course[cc.course_id] = []
                class_ids_by_course[cc.course_id].append(cc.id)

            # Get all class members (students) for these classes
            all_class_members = []
            unique_students = set()
            active_students_set = set()
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            
            if all_class_ids:
                all_class_members = (
                    session.query(ClassMember)
                    .filter(
                        ClassMember.course_class_id.in_(all_class_ids),
                        ClassMember.role == "student"
                    )
                    .all()
                )
                
                for cm in all_class_members:
                    unique_students.add(cm.user_id)
                    if cm.enrolled_at and cm.enrolled_at >= thirty_days_ago:
                        active_students_set.add(cm.user_id)
            
            total_students = len(unique_students)
            active_students = len(active_students_set)
            
            # Count students per course
            students_per_class = {}
            for cm in all_class_members:
                if cm.course_class_id not in students_per_class:
                    students_per_class[cm.course_class_id] = set()
                students_per_class[cm.course_class_id].add(cm.user_id)
            
            student_count_by_course = {}
            for course_id, class_ids in class_ids_by_course.items():
                unique_course_students = set()
                for class_id in class_ids:
                    if class_id in students_per_class:
                        unique_course_students.update(students_per_class[class_id])
                student_count_by_course[course_id] = len(unique_course_students)
            
            # Get all reviews for these courses
            all_reviews = (
                session.query(CourseReview)
                .filter(CourseReview.course_id.in_(course_ids))
                .all()
            )
            
            rating_by_course = {}
            for review in all_reviews:
                if review.course_id not in rating_by_course:
                    rating_by_course[review.course_id] = {"sum": 0, "count": 0}
                rating_by_course[review.course_id]["sum"] += review.rating
                rating_by_course[review.course_id]["count"] += 1
            
            # Get completion rates per course
            # First, get all class member IDs for progress tracking
            class_member_ids = [cm.id for cm in all_class_members]
            completion_by_course = {}
            
            if class_member_ids:
                # Get all lesson progress for these class members
                all_progress = (
                    session.query(LessonProgress)
                    .filter(LessonProgress.class_member_id.in_(class_member_ids))
                    .all()
                )
                
                # Map class member ID to course ID
                class_member_to_course = {}
                for cm in all_class_members:
                    # Find which course this class member belongs to
                    for course_id, class_ids in class_ids_by_course.items():
                        if cm.course_class_id in class_ids:
                            class_member_to_course[cm.id] = course_id
                            break
                
                # Calculate completion per course
                course_completion_stats = {}
                for progress in all_progress:
                    course_id = class_member_to_course.get(progress.class_member_id)
                    if course_id:
                        if course_id not in course_completion_stats:
                            course_completion_stats[course_id] = {"total": 0, "completed": 0}
                        course_completion_stats[course_id]["total"] += 1
                        if progress.status == "completed":
                            course_completion_stats[course_id]["completed"] += 1
                
                # Calculate completion percentage
                for course_id, stats in course_completion_stats.items():
                    if stats["total"] > 0:
                        completion_by_course[course_id] = (stats["completed"] / stats["total"]) * 100
                    else:
                        completion_by_course[course_id] = 0
            
            # Build top courses data
            courses_with_stats = []
            for course in courses:
                rating_data = rating_by_course.get(course.id)
                avg_rating = rating_data["sum"] / rating_data["count"] if rating_data else 0
                
                courses_with_stats.append({
                    "id": course.id,
                    "title": course.title,
                    "students": student_count_by_course.get(course.id, 0),
                    "rating": round(avg_rating, 1),
                    "completion": round(completion_by_course.get(course.id, 0)),
                })
            
            # Sort by student count and get top 3
            top_courses = sorted(courses_with_stats, key=lambda x: x["students"], reverse=True)[:3]
            
            # Calculate averages
            avg_rating = sum(c["rating"] for c in courses_with_stats) / len(courses_with_stats) if courses_with_stats else 0
            avg_completion = sum(c["completion"] for c in courses_with_stats) / len(courses_with_stats) if courses_with_stats else 0
            
            # Get pending approvals (e.g., pending organization member requests)
            pending_approvals = (
                session.query(OrganizationMember)
                .filter(
                    OrganizationMember.organization_id == organization_id,
                    OrganizationMember.member_role == "pending"
                )
                .count()
            )
            
            return jsonify({
                "stats": {
                    "total_students": total_students,
                    "active_students": active_students,
                    "total_courses": total_courses,
                    "published_courses": published_courses,
                    "average_rating": round(avg_rating, 1),
                    "completion_rate": round(avg_completion),
                    "pending_approvals": pending_approvals,
                },
                "top_courses": top_courses,
            }), 200
            
        except Exception as exc:
            session.rollback()
            print(f"Error in admin dashboard: {exc}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@dashboard_ns.route("/dashboard/teacher")
class TeacherDashboardResource(Resource):
    def get(self):
        """Get aggregated teacher dashboard data for an organization."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        # Get organization_id from query params (optional, can filter by org)
        organization_id = request.args.get("organization_id", type=int)

        session = db_session()
        try:
            # Build query for courses created by this user
            course_query = session.query(Course).filter(Course.created_by == user_id)
            
            if organization_id:
                course_query = course_query.filter(Course.organization_id == organization_id)
            
            courses = course_query.order_by(Course.created_at.desc()).all()
            
            if not courses:
                return jsonify({
                    "courses": [],
                    "stats": {
                        "total_students": 0,
                        "active_courses": 0,
                        "average_rating": 0,
                        "completion_rate": 0,
                    },
                    "pending_grading": [],
                }), 200
            
            course_ids = [course.id for course in courses]
            
            # Get all course classes for these courses
            course_classes = (
                session.query(CourseClass)
                .filter(CourseClass.course_id.in_(course_ids))
                .all()
            )
            
            class_ids_by_course = {}
            all_class_ids = []
            
            for cc in course_classes:
                all_class_ids.append(cc.id)
                if cc.course_id not in class_ids_by_course:
                    class_ids_by_course[cc.course_id] = []
                class_ids_by_course[cc.course_id].append(cc.id)
            
            # Get all class members (students) for these classes
            all_class_members = []
            if all_class_ids:
                all_class_members = (
                    session.query(ClassMember)
                    .filter(
                        ClassMember.course_class_id.in_(all_class_ids),
                        ClassMember.role == "student"
                    )
                    .all()
                )
            
            # Count students per course
            students_per_class = {}
            for cm in all_class_members:
                if cm.course_class_id not in students_per_class:
                    students_per_class[cm.course_class_id] = set()
                students_per_class[cm.course_class_id].add(cm.user_id)
            
            student_count_by_course = {}
            for course_id, class_ids in class_ids_by_course.items():
                unique_course_students = set()
                for class_id in class_ids:
                    if class_id in students_per_class:
                        unique_course_students.update(students_per_class[class_id])
                student_count_by_course[course_id] = len(unique_course_students)
            
            # Get all reviews for these courses
            all_reviews = (
                session.query(CourseReview)
                .filter(CourseReview.course_id.in_(course_ids))
                .all()
            )
            
            rating_by_course = {}
            for review in all_reviews:
                if review.course_id not in rating_by_course:
                    rating_by_course[review.course_id] = {"sum": 0, "count": 0}
                rating_by_course[review.course_id]["sum"] += review.rating
                rating_by_course[review.course_id]["count"] += 1
            
            # Get assignments and pending grading
            assignments = (
                session.query(Assignment)
                .filter(Assignment.course_id.in_(course_ids))
                .order_by(Assignment.due_at.asc())
                .limit(5)
                .all()
            )
            
            assignment_ids = [a.id for a in assignments]
            pending_grading_list = []
            
            if assignment_ids:
                # Get submissions that need grading
                submissions = (
                    session.query(Submission)
                    .filter(
                        Submission.assignment_id.in_(assignment_ids),
                        Submission.grade.is_(None)
                    )
                    .all()
                )
                
                # Count pending submissions per assignment
                pending_count = {}
                for sub in submissions:
                    if sub.assignment_id not in pending_count:
                        pending_count[sub.assignment_id] = 0
                    pending_count[sub.assignment_id] += 1
                
                # Create a map for course titles
                course_map = {course.id: course.title for course in courses}
                
                for assignment in assignments:
                    count = pending_count.get(assignment.id, 0)
                    if count > 0:
                        pending_grading_list.append({
                            "id": assignment.id,
                            "title": assignment.title,
                            "course_name": course_map.get(assignment.course_id, "Unknown"),
                            "submissions": count,
                            "due_date": assignment.due_at.isoformat() if assignment.due_at else None,
                        })
            
            # Build teacher courses data
            teacher_courses = []
            total_students = 0
            total_rating_sum = 0
            rating_count = 0
            
            for course in courses:
                student_count = student_count_by_course.get(course.id, 0)
                total_students += student_count
                
                rating_data = rating_by_course.get(course.id)
                avg_rating = rating_data["sum"] / rating_data["count"] if rating_data else 0
                if rating_data:
                    total_rating_sum += avg_rating
                    rating_count += 1
                
                teacher_courses.append({
                    "id": course.id,
                    "title": course.title,
                    "thumbnail": course.thumbnail or "",
                    "students": student_count,
                    "progress": 0,  # Course progress would require more complex calculation
                    "rating": round(avg_rating, 1),
                    "status": course.status if course.status in ["published", "draft"] else "draft",
                })
            
            active_courses = len([c for c in courses if c.status == "published"])
            
            return jsonify({
                "courses": teacher_courses,
                "stats": {
                    "total_students": total_students,
                    "active_courses": active_courses,
                    "average_rating": round(total_rating_sum / rating_count, 1) if rating_count > 0 else 0,
                    "completion_rate": 0,  # Would require more complex calculation
                },
                "pending_grading": pending_grading_list[:3],  # Limit to 3 items
            }), 200
            
        except Exception as exc:
            session.rollback()
            print(f"Error in teacher dashboard: {exc}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()


@dashboard_ns.route("/organizations/memberships")
class UserMembershipsResource(Resource):
    def get(self):
        """Get user's organization memberships with roles."""
        db_session = current_app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured"}), 503

        user_id, _email = get_authenticated_user()
        if user_id is None:
            return jsonify({"error": "Unauthorized"}), 401

        session = db_session()
        try:
            # Get organization memberships
            memberships = (
                session.query(OrganizationMember)
                .filter(OrganizationMember.user_id == user_id)
                .all()
            )

            organizations = []
            roles = set()

            for membership in memberships:
                # Get organization name separately
                org = session.query(Organization).filter(Organization.id == membership.organization_id).first()
                if org:
                    role = membership.member_role
                    if role == "sub_admin":
                        role = "admin"
                    organizations.append({
                        "id": membership.organization_id,
                        "name": org.name,
                        "role": role,
                    })
                    if membership.member_role in ["admin", "sub_admin"]:
                        roles.add("admin")
                    elif membership.member_role == "teacher":
                        roles.add("teacher")
                    roles.add("student")

            if not organizations:
                roles.add("student")

            return jsonify({
                "organizations": organizations,
                "roles": list(roles),
            }), 200

        except Exception as exc:
            session.rollback()
            print(f"Error in memberships: {exc}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()