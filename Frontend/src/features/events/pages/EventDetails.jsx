import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getEventByIdApi, deleteEventService, markEventCompletedApi, approveEventApi, rejectEventApi, approveProposalApi, rejectProposalApi, approveEventByHodApi, rejectEventByHodApi } from '../service/eventService';
import EditEventModal from '../components/EditEventModal';
import RejectEventModal from '../components/RejectEventModal';
import ConfirmActionModal from '../components/ConfirmActionModal';
import ImageLightbox from '../../../components/common/ImageLightbox';
import '../style/EventDetails.scss';
import { formatDate } from '../../../utils/dateFormat';
import { getTasksApi } from '../../tasks/service/taskService';

const EventDetails = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    
    const [event, setEvent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [approvalTarget, setApprovalTarget] = useState(null);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        let isMounted = true;

        const initializeEventData = async () => {
            try {
                const evData = await getEventByIdApi(eventId);
                if (isMounted) setEvent(evData);
                const eventTasks = await getTasksApi(eventId);
                if (isMounted) setTasks(eventTasks);
            } catch (error) {
                console.error("Failed to load event:", error);
                if (isMounted) {
                    alert('Failed to load event details. Redirecting.');
                    navigate(user?.role === 'hod' ? '/hod/event-approvals' : ['admin', 'faculty_coordinator'].includes(user?.role) ? '/faculty/event-approvals' : '/president/events');
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
        } catch (error) {
            console.error("Refresh Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        try {
            await approveEventApi(eventId);
            alert('Event Approved Successfully!');
            navigate('/faculty/event-approvals');
        } catch (error) {
            console.error("Approval Error:", error);
            alert('Failed to approve event.');
        }
    };

    const handleHodApprove = async () => {
        await approveEventByHodApi(eventId);
        navigate('/hod/event-approvals');
    };

    const handleReject = async (payload) => {
        try {
            await rejectEventApi(eventId, payload);
            alert('Event successfully rejected.');
            setIsRejectModalOpen(false);
            navigate('/faculty/event-approvals');
        } catch (error) {
            console.error("Rejection Error:", error);
            alert('Failed to reject event. Please try again.');
        }
    };

    const handleApproveProposal = async () => {
        if (!window.confirm('Approve this club member proposal and send it to Grafik?')) return;

        try {
            await approveProposalApi(eventId);
            handleManualRefresh();
        } catch (error) {
            console.error("Proposal Approval Error:", error);
            alert('Failed to approve proposal.');
        }
    };

    const handleRejectProposal = async () => {
        const reason = window.prompt('Enter rejection reason for the club member.');
        if (!reason || !reason.trim()) return;

        try {
            await rejectProposalApi(eventId, reason.trim());
            handleManualRefresh();
        } catch (error) {
            console.error("Proposal Rejection Error:", error);
            alert('Failed to reject proposal.');
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

    if (isLoading) return <div className="loading-state">Loading event framework...</div>;
    if (!event) return <div className="loading-state">Event not found or has been deleted.</div>;

    const formattedDate = formatDate(event.date);
    const isCompleted = event.status === 'completed' || event.status === 'Completed';
    const isApproved = event.status === 'approved';
    const isReview = event.status === 'review' || event.status === 'pending_grafik_poster' || event.status === 'poster_submitted';
    const isPendingPresident = event.status === 'pending_president';
    const isPendingAdmin = event.status === 'pending_admin' || event.status === 'pending_faculty';
    const isPendingHod = event.status === 'pending_hod';
    const isRejected = event.status === 'rejected' || event.status === 'president_rejected';
    const isBannerRejected = event.status === 'banner_rejected';
    
    const creatorId = typeof event.creator?.student === 'object' ? event.creator?.student?._id : event.creator?.student;
    const isOwnClubMemberProposal = user?.isClubMember && creatorId === user?._id;
    const canManage = ['admin', 'faculty_coordinator', 'hod'].includes(user?.role) || user?.role === 'president' || isOwnClubMemberProposal;
    const canEditDelete = user?.role === 'president' || isOwnClubMemberProposal;

    const statusLabel = isPendingPresident ? 'Pending President' : isReview ? 'Pending Grafik' : isPendingAdmin ? 'Pending Faculty Coordinator' : isPendingHod ? 'Pending HOD Final Approval' : isBannerRejected ? 'Flyer Rejected' : event.status === 'president_rejected' ? 'President Rejected' : event.status;

    return (
        <div className="event-details-page">
            <div className="page-header" style={{ marginBottom: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#0f172a' }}>Event Details Workspace</h1>
                <p style={{ margin: 0, color: '#64748b' }}>Manage event status, view analytics, and control event lifecycle.</p>
            </div>

            {['admin', 'faculty_coordinator'].includes(user?.role) && isPendingAdmin && (
                <div className="admin-review-bar">
                    <div className="review-info">
                        <i className="ri-shield-check-fill"></i>
                        <div>
                            <h3>Pending Faculty Coordinator Review</h3>
                            <p>Review the event specifications and flyer below. You must approve or reject this submission to proceed.</p>
                        </div>
                    </div>
                    <div className="review-actions">
                        <button className="btn-danger" onClick={() => setIsRejectModalOpen(true)}>
                            <i className="ri-close-circle-line"></i> Reject Event
                        </button>
                        <button className="btn-success" onClick={() => setApprovalTarget('faculty')}>
                            <i className="ri-check-double-line"></i> Approve Event
                        </button>
                    </div>
                </div>
            )}

            {user?.role === 'hod' && isPendingHod && (
                <div className="admin-review-bar">
                    <div className="review-info"><i className="ri-shield-star-fill"></i><div><h3>Pending HOD Final Approval</h3><p>Final approval publishes this event to students.</p></div></div>
                    <div className="review-actions">
                        <button className="btn-danger" onClick={() => setIsRejectModalOpen(true)}>Reject Event</button>
                        <button className="btn-success" onClick={() => setApprovalTarget('hod')}>Final Approve</button>
                    </div>
                </div>
            )}

            {user?.role === 'president' && isPendingPresident && (
                <div className="admin-review-bar">
                    <div className="review-info">
                        <i className="ri-user-star-fill"></i>
                        <div>
                            <h3>Club Member Proposal</h3>
                            <p>Approve this proposal to send it to Grafik, or reject it with feedback for the club member.</p>
                        </div>
                    </div>
                    <div className="review-actions">
                        <button className="btn-danger" onClick={handleRejectProposal}>
                            <i className="ri-close-circle-line"></i> Reject Proposal
                        </button>
                        <button className="btn-success" onClick={handleApproveProposal}>
                            <i className="ri-check-double-line"></i> Approve Proposal
                        </button>
                    </div>
                </div>
            )}

            {isRejected && (user?.role === 'president' || user?.isClubMember) && (
                <div className="rejection-banner">
                    <i className="ri-error-warning-fill banner-icon"></i>
                    <div className="banner-text">
                        <h3>{event.status === 'president_rejected' ? 'Proposal Rejected' : 'Event Details Rejected'}</h3>
                        <p><strong>Feedback:</strong> {event.rejectedReason}</p>
                        <span>{user?.isClubMember ? 'You can edit the proposal and resubmit it to the President.' : 'Please edit the event details below to resolve the issue. Upon saving, it will automatically be sent to Grafik for flyer regeneration.'}</span>
                    </div>
                </div>
            )}

            {isBannerRejected && user?.role === 'president' && (
                <div className="warning-banner">
                    <i className="ri-image-edit-line banner-icon"></i>
                    <div className="banner-text">
                        <h3>Flyer Rejected By Faculty Coordinator</h3>
                        <p><strong>Reason:</strong> {event.rejectedReason}</p>
                        <span>Event details are accepted. The Grafik team has been notified and is currently working on a replacement flyer. No action required from you at this time.</span>
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
                    <p style={{ marginTop: '4px', color: '#475569' }}>
                        Created by <strong>{event.creator?.name || 'Unknown'}</strong> ({event.creator?.usn || 'N/A'}) as <strong style={{ textTransform: 'capitalize' }}>{event.creator?.role === 'Admin' ? 'Faculty Coordinator' : event.creator?.role || 'N/A'}</strong>
                    </p>
                </div>
                
                <div className="details-actions">
                    <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>

                    {(user?.role === 'president' || isOwnClubMemberProposal) && isCompleted && (
                        <button className="btn-primary report-btn" onClick={() => navigate(`/president/reports/write/${event._id}`)}>
                            <i className="ri-file-text-line"></i> Manage Event Report
                        </button>
                    )}

                    {canManage && !isCompleted && !['admin', 'faculty_coordinator', 'hod'].includes(user?.role) && canEditDelete && (
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

            {canManage && (
                <div className="workflow-verification-panel">
                    <div className="panel-header">
                        <h2>Event Verification Status</h2>
                        <button className="btn-secondary" onClick={handleManualRefresh}>
                            <i className="ri-refresh-line"></i> Refresh
                        </button>
                    </div>
                    <div className="status-grid">
                        <div className="status-item">
                            <span className="label">Flyer Status</span>
                            <span className={`value ${event.bannerUrl ? 'success' : 'pending'}`}>
                                {event.bannerUrl ? <><i className="ri-check-line"></i> Uploaded</> : <><i className="ri-time-line"></i> Not Uploaded</>}
                            </span>
                        </div>
                        {tasks.map((task) => (
                            <div className="status-item" key={task._id}>
                                <span className="label" style={{ textTransform: 'capitalize' }}>{task.type.replaceAll('_', ' ')} Task</span>
                                <span className={`value ${task.status === 'completed' ? 'success' : 'pending'}`}>
                                    {(task.stage || task.status).replaceAll('_', ' ')}
                                </span>
                            </div>
                        ))}
                        <div className="status-item">
                            <span className="label">Gallery Status</span>
                            <span className={`value ${event.gallery && event.gallery.length > 0 ? 'success' : 'pending'}`}>
                                {event.gallery && event.gallery.length > 0 ? <><i className="ri-check-line"></i> Uploaded ({event.gallery.length})</> : <><i className="ri-time-line"></i> Not Uploaded</>}
                            </span>
                        </div>
                        <div className="status-item">
                            <span className="label">Registrations</span>
                            <span className="value neutral">{event.currentRegistrations || 0}</span>
                        </div>
                        <div className="status-item">
                            <span className="label">Feedback Submissions</span>
                            <span className="value neutral">{event.feedbackCount || 0}</span>
                        </div>
                        <div className="status-item">
                            <span className="label">Report Status</span>
                            <span className={`value ${event.reportStatus === 'reviewed' ? 'success' : event.reportStatus === 'submitted' ? 'neutral' : 'pending'}`}>
                                {event.reportStatus}
                            </span>
                        </div>
                    </div>
                    {event.status === 'completed' && (
                        <button className="btn-primary" style={{ marginTop: '20px', width: '100%', justifyContent: 'center' }} onClick={() => navigate(`/${user?.role === 'admin' ? 'admin' : 'president'}/events/${event._id}/analytics`)}>
                            <i className="ri-bar-chart-fill"></i> View Feedback Analytics
                        </button>
                    )}
                </div>
            )}

            {event.bannerUrl && (
                <div className="full-event-banner-container">
                    <img src={event.bannerUrl} alt="Event Flyer" className="full-event-banner" onClick={() => setLightboxImage(event.bannerUrl)} style={{ cursor: 'pointer' }} />
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

            {isEditModalOpen && <EditEventModal event={event} onClose={() => setIsEditModalOpen(false)} onSuccess={() => { setIsEditModalOpen(false); handleManualRefresh(); }} />}
            {isRejectModalOpen && <RejectEventModal
                onClose={() => setIsRejectModalOpen(false)}
                allowTargetSelection={user?.role !== 'hod'}
                title={user?.role === 'hod' ? 'Reject Event as HOD' : 'Reject Event Submission'}
                onConfirm={user?.role === 'hod'
                    ? async ({ reason }) => {
                        await rejectEventByHodApi(eventId, reason);
                        navigate('/hod/event-approvals');
                    }
                    : handleReject}
            />}
            {approvalTarget && <ConfirmActionModal
                title={approvalTarget === 'hod' ? 'Publish Event?' : 'Send Event to HOD?'}
                message={approvalTarget === 'hod'
                    ? 'Confirm final HOD approval. This publishes the event to students and activates PR attendance work.'
                    : 'Confirm Faculty Coordinator approval. The event will move to HOD final approval.'}
                confirmLabel={approvalTarget === 'hod' ? 'Final Approve' : 'Approve and Send'}
                onClose={() => setApprovalTarget(null)}
                onConfirm={approvalTarget === 'hod' ? handleHodApprove : handleApprove}
            />}
            {lightboxImage && <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />}
        </div>
    );
};

export default EventDetails;
