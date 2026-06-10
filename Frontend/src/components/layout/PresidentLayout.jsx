import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutStudent, checkAuthStatus } from '../../features/auth/service/authService';
import './PresidentLayout.scss';

const PresidentLayout = () => {
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
            } else if (user.role?.toLowerCase() !== 'president' && !user.isClubMember) {
                const role = user.role?.toLowerCase();
                if (role === 'student') navigate('/student/dashboard', { replace: true });
                else if (role === 'pr') navigate('/pr/dashboard', { replace: true });
                else if (role === 'grafik') navigate('/grafik/dashboard', { replace: true });
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
            console.error("Logout Event Error:", error);
        }
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    const isActiveLink = (path) => {
        if (path === '/president/events' && location.pathname.includes('/events/')) {
            return true;
        }
        return location.pathname === path;
    };

    if (isCheckingAuth || !user) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Authenticating President...</div>;

    const clubLabel = user.clubName ? user.clubName : 'Unassigned';
    const userRoleLabel = user.isClubMember ? 'Club Member' : 'President';

    return (
        <div className="president-layout">
            <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={closeSidebar}></div>
            
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>{clubLabel}</h2>
                    <button className="mobile-close-btn" onClick={closeSidebar}>
                        <i className="ri-close-line"></i>
                    </button>
                </div>
                <nav className="sidebar-nav">
                    <NavLink to="/president/dashboard" className={`nav-item ${isActiveLink('/president/dashboard') ? 'active' : ''}`} onClick={closeSidebar}>
                        <i className="ri-dashboard-line"></i> Overview
                    </NavLink>
                    <NavLink to="/president/events" className={`nav-item ${isActiveLink('/president/events') ? 'active' : ''}`} onClick={closeSidebar}>
                        <i className="ri-calendar-event-line"></i> Event Management
                    </NavLink>
                    {user?.role === 'president' && (
                        <NavLink to="/president/club" className={`nav-item ${isActiveLink('/president/club') ? 'active' : ''}`} onClick={closeSidebar}>
                            <i className="ri-team-line"></i> Club Members
                        </NavLink>
                    )}
                    <NavLink to="/president/ai-agent" className={`nav-item ${isActiveLink('/president/ai-agent') ? 'active' : ''}`} onClick={closeSidebar}>
                        <i className="ri-robot-2-line"></i> AI Assistant
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
                        <span className="club-chip">{clubLabel} {userRoleLabel}</span>
                        <span>{user.name}</span>
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

export default PresidentLayout;