import React, { useState } from 'react';
import '../style/EventModals.scss';

const RejectEventModal = ({ onClose, onConfirm }) => {
    const [reason, setReason] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedReason = reason.trim();
        
        if (!trimmedReason) {
            alert("A valid rejection reason is required.");
            return;
        }
        
        onConfirm(trimmedReason);
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
                            <label style={{ color: '#dc2626' }}>Reason for Rejection *</label>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 12px 0', lineHeight: 1.5 }}>
                                This reason will be visible to the Club President so they can correct and resubmit the event structure. Cannot be empty.
                            </p>
                            <textarea 
                                rows="5" 
                                required 
                                value={reason} 
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="E.g., The main auditorium is already booked on this date. Please select an alternate venue or reschedule."
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