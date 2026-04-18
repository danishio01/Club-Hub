import React, { useState } from 'react';
import { bulkUpdateService } from '../service/studentService';
import '../style/StudentModals.scss';

const BulkEditModal = ({ onClose, onSuccess }) => {
    const [criteria, setCriteria] = useState({ department: '', semester: '', section: '' });
    const [updateData, setUpdateData] = useState({ semester: '', section: '' });
    const [isLoading, setIsLoading] = useState(false);

    const handleCriteriaChange = (e) => setCriteria({ ...criteria, [e.target.name]: e.target.value });
    const handleUpdateChange = (e) => setUpdateData({ ...updateData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const activeCriteria = Object.fromEntries(Object.entries(criteria).filter(([, v]) => v !== ''));
        const activeUpdateData = Object.fromEntries(Object.entries(updateData).filter(([, v]) => v !== ''));

        if (Object.keys(activeCriteria).length === 0) {
            return alert('Please select at least one Target Group criteria.');
        }
        if (Object.keys(activeUpdateData).length === 0) {
            return alert('Please select at least one New Value to apply.');
        }

        setIsLoading(true);
        try {
            await bulkUpdateService(activeCriteria, activeUpdateData);
            onSuccess();
        } catch (error) {
            console.error(error);
            alert('Failed to bulk update students.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <h2>Bulk Edit Students</h2>
                    <button className="close-button" onClick={onClose}><i className="ri-close-line"></i></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>1. Select Target Group</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Department</label>
                                <select name="department" value={criteria.department} onChange={handleCriteriaChange}>
                                    <option value="">Any</option>
                                    <option value="CSE">CSE</option>
                                    <option value="CSE-AIML">CSE-AIML</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Semester</label>
                                <select name="semester" value={criteria.semester} onChange={handleCriteriaChange}>
                                    <option value="">Any</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => <option key={sem} value={sem}>{sem}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Section</label>
                                <select name="section" value={criteria.section} onChange={handleCriteriaChange}>
                                    <option value="">Any</option>
                                    {['A', 'B', 'C', 'D'].map(sec => <option key={sec} value={sec}>{sec}</option>)}
                                </select>
                            </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />

                        <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>2. Apply New Values</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Advance to Semester</label>
                                <select name="semester" value={updateData.semester} onChange={handleUpdateChange}>
                                    <option value="">Do not change</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => <option key={sem} value={sem}>{sem}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Change to Section</label>
                                <select name="section" value={updateData.section} onChange={handleUpdateChange}>
                                    <option value="">Do not change</option>
                                    {['A', 'B', 'C', 'D'].map(sec => <option key={sec} value={sec}>{sec}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            {isLoading ? 'Updating...' : 'Update Batch'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BulkEditModal;