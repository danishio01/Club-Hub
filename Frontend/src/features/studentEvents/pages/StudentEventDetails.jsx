import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { getStudentEventByIdApi, registerForEventApi, createPaymentOrderApi, verifyPaymentApi, submitReviewApi, markAttendanceApi } from '../service/studentEventsService';
import '../style/StudentEventDetails.scss';

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
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [isReviewSubmitted, setIsReviewSubmitted] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchEventData = async () => {
            try {
                const data = await getStudentEventByIdApi(eventId);
                if (isMounted) setEvent(data);
            } catch (error) {
                console.error("Load Event Details Failed:", error);
                if (isMounted) navigate('/student/dashboard');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        fetchEventData();
        return () => { isMounted = false; };
    }, [eventId, navigate]);

    const reloadEvent = async () => {
        try {
            const data = await getStudentEventByIdApi(eventId);
            setEvent(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleRegister = async () => {
        if(!window.confirm('Do you want to register for this event?')) return;
        setIsRegistering(true);

        try {
            if (event.eventType === 'Free') {
                await registerForEventApi(eventId);
                alert('Registered successfully!');
                await reloadEvent();
                setIsRegistering(false);
            } else {
                const res = await loadRazorpayScript();
                if (!res) {
                    alert('Razorpay SDK failed to load. Are you online?');
                    setIsRegistering(false);
                    return;
                }

                const orderData = await createPaymentOrderApi(eventId);

                const options = {
                    key: orderData.key_id, 
                    amount: orderData.amount,
                    currency: orderData.currency,
                    name: "ClubHub",
                    description: `Registration for ${event?.title}`,
                    order_id: orderData.id,
                    handler: async function (response) {
                        try {
                            await verifyPaymentApi({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            });
                            
                            await registerForEventApi(eventId);
                            alert('Payment successful and registered!');
                            await reloadEvent();
                        } catch (err) {
                            console.error("Payment Verification Event Error:", err);
                            alert('Payment verification failed. Please contact admin.');
                        }
                    },
                    theme: { color: "#2563eb" }
                };

                const paymentObject = new window.Razorpay(options);
                paymentObject.on('payment.failed', function (response) {
                    console.error("Payment Failed Payload:", response);
                    alert('Payment failed. Please try again.');
                });
                
                paymentObject.open();
                setIsRegistering(false); 
            }
        } catch (error) {
            console.error("Registration Setup Error:", error);
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
                alert('QR Scanned! Please submit a review below to finalize your attendance.');
                await reloadEvent(); 
            } catch (error) {
                alert(error.response?.data?.message || 'Failed to mark attendance.');
            }
        }
    };

    const handleReviewSubmit = async () => {
        try {
            await submitReviewApi(eventId, { rating, review: reviewText });
            setIsReviewSubmitted(true);
            alert('Review submitted! Attendance marked and points awarded.');
            await reloadEvent();
        } catch (error) {
            console.error("Review Upload Error:", error);
            alert('Failed to submit review.');
        }
    };

    if (isLoading) return <div className="loading-state">Loading event details...</div>;
    if (!event) return null;

    const isFull = event.currentRegistrations >= event.maxParticipants;
    const formattedDate = new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="student-event-details">
            <button className="btn-secondary" style={{ width: 'fit-content' }} onClick={() => navigate('/student/dashboard')}>
                <i className="ri-arrow-left-line"></i> Back to Events
            </button>

            {event.bannerUrl && (
                <div className="full-event-banner-container">
                    <img src={event.bannerUrl} alt="Event Banner" className="full-event-banner" />
                </div>
            )}

            <div className="event-banner">
                <div className="event-banner-info">
                    <div className="club-name">{event?.club?.name || 'Campus Club'}</div>
                    <h1>{event?.title}</h1>
                    <div className="meta-details">
                        <span><i className="ri-calendar-line"></i> {formattedDate}</span>
                        <span><i className="ri-time-line"></i> {event.time}</span>
                        <span><i className="ri-map-pin-line"></i> {event.venue}</span>
                    </div>
                </div>
                <div>
                    {event.attendanceStatus === 'Attended' ? (
                        <div className="status-badge status-attended">
                            <i className="ri-checkbox-circle-fill"></i> Attendance Marked
                        </div>
                    ) : event.attendanceStatus === 'Scanned' ? (
                        <div className="status-badge pending-review">
                            <i className="ri-error-warning-fill"></i> Pending Review
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
                    
                    <h3 className="tags-title">Event Tags</h3>
                    <div className="tag-list">
                        {event?.tags?.map(tag => (
                            <span key={tag} className="tag">{tag}</span>
                        ))}
                    </div>
                </div>

                <div className="action-card">
                    <div>
                        <span className="action-label">Entry Fee</span>
                        <span className={`action-value ${event.eventType === 'Free' ? 'free' : 'paid'}`}>
                            {event.eventType === 'Free' ? 'Free' : `₹${event.price}`}
                        </span>
                    </div>
                    
                    <div>
                        <span className="action-label">Capacity</span>
                        <span className="action-value capacity">
                            {event.currentRegistrations} / {event.maxParticipants} Spots Filled
                        </span>
                    </div>

                    {event.isRegistered && event.attendanceStatus !== 'Attended' && event.attendanceStatus !== 'Scanned' && (
                        <div className="scanner-trigger-section">
                            <p>At the venue? Scan the QR code displayed by the PR officer.</p>
                            <button className="btn-scan" onClick={() => setIsScannerOpen(true)}>
                                <i className="ri-qr-scan-2-line"></i> Scan Attendance QR
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {event.attendanceStatus === 'Scanned' && !isReviewSubmitted && (
                <div className="review-section">
                    <h3><i className="ri-star-smile-fill"></i> Complete Your Attendance</h3>
                    <p>You have successfully scanned the QR code. Please rate the event and provide a short review to finalize your attendance and earn 100 points!</p>
                    
                    <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                        <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                        <option value="4">⭐⭐⭐⭐ Good</option>
                        <option value="3">⭐⭐⭐ Average</option>
                        <option value="2">⭐⭐ Poor</option>
                        <option value="1">⭐ Terrible</option>
                    </select>
                    
                    <textarea 
                        placeholder="Write a short review about the event..." 
                        value={reviewText} 
                        onChange={(e) => setReviewText(e.target.value)}
                    />
                    
                    <button className="btn-primary" onClick={handleReviewSubmit}>
                        Submit Review & Get Points
                    </button>
                </div>
            )}

            {isScannerOpen && (
                <div className="scanner-modal-overlay">
                    <div className="scanner-container">
                        <div className="scanner-header">
                            <h3>Scan QR Code</h3>
                            <button className="close-scanner" onClick={() => setIsScannerOpen(false)}>
                                <i className="ri-close-line"></i>
                            </button>
                        </div>
                        <div className="scanner-wrapper">
                            <Scanner onScan={handleScan} />
                        </div>
                        <p className="scanner-instructions">
                            Point your camera at the QR code displayed by the PR officer.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentEventDetails;