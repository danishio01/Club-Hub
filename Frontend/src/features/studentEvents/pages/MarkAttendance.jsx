import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { markAttendanceApi } from '../service/studentEventsService';

const MarkAttendance = () => {
    const { eventId } = useParams();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [status, setStatus] = useState('processing'); 
    const [message, setMessage] = useState('Recording your scan...');

    useEffect(() => {
        const recordAttendance = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Invalid QR Code. No token provided.');
                return;
            }

            try {
                const response = await markAttendanceApi(eventId, token);
                setStatus('success');
                setMessage(response.message);
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Failed to process QR scan. Please try again.');
            }
        };

        recordAttendance();
    }, [eventId, token]);

    return (
        <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center', padding: '40px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            
            {status === 'processing' && (
                <div>
                    <i className="ri-loader-4-line" style={{ fontSize: '3rem', color: '#3b82f6', display: 'inline-block', animation: 'spin 1s linear infinite' }}></i>
                    <h2 style={{ marginTop: '16px', color: '#0f172a' }}>Processing...</h2>
                </div>
            )}

            {status === 'success' && (
                <div>
                    <div style={{ width: '80px', height: '80px', background: '#fef08a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <i className="ri-qr-scan-2-line" style={{ fontSize: '3rem', color: '#854d0e' }}></i>
                    </div>
                    <h2 style={{ color: '#854d0e', marginBottom: '8px' }}>QR Scanned!</h2>
                </div>
            )}

            {status === 'error' && (
                <div>
                    <div style={{ width: '80px', height: '80px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <i className="ri-close-line" style={{ fontSize: '3rem', color: '#dc2626' }}></i>
                    </div>
                    <h2 style={{ color: '#dc2626', marginBottom: '8px' }}>Scan Failed</h2>
                </div>
            )}

            <p style={{ color: '#475569', fontSize: '1.1rem', marginBottom: '24px' }}>{message}</p>

            {status === 'success' ? (
                <button 
                    onClick={() => navigate(`/student/events/${eventId}`)}
                    style={{ padding: '12px 24px', background: '#9333ea', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem', cursor: 'pointer', fontWeight: 500 }}
                >
                    Continue to Review
                </button>
            ) : (
                <button 
                    onClick={() => navigate('/student/dashboard')}
                    style={{ padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem', cursor: 'pointer', fontWeight: 500 }}
                >
                    Return to Dashboard
                </button>
            )}

            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default MarkAttendance;