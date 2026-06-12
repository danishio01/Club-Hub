import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getEventByIdApi, generateQrTokenApi, getEventRegistrationsApi } from '../../events/service/eventService';
import '../style/PrEventManagement.scss';
import useRealtimeEventRefresh from '../../events/hooks/useRealtimeEventRefresh';

const PrEventManagement = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    
    const [event, setEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [qrUrl, setQrUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const initializeSessionData = useCallback(async () => {
        try {
            const evData = await getEventByIdApi(eventId);
            const regData = await getEventRegistrationsApi(eventId);
            setEvent(evData);
            setRegistrations(regData);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);
    useRealtimeEventRefresh(initializeSessionData);

    useEffect(() => {
        Promise.all([getEventByIdApi(eventId), getEventRegistrationsApi(eventId)])
            .then(([evData, regData]) => {
                setEvent(evData);
                setRegistrations(regData);
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [eventId]);

    const handleManualRefresh = async () => {
        try {
            const regData = await getEventRegistrationsApi(eventId);
            setRegistrations(regData);
        } catch (error) {
            console.error(error);
        }
    };

    const handleGenerateQR = async () => {
        try {
            const token = await generateQrTokenApi(eventId);
            const url = `${window.location.origin}/student/attendance/${eventId}?token=${token}`;
            setQrUrl(url);
        } catch (error) {
            console.error(error);
        }
    };

    if (isLoading) return <div className="loading-state">Loading Session Data...</div>;
    if (!event) return <div className="loading-state">Event not found.</div>;

    return (
        <div className="pr-event-management">
            <button className="btn-secondary" style={{ width: 'fit-content' }} onClick={() => navigate('/pr/dashboard')}>
                <i className="ri-arrow-left-line"></i> Back to Events
            </button>

            <div className="management-header">
                <div>
                    <h1>{event.title}</h1>
                    <p>Attendance Session Control Panel</p>
                    <p>Created by {event.creator?.name || 'Unknown'} ({event.creator?.usn || 'N/A'}) as {event.creator?.role || 'N/A'}</p>
                </div>
                <div className="stats-badge">
                    {registrations.length} / {event.maxParticipants} Registered
                </div>
            </div>

            {event.bannerUrl && (
                <div className="full-event-banner-container">
                    <img src={event.bannerUrl} alt="Approved Event Poster" className="full-event-banner" />
                    <div className="banner-label-overlay"><i className="ri-verified-badge-line"></i> Approved Promotional Material</div>
                </div>
            )}

            <div className="management-grid">
                <div className="qr-panel">
                    <h2>Live Attendance QR</h2>
                    <p>Display this code on a screen or tablet at the door. Students will scan this code using their Student Dashboard to mark attendance.</p>
                    
                    <div className="qr-container">
                        {qrUrl ? (
                            <QRCodeSVG value={qrUrl} size={250} level="H" />
                        ) : (
                            <span className="qr-placeholder">QR Code not generated yet.</span>
                        )}
                    </div>
                    
                    <button className="btn-primary" style={{ width: '100%' }} onClick={handleGenerateQR}>
                        <i className="ri-qr-code-line"></i> {qrUrl ? 'Regenerate Dynamic QR' : 'Generate Door QR Code'}
                    </button>
                </div>

                <div className="registrations-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ margin: 0 }}>Registered Students</h2>
                        <button className="btn-refresh" onClick={handleManualRefresh}>
                            <i className="ri-refresh-line"></i> Refresh
                        </button>
                    </div>

                    {registrations.length === 0 ? (
                        <div className="empty-state">No students have registered yet.</div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Student Details</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registrations.map(reg => (
                                        <tr key={reg._id}>
                                            <td>
                                                <div className="student-name">{reg.student?.name || 'Unknown Student'}</div>
                                                <div className="student-usn">{reg.student?.usn || 'N/A'}</div>
                                            </td>
                                            <td>
                                                <span className={`reg-badge ${reg.status.toLowerCase()}`}>
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
            </div>
        </div>
    );
};

export default PrEventManagement;
