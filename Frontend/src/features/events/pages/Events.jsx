import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getEventsList } from '../service/eventService';
import AddEventModal from '../components/AddEventModal';
import '../../students/style/Students.scss';

const EventTable = ({ data, emptyMessage, isLoading, formatDate, navigate }) => (
    <div className="table-container">
        <table className="data-table">
            <thead>
                <tr>
                    <th>Date & Time</th>
                    <th>Event Name</th>
                    <th>Club</th>
                    <th>Venue</th>
                    <th>Type</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {isLoading ? (
                    <tr><td colSpan="6" style={{textAlign: 'center'}}>Loading data...</td></tr>
                ) : data.length === 0 ? (
                    <tr><td colSpan="6" style={{textAlign: 'center'}}>{emptyMessage}</td></tr>
                ) : (
                    data.map(event => (
                        <tr key={event._id}>
                            <td>
                                <div style={{ fontWeight: 500 }}>{formatDate(event.date)}</div>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{event.time}</div>
                            </td>
                            <td style={{ fontWeight: 600, color: '#0f172a' }}>{event?.title}</td>
                            <td>{event?.club?.name || 'Deleted Club'}</td>
                            <td>{event.venue}</td>
                            <td>
                                <span style={{ 
                                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600,
                                    backgroundColor: event.eventType === 'Free' ? '#dcfce7' : '#fee2e2',
                                    color: event.eventType === 'Free' ? '#166534' : '#991b1b'
                                }}>
                                    {event.eventType === 'Paid' ? `₹${event.price}` : 'Free'}
                                </span>
                            </td>
                            <td>
                                <button 
                                    className="btn-primary" 
                                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                    onClick={() => navigate(`/president/events/${event._id}`)}
                                >
                                    View Details
                                </button>
                            </td>
                        </tr>
                    ))
                )}
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
        loadEvents();
    }, [loadEvents]);

    const handleSuccess = () => {
        setIsAddModalOpen(false);
        loadEvents();
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const upcomingEvents = events.filter(e => e.status !== 'Completed');
    const completedEvents = events.filter(e => e.status === 'Completed');

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

    return (
        <div className="students-page" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="page-header-actions">
                <div className="title-section">
                    <h1>Event Management</h1>
                    <p>Manage club events, registrations, and analytics securely.</p>
                </div>
                <div className="action-buttons">
                    <button className="btn-primary" onClick={() => setIsAddModalOpen(true)} disabled={!hasClub && user?.role === 'president'}>
                        <i className="ri-calendar-event-line"></i> Create Event
                    </button>
                </div>
            </div>

            <div>
                <h2 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '16px' }}>Upcoming Events</h2>
                <EventTable 
                    data={upcomingEvents} 
                    emptyMessage="No upcoming events scheduled." 
                    isLoading={isLoading} 
                    formatDate={formatDate} 
                    navigate={navigate} 
                />
            </div>

            {completedEvents.length > 0 && (
                <div>
                    <h2 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '16px' }}>Completed Events</h2>
                    <EventTable 
                        data={completedEvents} 
                        emptyMessage="No completed events found." 
                        isLoading={isLoading} 
                        formatDate={formatDate} 
                        navigate={navigate} 
                    />
                </div>
            )}

            {isAddModalOpen && <AddEventModal onClose={() => setIsAddModalOpen(false)} onSuccess={handleSuccess} />}
        </div>
    );
};

export default Events;