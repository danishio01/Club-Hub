import { createBrowserRouter } from "react-router-dom";
import AdminLogin from "../features/auth/pages/AdminLogin";
import StudentLogin from "../features/auth/pages/StudentLogin";
import AdminLayout from "../components/layout/AdminLayout";
import StudentLayout from "../components/layout/StudentLayout";
import Dashboard from "../features/dashboard/pages/Dashboard";
import Students from "../features/students/pages/Students";
import Clubs from "../features/clubs/pages/Clubs";
import Events from "../features/events/pages/Events";
import EventDetails from "../features/events/pages/EventDetails";
import Profile from "../features/profile/pages/Profile";
import StudentEvents from "../features/studentEvents/pages/StudentEvents";
import StudentEventDetails from "../features/studentEvents/pages/StudentEventDetails";
import MarkAttendance from "../features/studentEvents/pages/MarkAttendance";

export const routes = createBrowserRouter([
    {
        path: "/",
        element: <StudentLogin />,
    },
    {
        path: "/admin/login",
        element: <AdminLogin />,
    },
    {
        path: "/admin",
        element: <AdminLayout />,
        children: [
            {
                path: "dashboard",
                element: <Dashboard />
            },
            {
                path: "students",
                element: <Students />
            },
            {
                path: "clubs",
                element: <Clubs />
            },
            {
                path: "events",
                element: <Events />
            },
            {
                path: "events/:eventId",
                element: <EventDetails />
            }
        ]
    },
    {
        path: "/student",
        element: <StudentLayout />,
        children: [
            {
                path: "dashboard",
                element: <StudentEvents />
            },
            {
                path: "events/:eventId",
                element: <StudentEventDetails />
            },
            {
                path: "attendance/:eventId",
                element: <MarkAttendance />
            },
            {
                path: "leaderboard",
                element: (
                    <div style={{ padding: '24px' }}>
                        <h1>Campus Leaderboard</h1>
                        <p>Integration coming next!</p>
                    </div>
                )
            },
            {
                path: "certificates",
                element: (
                    <div style={{ padding: '24px' }}>
                        <h1>My Certificates</h1>
                        <p>Integration coming next!</p>
                    </div>
                )
            },
            {
                path: "profile",
                element: <Profile />
            }
        ]
    }
]);