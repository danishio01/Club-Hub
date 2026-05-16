import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentEvents } from '../hooks/useStudentEvents';
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
    const { isLoading, recommendedEvents, otherEvents, formatDate } = useStudentEvents();

    if (isLoading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading campus events...</div>;
    }

    if (recommendedEvents.length === 0 && otherEvents.length === 0) {
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
            {recommendedEvents.length > 0 && (
                <section className="events-section">
                    <div className="section-header">
                        <h2><i className="ri-star-smile-line" style={{ color: '#eab308' }}></i> Recommended For You</h2>
                        <p>Events matching your selected campus interests.</p>
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