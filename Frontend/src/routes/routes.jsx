import { createBrowserRouter } from "react-router-dom";
import AdminLogin from "../features/auth/pages/AdminLogin";

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
        path: "/admin/dashboard",
        element: <div>Admin Dashboard Workspace (To be developed)</div>,
    }
]);