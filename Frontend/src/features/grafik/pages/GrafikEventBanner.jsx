import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGrafikEventByIdApi, generateBannerApi, uploadCustomBannerApi, approveBannerApi } from '../../events/service/eventService';
import '../style/GrafikEventBanner.scss';

const GrafikEventBanner = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    
    const [event, setEvent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchEventDetails = async () => {
            try {
                const data = await getGrafikEventByIdApi(eventId);
                if (isMounted) {
                    setEvent(data);
                }
            } catch (error) {
                console.error(error);
                if (isMounted) {
                    alert("Failed to load event details.");
                    navigate('/grafik/dashboard');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchEventDetails();

        return () => {
            isMounted = false;
        };
    }, [eventId, navigate]);

    const handleGenerate = async () => {
        setIsProcessing(true);
        try {
            const bannerUrl = await generateBannerApi(eventId);
            setEvent(prev => ({ ...prev, bannerUrl }));
        } catch (error) {
            console.error("Generation failed:", error);
            alert("Failed to generate banner.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCustomUpload = async (file) => {
        if (!file) return;
        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const base64Image = e.target.result;
                const bannerUrl = await uploadCustomBannerApi(eventId, base64Image);
                setEvent(prev => ({ ...prev, bannerUrl }));
            } catch (error) {
                console.error("Upload failed:", error);
                alert("Failed to upload custom banner.");
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        setIsProcessing(true);
        try {
            await approveBannerApi(eventId);
            alert("Banner Approved! Event passed to Admin.");
            navigate('/grafik/dashboard');
        } catch (error) {
            console.error("Approval failed:", error);
            alert("Failed to submit banner.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) return <div className="loading-state">Loading Event Management Workspace...</div>;
    if (!event) return <div className="loading-state">Event not found.</div>;

    const formattedDate = new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const isReadOnly = event.status === 'approved' || event.status === 'completed' || event.status === 'pending_admin';

    return (
        <div className="grafik-banner-page">
            <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <button className="btn-secondary" onClick={() => navigate('/grafik/dashboard')}>
                    <i className="ri-arrow-left-line"></i> Back to Dashboard
                </button>
                <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#0f172a' }}>Event Banner Management</h1>
                <p style={{ margin: 0, color: '#64748b' }}>Generate, preview, and assign promotional banners for this event.</p>
            </div>

            {event.status === 'banner_rejected' && event.rejectedReason && (
                <div className="rejection-banner">
                    <i className="ri-error-warning-fill"></i>
                    <div>
                        <h3>Banner Design Rejected by Admin</h3>
                        <p>{event.rejectedReason}</p>
                    </div>
                </div>
            )}

            <div className="management-grid">
                <div className="event-info-panel">
                    <h2>Event Details</h2>
                    <div className="info-block">
                        <span className="label">Title</span>
                        <span className="value">{event.title}</span>
                    </div>
                    <div className="info-block">
                        <span className="label">Organizing Club</span>
                        <span className="value">{event.club?.name}</span>
                    </div>
                    <div className="info-block">
                        <span className="label">Description</span>
                        <span className="value desc">{event.description}</span>
                    </div>
                    
                    <div className="info-grid">
                        <div className="info-block">
                            <span className="label">Date</span>
                            <span className="value">{formattedDate}</span>
                        </div>
                        <div className="info-block">
                            <span className="label">Time</span>
                            <span className="value">{event.time}</span>
                        </div>
                        <div className="info-block">
                            <span className="label">Venue</span>
                            <span className="value">{event.venue}</span>
                        </div>
                        <div className="info-block">
                            <span className="label">Entry / Fee</span>
                            <span className="value">{event.eventType === 'Free' ? 'Free' : `₹${event.price}`}</span>
                        </div>
                    </div>

                    <div className="info-block" style={{ marginTop: '16px' }}>
                        <span className="label">Tags</span>
                        <div className="tag-list">
                            {event.tags?.map(tag => <span key={tag} className="tag">{tag}</span>)}
                        </div>
                    </div>
                </div>

                <div className="banner-control-panel">
                    <h2>Banner Management</h2>
                    <div className="full-event-banner-container">
                        {event.bannerUrl ? (
                            <img src={event.bannerUrl} alt="Event Banner" className="full-event-banner" />
                        ) : (
                            <div className="empty-preview">
                                <i className="ri-image-add-line"></i>
                                <span>No Banner Set</span>
                            </div>
                        )}
                    </div>

                    {!isReadOnly && (
                        <div className="action-buttons">
                            <div className="generation-options">
                                <button className="btn-ai" onClick={handleGenerate} disabled={isProcessing}>
                                    <i className={isProcessing ? "ri-loader-4-line spin" : "ri-magic-line"}></i> 
                                    {event.bannerUrl ? 'Regenerate Different Theme' : 'Generate Automatic Banner'}
                                </button>
                                
                                <button className="btn-upload" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                                    <i className="ri-upload-cloud-2-line"></i> 
                                    Upload Manual File
                                </button>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    ref={fileInputRef}
                                    onChange={(e) => handleCustomUpload(e.target.files[0])}
                                />
                            </div>

                            {event.bannerUrl && (
                                <button className="btn-submit" onClick={handleSubmit} disabled={isProcessing}>
                                    <i className="ri-check-double-line"></i> Submit Banner for Review
                                </button>
                            )}
                        </div>
                    )}
                    
                    {isReadOnly && (
                        <div className="readonly-notice">
                            <i className="ri-lock-line"></i> This event banner is currently locked for review or has already been published.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GrafikEventBanner;