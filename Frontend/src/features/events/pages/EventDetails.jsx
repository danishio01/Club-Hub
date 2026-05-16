import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getEventByIdApi, deleteEventService, markEventCompletedApi, getEventReviewsApi, summarizeReviewsApi } from '../service/eventService';
import EditEventModal from '../components/EditEventModal';
import '../style/EventDetails.scss';

const EventDetails = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [reviewData, setReviewData] = useState({ reviews: [], averageRating: 0, total: 0 });
    const [aiSummary, setAiSummary] = useState(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const loadEvent = useCallback(async () => {
        try {
            const data = await getEventByIdApi(eventId);
            setEvent(data);
            try {
                const rData = await getEventReviewsApi(eventId);
                if(rData) setReviewData(rData);
            } catch (err) {
                console.error("Failed to load reviews:", err);
            }
        } catch (error) {
            console.error("Failed to load event:", error);
            alert('Failed to load event details. Redirecting.');
            navigate('/president/events');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, navigate]);

    useEffect(() => {
        const fetchEventData = async () => {
            await loadEvent();
        };
        fetchEventData();
    }, [loadEvent]);

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
        if(window.confirm('Are you sure you want to mark this event as completed? It will be removed from the student portal.')) {
            try {
                await markEventCompletedApi(eventId);
                loadEvent();
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
            console.error("Summary Generation Error:", error);
            alert('Failed to generate summary.');
        } finally {
            setIsSummarizing(false);
        }
    };

    if (isLoading) return <div>Loading event details...</div>;
    if (!event) return <div>Event not found.</div>;

    const formattedDate = new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const isCompleted = event.status === 'Completed';

    return (
        <div className="event-details-page">
            <div className="details-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h1 style={{ margin: 0 }}>{event.title}</h1>
                        {isCompleted && (
                            <span style={{ padding: '4px 10px', background: '#dcfce7', color: '#166534', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
                                <i className="ri-check-double-line"></i> Completed
                            </span>
                        )}
                    </div>
                    <p>Organized by {event?.club?.name || 'Unknown/Deleted Club'}</p>
                </div>
                <div className="details-actions">
                    <button className="btn-secondary" onClick={() => navigate('/president/events')}>Back</button>
                    {!isCompleted && (
                        <button className="btn-primary" style={{ backgroundColor: '#3b82f6' }} onClick={handleMarkCompleted}>
                            <i className="ri-flag-2-line"></i> Mark Completed
                        </button>
                    )}
                    <button className="btn-primary" onClick={() => setIsEditModalOpen(true)}>
                        <i className="ri-pencil-line"></i> Edit
                    </button>
                    <button className="btn-danger" onClick={handleDelete}>
                        <i className="ri-delete-bin-line"></i> Delete
                    </button>
                </div>
            </div>

            <div className="layout-grid">
                <div className="info-panel">
                    <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.25rem' }}>Event Information</h2>
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
                            <span className="label">Capacity</span>
                            <span className="value">{event.currentRegistrations} / {event.maxParticipants} Registered</span>
                        </div>
                    </div>

                    <div style={{ marginTop: '24px' }}>
                        <span className="label" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Tags</span>
                        <div className="tag-list">
                            {event?.tags?.map(tag => <span key={tag} className="tag">{tag}</span>)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="reviews-panel" style={{ marginTop: '24px', padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

            {isEditModalOpen && <EditEventModal event={event} onClose={() => setIsEditModalOpen(false)} onSuccess={() => { setIsEditModalOpen(false); loadEvent(); }} />}
        </div>
    );
};

export default EventDetails;