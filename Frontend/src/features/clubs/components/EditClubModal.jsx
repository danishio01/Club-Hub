import React, { useState, useEffect } from 'react';
import { updateClubService } from '../service/clubService';
import axiosInstance from '../../../api/axiosInstance';
import '../style/ClubModals.scss';
import SearchableSelect from '../../../components/common/SearchableSelect';

const EditClubModal = ({ club, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: club?.name || '',
        description: club?.description || '',
        president: club?.president?._id || '',
        isActive: club?.isActive ?? true,
        specialRole: club?.specialRole || ''
    });
    const [presidents, setPresidents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchPresidents = async () => {
            try {
                const res = await axiosInstance.get(`/clubs/available-students?position=president&clubId=${club._id}`);
                const loadedPresidents = res.data.data;
                
                // If current president is not in the list (e.g. role changed), we still want to show them if they exist in club
                if (club?.president && !loadedPresidents.find(p => p._id === club.president._id)) {
                    loadedPresidents.push(club.president);
                }
                
                setPresidents(loadedPresidents);
            } catch (error) {
                console.error("Failed to load presidents", error);
            }
        };
        fetchPresidents();
    }, [club]);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const dataToSubmit = { ...formData };
            if (!dataToSubmit.president) dataToSubmit.president = null; 
            
            await updateClubService(club._id, dataToSubmit);
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
                        <div className="form-group">
                            <label>Assign President (Optional)</label>
                            <SearchableSelect value={formData.president} onChange={(president) => setFormData({ ...formData, president })} placeholder="Search President by name or USN" options={presidents.map((p) => ({ value: p._id, label: `${p.name} (${p.usn || p.email})` }))} />
                        </div>
                        <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                            <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} style={{ width: 'auto' }} />
                            <label style={{ margin: 0 }}>Active Club</label>
                        </div>
                        <div className="form-group">
                            <label>College-Wide Special Responsibility</label>
                            <select name="specialRole" value={formData.specialRole} onChange={handleChange}>
                                <option value="">Normal Club</option>
                                <option value="pr">Designated PR Club</option>
                                <option value="grafik">Designated Grafik Club</option>
                            </select>
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
