import { createBrowserRouter, Navigate } from "react-router";
import { AuthLayout } from "./layouts/AuthLayout";
import { AppLayout } from "./layouts/AppLayout";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import OnboardingPage from "./pages/onboarding/OnboardingPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import OrganizationsPage from "./pages/organizations/OrganizationsPage";
import OrganizationDetailPage from "./pages/organizations/OrganizationDetailPage";
import CoursesPage from "./pages/courses/CoursesPage";
import CourseDetailPage from "./pages/courses/CourseDetailPage";
import LessonViewerPage from "./pages/lessons/LessonViewerPage";
import AssignmentsPage from "./pages/assignments/AssignmentsPage";
import AssignmentDetailPage from "./pages/assignments/AssignmentDetailPage";
import MessagesPage from "./pages/messages/MessagesPage";
import AnalyticsPage from "./pages/analytics/AnalyticsPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import ProfilePage from "./pages/profile/ProfilePage";
import AdminPage from "./pages/admin/AdminPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/auth/login" replace />,
  },
  {
    path: "/auth",
    Component: AuthLayout,
    children: [
      { path: "login", Component: LoginPage },
      { path: "register", Component: RegisterPage },
      { path: "forgot-password", Component: ForgotPasswordPage },
    ],
  },
  {
    path: "/onboarding",
    Component: OnboardingPage,
  },
  {
    path: "/app",
    Component: AppLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "organizations", Component: OrganizationsPage },
      { path: "organizations/:id", Component: OrganizationDetailPage },
      { path: "courses", Component: CoursesPage },
      { path: "courses/:id", Component: CourseDetailPage },
      { path: "courses/:courseId/lessons/:lessonId", Component: LessonViewerPage },
      { path: "assignments", Component: AssignmentsPage },
      { path: "assignments/:id", Component: AssignmentDetailPage },
      { path: "messages", Component: MessagesPage },
      { path: "analytics", Component: AnalyticsPage },
      { path: "notifications", Component: NotificationsPage },
      { path: "profile", Component: ProfilePage },
      { path: "admin", Component: AdminPage },
    ],
  },
]);