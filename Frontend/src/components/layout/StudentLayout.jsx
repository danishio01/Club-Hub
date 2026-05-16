import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutStudent, checkAuthStatus } from '../../features/auth/service/authService';
import './StudentLayout.scss';

const StudentLayout = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isCheckingAuth } = useSelector((state) => state.auth);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (!user) dispatch(checkAuthStatus());
    }, [dispatch, user]);

    useEffect(() => {
        if (!isCheckingAuth) {
            if (!user) {
                navigate('/', { replace: true });
            } else if (user.role?.toLowerCase() !== 'student') {
                const role = user.role?.toLowerCase();
                if (role === 'president') navigate('/president/dashboard', { replace: true });
                else if (role === 'pr') navigate('/pr/dashboard', { replace: true });
                else if (role === 'admin') navigate('/admin/dashboard', { replace: true });
                else navigate('/', { replace: true });
            }
        }
    }, [user, isCheckingAuth, navigate]);

    const handleLogout = async () => {
        try {
            await dispatch(logoutStudent());
            navigate('/', { replace: true });
        } catch (error) {
            console.error("Student Logout Error:", error);
        }
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    if (isCheckingAuth || !user) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading Profile...</div>;

    return (
        <div className="student-layout">
            <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={closeSidebar}></div>
            
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>Student Portal</h2>
                    <button className="mobile-close-btn" onClick={closeSidebar}>
                        <i className="ri-close-line"></i>
                    </button>
                </div>
                <nav className="sidebar-nav">
                    <NavLink to="/student/dashboard" className={({ isActive }) => isActive && location.pathname === '/student/dashboard' ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
                        <i className="ri-calendar-event-line"></i> Events Directory
                    </NavLink>
                    <NavLink to="/student/leaderboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
                        <i className="ri-trophy-line"></i> Leaderboard
                    </NavLink>
                    <NavLink to="/student/attendance-report" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
                        <i className="ri-calendar-check-line"></i> Attendance
                    </NavLink>
                    <NavLink to="/student/certificates" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
                        <i className="ri-medal-line"></i> Certificates
                    </NavLink>
                    <NavLink to="/student/profile" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
                        <i className="ri-user-line"></i> Profile
                    </NavLink>
                </nav>
                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={handleLogout}>
                        <i className="ri-logout-box-r-line"></i> Logout
                    </button>
                </div>
            </aside>
            
            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <button className="menu-toggle" onClick={toggleSidebar}>
                            <i className="ri-menu-line"></i>
                        </button>
                    </div>
                    <div className="user-info">
                        <span>Welcome, {user.name}</span>
                        <div className="avatar">{user.name.charAt(0)}</div>
                    </div>
                </header>
                <div className="page-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default StudentLayout;