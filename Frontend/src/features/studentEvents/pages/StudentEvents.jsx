import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentEvents } from '../hooks/useStudentEvents';
import { useSelector } from 'react-redux';
import '../style/StudentEvents.scss';

const EventCard = ({ event, formatDate }) => {
    const navigate = useNavigate();

    return (
        <div className="event-card">
            <div className="event-card-header">
                <div className="event-club">{event?.club?.name || 'Campus Club'}</div>
                <h3 className="event-title">{event?.title}</h3>
                <div className="event-tags">
                    {event?.tags?.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                    ))}
                </div>
            </div>
            <div className="event-card-body">
                <p className="event-description">{event.description}</p>
                <div className="event-details-grid">
                    <div className="detail-item">
                        <i className="ri-calendar-line"></i>
                        {formatDate(event.date)}
                    </div>
                    <div className="detail-item">
                        <i className="ri-time-line"></i>
                        {event.time}
                    </div>
                    <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                        <i className="ri-map-pin-line"></i>
                        {event.venue}
                    </div>
                </div>
            </div>
            <div className="event-card-footer">
                <div className={`event-price ${event.eventType === 'Free' ? 'price-free' : 'price-paid'}`}>
                    {event.eventType === 'Free' ? 'Free' : `₹${event.price}`}
                </div>
                <button className="btn-primary" onClick={() => navigate(`/student/events/${event._id}`)}>
                    View Event
                </button>
            </div>
        </div>
    );
};

const StudentEvents = () => {
    // Correctly extract 'events' alongside the other properties
    const { isLoading, events, formatDate } = useStudentEvents();
    const { user } = useSelector((state) => state.auth);

    if (isLoading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading campus events...</div>;
    }

    // Double safe check for crash prevention
    const safeEvents = Array.isArray(events) ? events : [];

    const registeredEvents = safeEvents.filter(e => e.isRegistered);
    const nonRegisteredEvents = safeEvents.filter(e => !e.isRegistered);
    
    const userInterests = user?.interests || [];
    const recommendedEvents = nonRegisteredEvents.filter(e => 
        e.tags && Array.isArray(e.tags) && e.tags.some(tag => userInterests.includes(tag))
    );
    const otherEvents = nonRegisteredEvents.filter(e => 
        !e.tags || !Array.isArray(e.tags) || !e.tags.some(tag => userInterests.includes(tag))
    );

    if (safeEvents.length === 0) {
        return (
            <div className="student-events-page">
                <div style={{ padding: '60px 40px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <i className="ri-calendar-event-line" style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: '16px', display: 'block' }}></i>
                    <h2 style={{ color: '#0f172a', marginBottom: '8px' }}>No Upcoming Events</h2>
                    <p style={{ color: '#64748b', margin: 0 }}>There are no events scheduled by any clubs at the moment. Check back later!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="student-events-page">
            {registeredEvents.length > 0 && (
                <section className="events-section">
                    <div className="section-header">
                        <h2><i className="ri-checkbox-circle-fill" style={{ color: '#16a34a' }}></i> Registered Events</h2>
                        <p>Events you have successfully registered for. Don't forget to mark attendance!</p>
                    </div>
                    <div className="events-grid">
                        {registeredEvents.map(event => (
                            <EventCard key={event._id} event={event} formatDate={formatDate} />
                        ))}
                    </div>
                </section>
            )}

            {recommendedEvents.length > 0 && (
                <section className="events-section">
                    <div className="section-header">
                        <h2><i className="ri-star-smile-line" style={{ color: '#eab308' }}></i> Recommended For You</h2>
                        <p>Available events matching your selected campus interests.</p>
                    </div>
                    <div className="events-grid">
                        {recommendedEvents.map(event => (
                            <EventCard key={event._id} event={event} formatDate={formatDate} />
                        ))}
                    </div>
                </section>
            )}

            {otherEvents.length > 0 && (
                <section className="events-section">
                    <div className="section-header">
                        <h2><i className="ri-compass-3-line" style={{ color: '#3b82f6' }}></i> Explore More Events</h2>
                        <p>Discover everything else happening around the campus.</p>
                    </div>
                    <div className="events-grid">
                        {otherEvents.map(event => (
                            <EventCard key={event._id} event={event} formatDate={formatDate} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default StudentEvents;