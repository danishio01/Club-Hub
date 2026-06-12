import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutStudent, checkAuthStatus } from '../../features/auth/service/authService';
import NotificationBell from '../..//features/notifications/components/NotificationBell';
import './GrafikLayout.scss';

const GrafikLayout = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, isCheckingAuth } = useSelector((state) => state.auth);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (!user) dispatch(checkAuthStatus());
    }, [dispatch, user]);

    useEffect(() => {
        if (!isCheckingAuth) {
            if (!user) {
                navigate('/', { replace: true });
            } else if (user.role?.toLowerCase() !== 'grafik') {
                const role = user.role?.toLowerCase();
                if (role === 'student') navigate('/student/dashboard', { replace: true });
                else if (role === 'president') navigate('/president/dashboard', { replace: true });
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
            console.error("Grafik Logout Error:", error);
        }
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    if (isCheckingAuth || !user) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Authenticating Grafik Team...</div>;

    return (
        <div className="grafik-layout">
            <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={closeSidebar}></div>
            
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>Grafik Portal</h2>
                    <button className="mobile-close-btn" onClick={closeSidebar}>
                        <i className="ri-close-line"></i>
                    </button>
                </div>
                <nav className="sidebar-nav">
                    <NavLink to="/grafik/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
                        <i className="ri-image-edit-line"></i> Banner Dashboard
                    </NavLink>
                    <NavLink to="/grafik/galleries" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
                        <i className="ri-camera-lens-fill"></i> Event Galleries
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
                        <NotificationBell />
                        <span>{user.name} (Grafik)</span>
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

export default GrafikLayout;