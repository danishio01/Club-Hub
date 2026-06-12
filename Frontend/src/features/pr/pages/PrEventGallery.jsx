import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPrCompletedEventsApi, reviewGalleryApi } from '../../events/service/eventService';
import ImageLightbox from '../../../components/common/ImageLightbox';
import '../style/PrEventGallery.scss';

const PrEventGallery = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [lightboxImage, setLightboxImage] = useState(null);

    useEffect(() => {
        let isMounted = true;
        
        const fetchGalleries = async () => {
            try {
                const data = await getPrCompletedEventsApi();
                if (isMounted) setEvents(data);
            } catch (error) {
                console.error("Failed to load PR galleries:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchGalleries();
        
        return () => { isMounted = false; };
    }, []);

    const openGallery = (event) => {
        setSelectedEvent(event);
    };

    const closeGallery = () => {
        setSelectedEvent(null);
    };

    const reviewGallery = async (event, decision) => {
        const reason = decision === 'rejected' ? window.prompt('Why is this gallery being rejected?') : '';
        if (decision === 'rejected' && !reason?.trim()) return;
        await reviewGalleryApi(event._id, decision, reason);
        setEvents(current => current.map(item => item._id === event._id
            ? { ...item, galleryStatus: decision, galleryRejectionReason: reason || null }
            : item));
    };

    if (isLoading) return <div className="pr-gallery-page"><div className="loading-state">Loading official event galleries...</div></div>;

    return (
        <div className="pr-gallery-page">
            <div className="header-section">
                <h1>Official Event Galleries</h1>
                <p>Access high-quality post-event photos curated by the Grafik Team and prepare social media promotions.</p>
            </div>

            {selectedEvent ? (
                <div className="gallery-view">
                    <div className="gallery-view-header">
                        <button className="btn-secondary" onClick={closeGallery}>
                            <i className="ri-arrow-left-line"></i> Back to Albums
                        </button>
                        <div className="header-details">
                            <h2>{selectedEvent.title}</h2>
                            <p>Organized by {selectedEvent.club?.name}</p>
                        </div>
                        <button 
                            className="btn-primary" 
                            style={{ marginLeft: 'auto' }}
                            onClick={() => navigate(`/pr/events/${selectedEvent._id}/share`)}
                        >
                            <i className="ri-share-forward-line"></i> Create Social Post
                        </button>
                    </div>
                    
                    <div className="photos-grid">
                        {selectedEvent.gallery.map(img => (
                            <div key={img.fileId} className="photo-card" onClick={() => setLightboxImage(img.url)}>
                                <img src={img.url} alt="Event Capture" />
                                <div className="zoom-overlay">
                                    <i className="ri-zoom-in-line"></i>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="albums-grid">
                    {events.length === 0 ? (
                        <div className="empty-state">
                            <i className="ri-camera-off-line"></i>
                            <p>No completed event galleries are currently available.</p>
                        </div>
                    ) : (
                        events.map(event => (
                            <div key={event._id} className="album-card">
                                <div className="album-cover">
                                    <img src={event.gallery[0].url} alt="Album Cover" />
                                    <div className="photo-count">
                                        <i className="ri-image-2-fill"></i> {event.gallery.length} Photos
                                    </div>
                                </div>
                                <div className="album-info">
                                    <h3>{event.title}</h3>
                                    <p>{new Date(event.date).toLocaleDateString()}</p>
                                    <p>Approval: {event.galleryStatus || 'pending'}</p>
                                </div>
                                <div className="album-actions">
                                    <button className="btn-action view" onClick={() => openGallery(event)}>
                                        <i className="ri-eye-line"></i> View Gallery
                                    </button>
                                    <button className="btn-action share" onClick={() => navigate(`/pr/events/${event._id}/share`)}>
                                        <i className="ri-share-forward-line"></i> Create Post
                                    </button>
                                    {event.galleryStatus !== 'approved' && (
                                        <button className="btn-action view" onClick={() => reviewGallery(event, 'approved')}>Approve</button>
                                    )}
                                    {event.galleryStatus !== 'rejected' && (
                                        <button className="btn-action share" onClick={() => reviewGallery(event, 'rejected')}>Reject</button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {lightboxImage && (
                <ImageLightbox 
                    imageUrl={lightboxImage} 
                    onClose={() => setLightboxImage(null)} 
                />
            )}
        </div>
    );
};

export default PrEventGallery;
