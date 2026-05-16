import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginSuccess, setAuthChecked } from '../../features/auth/state/authSlice';
import axiosInstance from '../../api/axiosInstance';
import './AdminLayout.scss';

const AdminLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, isCheckingAuth } = useSelector((state) => state.auth);

    useEffect(() => {
        const verifyAdminSession = async () => {
            try {
                const response = await axiosInstance.get('/admin/me');
                dispatch(loginSuccess({ ...response.data.data, role: 'admin' }));
            } catch (error) {
                console.error("Admin session validation failed", error);
                dispatch(setAuthChecked());
                navigate('/admin/login', { replace: true });
            }
        };

        if (!user) {
            verifyAdminSession();
        }
    }, [dispatch, navigate, user]);

    const handleLogout = async () => {
        try {
            await axiosInstance.post('/admin/logout');
            navigate('/admin/login', { replace: true });
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMenu = () => setIsMobileMenuOpen(false);

    const navItems = [
        { path: '/admin/dashboard', icon: 'ri-dashboard-line', label: 'Dashboard' },
        { path: '/admin/students', icon: 'ri-group-line', label: 'Students' },
        { path: '/admin/clubs', icon: 'ri-team-line', label: 'Clubs' },
        { path: '/admin/event-approvals', icon: 'ri-calendar-check-fill', label: 'Event Approvals' },
        { path: '/admin/reports', icon: 'ri-file-list-3-fill', label: 'Report Reviews' },
        { path: '/admin/leaderboard', icon: 'ri-trophy-line', label: 'Leaderboard' },
        { path: '/admin/attendance', icon: 'ri-calendar-check-line', label: 'Master Grid' }
    ];

    if (isCheckingAuth || !user) {
        return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Authenticating Admin Session...</div>;
    }

    return (
        <div className="admin-layout">
            <nav className="top-navbar">
                <div className="nav-brand">
                    <img src="https://ik.imagekit.io/p4nbkerbz/ClubHub/image.png?updatedAt=1776478146181" alt="Logo" className="nav-logo" />
                    ClubHub Admin
                </div>

                <div className="desktop-nav">
                    {navItems.map((item) => (
                        <NavLink key={item.path} to={item.path} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <i className={item.icon}></i>
                            {item.label}
                        </NavLink>
                    ))}
                    <button className="nav-link logout-btn-header" onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                        <i className="ri-logout-box-r-line"></i> Logout
                    </button>
                </div>

                <button className="mobile-menu-btn" onClick={toggleMenu}>
                    <i className="ri-menu-line"></i>
                </button>
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
                        <NavLink key={item.path} to={item.path} onClick={closeMenu} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
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