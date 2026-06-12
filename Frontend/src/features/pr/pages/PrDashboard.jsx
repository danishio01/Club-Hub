import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../api/axiosInstance';
import '../style/PrDashboard.scss';
import useRealtimeEventRefresh from '../../events/hooks/useRealtimeEventRefresh';

const PrDashboard = () => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const initializeEvents = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await axiosInstance.get('/events');
            setEvents(res.data.data.filter(e => e.status === 'approved'));
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);
    useRealtimeEventRefresh(initializeEvents);

    useEffect(() => {
        axiosInstance.get('/events')
            .then((res) => setEvents(res.data.data.filter(e => e.status === 'approved')))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <div className="pr-dashboard-page">
            <div className="header-section">
                <h1>Attendance Operations & Promotion</h1>
                <p>View approved promotional materials and manage student attendance for active events.</p>
            </div>

            {isLoading ? (
                <div className="loading-state">Loading active events...</div>
            ) : events.length === 0 ? (
                <div className="empty-state">No approved active events currently require attendance management.</div>
            ) : (
                <div className="events-grid">
                    {events.map(event => (
                        <div key={event._id} className="pr-event-card">
                            {event.bannerUrl ? (
                                <div className="card-banner">
                                    <img src={event.bannerUrl} alt="Event Promotion" />
                                </div>
                            ) : (
                                <div className="card-banner placeholder">
                                    <i className="ri-image-line"></i>
                                    <span>No Promotional Banner</span>
                                </div>
                            )}
                            
                            <div className="card-content-wrapper">
                                <div className="card-info">
                                    <h3>{event.title}</h3>
                                    <p><i className="ri-user-line"></i> {event.creator?.name || 'Unknown'} ({event.creator?.role || 'N/A'})</p>
                                    <p><i className="ri-map-pin-line"></i> {event.venue}</p>
                                    <p><i className="ri-time-line"></i> {event.time}</p>
                                </div>
                                <button className="btn-manage-trigger" onClick={() => navigate(`/pr/events/${event._id}`)}>
                                    <i className="ri-group-line"></i> Open Ops Dashboard
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PrDashboard;
