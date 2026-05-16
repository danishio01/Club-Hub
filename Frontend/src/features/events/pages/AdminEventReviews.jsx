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
    const approvedEvents = events.filter(e => e.status === 'approved' || e.status === 'completed' || e.status === 'Completed');
    const rejectedEvents = events.filter(e => e.status === 'rejected');

    const renderEventGrid = (data, emptyText, highlightClass = '') => {
        if (data.length === 0) return <div className="empty-state">{emptyText}</div>;

        return (
            <div className="reviews-grid">
                {data.map(event => {
                    const formattedDate = new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                    return (
                        <div key={event._id} className={`review-card ${highlightClass}`}>
                            <div className="card-header">
                                <span className="club-badge">{event.club?.name || 'Deleted Club'}</span>
                                <span className={`status-badge ${event.status.toLowerCase()}`}>{event.status}</span>
                            </div>
                            <h3 className="event-title">{event.title}</h3>
                            <p className="event-desc">{event.description}</p>
                            
                            {event.status === 'rejected' && event.rejectedReason && (
                                <div className="rejection-reason">
                                    <strong>Rejection Reason:</strong> {event.rejectedReason}
                                </div>
                            )}
                            
                            <div className="meta-grid">
                                <div><i className="ri-calendar-line"></i> {formattedDate}</div>
                                <div><i className="ri-time-line"></i> {event.time}</div>
                                <div><i className="ri-map-pin-line"></i> {event.venue}</div>
                            </div>

                            <button className="btn-primary full-width" onClick={() => navigate(`/admin/events/${event._id}`)}>
                                <i className="ri-eye-line"></i> View Details
                            </button>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (isLoading) return <div className="admin-reviews-page"><div className="empty-state">Loading Event History...</div></div>;

    return (
        <div className="admin-reviews-page">
            <div className="page-header">
                <h1>Event Approval History</h1>
                <p>Review incoming requests and track previously approved or rejected events.</p>
            </div>

            {reviewEvents.length > 0 && (
                <div className="section-block">
                    <h2><i className="ri-time-line"></i> Pending Reviews</h2>
                    {renderEventGrid(reviewEvents, "No pending events.", "highlight-pending")}
                </div>
            )}

            {approvedEvents.length > 0 && (
                <div className="section-block">
                    <h2><i className="ri-check-double-line"></i> Approved Events</h2>
                    {renderEventGrid(approvedEvents, "No approved events.")}
                </div>
            )}

            {rejectedEvents.length > 0 && (
                <div className="section-block">
                    <h2><i className="ri-close-circle-line"></i> Rejected Events</h2>
                    {renderEventGrid(rejectedEvents, "No rejected events.", "highlight-rejected")}
                </div>
            )}

            {events.length === 0 && (
                <div className="empty-state">
                    <i className="ri-inbox-line" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}></i>
                    <h3>No Event History</h3>
                    <p>No events have been submitted by presidents yet.</p>
                </div>
            )}
        </div>
    );
};

export default AdminEventReviews;