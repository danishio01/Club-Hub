import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutStudent, checkAuthStatus } from '../../features/auth/service/authService';
import './StudentLayout.scss';

const StudentLayout = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, isCheckingAuth } = useSelector((state) => state.auth);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (!user) {
            dispatch(checkAuthStatus());
        }
    }, [dispatch, user]);

    const handleLogout = async () => {
        await dispatch(logoutStudent());
        navigate('/');
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    if (isCheckingAuth) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Profile...</div>;
    }

    if (!user || user.role !== 'student') {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Unauthorized Access. Please login as a student.</div>;
    }

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
                    <NavLink to="/student/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
                        <i className="ri-calendar-event-line"></i> Dashboard (Events)
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
                    <button className="menu-toggle" onClick={toggleSidebar}>
                        <i className="ri-menu-line"></i>
                    </button>
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