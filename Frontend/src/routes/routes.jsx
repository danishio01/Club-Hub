import { createBrowserRouter } from "react-router-dom";
import AdminLogin from "../features/auth/pages/AdminLogin";
import AdminLayout from "../components/layout/AdminLayout";
import Dashboard from "../features/dashboard/pages/Dashboard";
import Students from "../features/students/pages/Students";

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
                element: <div>Clubs Management (Coming Soon)</div>
            },
            {
                path: "events",
                element: <div>Events Management (Coming Soon)</div>
            }
        ]
    }
]);