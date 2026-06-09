import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGrafikEventsApi } from '../../events/service/eventService';
import '../style/GrafikGalleriesList.scss';

const GrafikGalleriesList = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadEvents = useCallback(async () => {
        try {
            const data = await getGrafikEventsApi();
            setEvents(data.filter(e => e.status === 'completed' || e.status === 'Completed'));
        } catch (error) {
            console.error("Failed to load completed events:", error);
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

    return (
        <div className="grafik-galleries-list-page">
            <div className="header-section">
                <h1>Post-Event Galleries</h1>
                <p>Curate and manage official photo galleries for completed events.</p>
            </div>
            
            {isLoading ? (
                <div className="loading-state">Loading completed events...</div>
            ) : events.length === 0 ? (
                <div className="placeholder-container">
                    <i className="ri-camera-off-fill placeholder-icon"></i>
                    <h2>No Completed Events Yet</h2>
                    <p>Only events that have successfully concluded will appear here for gallery curation.</p>
                </div>
            ) : (
                <div className="grafik-grid">
                    {events.map(event => (
                        <div key={event._id} className="grafik-card gallery-card">
                            <div className="card-info">
                                <div className="card-header-row">
                                    <span className="club-badge">{event.club?.name}</span>
                                    <span className="status-badge success">Completed</span>
                                </div>
                                <h3>{event.title}</h3>
                                <p><i className="ri-calendar-line"></i> {new Date(event.date).toLocaleDateString()}</p>
                                
                                <div className="gallery-stats">
                                    <span className="stat-label">Gallery Status</span>
                                    <span className="stat-value">
                                        <i className="ri-image-2-fill"></i> {event.gallery ? event.gallery.length : 0} Photos
                                    </span>
                                </div>
                            </div>
                            
                            <div className="card-actions">
                                <button 
                                    className="btn-manage gallery-btn" 
                                    onClick={() => navigate(`/grafik/events/${event._id}/gallery`)}
                                >
                                    <i className="ri-camera-lens-fill"></i> Manage Gallery
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GrafikGalleriesList;