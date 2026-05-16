import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getEventByIdApi, deleteEventService, markEventCompletedApi, getEventReviewsApi, summarizeReviewsApi, getEventRegistrationsApi, approveEventApi, rejectEventApi } from '../service/eventService';
import EditEventModal from '../components/EditEventModal';
import RejectEventModal from '../components/RejectEventModal';
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

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const evData = await getEventByIdApi(eventId);
            setEvent(evData);
            
            if (evData.status === 'approved' || evData.status === 'completed' || evData.status === 'Completed') {
                const regData = await getEventRegistrationsApi(eventId);
                setRegistrations(regData);
                try {
                    const rData = await getEventReviewsApi(eventId);
                    if (rData) setReviewData(rData);
                } catch (error) {
                    console.error("Reviews load failed:", error);
                }
            }
        } catch (error) {
            console.error("Failed to load event details:", error);
            alert('Failed to load event details.');
            navigate(user?.role === 'admin' ? '/admin/event-approvals' : '/president/events');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, navigate, user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

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

    const handleReject = async (reason) => {
        try {
            await rejectEventApi(eventId, reason);
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
                loadData();
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

    if (isLoading) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading event framework...</div>;
    if (!event) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Event not found or has been deleted.</div>;

    const formattedDate = new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const isCompleted = event.status === 'completed' || event.status === 'Completed';
    const isApproved = event.status === 'approved';
    const isReview = event.status === 'review';
    const isRejected = event.status === 'rejected';
    const canManage = user?.role === 'admin' || !!user?.clubName;

    return (
        <div className="event-details-page">
            {/* ADMIN DEDICATED REVIEW BAR */}
            {user?.role === 'admin' && isReview && (
                <div className="admin-review-bar">
                    <div className="review-info">
                        <i className="ri-shield-check-fill"></i>
                        <div>
                            <h3>Pending Admin Review</h3>
                            <p>Review the event specifications below. You must approve or reject this submission to proceed.</p>
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

            {/* PRESIDENT REJECTION BANNER */}
            {isRejected && user?.role === 'president' && (
                <div className="rejection-banner">
                    <i className="ri-error-warning-fill banner-icon"></i>
                    <div className="banner-text">
                        <h3>Event Submission Rejected</h3>
                        <p><strong>Admin Feedback:</strong> {event.rejectedReason}</p>
                        <span>Please edit the event details below to resolve the issue. Upon saving, it will automatically be resubmitted for review.</span>
                    </div>
                </div>
            )}

            <div className="details-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h1 style={{ margin: 0 }}>{event.title}</h1>
                        <span className={`status-badge ${event.status.toLowerCase()}`}>
                            {event.status}
                        </span>
                    </div>
                    <p>Organized by {event?.club?.name || 'Unknown/Deleted Club'}</p>
                </div>
                
                <div className="details-actions">
                    <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>

                    {user?.role === 'president' && canManage && (
                        <>
                            {isApproved && (
                                <button className="btn-primary" style={{ backgroundColor: '#3b82f6' }} onClick={handleMarkCompleted}>
                                    <i className="ri-flag-2-line"></i> Mark Completed
                                </button>
                            )}
                            <button className="btn-primary" onClick={() => setIsEditModalOpen(true)}>
                                <i className="ri-pencil-line"></i> Edit Event
                            </button>
                            <button className="btn-danger-outline" onClick={handleDelete}>
                                <i className="ri-delete-bin-line"></i> Delete Event
                            </button>
                        </>
                    )}
                </div>
            </div>

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

            {(isApproved || isCompleted) && user?.role === 'president' && (
                <>
                    <div className="registrations-panel">
                        <div className="panel-header">
                            <h2>Registrations Roll ({registrations.length})</h2>
                            <button className="btn-secondary" onClick={loadData}>
                                <i className="ri-refresh-line"></i> Refresh
                            </button>
                        </div>

                        {registrations.length === 0 ? (
                            <div className="empty-state">No students are registered for this event yet.</div>
                        ) : (
                            <div className="responsive-table-wrapper">
                                <table className="registrations-table">
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
                                                <td data-label="Name" style={{ fontWeight: 600, color: '#0f172a' }}>{reg.student?.name || 'Unknown User'}</td>
                                                <td data-label="USN" style={{ fontFamily: 'monospace', color: '#475569' }}>{reg.student?.usn || 'N/A'}</td>
                                                <td data-label="Department">{reg.student?.department || 'N/A'}</td>
                                                <td data-label="Sem & Sec">
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
                        <div className="reviews-panel" style={{ marginTop: '24px', padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <h2 style={{ margin: 0 }}>Student Reviews ({reviewData.averageRating} ⭐)</h2>
                                <button className="btn-secondary" onClick={handleSummarize} disabled={isSummarizing || reviewData.total === 0}>
                                    {isSummarizing ? 'Generating...' : '✨ Summarize with AI'}
                                </button>
                            </div>
                            
                            {aiSummary && (
                                <div style={{ marginTop: '16px', padding: '16px', background: '#f0f9ff', borderLeft: '4px solid #3b82f6', borderRadius: '4px', lineHeight: 1.6 }}>
                                    <strong>AI Summary:</strong> 
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {aiSummary}
                                    </ReactMarkdown>
                                </div>
                            )}

                            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {reviewData?.reviews?.map(r => (
                                    <div key={r._id} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{r?.student?.name || 'Unknown Student'} - {r.rating} ⭐</div>
                                        <div style={{ color: '#475569' }}>{r.review || 'No written feedback provided.'}</div>
                                    </div>
                                ))}
                                {reviewData.total === 0 && <p style={{ color: '#94a3b8' }}>No reviews yet.</p>}
                            </div>
                        </div>
                    )}
                </>
            )}

            {isEditModalOpen && <EditEventModal event={event} onClose={() => setIsEditModalOpen(false)} onSuccess={() => { setIsEditModalOpen(false); loadData(); }} />}
            {isRejectModalOpen && <RejectEventModal onClose={() => setIsRejectModalOpen(false)} onConfirm={handleReject} />}
        </div>
    );
};

export default EventDetails;