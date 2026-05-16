import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getDashboardData } from '../../dashboard/service/dashboardService';
import '../style/PresidentDashboard.scss';

const PresidentDashboard = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { stats, isLoading } = useSelector((state) => state.dashboard);

    useEffect(() => {
        dispatch(getDashboardData());
    }, [dispatch]);

    return (
        <div className="president-dashboard">
            <div className="welcome-banner">
                <div className="banner-content">
                    <h1>President Command Center</h1>
                    <p>Oversee operations, manage events, and track metrics for <strong>{stats?.clubName || 'Your Club'}</strong>.</p>
                </div>
                <i className="ri-vip-crown-2-fill banner-icon"></i>
            </div>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '10px' }}>
                <div className="stat-card" style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#64748b', textTransform: 'uppercase' }}>Total Events</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>{isLoading ? '...' : stats?.totalEvents || 0}</p>
                </div>
                <div className="stat-card" style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#64748b', textTransform: 'uppercase' }}>Total Registrations</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#16a34a' }}>{isLoading ? '...' : stats?.totalParticipation || 0}</p>
                </div>
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