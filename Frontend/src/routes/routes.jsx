import { createBrowserRouter, Navigate } from "react-router-dom";
import AdminLogin from "../features/auth/pages/AdminLogin";
import StudentLogin from "../features/auth/pages/StudentLogin";
import AdminLayout from "../components/layout/AdminLayout";
import StudentLayout from "../components/layout/StudentLayout";
import PresidentLayout from "../components/layout/PresidentLayout";
import PrLayout from "../components/layout/PrLayout";
import GrafikLayout from "../components/layout/GrafikLayout";
import ErrorBoundary from "../components/common/ErrorBoundary";

import Dashboard from "../features/dashboard/pages/Dashboard";
import Students from "../features/students/pages/Students";
import Clubs from "../features/clubs/pages/Clubs";
import AdminEventReviews from "../features/events/pages/AdminEventReviews";
import Events from "../features/events/pages/Events";
import EventDetails from "../features/events/pages/EventDetails";
import Profile from "../features/profile/pages/Profile";
import StudentEvents from "../features/studentEvents/pages/StudentEvents";
import StudentEventDetails from "../features/studentEvents/pages/StudentEventDetails";
import MarkAttendance from "../features/studentEvents/pages/MarkAttendance";
import Leaderboard from "../features/leaderboard/pages/Leaderboard";
import Certificates from "../features/certificates/pages/Certificates";
import StudentAttendance from "../features/attendance/pages/StudentAttendance";
import AdminAttendance from "../features/attendance/pages/AdminAttendance";
import AdminAiAgent from "../features/ai/pages/AdminAiAgent";
import PresidentDashboard from "../features/president/pages/PresidentDashboard";
import PrDashboard from "../features/pr/pages/PrDashboard";
import PrEventManagement from "../features/pr/pages/PrEventManagement";
import PrEventGallery from "../features/pr/pages/PrEventGallery"; 
import PrSocialShare from "../features/pr/pages/PrSocialShare";
import GrafikDashboard from "../features/grafik/pages/GrafikDashboard";
import GrafikGalleriesList from "../features/grafik/pages/GrafikGalleriesList";
import GrafikEventBanner from "../features/grafik/pages/GrafikEventBanner"; 
import GrafikEventGallery from "../features/grafik/pages/GrafikEventGallery";

import ReportEditor from "../features/reports/pages/ReportEditor";
import AdminReportReview from "../features/reports/pages/AdminReportReview";

import StudentFeedback from "../features/feedback/pages/StudentFeedback";
import FeedbackAnalytics from "../features/reports/pages/FeedbackAnalytics";
import TaskDashboard from "../features/tasks/pages/TaskDashboard";
import FacultyAccounts from "../features/staff/pages/FacultyAccounts";

