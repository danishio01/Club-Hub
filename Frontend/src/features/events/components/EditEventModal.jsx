import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateEventService } from '../service/eventService';
import { getClubsList } from '../../clubs/service/clubService';
import '../../students/style/StudentModals.scss';
import '../style/EventModals.scss';

const AVAILABLE_TAGS = [
    'Coding', 'Development', 'AI', 'Problem Solving', 'Tech Talk', 
    'Editing', 'Photography', 'Content Creation', 'Games', 'Dance', 
    'Music', 'Entertainment', 'Interaction', 'Social Media', 'Promotion'
];

const EditEventModal = ({ event, onClose, onSuccess }) => {
    const dispatch = useDispatch();
    const { clubs } = useSelector((state) => state.clubs);
    const { user } = useSelector((state) => state.auth);
    
    const [formData, setFormData] = useState({
        title: event?.title || '',
        club: event?.club?._id || '',
        description: event?.description || '',
        tags: event?.tags || [],
        date: event?.date ? event.date.split('T')[0] : '',
        time: event?.time || '',
        venue: event?.venue || '',
        eventType: event?.eventType || 'Free',
        price: event?.price || 0,
        maxParticipants: event?.maxParticipants || ''
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user?.role === 'admin') {
            dispatch(getClubsList());
        }
    }, [dispatch, user]);

    const activeClubs = clubs.filter(c => c.isActive || c._id === formData.club);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleTagChange = (tag) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.includes(tag) 
                ? prev.tags.filter(t => t !== tag) 
                : [...prev.tags, tag]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.tags.length === 0) return alert('Please select at least one tag.');
        
        setIsLoading(true);
        try {
            const dataToSubmit = { ...formData };
            if (user?.role === 'president') {
                delete dataToSubmit.club;
            }
            await updateEventService(event._id, dataToSubmit);
            onSuccess();
        } catch (error) {
            console.error(error);
            alert('Failed to update event.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container large">
                <div className="modal-header">
                    <h2>Edit Event</h2>
                    <button className="close-button" onClick={onClose}><i className="ri-close-line"></i></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Event Name</label>
                                <input type="text" name="title" required value={formData.title} onChange={handleChange} />
                            </div>
                            {user?.role === 'admin' && (
                                <div className="form-group">
                                    <label>Organizing Club</label>
                                    <select name="club" required value={formData.club} onChange={handleChange}>
                                        <option value="">Select Club</option>
                                        {activeClubs.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea name="description" rows="2" required value={formData.description} onChange={handleChange}></textarea>
                        </div>

                        <div className="form-group">
                            <label>Event Tags</label>
                            <div className="tags-grid">
                                {AVAILABLE_TAGS.map(tag => (
                                    <label key={tag} className="tag-checkbox">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.tags.includes(tag)} 
                                            onChange={() => handleTagChange(tag)} 
                                        />
                                        {tag}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Date</label>
                                <input type="date" name="date" required value={formData.date} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Time</label>
                                <input type="time" name="time" required value={formData.time} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Venue</label>
                                <input type="text" name="venue" required value={formData.venue} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Event Type</label>
                                <select name="eventType" required value={formData.eventType} onChange={handleChange}>
                                    <option value="Free">Free</option>
                                    <option value="Paid">Paid</option>
                                </select>
                            </div>
                            {formData.eventType === 'Paid' && (
                                <div className="form-group">
                                    <label>Price (₹)</label>
                                    <input type="number" name="price" min="1" required value={formData.price} onChange={handleChange} />
                                </div>
                            )}
                            <div className="form-group">
                                <label>Max Participants</label>
                                <input type="number" name="maxParticipants" min="1" required value={formData.maxParticipants} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            {isLoading ? 'Updating...' : 'Update Event'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditEventModal;