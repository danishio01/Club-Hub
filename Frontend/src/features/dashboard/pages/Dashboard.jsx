import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getDashboardData } from '../service/dashboardService';
import '../style/Dashboard.scss';

const Dashboard = () => {
    const dispatch = useDispatch();
    const { stats, isLoading } = useSelector((state) => state.dashboard);

    useEffect(() => {
        dispatch(getDashboardData());
    }, [dispatch]);

    if (isLoading || !stats) {
        return <div>Loading platform statistics...</div>;
    }

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <h1 className="page-title">Platform Overview</h1>
                <p className="page-subtitle">Summary of all club activities and engagement.</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon"><i className="ri-group-line"></i></div>
                    <div className="stat-details">
                        <span className="stat-label">Total Students</span>
                        <span className="stat-value">{stats.totalStudents}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon"><i className="ri-team-line"></i></div>
                    <div className="stat-details">
                        <span className="stat-label">Total Clubs</span>
                        <span className="stat-value">{stats.totalClubs}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon"><i className="ri-calendar-event-line"></i></div>
                    <div className="stat-details">
                        <span className="stat-label">Total Events</span>
                        <span className="stat-value">{stats.totalEvents}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon"><i className="ri-user-star-line"></i></div>
                    <div className="stat-details">
                        <span className="stat-label">Event Participation</span>
                        <span className="stat-value">{stats.totalParticipation}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon"><i className="ri-medal-line"></i></div>
                    <div className="stat-details">
                        <span className="stat-label">Most Active Club</span>
                        <span className="stat-value" style={{ fontSize: '1.2rem' }}>{stats.mostActiveClub}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;