export const routes = createBrowserRouter([
    {
        path: "/",
        element: <StudentLogin />,
        errorElement: <ErrorBoundary />
    },
    {
        path: "/staff/login",
        element: <AdminLogin />,
        errorElement: <ErrorBoundary />
    },
    {
        path: "/admin/login",
        element: <Navigate to="/staff/login" replace />,
        errorElement: <ErrorBoundary />
    },
    {
        path: "/faculty",
        element: <AdminLayout />,
        errorElement: <ErrorBoundary />,
        children: [
            { path: "dashboard", element: <Dashboard /> },
            { path: "students", element: <Students /> },
            { path: "clubs", element: <Clubs /> },
            { path: "event-approvals", element: <AdminEventReviews /> },
            { path: "events/:eventId", element: <EventDetails /> },
            { path: "events/:eventId/analytics", element: <FeedbackAnalytics /> },
            { path: "leaderboard", element: <Leaderboard isAdmin={true} /> },
            { path: "attendance", element: <AdminAttendance /> },
            { path: "reports", element: <AdminReportReview /> },
            { path: "tasks", element: <TaskDashboard /> }
            ,{ path: "profile", element: <Profile /> }
        ]
    },
    {
        path: "/admin",
        element: <AdminLayout />,
        errorElement: <ErrorBoundary />,
        children: [
            { path: "dashboard", element: <Dashboard /> },
            { path: "students", element: <Students /> },
            { path: "clubs", element: <Clubs /> },
            { path: "event-approvals", element: <AdminEventReviews /> },
            { path: "events/:eventId", element: <EventDetails /> },
            { path: "events/:eventId/analytics", element: <FeedbackAnalytics /> },
            { path: "leaderboard", element: <Leaderboard isAdmin={true} /> },
            { path: "attendance", element: <AdminAttendance /> },
            { path: "reports", element: <AdminReportReview /> } 
            ,{ path: "tasks", element: <TaskDashboard /> }
            ,{ path: "profile", element: <Profile /> }
        ]
    },
    {
        path: "/president",
        element: <PresidentLayout />,
        errorElement: <ErrorBoundary />,
        children: [
            { path: "dashboard", element: <PresidentDashboard /> },
            { path: "events", element: <Events /> },
            { path: "events/:eventId", element: <EventDetails /> },
            { path: "events/:eventId/analytics", element: <FeedbackAnalytics /> },
            { path: "club", element: <Clubs /> },
            { path: "ai-agent", element: <AdminAiAgent /> },
            { path: "reports/write/:eventId", element: <ReportEditor /> } 
            ,{ path: "tasks", element: <TaskDashboard /> }
            ,{ path: "pr/dashboard", element: <PrDashboard /> }
            ,{ path: "pr/events/:eventId", element: <PrEventManagement /> }
            ,{ path: "pr/galleries", element: <PrEventGallery /> }
            ,{ path: "pr/events/:eventId/share", element: <PrSocialShare /> }
            ,{ path: "grafik/dashboard", element: <GrafikDashboard /> }
            ,{ path: "grafik/galleries", element: <GrafikGalleriesList /> }
            ,{ path: "grafik/events/:eventId/banner", element: <GrafikEventBanner /> }
            ,{ path: "grafik/events/:eventId/gallery", element: <GrafikEventGallery /> }
            ,{ path: "profile", element: <Profile /> }
        ]
    },
    {
        path: "/hod",
        element: <AdminLayout />,
        errorElement: <ErrorBoundary />,
        children: [
            { path: "dashboard", element: <Dashboard /> },
            { path: "faculty-coordinators", element: <FacultyAccounts /> },
            { path: "clubs", element: <Clubs /> },
            { path: "event-approvals", element: <AdminEventReviews /> },
            { path: "events/:eventId", element: <EventDetails /> },
            { path: "tasks", element: <TaskDashboard /> },
            { path: "attendance", element: <AdminAttendance /> },
            { path: "reports", element: <AdminReportReview /> }
            ,{ path: "leaderboard", element: <Leaderboard isAdmin={true} /> }
            ,{ path: "profile", element: <Profile /> }
        ]
    },
    {
        path: "/pr",
        element: <PrLayout />,
        errorElement: <ErrorBoundary />,
        children: [
            { path: "dashboard", element: <PrDashboard /> },
            { path: "events/:eventId", element: <PrEventManagement /> },
            { path: "galleries", element: <PrEventGallery /> },
            { path: "events/:eventId/share", element: <PrSocialShare /> }
        ]
    },
    {
        path: "/grafik",
        element: <GrafikLayout />,
        errorElement: <ErrorBoundary />,
        children: [
            { path: "dashboard", element: <GrafikDashboard /> },
            { path: "galleries", element: <GrafikGalleriesList /> },
            { path: "events/:eventId/banner", element: <GrafikEventBanner /> },
            { path: "events/:eventId/gallery", element: <GrafikEventGallery /> }
        ]
    },
    {
        path: "/student",
        element: <StudentLayout />,
        errorElement: <ErrorBoundary />,
        children: [
            { path: "dashboard", element: <StudentEvents /> },
            { path: "events/:eventId", element: <StudentEventDetails /> },
            { path: "feedback/:eventId", element: <StudentFeedback /> },
            { path: "attendance/:eventId", element: <MarkAttendance /> },
            { path: "leaderboard", element: <Leaderboard isAdmin={false} /> },
            { path: "attendance-report", element: <StudentAttendance /> },
            { path: "certificates", element: <Certificates /> },
            { path: "profile", element: <Profile /> }
        ]
    }
]);
