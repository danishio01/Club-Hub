import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getEventsList } from '../service/eventService';
import '../style/AdminEventReviews.scss';

const AdminEventReviews = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { events, isLoading } = useSelector((state) => state.events);

    const loadEvents = useCallback(() => {
        dispatch(getEventsList());
    }, [dispatch]);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    const reviewEvents = events.filter(e => e.status === 'review');

    return (
        <div className="admin-reviews-page">
            <div className="page-header">
                <h1>Event Approvals</h1>
                <p>Review event submissions from Club Presidents before they go live on the student portal.</p>
            </div>

            {isLoading ? (
                <div className="empty-state">Fetching pending reviews...</div>
            ) : reviewEvents.length === 0 ? (
                <div className="empty-state">
                    <i className="ri-check-double-line" style={{ fontSize: '3rem', color: '#10b981', display: 'block', marginBottom: '12px' }}></i>
                    <h3>All Caught Up!</h3>
                    <p>There are no pending events waiting for your review.</p>
                </div>
            ) : (
                <div className="reviews-grid">
                    {reviewEvents.map(event => {
                        const formattedDate = new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                        return (
                            <div key={event._id} className="review-card">
                                <div className="card-header">
                                    <span className="club-badge">{event.club?.name || 'Deleted Club'}</span>
                                    <span className="status-badge pending">Pending Review</span>
                                </div>
                                <h3 className="event-title">{event.title}</h3>
                                <p className="event-desc">{event.description}</p>
                                
                                <div className="meta-grid">
                                    <div><i className="ri-calendar-line"></i> {formattedDate}</div>
                                    <div><i className="ri-time-line"></i> {event.time}</div>
                                    <div><i className="ri-map-pin-line"></i> {event.venue}</div>
                                </div>

                                <button className="btn-primary full-width" onClick={() => navigate(`/admin/events/${event._id}`)}>
                                    <i className="ri-eye-line"></i> Review Full Details
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminEventReviews;