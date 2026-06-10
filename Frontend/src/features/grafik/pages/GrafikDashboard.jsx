import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGrafikEventsApi } from '../../events/service/eventService';
import '../style/GrafikDashboard.scss';

const GrafikDashboard = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadEvents = useCallback(async () => {
        try {
            const data = await getGrafikEventsApi();
            setEvents(data);
        } catch (error) {
            console.error("Failed to load Grafik events:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        
        const fetchInitialData = async () => {
            if (isMounted) await loadEvents();
        };

        fetchInitialData();
        
        return () => {
            isMounted = false;
        };
    }, [loadEvents]);

    const renderEventCard = (event, badgeClass, statusLabel) => (
        <div key={event._id} className="grafik-card">
            <div className="card-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="club-badge">{event.club?.name}</span>
                    <span className={`status-badge ${badgeClass}`}>{statusLabel}</span>
                </div>
                <h3>{event.title}</h3>
                <p><i className="ri-user-line"></i> {event.creator?.name || 'Unknown'} ({event.creator?.role || 'N/A'})</p>
                <p><i className="ri-calendar-line"></i> {new Date(event.date).toLocaleDateString()}</p>
            </div>
            
            {event.bannerUrl ? (
                <div className="banner-preview">
                    <img src={event.bannerUrl} alt="Banner" />
                </div>
            ) : (
                <div className="banner-preview empty">
                    <i className="ri-image-line"></i>
                    <span>No Banner</span>
                </div>
            )}

            <div className="card-actions">
                <button 
                    className="btn-manage" 
                    onClick={() => navigate(`/grafik/events/${event._id}/banner`)}
                >
                    <i className="ri-image-edit-line"></i> Manage Banner
                </button>
            </div>
        </div>
    );

    const pendingCreation = events.filter(e => e.status === 'review');
    const pendingAdmin = events.filter(e => e.status === 'pending_admin');
    const rejectedBanners = events.filter(e => e.status === 'banner_rejected');
    const approved = events.filter(e => e.status === 'approved');

    return (
        <div className="grafik-dashboard-page">
            <div className="header-section">
                <h1>Grafik Operations Dashboard</h1>
                <p>Track your assignments and manage upcoming event banners.</p>
            </div>
            
            {isLoading ? (
                <div className="loading-state">Loading dashboard data...</div>
            ) : pendingCreation.length === 0 && pendingAdmin.length === 0 && rejectedBanners.length === 0 && approved.length === 0 ? (
                <div className="placeholder-container">
                    <i className="ri-image-edit-fill placeholder-icon"></i>
                    <h2>All Caught Up!</h2>
                    <p>No active events require banner management at this time.</p>
                </div>
            ) : (
                <div className="dashboard-sections">
                    {rejectedBanners.length > 0 && (
                        <div className="section-block">
                            <h2 className="section-title error"><i className="ri-error-warning-fill"></i> Rejected Banners</h2>
                            <div className="grafik-grid">
                                {rejectedBanners.map(e => renderEventCard(e, 'rejected', 'Fix Required'))}
                            </div>
                        </div>
                    )}

                    {pendingCreation.length > 0 && (
                        <div className="section-block">
                            <h2 className="section-title primary"><i className="ri-magic-line"></i> Pending Banner Creation</h2>
                            <div className="grafik-grid">
                                {pendingCreation.map(e => renderEventCard(e, 'pending', 'Needs Banner'))}
                            </div>
                        </div>
                    )}

                    {pendingAdmin.length > 0 && (
                        <div className="section-block">
                            <h2 className="section-title warning"><i className="ri-time-line"></i> Pending Admin Review</h2>
                            <div className="grafik-grid">
                                {pendingAdmin.map(e => renderEventCard(e, 'waiting', 'Under Review'))}
                            </div>
                        </div>
                    )}

                    {approved.length > 0 && (
                        <div className="section-block">
                            <h2 className="section-title success"><i className="ri-check-double-line"></i> Published & Upcoming</h2>
                            <div className="grafik-grid">
                                {approved.map(e => renderEventCard(e, 'success', 'Approved'))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GrafikDashboard;
