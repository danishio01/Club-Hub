import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/PresidentDashboard.scss';

const PresidentDashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="president-dashboard">
            <div className="welcome-banner">
                <div className="banner-content">
                    <h1>President Command Center</h1>
                    <p>Oversee your club's operations, manage events, and leverage AI insights seamlessly.</p>
                </div>
                <i className="ri-vip-crown-2-fill banner-icon"></i>
            </div>

            <div className="action-grid">
                <div className="action-card" onClick={() => navigate('/president/events')}>
                    <div className="icon-wrapper events-icon">
                        <i className="ri-calendar-event-fill"></i>
                    </div>
                    <h3>Event Management</h3>
                    <p>Create, edit, and track all upcoming and completed events.</p>
                </div>

                <div className="action-card" onClick={() => navigate('/president/ai-agent')}>
                    <div className="icon-wrapper ai-icon">
                        <i className="ri-robot-2-fill"></i>
                    </div>
                    <h3>AI Assistant</h3>
                    <p>Automate emails, summarize feedback, and organize tasks.</p>
                </div>
            </div>
        </div>
    );
};

export default PresidentDashboard;