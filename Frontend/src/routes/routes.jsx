import { createBrowserRouter } from "react-router-dom";
import AdminLogin from "../features/auth/pages/AdminLogin";
import StudentLogin from "../features/auth/pages/StudentLogin";
import AdminLayout from "../components/layout/AdminLayout";
import StudentLayout from "../components/layout/StudentLayout";
import PresidentLayout from "../components/layout/PresidentLayout";
import PrLayout from "../components/layout/PrLayout";
import ErrorBoundary from "../components/common/ErrorBoundary";

import Dashboard from "../features/dashboard/pages/Dashboard";
import Students from "../features/students/pages/Students";
import Clubs from "../features/clubs/pages/Clubs";
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
            { path: "leaderboard", element: <Leaderboard isAdmin={true} /> },
            { path: "attendance", element: <AdminAttendance /> }
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
            { path: "ai-agent", element: <AdminAiAgent /> }
        ]
    },
    {
        path: "/pr",
        element: <PrLayout />,
        errorElement: <ErrorBoundary />,
        children: [
            { path: "dashboard", element: <PrDashboard /> },
            { path: "events/:eventId", element: <PrEventManagement /> }
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