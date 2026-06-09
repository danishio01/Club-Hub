import React, { useEffect, useState } from 'react';
import { getPrCompletedEventsApi } from '../../events/service/eventService';
import ImageLightbox from '../../../components/common/ImageLightbox';
import '../style/PrEventGallery.scss';

const PrEventGallery = () => {
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

    if (isLoading) return <div className="pr-gallery-page"><div className="loading-state">Loading official event galleries...</div></div>;

    return (
        <div className="pr-gallery-page">
            <div className="header-section">
                <h1>Official Event Galleries</h1>
                <p>Access high-quality post-event photos curated by the Grafik Team for promotional use.</p>
            </div>

            {selectedEvent ? (
                <div className="gallery-view">
                    <div className="gallery-view-header">
                        <button className="btn-secondary" onClick={closeGallery}>
                            <i className="ri-arrow-left-line"></i> Back to Albums
                        </button>
                        <div>
                            <h2>{selectedEvent.title}</h2>
                            <p>Organized by {selectedEvent.club?.name}</p>
                        </div>
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
                            <div key={event._id} className="album-card" onClick={() => openGallery(event)}>
                                <div className="album-cover">
                                    <img src={event.gallery[0].url} alt="Album Cover" />
                                    <div className="photo-count">
                                        <i className="ri-image-2-fill"></i> {event.gallery.length} Photos
                                    </div>
                                </div>
                                <div className="album-info">
                                    <h3>{event.title}</h3>
                                    <p>{new Date(event.date).toLocaleDateString()}</p>
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