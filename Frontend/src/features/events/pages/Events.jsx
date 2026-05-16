import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getEventsList } from '../service/eventService';
import AddEventModal from '../components/AddEventModal';
import '../../students/style/Students.scss';

const EventTable = ({ data, navigate }) => (
    <div className="table-container">
        <table className="data-table">
            <thead>
                <tr>
                    <th>Status</th>
                    <th>Date & Time</th>
                    <th>Event Name</th>
                    <th>Venue</th>
                    <th>Type</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {data.map(event => (
                    <tr key={event._id}>
                        <td>
                            <span style={{ 
                                padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                                backgroundColor: event.status === 'approved' ? '#dcfce7' : event.status === 'review' ? '#fef08a' : event.status === 'rejected' ? '#fee2e2' : '#f1f5f9',
                                color: event.status === 'approved' ? '#166534' : event.status === 'review' ? '#854d0e' : event.status === 'rejected' ? '#991b1b' : '#475569',
                                border: `1px solid ${event.status === 'approved' ? '#bbf7d0' : event.status === 'review' ? '#fde047' : event.status === 'rejected' ? '#fecaca' : '#cbd5e1'}`
                            }}>
                                {event.status}
                            </span>
                        </td>
                        <td>
                            <div style={{ fontWeight: 500 }}>{new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{event.time}</div>
                        </td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{event.title}</td>
                        <td>{event.venue}</td>
                        <td>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, backgroundColor: event.eventType === 'Free' ? '#eff6ff' : '#f1f5f9', color: event.eventType === 'Free' ? '#1d4ed8' : '#0f172a' }}>
                                {event.eventType === 'Paid' ? `₹${event.price}` : 'Free'}
                            </span>
                        </td>
                        <td>
                            <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#0f172a' }} onClick={() => navigate(`/president/events/${event._id}`)}>
                                View Details
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const Events = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { events, isLoading } = useSelector((state) => state.events);
    const { user } = useSelector((state) => state.auth);
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const hasClub = !!user?.clubName;

    const loadEvents = useCallback(() => {
        dispatch(getEventsList());
    }, [dispatch]);

    useEffect(() => {
        if (hasClub) loadEvents();
    }, [loadEvents, hasClub]);

    const handleSuccess = () => {
        setIsAddModalOpen(false);
        loadEvents();
    };

    if (user?.role === 'president' && !hasClub) {
        return (
            <div className="students-page">
                <div style={{ padding: '40px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', textAlign: 'center' }}>
                    <i className="ri-error-warning-line" style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}></i>
                    <h2>Club is not assigned</h2>
                    <p>You cannot view or manage events until a system administrator links you to an active club.</p>
                </div>
            </div>
        );
    }

    if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading your events...</div>;

    const reviewEvents = events.filter(e => e.status === 'review');
    const upcomingEvents = events.filter(e => e.status === 'approved');
    const rejectedEvents = events.filter(e => e.status === 'rejected');
    const completedEvents = events.filter(e => e.status === 'completed' || e.status === 'Completed');

    return (
        <div className="students-page" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="page-header-actions">
                <div className="title-section">
                    <h1>Event Management</h1>
                    <p>Manage submissions, approvals, and analytics for <strong>{user.clubName}</strong>.</p>
                </div>
                <div className="action-buttons">
                    <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
                        <i className="ri-calendar-event-line"></i> Create New Event
                    </button>
                </div>
            </div>

            {events.length === 0 && (
                <div style={{ padding: '60px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <h3 style={{ color: '#0f172a' }}>No Events Found</h3>
                    <p style={{ color: '#64748b' }}>Start by creating your first event submission for review.</p>
                </div>
            )}

            {rejectedEvents.length > 0 && (
                <div>
                    <h2 style={{ fontSize: '1.25rem', color: '#dc2626', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><i className="ri-error-warning-fill"></i> Rejected Submissions</h2>
                    <EventTable data={rejectedEvents} navigate={navigate} />
                </div>
            )}

            {reviewEvents.length > 0 && (
                <div>
                    <h2 style={{ fontSize: '1.25rem', color: '#854d0e', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><i className="ri-time-fill"></i> Pending Review</h2>
                    <EventTable data={reviewEvents} navigate={navigate} />
                </div>
            )}

            {upcomingEvents.length > 0 && (
                <div>
                    <h2 style={{ fontSize: '1.25rem', color: '#16a34a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><i className="ri-calendar-check-fill"></i> Approved Upcoming Events</h2>
                    <EventTable data={upcomingEvents} navigate={navigate} />
                </div>
            )}

            {completedEvents.length > 0 && (
                <div>
                    <h2 style={{ fontSize: '1.25rem', color: '#475569', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><i className="ri-flag-2-fill"></i> Completed Events</h2>
                    <EventTable data={completedEvents} navigate={navigate} />
                </div>
            )}

            {isAddModalOpen && <AddEventModal onClose={() => setIsAddModalOpen(false)} onSuccess={handleSuccess} />}
        </div>
    );
};

export default Events;