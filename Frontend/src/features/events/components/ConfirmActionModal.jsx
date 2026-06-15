import React from 'react';
import '../style/EventModals.scss';

const ConfirmActionModal = ({ title, message, confirmLabel = 'Confirm', onClose, onConfirm, danger = false }) => (
    <div className="modal-overlay">
        <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
                <h2>{title}</h2>
                <button className="close-button" onClick={onClose}><i className="ri-close-line"></i></button>
            </div>
            <div className="modal-body-scrollable">
                <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>{message}</p>
            </div>
            <div className="modal-footer">
                <button className="btn-secondary" onClick={onClose}>Cancel</button>
                <button className={danger ? 'btn-danger' : 'btn-success'} onClick={onConfirm}>{confirmLabel}</button>
            </div>
        </div>
    </div>
);

export default ConfirmActionModal;
