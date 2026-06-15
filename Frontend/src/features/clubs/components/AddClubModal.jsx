import React, { useState, useEffect } from 'react';
import { createClubService } from '../service/clubService';
import axiosInstance from '../../../api/axiosInstance';
import '../style/ClubModals.scss';

const AddClubModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({ name: '', description: '', president: '', specialRole: '', isActive: true });
    const [presidents, setPresidents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchPresidents = async () => {
            try {
                const res = await axiosInstance.get('/clubs/available-students?position=president');
                setPresidents(res.data.data);
            } catch (error) {
                console.error("Failed to load presidents", error);
            }
        };
        fetchPresidents();
    }, []);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const dataToSubmit = { ...formData };
            if (!dataToSubmit.president) delete dataToSubmit.president; // Optional
            
            await createClubService(dataToSubmit);
            onSuccess();
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to add club.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <h2>Create New Club</h2>
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
                        <div className="form-group">
                            <label>Assign President (Optional)</label>
                            <select name="president" value={formData.president} onChange={handleChange}>
                                <option value="">None</option>
                                {presidents.map(p => <option key={p._id} value={p._id}>{p.name} ({p.usn})</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>College-Wide Special Responsibility</label>
                            <select name="specialRole" value={formData.specialRole} onChange={handleChange}>
                                <option value="">Normal Club</option>
                                <option value="pr">Designated PR Club</option>
                                <option value="grafik">Designated Grafik Club</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                            <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} style={{ width: 'auto' }} />
                            <label style={{ margin: 0 }}>Active Club</label>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Create Club'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddClubModal;
