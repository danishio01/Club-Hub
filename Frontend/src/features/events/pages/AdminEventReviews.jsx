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

    const reviewEvents = events.filter(e => e.status === 'pending_admin');
    const inProgressEvents = events.filter(e => e.status === 'review' || e.status === 'pending_president');
    const approvedEvents = events.filter(e => e.status === 'approved' || e.status === 'completed' || e.status === 'Completed');
    const rejectedEvents = events.filter(e => e.status === 'rejected' || e.status === 'banner_rejected' || e.status === 'president_rejected');

    const renderEventGrid = (data, emptyText, highlightClass = '') => {
        if (data.length === 0) return <div className="empty-state">{emptyText}</div>;

        return (
            <div className="reviews-grid">
                {data.map(event => {
                    const formattedDate = new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                    
                    let displayStatus = event.status;
                    if (event.status === 'pending_admin') displayStatus = 'Pending Admin Review (Flyer & Details)';
                    if (event.status === 'review') displayStatus = 'Waiting For Grafik Flyer';
                    if (event.status === 'pending_president') displayStatus = 'Pending President Review';
                    if (event.status === 'banner_rejected') displayStatus = 'Flyer Rejected (Needs Fix)';
                    if (event.status === 'rejected') displayStatus = 'Event Rejected (Needs Fix)';
                    if (event.status === 'president_rejected') displayStatus = 'Proposal Rejected By President';

                    return (
                        <div key={event._id} className={`review-card ${highlightClass}`}>
                            <div className="card-header">
                                <span className="club-badge">{event.club?.name || 'Deleted Club'}</span>
                                <span className={`status-badge ${event.status.toLowerCase()}`}>
                                    {displayStatus}
                                </span>
                            </div>
                            <h3 className="event-title">{event.title}</h3>
                            <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '10px' }}>
                                <i className="ri-user-line"></i> Created by <strong>{event.creator?.name || 'Unknown'}</strong> ({event.creator?.usn || 'N/A'}) as <strong style={{ textTransform: 'capitalize' }}>{event.creator?.role || 'N/A'}</strong>
                            </div>
                            <p className="event-desc">{event.description}</p>
                            
                            {(event.status === 'rejected' || event.status === 'banner_rejected') && event.rejectedReason && (
                                <div className="rejection-reason">
                                    <strong>Rejection Reason:</strong> {event.rejectedReason}
                                </div>
                            )}
                            
                            <div className="meta-grid">
                                <div><i className="ri-calendar-line"></i> {formattedDate}</div>
                                <div><i className="ri-time-line"></i> {event.time}</div>
                                <div style={{ gridColumn: 'span 2' }}><i className="ri-map-pin-line"></i> {event.venue}</div>
                            </div>

                            <button className="btn-primary full-width" onClick={() => navigate(`/admin/events/${event._id}`)}>
                                <i className="ri-eye-line"></i> View Lifecycle Details
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
                <h1>Event Approval History & Tracker</h1>
                <p>Track all institutional events through their entire lifecycle from creation to approval.</p>
            </div>

            {reviewEvents.length > 0 && (
                <div className="section-block">
                    <h2><i className="ri-time-line"></i> Pending Admin Final Approval</h2>
                    {renderEventGrid(reviewEvents, "No pending events.", "highlight-pending")}
                </div>
            )}

            {inProgressEvents.length > 0 && (
                <div className="section-block">
                    <h2><i className="ri-loader-4-line"></i> In Progress (President / Grafik Working)</h2>
                    {renderEventGrid(inProgressEvents, "No events in progress.", "highlight-in-progress")}
                </div>
            )}

            {rejectedEvents.length > 0 && (
                <div className="section-block">
                    <h2><i className="ri-close-circle-line"></i> Rejected (Waiting For Fixes)</h2>
                    {renderEventGrid(rejectedEvents, "No rejected events.", "highlight-rejected")}
                </div>
            )}

            {approvedEvents.length > 0 && (
                <div className="section-block">
                    <h2><i className="ri-check-double-line"></i> Approved / Published Events</h2>
                    {renderEventGrid(approvedEvents, "No approved events.")}
                </div>
            )}

            {events.length === 0 && (
                <div className="empty-state">
                    <i className="ri-inbox-line" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}></i>
                    <h3>No Event History</h3>
                    <p>No events have been submitted into the system yet.</p>
                </div>
            )}
        </div>
    );
};

export default AdminEventReviews;