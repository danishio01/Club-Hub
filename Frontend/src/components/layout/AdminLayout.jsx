import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import './AdminLayout.scss';

const AdminLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const verifyAdmin = async () => {
            try {
                await axiosInstance.get('/admin/me');
                setIsCheckingAuth(false);
            } catch (error) {
                console.error(error)
                navigate('/admin/login');
            }
        };
        verifyAdmin();
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await axiosInstance.post('/admin/logout');
            navigate('/admin/login');
        } catch (error) {
            console.error(error)
            console.error('Logout failed');
        }
    };

    const toggleMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMenu = () => {
        setIsMobileMenuOpen(false);
    };

    const navItems = [
        { path: '/admin/dashboard', icon: 'ri-dashboard-line', label: 'Dashboard' },
        { path: '/admin/students', icon: 'ri-group-line', label: 'Students' },
        { path: '/admin/clubs', icon: 'ri-team-line', label: 'Clubs' },
        { path: '/admin/events', icon: 'ri-calendar-event-line', label: 'Events' },
        { path: '/admin/leaderboard', icon: 'ri-trophy-line', label: 'Leaderboard' },
        { path: '/admin/attendance', icon: 'ri-calendar-check-line', label: 'Attendance' },
        { path: '/admin/ai-agent', icon: 'ri-robot-2-line', label: 'AI Assistant' }
    ];

    if (isCheckingAuth) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Verifying Admin Access...</div>;
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
                {navItems.map((item) => (
                    <NavLink key={item.path} to={item.path} onClick={closeMenu} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        <i className={item.icon}></i>
                        {item.label}
                    </NavLink>
                ))}
                <button className="nav-link" onClick={() => { closeMenu(); handleLogout(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: '#dc2626' }}>
                    <i className="ri-logout-box-r-line"></i> Logout
                </button>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;