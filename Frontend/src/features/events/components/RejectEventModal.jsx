import React, { useState } from 'react';
import '../style/EventModals.scss';

const RejectEventModal = ({ onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [rejectType, setRejectType] = useState('banner');

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedReason = reason.trim();
        
        if (!trimmedReason) {
            alert("A valid rejection reason is required.");
            return;
        }
        
        onConfirm({ reason: trimmedReason, rejectType });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container" style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2>Reject Event Submission</h2>
                    <button className="close-button" onClick={onClose}><i className="ri-close-line"></i></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label style={{ color: '#0f172a' }}>Rejection Target *</label>
                            <select 
                                value={rejectType} 
                                onChange={(e) => setRejectType(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '16px' }}
                            >
                                <option value="banner">Reject Banner Design (Returns to Grafik)</option>
                                <option value="event">Reject Entire Event Details (Returns to President)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label style={{ color: '#dc2626' }}>Reason for Rejection *</label>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 12px 0', lineHeight: 1.5 }}>
                                This reason will be visible to the responsible team so they can correct and resubmit. Cannot be empty.
                            </p>
                            <textarea 
                                rows="5" 
                                required 
                                value={reason} 
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={rejectType === 'banner' ? "E.g., The banner text is illegible, please upload a clearer version." : "E.g., The main auditorium is already booked. Reschedule."}
                                style={{ borderColor: '#fca5a5', width: '100%', resize: 'vertical' }}
                            ></textarea>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-danger" style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#dc2626', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                            Confirm Rejection
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RejectEventModal;