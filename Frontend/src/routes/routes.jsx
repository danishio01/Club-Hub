import { createBrowserRouter } from "react-router-dom";
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
import PrSocialShare from "../features/pr/pages/PrSocialShare"; // NEW
import GrafikDashboard from "../features/grafik/pages/GrafikDashboard";
import GrafikGalleriesList from "../features/grafik/pages/GrafikGalleriesList";
import GrafikEventBanner from "../features/grafik/pages/GrafikEventBanner"; 
import GrafikEventGallery from "../features/grafik/pages/GrafikEventGallery";

import ReportEditor from "../features/reports/pages/ReportEditor";
import AdminReportReview from "../features/reports/pages/AdminReportReview";

export const routes = createBrowserRouter([
    {
        path: "/",
        element: <StudentLogin />,
        errorElement: <ErrorBoundary />
    },
    {
        path: "/admin/login",
        element: <AdminLogin />,
        errorElement: <ErrorBoundary />
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
            { path: "leaderboard", element: <Leaderboard isAdmin={true} /> },
            { path: "attendance", element: <AdminAttendance /> },
            { path: "reports", element: <AdminReportReview /> } 
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
            { path: "club", element: <Clubs /> },
            { path: "ai-agent", element: <AdminAiAgent /> },
            { path: "reports/write/:eventId", element: <ReportEditor /> } 
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
            { path: "events/:eventId/share", element: <PrSocialShare /> } // NEW
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
            { path: "attendance/:eventId", element: <MarkAttendance /> },
            { path: "leaderboard", element: <Leaderboard isAdmin={false} /> },
            { path: "attendance-report", element: <StudentAttendance /> },
            { path: "certificates", element: <Certificates /> },
            { path: "profile", element: <Profile /> }
        ]
    }
]);
