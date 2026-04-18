import { createBrowserRouter } from "react-router-dom";
import AdminLogin from "../features/auth/pages/AdminLogin";
import StudentLogin from "../features/auth/pages/StudentLogin";
import AdminLayout from "../components/layout/AdminLayout";
import StudentLayout from "../components/layout/StudentLayout";
import Dashboard from "../features/dashboard/pages/Dashboard";
import Students from "../features/students/pages/Students";
import Clubs from "../features/clubs/pages/Clubs";
import Events from "../features/events/pages/Events";
import Profile from "../features/profile/pages/Profile";
import StudentEvents from "../features/studentEvents/pages/StudentEvents";

const PlaceholderComponent = ({ title }) => (
    <div style={{ padding: '24px' }}>
        <h1>{title}</h1>
        <p>Integration coming next!</p>
    </div>
);

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
                path: "leaderboard",
                element: <PlaceholderComponent title="Campus Leaderboard" />
            },
            {
                path: "certificates",
                element: <PlaceholderComponent title="My Certificates" />
            },
            {
                path: "profile",
                element: <Profile />
            }
        ]
    }
]);