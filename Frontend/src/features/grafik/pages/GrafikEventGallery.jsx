import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGrafikEventByIdApi, uploadGalleryImageApi, deleteGalleryImageApi } from '../../events/service/eventService';
import ImageLightbox from '../../../components/common/ImageLightbox';
import '../style/GrafikEventGallery.scss';

const GrafikEventGallery = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    
    const [event, setEvent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    
    const [uploadQueue, setUploadQueue] = useState([]);
    const [uploadedImages, setUploadedImages] = useState([]);
    
    const [lightboxImage, setLightboxImage] = useState(null);

    const loadEventDetails = useCallback(async () => {
        try {
            const data = await getGrafikEventByIdApi(eventId);
            setEvent(data);
            if (data.gallery) setUploadedImages(data.gallery);
        } catch (error) {
            console.error(error);
            alert("Failed to load event gallery.");
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

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const newQueueItems = files.map(file => ({
            file,
            previewUrl: URL.createObjectURL(file)
        }));

        setUploadQueue(prev => [...prev, ...newQueueItems]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFromQueue = (indexToRemove) => {
        setUploadQueue(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const submitUploadQueue = async () => {
        if (uploadQueue.length === 0) return;
        setIsUploading(true);
        
        for (const item of uploadQueue) {
            try {
                const base64Image = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (err) => reject(err);
                    reader.readAsDataURL(item.file);
                });
                
                const updatedGallery = await uploadGalleryImageApi(eventId, base64Image);
                setUploadedImages(updatedGallery);
            } catch (error) {
                console.error("Upload failed for file:", item.file.name, error);
                alert(`Failed to upload ${item.file.name}`);
            }
        }
        
        setUploadQueue([]);
        setIsUploading(false);
    };

    const handleDelete = async (fileId) => {
        if (!window.confirm("Are you sure you want to permanently delete this photo?")) return;
        
        setDeletingId(fileId);
        try {
            const updatedGallery = await deleteGalleryImageApi(eventId, fileId);
            setUploadedImages(updatedGallery);
        } catch (error) {
            console.error("Delete failed:", error);
            alert("Failed to delete photo.");
        } finally {
            setDeletingId(null);
        }
    };

    if (isLoading) return <div className="loading-state">Loading Event Gallery...</div>;
    if (!event) return null;

    if (event.status !== 'completed') {
        return (
            <div className="grafik-gallery-page">
                <div className="error-banner">
                    <i className="ri-error-warning-fill"></i>
                    Galleries can only be curated for completed events.
                </div>
                <button className="btn-secondary" onClick={() => navigate('/grafik/dashboard')}>Back to Dashboard</button>
            </div>
        );
    }

    const formattedDate = new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="grafik-gallery-page">
            <div className="page-header">
                <button className="btn-secondary" onClick={() => navigate('/grafik/dashboard')}>
                    <i className="ri-arrow-left-line"></i> Back to Dashboard
                </button>
                <div className="title-row">
                    <h1>Post-Event Gallery Management</h1>
                    <span className="club-chip">{event.club?.name}</span>
                </div>
                <p>Curate the official photo gallery for <strong>{event.title}</strong>.</p>
            </div>

            <div className="management-grid">
                <div className="event-info-panel">
                    <h2>Event Details Reference</h2>
                    <div className="info-list">
                        <div className="info-item">
                            <span className="label">Title</span>
                            <span className="value">{event.title}</span>
                        </div>
                        <div className="info-item">
                            <span className="label">Description</span>
                            <span className="value desc">{event.description}</span>
                        </div>
                    </div>
                    <div className="info-grid">
                        <div className="info-item">
                            <span className="label">Date</span>
                            <span className="value">{formattedDate}</span>
                        </div>
                        <div className="info-item">
                            <span className="label">Venue</span>
                            <span className="value">{event.venue}</span>
                        </div>
                    </div>
                </div>

                <div className="banner-control-panel">
                    <h2>Official Event Banner</h2>
                    <div className="full-event-banner-container">
                        {event.bannerUrl ? (
                            <img src={event.bannerUrl} alt="Event Banner" className="banner-image" onClick={() => setLightboxImage(event.bannerUrl)} />
                        ) : (
                            <div className="empty-preview">
                                <i className="ri-image-line"></i>
                                <span>No Banner Available</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="gallery-workspace">
                <div className="upload-panel">
                    <div className="upload-box" onClick={!isUploading ? handleUploadClick : undefined}>
                        <i className={isUploading ? "ri-loader-4-line spin" : "ri-upload-cloud-2-line"}></i>
                        <h3>Select Photos to Upload</h3>
                        <p>Click to browse files. Multi-selection is supported.</p>
                        <input 
                            type="file" 
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            disabled={isUploading}
                        />
                    </div>
                </div>

                {uploadQueue.length > 0 && (
                    <div className="queue-panel">
                        <div className="queue-header">
                            <h3><i className="ri-gallery-upload-line"></i> Selected for Upload ({uploadQueue.length})</h3>
                            <button className="btn-primary" onClick={submitUploadQueue} disabled={isUploading}>
                                {isUploading ? 'Uploading...' : 'Confirm Upload'}
                            </button>
                        </div>
                        <div className="photos-grid">
                            {uploadQueue.map((item, index) => (
                                <div key={index} className="photo-card preview">
                                    <img src={item.previewUrl} alt="Upload Preview" />
                                    <button 
                                        className="btn-delete-photo" 
                                        onClick={(e) => { e.stopPropagation(); removeFromQueue(index); }}
                                        disabled={isUploading}
                                    >
                                        <i className="ri-close-line"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="gallery-display-panel">
                    <div className="gallery-display-header">
                        <h2>Live Gallery Content ({uploadedImages.length})</h2>
                    </div>
                    <div className="photos-grid">
                        {uploadedImages.length === 0 ? (
                            <div className="empty-gallery">
                                <i className="ri-image-2-line"></i>
                                <p>No photos uploaded yet for this event.</p>
                            </div>
                        ) : (
                            uploadedImages.map(img => (
                                <div key={img.fileId} className="photo-card" onClick={() => setLightboxImage(img.url)}>
                                    <img src={img.url} alt="Event Moment" />
                                    <button 
                                        className="btn-delete-photo" 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(img.fileId); }}
                                        disabled={deletingId === img.fileId}
                                    >
                                        <i className={deletingId === img.fileId ? "ri-loader-4-line spin" : "ri-delete-bin-line"}></i>
                                    </button>
                                </div>
                            ))
                        )}
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

export default GrafikEventGallery;