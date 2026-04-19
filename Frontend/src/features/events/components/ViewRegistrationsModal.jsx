import React, { useState, useEffect } from 'react';
import { getEventRegistrationsApi } from '../service/eventService';
import '../style/EventModals.scss';

const ViewRegistrationsModal = ({ event, onClose }) => {
    const [registrations, setRegistrations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRegistrations = async () => {
            try {
                const data = await getEventRegistrationsApi(event._id);
                setRegistrations(data);
            } catch (error) {
                console.error('Failed to fetch registrations', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (event) {
            fetchRegistrations();
        }
    }, [event]);

    return (
        <div className="modal-overlay">
            {/* FIX: Increased max-width to allow the table to breathe */}
            <div className="modal-container large" style={{ maxWidth: '1000px', width: '95%' }}>
                <div className="modal-header">
                    <h2>Registrations: {event.title}</h2>
                    <button className="close-button" onClick={onClose}><i className="ri-close-line"></i></button>
                </div>
                <div className="modal-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <span style={{ fontWeight: 500, color: '#0f172a' }}>
                            Total Registered: {registrations.length} / {event.maxParticipants}
                        </span>
                    </div>

                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading registrations...</div>
                    ) : registrations.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No students have registered for this event yet.</div>
                    ) : (
                        <div className="registrations-table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>USN</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Department</th>
                                        <th>Sem/Sec</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registrations.map((reg) => (
                                        <tr key={reg._id}>
                                            <td style={{ fontWeight: 600, color: '#0f172a' }}>{reg.student?.usn}</td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{reg.student?.name}</td>
                                            <td>{reg.student?.email}</td>
                                            <td>{reg.student?.department}</td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{reg.student?.semester} - {reg.student?.section}</td>
                                            <td>
                                                <span className={`reg-status-badge ${reg.status.toLowerCase()}`}>
                                                    {reg.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default ViewRegistrationsModal;