import React from 'react';
import { useStudentEvents } from '../hooks/useStudentEvents';
import '../style/StudentEvents.scss';

const EventCard = ({ event, onRegister, formatDate }) => (
    <div className="event-card">
        <div className="event-card-header">
            <div className="event-club">{event.club?.name || 'Campus Club'}</div>
            <h3 className="event-title">{event.title}</h3>
            <div className="event-tags">
                {event.tags.map(tag => (
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
            <button className="btn-primary" onClick={() => onRegister(event._id)}>
                Register Now
            </button>
        </div>
    </div>
);

const StudentEvents = () => {
    const { isLoading, recommendedEvents, otherEvents, handleRegister, formatDate } = useStudentEvents();

    if (isLoading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading campus events...</div>;
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
                            <EventCard key={event._id} event={event} onRegister={handleRegister} formatDate={formatDate} />
                        ))}
                    </div>
                </section>
            )}

            <section className="events-section">
                <div className="section-header">
                    <h2><i className="ri-compass-3-line" style={{ color: '#3b82f6' }}></i> Explore More Events</h2>
                    <p>Discover everything else happening around the campus.</p>
                </div>
                {otherEvents.length === 0 && recommendedEvents.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                        No upcoming events at the moment. Check back later!
                    </div>
                ) : (
                    <div className="events-grid">
                        {otherEvents.map(event => (
                            <EventCard key={event._id} event={event} onRegister={handleRegister} formatDate={formatDate} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default StudentEvents;