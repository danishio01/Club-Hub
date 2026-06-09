import React from 'react';
import '../style/GrafikDashboard.scss';

const GrafikDashboard = () => {
    return (
        <div className="grafik-dashboard-page">
            <div className="header-section">
                <h1>Welcome Grafik Team</h1>
                <p>Your central hub for promotional content and banner management.</p>
            </div>
            
            <div className="placeholder-container">
                <i className="ri-image-edit-fill placeholder-icon"></i>
                <h2>Banner Management Module Coming Soon</h2>
                <p>Event updates, poster uploads, and AI banner generation will be available here.</p>
            </div>
        </div>
    );
};

export default GrafikDashboard;