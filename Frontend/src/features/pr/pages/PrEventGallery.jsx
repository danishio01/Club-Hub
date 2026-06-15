import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageLightbox from '../../../components/common/ImageLightbox';
import '../style/PrEventGallery.scss';
import { takeOverTaskApi } from '../../tasks/service/taskService';
import { useSelector } from 'react-redux';
import { formatDate } from '../../../utils/dateFormat';
import useAuthorizedTasks from '../../tasks/hooks/useAuthorizedTasks';

const PrEventGallery = () => {
    const navigate = useNavigate();
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [lightboxImage, setLightboxImage] = useState(null);
    const { user } = useSelector((state) => state.auth);
    const { tasks, isLoading, refresh } = useAuthorizedTasks({ type: 'social_media', specialRole: 'pr' });
    const events = tasks.map((task) => task.event).filter((event) => event?.status === 'completed');

    const getSocialTask = (eventId) => tasks.find((task) => task.event?._id === eventId);
    const isPrPresident = user?.role === 'president' && user?.specialClubRole === 'pr';

    const takeOver = async (task) => {
        await takeOverTaskApi(task._id);
        refresh();
    };

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
                            <p>Assigned to: {getSocialTask(selectedEvent._id)?.assignee?.name || 'Unassigned'} ({getSocialTask(selectedEvent._id)?.assignee?.usn || 'N/A'})</p>
                            <p>Status: {getSocialTask(selectedEvent._id)?.status || 'Not created'}</p>
                        </div>
                        {!['completed', 'cancelled'].includes(getSocialTask(selectedEvent._id)?.status) && <button
                            className="btn-primary" 
                            style={{ marginLeft: 'auto' }}
                            onClick={() => navigate(`/president/pr/events/${selectedEvent._id}/share`)}
                        >
                            <i className="ri-share-forward-line"></i> Create Social Post
                        </button>}
                    </div>
                    
                    <div className="photos-grid">
                        {selectedEvent.galleryStatus === 'approved' && selectedEvent.gallery?.length ? selectedEvent.gallery.map(img => (
                            <div key={img.fileId} className="photo-card" onClick={() => setLightboxImage(img.url)}>
                                <img src={img.url} alt="Event Capture" />
                                <div className="zoom-overlay">
                                    <i className="ri-zoom-in-line"></i>
                                </div>
                            </div>
                        )) : <div className="empty-state">Grafik gallery photos are not approved yet. The social-media task remains available for planning.</div>}
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
                        events.map(event => {
                            const task = getSocialTask(event._id);
                            return (
                            <div key={event._id} className="album-card">
                                <div className="album-cover">
                                    {event.galleryStatus === 'approved' && event.gallery?.[0]?.url ? <img src={event.gallery[0].url} alt="Album Cover" /> : <div className="empty-state">Photos pending approval</div>}
                                    <div className="photo-count">
                                        <i className="ri-image-2-fill"></i> {event.galleryStatus === 'approved' ? event.gallery?.length || 0 : 0} Photos
                                    </div>
                                </div>
                                <div className="album-info">
                                    <h3>{event.title}</h3>
                                    <p>{formatDate(event.date)}</p>
                                    <p>Assigned to: {task?.assignee?.name || 'Unassigned'} ({task?.assignee?.usn || 'N/A'})</p>
                                    <p>Status: {task?.status || 'Not created'}</p>
                                    <p>Assigned: {formatDate(task?.assignedAt)} | Due: {formatDate(task?.dueAt)}</p>
                                    <p>{event.galleryStatus === 'approved' ? 'Approved photos ready' : 'Waiting for approved Grafik photos'}</p>
                                </div>
                                <div className="album-actions">
                                    <button className="btn-action view" onClick={() => openGallery(event)}>
                                        <i className="ri-eye-line"></i> View Gallery
                                    </button>
                                    {task && !['completed', 'cancelled'].includes(task.status) && <button className="btn-action share" onClick={() => navigate(`/president/pr/events/${event._id}/share`)}>
                                        <i className="ri-share-forward-line"></i> Create Post
                                    </button>}
                                    {isPrPresident && task && task.assignee?._id !== user?._id && !['completed', 'cancelled'].includes(task.status) && (
                                        <button className="btn-action share" onClick={() => takeOver(task)}>
                                            <i className="ri-user-star-line"></i> Take Over
                                        </button>
                                    )}
                                    {isPrPresident && task && !['completed', 'cancelled'].includes(task.status) && (
                                        <button className="btn-action view" onClick={() => navigate('/president/tasks')}>
                                            <i className="ri-user-settings-line"></i> Assign / Reassign
                                        </button>
                                    )}
                                </div>
                            </div>
                        )})
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
