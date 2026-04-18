import React, { useState } from 'react';
import { updateClubService } from '../service/clubService';
import '../style/ClubModals.scss';

const EditClubModal = ({ club, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: club?.name || '',
        description: club?.description || '',
        isActive: club?.isActive ?? true
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await updateClubService(club._id, formData);
            onSuccess();
        } catch (error) {
            console.error(error);
            alert('Failed to update club.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <h2>Edit Club</h2>
                    <button className="close-button" onClick={onClose}><i className="ri-close-line"></i></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Club Name</label>
                            <input type="text" name="name" required value={formData.name} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea name="description" rows="4" required value={formData.description} onChange={handleChange}></textarea>
                        </div>
                        <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                            <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} style={{ width: 'auto' }} />
                            <label style={{ margin: 0 }}>Active Club</label>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            {isLoading ? 'Updating...' : 'Update Club'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditClubModal;