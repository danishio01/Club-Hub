import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { getStudentEventByIdApi, registerForEventApi, markAttendanceApi, createPaymentOrderApi, verifyPaymentApi } from '../service/studentEventsService';
import '../style/StudentEventDetails.scss';

// Dynamically loads the Razorpay checkout window
const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const StudentEventDetails = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    
    const [event, setEvent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const loadEvent = useCallback(async () => {
        try {
            const data = await getStudentEventByIdApi(eventId);
            setEvent(data);
        } catch (error) {
            console.error(error)
            navigate('/student/dashboard');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, navigate]);

    useEffect(() => {
        const fetchInitialData = async () => {
            await loadEvent();
        };
        fetchInitialData();
    }, [loadEvent]);

    const handleRegister = async () => {
        if(!window.confirm('Do you want to register for this event?')) return;
        
        setIsRegistering(true);

        try {
            if (event.eventType === 'Free') {
                await registerForEventApi(eventId);
                alert('Registered successfully!');
                await loadEvent();
                setIsRegistering(false);
            } else {
                // Paid Event Flow
                const res = await loadRazorpayScript();
                if (!res) {
                    alert('Razorpay SDK failed to load. Are you online?');
                    setIsRegistering(false);
                    return;
                }

                // 1. Get Order ID from backend
                const orderData = await createPaymentOrderApi(eventId);

                // 2. Configure Razorpay Popup
                const options = {
                    key: orderData.key_id, 
                    amount: orderData.amount,
                    currency: orderData.currency,
                    name: "ClubHub",
                    description: `Registration for ${event.title}`,
                    order_id: orderData.id,
                    handler: async function (response) {
                        try {
                            // 3. Verify payment signature on backend
                            await verifyPaymentApi({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            });
                            
                            // 4. Register the student in the database
                            await registerForEventApi(eventId);
                            alert('Payment successful and registered!');
                            await loadEvent();
                        } catch (err) {
                            console.error(err)
                            alert('Payment verification failed. Please contact admin.');
                        }
                    },
                    theme: {
                        color: "#2563eb"
                    }
                };

                const paymentObject = new window.Razorpay(options);
                paymentObject.on('payment.failed', function (response) {
                    console.log(response)
                    alert('Payment failed. Please try again.');
                });
                
                paymentObject.open();
                setIsRegistering(false); 
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to process registration.');
            setIsRegistering(false);
        }
    };

    const handleScan = async (scannedData) => {
        if (scannedData && scannedData.length > 0) {
            const qrText = scannedData[0].rawValue;
            setIsScannerOpen(false);
            
            try {
                const url = new URL(qrText);
                const token = url.searchParams.get('token');
                
                if (!token) return alert('Invalid QR code format.');

                await markAttendanceApi(eventId, token);
                alert('Attendance recorded successfully!');
                await loadEvent(); 
            } catch (error) {
                alert(error.response?.data?.message || 'Failed to mark attendance.');
            }
        }
    };

    if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading event details...</div>;
    if (!event) return null;

    const isFull = event.currentRegistrations >= event.maxParticipants;
    const formattedDate = new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="student-event-details">
            <button className="btn-secondary" style={{ width: 'fit-content' }} onClick={() => navigate('/student/dashboard')}>
                <i className="ri-arrow-left-line"></i> Back to Events
            </button>

            <div className="event-banner">
                <div className="event-banner-info">
                    <div className="club-name">{event.club?.name || 'Campus Club'}</div>
                    <h1>{event.title}</h1>
                    <div style={{ display: 'flex', gap: '16px', color: '#64748b', fontSize: '0.95rem', marginTop: '12px' }}>
                        <span><i className="ri-calendar-line"></i> {formattedDate}</span>
                        <span><i className="ri-time-line"></i> {event.time}</span>
                        <span><i className="ri-map-pin-line"></i> {event.venue}</span>
                    </div>
                </div>
                <div>
                    {event.attendanceStatus === 'Attended' ? (
                        <div className="status-badge status-attended">
                            <i className="ri-checkbox-circle-fill" style={{ fontSize: '1.2rem' }}></i> Attendance Marked
                        </div>
                    ) : event.isRegistered ? (
                        <button className="btn-registered" disabled>
                            <i className="ri-check-double-line"></i> Registered
                        </button>
                    ) : isFull ? (
                        <button className="btn-full" disabled>
                            <i className="ri-forbid-line"></i> Event Full
                        </button>
                    ) : (
                        <button className="btn-primary" onClick={handleRegister} disabled={isRegistering}>
                            {isRegistering ? 'Processing...' : (event.eventType === 'Free' ? 'Register Now' : `Pay ₹${event.price} & Register`)}
                        </button>
                    )}
                </div>
            </div>

            <div className="main-content-grid">
                <div className="description-card">
                    <h2>About the Event</h2>
                    <p className="description-text">{event.description}</p>
                    
                    <h3 style={{ marginTop: '24px', fontSize: '1rem', color: '#0f172a' }}>Event Tags</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                        {event.tags.map(tag => (
                            <span key={tag} style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem', color: '#475569' }}>
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="action-card">
                    <div>
                        <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Entry Fee</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: event.eventType === 'Free' ? '#16a34a' : '#0f172a' }}>
                            {event.eventType === 'Free' ? 'Free' : `₹${event.price}`}
                        </span>
                    </div>
                    
                    <div>
                        <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Capacity</span>
                        <span style={{ fontSize: '1rem', fontWeight: 500, color: '#0f172a' }}>
                            {event.currentRegistrations} / {event.maxParticipants} Spots Filled
                        </span>
                    </div>

                    {event.isRegistered && event.attendanceStatus !== 'Attended' && (
                        <div style={{ marginTop: '16px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '12px', textAlign: 'center' }}>
                                At the venue? Scan the QR code to mark your attendance.
                            </p>
                            <button className="btn-scan" onClick={() => setIsScannerOpen(true)}>
                                <i className="ri-qr-scan-2-line"></i> Scan Attendance QR
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isScannerOpen && (
                <div className="scanner-modal-overlay">
                    <div className="scanner-container">
                        <div className="scanner-header">
                            <h3>Scan QR Code</h3>
                            <button className="close-scanner" onClick={() => setIsScannerOpen(false)}>
                                <i className="ri-close-line"></i>
                            </button>
                        </div>
                        <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
                            <Scanner onScan={handleScan} />
                        </div>
                        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', marginTop: '16px' }}>
                            Point your camera at the QR code displayed by the event organizer.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentEventDetails;