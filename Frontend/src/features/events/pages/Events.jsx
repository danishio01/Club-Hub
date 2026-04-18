import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getEventsList, deleteEventService } from '../service/eventService';
import AddEventModal from '../components/AddEventModal';
import EditEventModal from '../components/EditEventModal';
import '../../students/style/Students.scss';

const Events = () => {
    const dispatch = useDispatch();
    const { events, isLoading } = useSelector((state) => state.events);
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);

    const loadEvents = () => {
        dispatch(getEventsList());
    };

    useEffect(() => {
        loadEvents();
    }, [dispatch]);

    const handleDelete = async (id) => {
        if(window.confirm('Are you sure you want to delete this event?')) {
            try {
                await deleteEventService(id);
                loadEvents();
            } catch (error) {
                console.error(error);
                alert('Failed to delete event.');
            }
        }
    };

    const handleSuccess = () => {
        setIsAddModalOpen(false);
        setEditingEvent(null);
        loadEvents();
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    return (
        <div className="students-page">
            <div className="page-header-actions">
                <div className="title-section">
                    <h1>Event Management</h1>
                    <p>Create and manage club events, venues, and scheduling.</p>
                </div>
                <div className="action-buttons">
                    <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
                        <i className="ri-calendar-event-line"></i> Create Event
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date & Time</th>
                            <th>Event Name</th>
                            <th>Club</th>
                            <th>Venue</th>
                            <th>Type</th>
                            <th>Capacity</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="7" style={{textAlign: 'center'}}>Loading data...</td></tr>
                        ) : events.length === 0 ? (
                            <tr><td colSpan="7" style={{textAlign: 'center'}}>No events scheduled.</td></tr>
                        ) : (
                            events.map(event => (
                                <tr key={event._id}>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{formatDate(event.date)}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{event.time}</div>
                                    </td>
                                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{event.title}</td>
                                    <td>{event.club?.name || 'Deleted Club'}</td>
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
                                    <td>{event.maxParticipants}</td>
                                    <td>
                                        <button className="action-icon" title="View Registrations">
                                            <i className="ri-group-line"></i>
                                        </button>
                                        <button className="action-icon edit" onClick={() => setEditingEvent(event)} title="Edit Event">
                                            <i className="ri-pencil-line"></i>
                                        </button>
                                        <button className="action-icon delete" onClick={() => handleDelete(event._id)} title="Delete Event">
                                            <i className="ri-delete-bin-line"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isAddModalOpen && <AddEventModal onClose={() => setIsAddModalOpen(false)} onSuccess={handleSuccess} />}
            {editingEvent && <EditEventModal event={editingEvent} onClose={() => setEditingEvent(null)} onSuccess={handleSuccess} />}
        </div>
    );
};

export default Events;