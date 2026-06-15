import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginSuccess, logoutSuccess, setAuthChecked } from '../../features/auth/state/authSlice';
import axiosInstance from '../../api/axiosInstance';
import NotificationBell from '../..//features/notifications/components/NotificationBell';
import { unregisterCurrentFcmToken } from '../../features/notifications/service/fcmClient';
import './AdminLayout.scss';

const AdminLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isCheckingAuth } = useSelector((state) => state.auth);

    useEffect(() => {
        const verifyAdminSession = async () => {
            try {
                const response = await axiosInstance.get('/staff/me');
                dispatch(loginSuccess(response.data.data));
            } catch (error) {
                console.error("Admin session validation failed", error);
                dispatch(setAuthChecked());
                navigate('/staff/login', { replace: true });
            }
        };

        if (!user) {
            verifyAdminSession();
        }
    }, [dispatch, navigate, user]);

    const handleLogout = async () => {
        try {
            unregisterCurrentFcmToken().catch((error) => console.warn('FCM token cleanup failed during logout:', error));
            await axiosInstance.post('/staff/logout');
            dispatch(logoutSuccess());
            navigate('/staff/login', { replace: true });
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMenu = () => setIsMobileMenuOpen(false);

    const isActiveLink = (path) => {
        if (path.endsWith('/event-approvals') && location.pathname.includes('/events/')) {
            return true;
        }
        return location.pathname === path;
    };

    const isHod = user?.role === 'hod';
    const basePath = isHod ? '/hod' : '/faculty';
    const navItems = [
        { path: `${basePath}/dashboard`, icon: 'ri-dashboard-line', label: 'Dashboard' },
        ...(!isHod ? [{ path: `${basePath}/students`, icon: 'ri-group-line', label: 'Students' }] : []),
        ...(isHod ? [{ path: `${basePath}/faculty-coordinators`, icon: 'ri-user-settings-line', label: 'Faculty Coordinators' }] : []),
        { path: `${basePath}/clubs`, icon: 'ri-team-line', label: 'Clubs' },
        { path: `${basePath}/event-approvals`, icon: 'ri-calendar-check-fill', label: 'Event Approvals' },
        { path: `${basePath}/tasks`, icon: 'ri-task-line', label: 'Work Oversight' },
        { path: `${basePath}/leaderboard`, icon: 'ri-trophy-line', label: 'Leaderboard' },
        { path: `${basePath}/reports`, icon: 'ri-file-list-3-fill', label: 'Report Reviews' },
        { path: `${basePath}/attendance`, icon: 'ri-calendar-check-line', label: 'Master Grid' },
        { path: `${basePath}/profile`, icon: 'ri-user-line', label: 'Profile' }
    ];

    if (isCheckingAuth || !user) {
        return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Authenticating staff session...</div>;
    }

    return (
        <div className="admin-layout">
            <nav className="top-navbar">
                <div className="nav-brand">
                    <img src="https://ik.imagekit.io/p4nbkerbz/ClubHub/applogo.png" alt="Logo" className="nav-logo" />
                    ClubHub {isHod ? 'HOD' : 'Faculty Coordinator'}
                </div>

                <div className="desktop-nav">
                    {navItems.map((item) => (
                        <NavLink key={item.path} to={item.path} className={`nav-link ${isActiveLink(item.path) ? 'active' : ''}`}>
                            <i className={item.icon}></i>
                            {item.label}
                        </NavLink>
                    ))}
                    <button className="nav-link logout-btn-header" onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                        <i className="ri-logout-box-r-line"></i> Logout
                    </button>
                </div>

                <div className="staff-header-tools">
                    <NotificationBell />
                    <button className="mobile-menu-btn" onClick={toggleMenu}><i className="ri-menu-line"></i></button>
                </div>
            </nav>

            <div className={`overlay ${isMobileMenuOpen ? 'show' : ''}`} onClick={closeMenu}></div>

            <aside className={`mobile-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="nav-brand">Menu</div>
                    <button className="close-btn" onClick={closeMenu}>
                        <i className="ri-close-line"></i>
                    </button>
                </div>
                <div className="sidebar-scrollable-nav">
                    {navItems.map((item) => (
                        <NavLink key={item.path} to={item.path} onClick={closeMenu} className={`nav-link ${isActiveLink(item.path) ? 'active' : ''}`}>
                            <i className={item.icon}></i>
                            {item.label}
                        </NavLink>
                    ))}
                    <button className="nav-link" onClick={() => { closeMenu(); handleLogout(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: '#dc2626', marginTop: 'auto' }}>
                        <i className="ri-logout-box-r-line"></i> Logout
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
