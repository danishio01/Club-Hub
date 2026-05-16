import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../api/axiosInstance';
import '../style/PrDashboard.scss';

const PrDashboard = () => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await axiosInstance.get('/events');
                // PR needs to manage attendance only for ongoing/upcoming events
                setEvents(res.data.data.filter(e => e.status !== 'Completed'));
            } catch(e) {
                console.error("Failed fetching PR events", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvents();
    }, []);

    return (
        <div className="pr-dashboard-page">
            <div className="header-section">
                <h1>Attendance Operations</h1>
                <p>Select an ongoing event to generate the QR code and manage student attendance.</p>
            </div>

            {isLoading ? (
                <div className="loading-state">Loading active events...</div>
            ) : events.length === 0 ? (
                <div className="empty-state">No active events currently require attendance management.</div>
            ) : (
                <div className="events-grid">
                    {events.map(event => (
                        <div key={event._id} className="pr-event-card">
                            <div className="card-info">
                                <h3>{event.title}</h3>
                                <p><i className="ri-map-pin-line"></i> {event.venue}</p>
                                <p><i className="ri-time-line"></i> {event.time}</p>
                            </div>
                            <button className="btn-manage-trigger" onClick={() => navigate(`/pr/events/${event._id}`)}>
                                <i className="ri-group-line"></i> Manage Attendance Session
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PrDashboard;