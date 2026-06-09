import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGrafikEventByIdApi, generateBannerApi, uploadCustomBannerApi, approveBannerApi } from '../../events/service/eventService';
import ImageLightbox from '../../../components/common/ImageLightbox';
import '../style/GrafikEventBanner.scss';

const GrafikEventBanner = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    
    const [event, setEvent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lightboxImage, setLightboxImage] = useState(null);

    const loadEventDetails = useCallback(async () => {
        try {
            const data = await getGrafikEventByIdApi(eventId);
            setEvent(data);
        } catch (error) {
            console.error(error);
            alert("Failed to load event details.");
            navigate('/grafik/dashboard');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, navigate]);

    useEffect(() => {
        let isMounted = true;
        const fetchInitialData = async () => {
            if (isMounted) await loadEventDetails();
        };

        fetchInitialData();
        
        return () => {
            isMounted = false;
        };
    }, [loadEventDetails]);

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
    if (!event) return null;

    const formattedDate = new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const isReadOnly = event.status === 'approved' || event.status === 'completed' || event.status === 'pending_admin';

    return (
        <div className="grafik-banner-page">
            <div className="page-header">
                <button className="btn-secondary" onClick={() => navigate('/grafik/dashboard')}>
                    <i className="ri-arrow-left-line"></i> Back to Dashboard
                </button>
                <div className="title-wrapper">
                    <h1>Official Event Banner</h1>
                    <p>Generate, preview, and assign promotional banners for this event.</p>
                </div>
            </div>

            {event.status === 'banner_rejected' && event.rejectedReason && (
                <div className="rejection-banner">
                    <i className="ri-error-warning-fill"></i>
                    <div className="rejection-content">
                        <h3>Banner Design Rejected by Admin</h3>
                        <p>{event.rejectedReason}</p>
                    </div>
                </div>
            )}

            <div className="workspace-layout">
                <div className="event-info-panel">
                    <h2>Event Details Reference</h2>
                    <div className="info-list">
                        <div className="info-item">
                            <div className="label">Title</div>
                            <div className="value">{event.title}</div>
                        </div>
                        <div className="info-item">
                            <div className="label">Organizing Club</div>
                            <div className="value">{event.club?.name}</div>
                        </div>
                        <div className="info-item">
                            <div className="label">Description</div>
                            <div className="value desc">{event.description}</div>
                        </div>
                    </div>
                    
                    <div className="info-grid">
                        <div className="info-item">
                            <div className="label">Date</div>
                            <div className="value">{formattedDate}</div>
                        </div>
                        <div className="info-item">
                            <div className="label">Time</div>
                            <div className="value">{event.time}</div>
                        </div>
                        <div className="info-item">
                            <div className="label">Venue</div>
                            <div className="value">{event.venue}</div>
                        </div>
                        <div className="info-item">
                            <div className="label">Entry / Fee</div>
                            <div className="value">{event.eventType === 'Free' ? 'Free' : `₹${event.price}`}</div>
                        </div>
                    </div>

                    <div className="info-item tags-section">
                        <div className="label">Tags</div>
                        <div className="tag-list">
                            {event.tags?.map(tag => <span key={tag} className="tag">{tag}</span>)}
                        </div>
                    </div>
                </div>

                <div className="banner-control-panel">
                    <h2>Banner Management</h2>
                    <div className="preview-container">
                        {event.bannerUrl ? (
                            <img 
                                src={event.bannerUrl} 
                                alt="Event Banner" 
                                className="banner-image" 
                                onClick={() => setLightboxImage(event.bannerUrl)} 
                            />
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
                                    {event.bannerUrl ? 'Regenerate Automatic Banner' : 'Generate Automatic Banner'}
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

            {lightboxImage && (
                <ImageLightbox 
                    imageUrl={lightboxImage} 
                    onClose={() => setLightboxImage(null)} 
                />
            )}
        </div>
    );
};

export default GrafikEventBanner;