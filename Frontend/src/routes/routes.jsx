import { createBrowserRouter } from "react-router-dom";
import AdminLogin from "../features/auth/pages/AdminLogin";
import AdminLayout from "../components/layout/AdminLayout";
import Dashboard from "../features/dashboard/pages/Dashboard";
import Students from "../features/students/pages/Students";
import Clubs from "../features/clubs/pages/Clubs";

export const routes = createBrowserRouter([
    {
        path: "/",
        element: <AdminLogin />,
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
                element: <div>Events Management (Coming Soon)</div>
            }
        ]
    }
]);