import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getEventByIdApi, deleteEventService, markEventCompletedApi, getEventReviewsApi, summarizeReviewsApi, getEventRegistrationsApi, approveEventApi, rejectEventApi } from '../service/eventService';
import EditEventModal from '../components/EditEventModal';
import RejectEventModal from '../components/RejectEventModal';
import ImageLightbox from '../../../components/common/ImageLightbox';
import '../style/EventDetails.scss';

const EventDetails = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    
    const [event, setEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [reviewData, setReviewData] = useState({ reviews: [], averageRating: 0, total: 0 });
    const [aiSummary, setAiSummary] = useState(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [lightboxImage, setLightboxImage] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const initializeEventData = async () => {
            try {
                const evData = await getEventByIdApi(eventId);
                
                if (isMounted) setEvent(evData);
                
                if (evData.status === 'approved' || evData.status === 'completed' || evData.status === 'Completed') {
                    const regData = await getEventRegistrationsApi(eventId);
                    if (isMounted) setRegistrations(regData);
                    
                    if (evData.status === 'completed' || evData.status === 'Completed') {
                        try {
                            const rData = await getEventReviewsApi(eventId);
                            if (isMounted && rData) setReviewData(rData);
                        } catch (error) {
                            console.error("Reviews load failed:", error);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to load event:", error);
                if (isMounted) {
                    alert('Failed to load event details. Redirecting.');
                    navigate(user?.role === 'admin' ? '/admin/event-approvals' : '/president/events');
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        initializeEventData();

        return () => {
            isMounted = false;
        };
    }, [eventId, navigate, user?.role]);

    const handleManualRefresh = async () => {
        setIsLoading(true);
        try {
            const evData = await getEventByIdApi(eventId);
            setEvent(evData);
            
            if (evData.status === 'approved' || evData.status === 'completed' || evData.status === 'Completed') {
                const regData = await getEventRegistrationsApi(eventId);
                setRegistrations(regData);
                
                if (evData.status === 'completed' || evData.status === 'Completed') {
                    try {
                        const rData = await getEventReviewsApi(eventId);
                        if (rData) setReviewData(rData);
                    } catch (error) {
                        console.error("Reviews refresh failed:", error);
                    }
                }
            }
        } catch (error) {
            console.error("Refresh Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        if(window.confirm('Approve this event? It will instantly become visible to the student portal.')) {
            try {
                await approveEventApi(eventId);
                alert('Event Approved Successfully!');
                navigate('/admin/event-approvals');
            } catch (error) {
                console.error("Approval Error:", error);
                alert('Failed to approve event.');
            }
        }
    };

    const handleReject = async (payload) => {
        try {
            await rejectEventApi(eventId, payload);
            alert('Event successfully rejected.');
            setIsRejectModalOpen(false);
            navigate('/admin/event-approvals');
        } catch (error) {
            console.error("Rejection Error:", error);
            alert('Failed to reject event. Please try again.');
        }
    };

    const handleDelete = async () => {
        if(window.confirm('Are you sure you want to completely delete this event?')) {
            try {
                await deleteEventService(eventId);
                navigate('/president/events');
            } catch (error) {
                console.error("Delete Error:", error);
                alert('Failed to delete event.');
            }
        }
    };

    const handleMarkCompleted = async () => {
        if(window.confirm('Mark this event as completed? It will be archived and removed from active registrations.')) {
            try {
                await markEventCompletedApi(eventId);
                handleManualRefresh();
            } catch (error) {
                console.error("Mark Complete Error:", error);
                alert('Failed to mark event as completed.');
            }
        }
    };

    const handleSummarize = async () => {
        setIsSummarizing(true);
        try {
            const summary = await summarizeReviewsApi(eventId);
            setAiSummary(summary);
        } catch (error) {
            console.error("Summary Gen Error:", error);
            alert('Failed to generate AI summary.');
        } finally {
            setIsSummarizing(false);
        }
    };

    if (isLoading) return <div className="loading-state">Loading event framework...</div>;
    if (!event) return <div className="loading-state">Event not found or has been deleted.</div>;

    const formattedDate = new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const isCompleted = event.status === 'completed' || event.status === 'Completed';
    const isApproved = event.status === 'approved';
    const isReview = event.status === 'review';
    const isPendingAdmin = event.status === 'pending_admin';
    const isRejected = event.status === 'rejected';
    const isBannerRejected = event.status === 'banner_rejected';
    const canManage = user?.role === 'admin' || !!user?.clubName;

    const statusLabel = isReview ? 'Pending Grafik' : isPendingAdmin ? 'Pending Admin' : isBannerRejected ? 'Banner Rejected' : event.status;

    return (
        <div className="event-details-page">
            <div className="page-header" style={{ marginBottom: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#0f172a' }}>Event Details Workspace</h1>
                <p style={{ margin: 0, color: '#64748b' }}>Manage event status, view analytics, and control event lifecycle.</p>
            </div>

            {user?.role === 'admin' && isPendingAdmin && (
                <div className="admin-review-bar">
                    <div className="review-info">
                        <i className="ri-shield-check-fill"></i>
                        <div>
                            <h3>Pending Admin Review</h3>
                            <p>Review the event specifications and poster below. You must approve or reject this submission to proceed.</p>
                        </div>
                    </div>
                    <div className="review-actions">
                        <button className="btn-danger" onClick={() => setIsRejectModalOpen(true)}>
                            <i className="ri-close-circle-line"></i> Reject Event
                        </button>
                        <button className="btn-success" onClick={handleApprove}>
                            <i className="ri-check-double-line"></i> Approve Event
                        </button>
                    </div>
                </div>
            )}

            {isRejected && user?.role === 'president' && (
                <div className="rejection-banner">
                    <i className="ri-error-warning-fill banner-icon"></i>
                    <div className="banner-text">
                        <h3>Event Details Rejected</h3>
                        <p><strong>Admin Feedback:</strong> {event.rejectedReason}</p>
                        <span>Please edit the event details below to resolve the issue. Upon saving, it will automatically be sent to Grafik for banner regeneration.</span>
                    </div>
                </div>
            )}

            {isBannerRejected && user?.role === 'president' && (
                <div className="warning-banner">
                    <i className="ri-image-edit-line banner-icon"></i>
                    <div className="banner-text">
                        <h3>Banner Rejected By Admin</h3>
                        <p><strong>Reason:</strong> {event.rejectedReason}</p>
                        <span>Event details are accepted. The Grafik team has been notified and is currently working on a replacement banner. No action required from you at this time.</span>
                    </div>
                </div>
            )}

            <div className="details-header">
                <div>
                    <div className="title-row">
                        <h1 style={{ margin: 0 }}>{event.title}</h1>
                        <span className={`status-badge ${event.status.toLowerCase()}`}>
                            {statusLabel}
                        </span>
                    </div>
                    <p>Organized by {event?.club?.name || 'Unknown/Deleted Club'}</p>
                </div>
                
                <div className="details-actions">
                    <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>

                    {user?.role === 'president' && isCompleted && (
                        <button className="btn-primary report-btn" onClick={() => navigate(`/president/reports/write/${event._id}`)}>
                            <i className="ri-file-text-line"></i> Manage Event Report
                        </button>
                    )}

                    {user?.role === 'president' && canManage && (
                        <>
                            {isApproved && (
                                <button className="btn-primary complete-btn" onClick={handleMarkCompleted}>
                                    <i className="ri-flag-2-line"></i> Mark Completed
                                </button>
                            )}
                            <button className="btn-primary edit-btn" onClick={() => setIsEditModalOpen(true)}>
                                <i className="ri-pencil-line"></i> Edit Event
                            </button>
                            <button className="btn-danger-outline" onClick={handleDelete}>
                                <i className="ri-delete-bin-line"></i> Delete Event
                            </button>
                        </>
                    )}
                </div>
            </div>

            {event.bannerUrl && (
                <div className="full-event-banner-container">
                    <img src={event.bannerUrl} alt="Event Banner" className="full-event-banner" onClick={() => setLightboxImage(event.bannerUrl)} style={{ cursor: 'pointer' }} />
                </div>
            )}

            <div className="info-panel">
                <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.25rem' }}>Event Specifications</h2>
                <p style={{ color: '#475569', lineHeight: 1.6 }}>{event.description}</p>
                
                <div className="info-grid">
                    <div className="info-item">
                        <span className="label">Date</span>
                        <span className="value">{formattedDate}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">Time</span>
                        <span className="value">{event.time}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">Venue</span>
                        <span className="value">{event.venue}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">Type / Price</span>
                        <span className="value">{event.eventType} {event.eventType === 'Paid' ? `- ₹${event.price}` : ''}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">Capacity Limit</span>
                        <span className="value">{event.maxParticipants} Total Students</span>
                    </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                    <span className="label" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Tags</span>
                    <div className="tag-list">
                        {event?.tags?.map(tag => <span key={tag} className="tag">{tag}</span>)}
                    </div>
                </div>
            </div>

            {isCompleted && event.gallery && event.gallery.length > 0 && (
                <div className="gallery-panel">
                    <div className="panel-header">
                        <h2><i className="ri-camera-lens-fill" style={{ color: '#0f172a' }}></i> Official Post-Event Gallery</h2>
                    </div>
                    <div className="gallery-grid">
                        {event.gallery.map(img => (
                            <div key={img.fileId} className="gallery-image-wrapper" onClick={() => setLightboxImage(img.url)} style={{ cursor: 'pointer' }}>
                                <img src={img.url} alt="Event Moment" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(isApproved || isCompleted) && (user?.role === 'president' || user?.role === 'admin') && (
                <>
                    <div className="registrations-panel">
                        <div className="panel-header">
                            <h2>Registrations Roll ({registrations.length})</h2>
                            <button className="btn-secondary" onClick={handleManualRefresh}>
                                <i className="ri-refresh-line"></i> Refresh
                            </button>
                        </div>

                        {registrations.length === 0 ? (
                            <div className="empty-state">No students are registered for this event yet.</div>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Student Name</th>
                                            <th>USN</th>
                                            <th>Department</th>
                                            <th>Sem & Sec</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {registrations.map(reg => (
                                            <tr key={reg._id}>
                                                <td style={{ fontWeight: 600, color: '#0f172a' }}>{reg.student?.name || 'Unknown User'}</td>
                                                <td style={{ fontFamily: 'monospace', color: '#475569' }}>{reg.student?.usn || 'N/A'}</td>
                                                <td>{reg.student?.department || 'N/A'}</td>
                                                <td>
                                                    {reg.student ? `${reg.student.semester} - ${reg.student.section}` : 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {isCompleted && (
                        <div className="reviews-panel">
                            <div className="panel-header">
                                <h2 style={{ margin: 0 }}>Student Reviews ({reviewData.averageRating} ⭐)</h2>
                                <button className="btn-secondary" onClick={handleSummarize} disabled={isSummarizing || reviewData.total === 0}>
                                    {isSummarizing ? 'Generating...' : '✨ Summarize with AI'}
                                </button>
                            </div>
                            
                            {aiSummary && (
                                <div className="ai-summary-box">
                                    <strong>AI Summary:</strong> 
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {aiSummary}
                                    </ReactMarkdown>
                                </div>
                            )}

                            <div className="review-cards-container">
                                {reviewData?.reviews?.map(r => (
                                    <div key={r._id} className="review-card">
                                        <div className="review-author">{r?.student?.name || 'Unknown Student'}</div>
                                        <div className="review-rating">{r.rating} ⭐</div>
                                        <div className="review-text">{r.review || 'No written feedback provided.'}</div>
                                    </div>
                                ))}
                                {reviewData.total === 0 && <p style={{ color: '#94a3b8', margin: 0 }}>No reviews yet.</p>}
                            </div>
                        </div>
                    )}
                </>
            )}

            {isEditModalOpen && <EditEventModal event={event} onClose={() => setIsEditModalOpen(false)} onSuccess={() => { setIsEditModalOpen(false); handleManualRefresh(); }} />}
            {isRejectModalOpen && <RejectEventModal onClose={() => setIsRejectModalOpen(false)} onConfirm={handleReject} />}
            {lightboxImage && <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />}
        </div>
    );
};

export default EventDetails;