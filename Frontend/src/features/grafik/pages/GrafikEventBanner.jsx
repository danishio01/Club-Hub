import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGrafikEventByIdApi, generateBannerApi, uploadCustomBannerApi } from '../../events/service/eventService';
import ImageLightbox from '../../../components/common/ImageLightbox';
import { useSelector } from 'react-redux';
import { getTasksApi, startTaskApi, submitTaskApi, reviewTaskApi } from '../../tasks/service/taskService';
import '../style/GrafikEventBanner.scss';
import { formatDate } from '../../../utils/dateFormat';

const GrafikEventBanner = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const fileInputRef = useRef(null);
    
    const [event, setEvent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [task, setTask] = useState(null);

    const loadEventDetails = useCallback(async () => {
        try {
            const [data, tasks] = await Promise.all([getGrafikEventByIdApi(eventId), getTasksApi(eventId)]);
            setEvent(data);
            setTask(tasks.find((item) => item.type === 'poster') || null);
        } catch (error) {
            console.error(error);
            alert("Failed to load event details.");
            navigate('/president/grafik/dashboard');
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
            if (task?.assignee?._id === user?._id && task.status === 'assigned') await startTaskApi(task._id);
        } catch (error) {
            console.error("Generation failed:", error);
            alert("Failed to generate flyer.");
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
                if (task?.assignee?._id === user?._id && task.status === 'assigned') await startTaskApi(task._id);
            } catch (error) {
                console.error("Upload failed:", error);
                alert("Failed to upload custom flyer.");
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        setIsProcessing(true);
        try {
            if (isGrafikPresident && task?.status === 'submitted') {
                await reviewTaskApi(task._id, 'approved');
                alert("Poster approved and sent to the Faculty Coordinator.");
            } else if (isGrafikPresident && task?.assignee?._id === user?._id) {
                await submitTaskApi(task._id, { url: event.bannerUrl, text: 'Poster completed by Grafik President.' });
                await reviewTaskApi(task._id, 'approved');
                alert("Poster completed and sent to the Faculty Coordinator.");
            } else if (task?.assignee?._id === user?._id) {
                await submitTaskApi(task._id, { url: event.bannerUrl, text: 'Poster uploaded and submitted for President review.' });
                alert("Poster submitted to the Grafik President for review.");
            }
            navigate('/president/grafik/dashboard');
        } catch (error) {
            console.error("Approval failed:", error);
            alert("Failed to submit flyer.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePosterReview = async (decision) => {
        if (decision === 'approved' && !window.confirm('Accept this poster and send it to the Faculty Coordinator?')) return;
        const reason = decision === 'rejected' ? window.prompt('Enter the required poster changes for the assigned Grafik member.') : '';
        if (decision === 'rejected' && !reason?.trim()) return;
        setIsProcessing(true);
        try {
            await reviewTaskApi(task._id, decision, reason.trim());
            alert(decision === 'approved' ? 'Poster accepted and sent to Faculty Coordinator.' : 'Poster rejected with correction feedback.');
            await loadEventDetails();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to review poster.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) return <div className="loading-state">Loading Event Management Workspace...</div>;
    if (!event) return null;

    const formattedDate = formatDate(event.date);
    const isGrafikPresident = user?.role === 'president' && user?.specialClubRole === 'grafik';
    const isReadOnly = ['approved', 'completed', 'pending_admin', 'pending_faculty', 'pending_hod'].includes(event.status)
        || (task?.status === 'submitted' && !isGrafikPresident);
    const canSubmit = task?.assignee?._id === user?._id && task?.status !== 'submitted';

    return (
        <div className="grafik-banner-page">
            <div className="page-header">
                <button className="btn-secondary" onClick={() => navigate('/president/grafik/dashboard')}>
                    <i className="ri-arrow-left-line"></i> Back to Dashboard
                </button>
                <div className="title-wrapper">
                    <h1>Official Event Flyer</h1>
                    <p>Generate, preview, and assign promotional flyers for this event.</p>
                </div>
            </div>

            {event.status === 'banner_rejected' && event.rejectedReason && (
                <div className="rejection-banner">
                    <i className="ri-error-warning-fill"></i>
                    <div className="rejection-content">
                        <h3>Flyer Design Rejected by Faculty Coordinator</h3>
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
                            <div className="label">Created By</div>
                            <div className="value">{event.creator?.name || 'Unknown'} ({event.creator?.usn || 'N/A'}) - {event.creator?.role || 'N/A'}</div>
                        </div>
                        <div className="info-item">
                            <div className="label">Poster Assignment</div>
                            <div className="value">{task?.assignee?.name || 'Unassigned'} ({task?.assignee?.usn || 'N/A'}) - {task?.status || 'Not created'}</div>
                        </div>
                        <div className="info-item">
                            <div className="label">Task Dates</div>
                            <div className="value">Assigned: {formatDate(task?.assignedAt)} | Due: {formatDate(task?.dueAt)}</div>
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
                    <h2>Flyer Management</h2>
                    <div className="preview-container">
                        {event.bannerUrl ? (
                            <img 
                                src={event.bannerUrl} 
                                alt="Event Flyer" 
                                className="banner-image" 
                                onClick={() => setLightboxImage(event.bannerUrl)} 
                            />
                        ) : (
                            <div className="empty-preview">
                                <i className="ri-image-add-line"></i>
                                <span>No Flyer Set</span>
                            </div>
                        )}
                    </div>

                    {!isReadOnly && (
                        <div className="action-buttons">
                            <div className="generation-options">
                                <button className="btn-ai" onClick={handleGenerate} disabled={isProcessing}>
                                    <i className={isProcessing ? "ri-loader-4-line spin" : "ri-magic-line"}></i> 
                                    {event.bannerUrl ? 'Regenerate Automatic Flyer' : 'Generate Automatic Flyer'}
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

                            {event.bannerUrl && canSubmit && (
                                <button className="btn-submit" onClick={handleSubmit} disabled={isProcessing}>
                                    <i className="ri-check-double-line"></i> {isGrafikPresident ? 'Submit to Faculty Coordinator' : 'Submit to Grafik President'}
                                </button>
                            )}
                        </div>
                    )}

                    {isGrafikPresident && task?.status === 'submitted' && (
                        <div className="action-buttons poster-review-actions">
                            <p>Review the submitted poster before it proceeds to Faculty Coordinator approval.</p>
                            <div className="generation-options">
                                <button className="btn-upload" onClick={() => handlePosterReview('rejected')} disabled={isProcessing}>
                                    <i className="ri-close-circle-line"></i> Reject with Reason
                                </button>
                                <button className="btn-submit" onClick={() => handlePosterReview('approved')} disabled={isProcessing}>
                                    <i className="ri-check-double-line"></i> Accept Poster
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {isReadOnly && (
                        <div className="readonly-notice">
                            <i className="ri-lock-line"></i> This event flyer is currently locked for review or has already been published.
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
