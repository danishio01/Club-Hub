import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import './AdminLayout.scss';

const AdminLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;