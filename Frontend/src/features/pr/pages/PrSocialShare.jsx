import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventByIdApi } from '../../events/service/eventService';
import ImageLightbox from '../../../components/common/ImageLightbox';
import '../style/PrSocialShare.scss';

const PrSocialShare = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    
    const [event, setEvent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImages, setSelectedImages] = useState([]);
    const [lightboxImage, setLightboxImage] = useState(null);

    useEffect(() => {
        let isMounted = true;
        
        const fetchEventDetails = async () => {
            try {
                const data = await getEventByIdApi(eventId);
                if (isMounted) setEvent(data);
            } catch (error) {
                console.error("Failed to load event for sharing:", error);
                if (isMounted) navigate('/pr/galleries');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchEventDetails();
        
        return () => { isMounted = false; };
    }, [eventId, navigate]);

    const handleToggleImage = (url) => {
        setSelectedImages(prev => 
            prev.includes(url) ? prev.filter(i => i !== url) : [...prev, url]
        );
    };

    const handleSelectAll = () => {
        if (event?.gallery) {
            setSelectedImages(event.gallery.map(img => img.url));
        }
    };

    const handleClearSelection = () => {
        setSelectedImages([]);
    };

    const generateTemplates = () => {
        if (!event) return {};

        const eventUrl = `${window.location.origin}/student/events/${event._id}`;
        const dateStr = new Date(event.date).toLocaleDateString();
        const safeClubName = (event.club?.name || 'ClubHub').replace(/\s+/g, '');

        const instagram = `🎉 ✨ Successfully Completed ✨ 🎉\n\n${event.title}\nOrganized by: ${event.club?.name || 'Our Team'}\n📍 Venue: ${event.venue} | 📅 Date: ${dateStr}\n\nThank you to everyone who made this event a grand success! Check out the official gallery on ClubHub!\n\nLink in bio! 🔗\n#ClubHub #${safeClubName} #CollegeEvent #Success`;
        
        const linkedin = `We are thrilled to announce the successful completion of "${event.title}" organized by ${event.club?.name || 'our team'}!\n\nOur students gathered at ${event.venue} on ${dateStr} for an incredible session.\n\nA huge thank you to all participants and organizers for making it happen.\n\nView the full event details and gallery here:\n${eventUrl}\n\n#ClubHub #${safeClubName} #StudentLeadership #CampusLife`;
        
        const whatsapp = `🎉 *${event.title} - Event Completed!* 🎉\n\nOrganized by: ${event.club?.name || 'Our Team'}\nWe had a blast at ${event.venue} on ${dateStr}!\n\nCheck out the official event photos and details on ClubHub:\n${eventUrl}`;
        
        const twitter = `Huge success at "${event.title}" by ${event.club?.name || 'our team'}! 🎉\n\nThanks to everyone who joined us at ${event.venue}.\n\nCheck out the official photo gallery on ClubHub:\n${eventUrl}\n\n#ClubHub #${safeClubName}`;

        return { instagram, linkedin, whatsapp, twitter };
    };

    const handleCopyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            alert("Content copied to clipboard!");
        } catch (err) {
            alert("Failed to copy content. Please select and copy manually.");
        }
    };

    const handleNativeShare = async (platformText) => {
        const eventUrl = `${window.location.origin}/student/events/${eventId}`;
        const fullText = `${platformText}`;

        try {
            const filesArray = [];
            
            if (selectedImages.length > 0 && navigator.canShare) {
                for (const imgUrl of selectedImages) {
                    try {
                        const response = await fetch(imgUrl);
                        const blob = await response.blob();
                        const file = new File([blob], `event_image_${Date.now()}.png`, { type: blob.type });
                        filesArray.push(file);
                    } catch (fetchErr) {
                        console.error("Failed to fetch image for sharing", fetchErr);
                    }
                }
            }

            const shareData = {
                title: event.title,
                text: fullText
            };

            if (filesArray.length > 0 && navigator.canShare && navigator.canShare({ files: filesArray })) {
                shareData.files = filesArray;
            }

            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                throw new Error("Web Share API not supported on this browser.");
            }
        } catch (err) {
            console.error("Native share failed:", err);
            handleCopyToClipboard(fullText);
        }
    };

    if (isLoading) return <div className="pr-social-page"><div className="loading-state">Loading Event Data...</div></div>;
    if (!event) return null;

    const templates = generateTemplates();

    return (
        <div className="pr-social-page">
            <div className="page-header">
                <button className="btn-secondary" onClick={() => navigate(-1)}>
                    <i className="ri-arrow-left-line"></i> Back to Gallery
                </button>
                <div className="title-row">
                    <h1>Social Media Post Creator</h1>
                    <span className="club-chip">{event.club?.name}</span>
                </div>
                <p>Select event photos and generate optimized promotional content for <strong>{event.title}</strong>.</p>
            </div>

            <div className="social-workspace-grid">
                <div className="left-panel">
                    <div className="info-card">
                        <h2>Event Reference</h2>
                        <div className="info-list">
                            <div className="info-item"><strong>Title:</strong> {event.title}</div>
                            <div className="info-item"><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</div>
                            <div className="info-item"><strong>Time:</strong> {event.time}</div>
                            <div className="info-item"><strong>Venue:</strong> {event.venue}</div>
                            <div className="info-item"><strong>Entry Fee:</strong> {event.eventType === 'Free' ? 'Free Entry' : `₹${event.price}`}</div>
                        </div>
                        {event.bannerUrl && (
                            <div className="banner-preview">
                                <strong>Official Banner:</strong>
                                <img src={event.bannerUrl} alt="Event Banner" />
                            </div>
                        )}
                    </div>

                    <div className="gallery-selection-card">
                        <div className="card-header">
                            <h2>Select Photos ({selectedImages.length} chosen)</h2>
                            <div className="selection-actions">
                                <button className="btn-text" onClick={handleSelectAll}>Select All</button>
                                <button className="btn-text danger" onClick={handleClearSelection}>Clear</button>
                            </div>
                        </div>

                        {(!event.gallery || event.gallery.length === 0) ? (
                            <div className="empty-gallery">No photos uploaded by Grafik yet.</div>
                        ) : (
                            <div className="thumbnail-grid">
                                {event.gallery.map(img => {
                                    const isSelected = selectedImages.includes(img.url);
                                    return (
                                        <div 
                                            key={img.fileId} 
                                            className={`thumbnail-card ${isSelected ? 'selected' : ''}`}
                                            onClick={() => handleToggleImage(img.url)}
                                        >
                                            <img src={img.url} alt="Gallery Thumbnail" />
                                            <div className="selection-overlay">
                                                <i className="ri-check-line"></i>
                                            </div>
                                            <button 
                                                className="btn-expand" 
                                                onClick={(e) => { e.stopPropagation(); setLightboxImage(img.url); }}
                                            >
                                                <i className="ri-fullscreen-line"></i>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="right-panel">
                    <h2>Generated Content Templates</h2>
                    <p className="helper-text">Click <strong>Share</strong> to push directly to apps (Mobile/Supported Browsers) or <strong>Copy</strong> to clipboard.</p>
                    
                    <div className="templates-list">
                        <div className="template-card instagram">
                            <div className="platform-header">
                                <i className="ri-instagram-fill"></i> Instagram Format
                            </div>
                            <textarea readOnly value={templates.instagram}></textarea>
                            <div className="card-actions">
                                <button className="btn-outline" onClick={() => handleCopyToClipboard(templates.instagram)}>
                                    <i className="ri-clipboard-line"></i> Copy
                                </button>
                                <button className="btn-solid" onClick={() => handleNativeShare(templates.instagram)}>
                                    <i className="ri-share-forward-line"></i> Share
                                </button>
                            </div>
                        </div>

                        <div className="template-card linkedin">
                            <div className="platform-header">
                                <i className="ri-linkedin-fill"></i> LinkedIn Format
                            </div>
                            <textarea readOnly value={templates.linkedin}></textarea>
                            <div className="card-actions">
                                <button className="btn-outline" onClick={() => handleCopyToClipboard(templates.linkedin)}>
                                    <i className="ri-clipboard-line"></i> Copy
                                </button>
                                <button className="btn-solid" onClick={() => handleNativeShare(templates.linkedin)}>
                                    <i className="ri-share-forward-line"></i> Share
                                </button>
                            </div>
                        </div>

                        <div className="template-card whatsapp">
                            <div className="platform-header">
                                <i className="ri-whatsapp-fill"></i> WhatsApp Format
                            </div>
                            <textarea readOnly value={templates.whatsapp}></textarea>
                            <div className="card-actions">
                                <button className="btn-outline" onClick={() => handleCopyToClipboard(templates.whatsapp)}>
                                    <i className="ri-clipboard-line"></i> Copy
                                </button>
                                <button className="btn-solid" onClick={() => handleNativeShare(templates.whatsapp)}>
                                    <i className="ri-share-forward-line"></i> Share
                                </button>
                            </div>
                        </div>

                        <div className="template-card twitter">
                            <div className="platform-header">
                                <i className="ri-twitter-x-fill"></i> X (Twitter) Format
                            </div>
                            <textarea readOnly value={templates.twitter}></textarea>
                            <div className="card-actions">
                                <button className="btn-outline" onClick={() => handleCopyToClipboard(templates.twitter)}>
                                    <i className="ri-clipboard-line"></i> Copy
                                </button>
                                <button className="btn-solid" onClick={() => handleNativeShare(templates.twitter)}>
                                    <i className="ri-share-forward-line"></i> Share
                                </button>
                            </div>
                        </div>
                    </div>
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

export default PrSocialShare;