import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../../api/axiosInstance';
import '../style/FeedbackAnalytics.scss';
import { formatDateTime } from '../../../utils/dateFormat';

const FeedbackAnalytics = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    
    const [analytics, setAnalytics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [aiSummary, setAiSummary] = useState(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    
    const [selectedReview, setSelectedReview] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await axiosInstance.get(`/feedback/analytics/${eventId}`);
                setAnalytics(res.data.data);
            } catch (error) {
                console.error("Failed to load analytics", error);
                alert("Failed to load analytics.");
                navigate(-1);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAnalytics();
    }, [eventId, navigate]);

    const handleSummarize = async () => {
        setIsSummarizing(true);
        try {
            const res = await axiosInstance.post(`/feedback/analytics/${eventId}/summary`);
            setAiSummary(res.data.data);
        } catch (error) {
            console.error("Summary Gen Error:", error);
            alert(error.response?.data?.message || 'Failed to generate AI summary.');
        } finally {
            setIsSummarizing(false);
        }
    };

    const parseMarkdownToNormalText = (text) => {
        if (!text) return null;
        const lines = text.split('\n');
        let currentList = [];
        const components = [];

        const formatBoldText = (rawText) => {
            let cleanText = rawText.replace(/^[-*•]\s*/, '').trim();
            const boldRegex = /\*\*(.*?)\*\*/g;
            const parts = [];
            let lastIndex = 0;
            let match;
            
            while ((match = boldRegex.exec(cleanText)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(cleanText.substring(lastIndex, match.index));
                }
                parts.push(<strong key={`bold-${match.index}`}>{match[1]}</strong>);
                lastIndex = boldRegex.lastIndex;
            }
            if (lastIndex < cleanText.length) {
                parts.push(cleanText.substring(lastIndex));
            }
            return parts.length > 0 ? parts : cleanText;
        };

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            const isHeader = trimmed.startsWith('###') || 
                             trimmed.startsWith('🌟') || 
                             trimmed.startsWith('📈') || 
                             trimmed.startsWith('💡') || 
                             trimmed.startsWith('🗣️') || 
                             trimmed.startsWith('📊') ||
                             trimmed.toLowerCase().includes('strengths') ||
                             trimmed.toLowerCase().includes('weaknesses') ||
                             trimmed.toLowerCase().includes('suggestions') ||
                             trimmed.toLowerCase().includes('praises') ||
                             trimmed.toLowerCase().includes('sentiment');

            if (isHeader) {
                if (currentList.length > 0) {
                    components.push(<ul key={`list-${index}`} style={{ paddingLeft: '20px', margin: '8px 0' }}>{currentList}</ul>);
                    currentList = [];
                }
                const headingText = trimmed.replace(/^###\s*/, '').replace(/\*\*/g, '').trim();
                components.push(<h3 key={`h3-${index}`} style={{ margin: '18px 0 8px 0', fontSize: '1.15rem', color: '#0f172a', fontWeight: '700' }}>{headingText}</h3>);
            } else if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
                const formatted = formatBoldText(trimmed);
                currentList.push(<li key={`li-${index}`} style={{ marginBottom: '6px', fontSize: '0.95rem', color: '#475569', lineHeight: '1.5' }}>{formatted}</li>);
            } else {
                if (currentList.length > 0) {
                    components.push(<ul key={`list-${index}`} style={{ paddingLeft: '20px', margin: '8px 0' }}>{currentList}</ul>);
                    currentList = [];
                }
                const formatted = formatBoldText(trimmed);
                components.push(<p key={`p-${index}`} style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#475569', lineHeight: '1.5' }}>{formatted}</p>);
            }
        });

        if (currentList.length > 0) {
            components.push(<ul key={`list-final`} style={{ paddingLeft: '20px', margin: '8px 0' }}>{currentList}</ul>);
        }

        return components;
    };

    if (isLoading) return <div className="loading-state">Loading Feedback Analytics...</div>;

    if (!analytics || analytics.total === 0) {
        return (
            <div className="analytics-page">
                <button className="btn-secondary" onClick={() => navigate(-1)}><i className="ri-arrow-left-line"></i> Back</button>
                <div className="empty-state">
                    <i className="ri-bar-chart-2-line"></i>
                    <h2>No Feedback Yet</h2>
                    <p>There are no feedback submissions for this event.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="analytics-page">
            <div className="page-header">
                <button className="btn-secondary" onClick={() => navigate(-1)}><i className="ri-arrow-left-line"></i> Back</button>
                <div className="title-row">
                    <h1>Feedback Analytics Dashboard</h1>
                </div>
                <p>Analyze quantitative and qualitative student feedback for <strong>{analytics.eventDetails?.title}</strong>.</p>
            </div>

            <div className="top-stats-row">
                <div className="stat-box primary">
                    <div className="icon"><i className="ri-group-line"></i></div>
                    <div className="info">
                        <span className="label">Total Responses</span>
                        <span className="value">{analytics.total} <small>Students</small></span>
                    </div>
                </div>
                
                <div className="ai-trigger-box">
                    <h3>AI Feedback Summary</h3>
                    <p>Generate actionable insights holistically from all responses combined.</p>
                    <button className="btn-ai" onClick={handleSummarize} disabled={isSummarizing}>
                        {isSummarizing ? <><i className="ri-loader-4-line spin"></i> Processing...</> : <><i className="ri-magic-line"></i> Generate Insights</>}
                    </button>
                </div>
            </div>

            {aiSummary && (
                <div className="ai-summary-container">
                    <div className="ai-header">
                        <i className="ri-sparkling-fill"></i> AI Generated Synthesis
                    </div>
                    <div className="ai-content">
                        {parseMarkdownToNormalText(aiSummary)}
                    </div>
                </div>
            )}

            <div className="questions-grid">
                {analytics.analytics.map((q, i) => (
                    <div key={q.id} className="question-card">
                        <h3>Q{i + 1}. {q.text}</h3>
                        
                        {q.type === 'rating' && (
                            <>
                                <div className="rating-result">
                                    <span className="score">{q.average} ⭐</span> Average Rating
                                </div>
                                <div className="mcq-result">
                                    {[5, 4, 3, 2, 1].map(star => {
                                        const count = q.breakdown[star] || 0;
                                        const percentage = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
                                        return (
                                            <div key={star} className="mcq-bar-row">
                                                <div className="bar-labels">
                                                    <span className="opt-text">{star} Star</span>
                                                    <span className="opt-count">{count} ({percentage}%)</span>
                                                </div>
                                                <div className="bar-track">
                                                    <div className="bar-fill rating-fill" style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {q.type === 'mcq' && q.breakdown && Object.keys(q.breakdown).length > 0 && (
                            <div className="mcq-result">
                                {Object.entries(q.breakdown).map(([opt, count]) => {
                                    const percentage = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
                                    return (
                                        <div key={opt} className="mcq-bar-row">
                                            <div className="bar-labels">
                                                <span className="opt-text">{opt}</span>
                                                <span className="opt-count">{count} ({percentage}%)</span>
                                            </div>
                                            <div className="bar-track">
                                                <div className="bar-fill" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {q.type === 'paragraph' && q.rawAnswers && q.rawAnswers.length > 0 && (
                            <div className="text-result-container">
                                {q.rawAnswers.slice(0, 5).map((ans, idx) => (
                                    <div key={idx} className="text-result">
                                        <i className="ri-chat-1-line"></i> {ans}
                                    </div>
                                ))}
                                {q.rawAnswers.length > 5 && <div className="text-result-more">+{q.rawAnswers.length - 5} more responses below.</div>}
                            </div>
                        )}
                        {q.type === 'paragraph' && (!q.rawAnswers || q.rawAnswers.length === 0) && (
                            <div className="text-result-empty">No written responses.</div>
                        )}
                    </div>
                ))}
            </div>

            <div className="raw-reviews-section">
                <h2>Individual Student Submissions</h2>
                <div className="reviews-grid">
                    {analytics.rawRegistrations.map((reg, idx) => {
                        const dateStr = formatDateTime(reg.feedbackSubmittedAt);
                        return (
                            <div key={idx} className="student-review-card" onClick={() => setSelectedReview(reg)}>
                                <div className="card-top">
                                    <span className="student-name">{reg.student?.name || 'Anonymous'}</span>
                                    <span className="date-tag">{dateStr}</span>
                                </div>
                                <div className="usn-tag">{reg.student?.usn || 'N/A'}</div>
                                <div className="card-bottom">
                                    <span className="view-btn">View Full Submission <i className="ri-arrow-right-line"></i></span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {selectedReview && (
                <div className="review-modal-overlay" onClick={() => setSelectedReview(null)}>
                    <div className="review-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Feedback by {selectedReview.student?.name || 'Anonymous'}</h3>
                            <button className="close-btn" onClick={() => setSelectedReview(null)}><i className="ri-close-line"></i></button>
                        </div>
                        <div className="modal-body">
                            {selectedReview.feedbackResponses.map((res, i) => (
                                <div key={i} className="qa-block">
                                    <div className="q-text">Q: {res.questionText}</div>
                                    <div className="a-text">
                                        A: {Array.isArray(res.answer) ? res.answer.join(', ') : res.answer} {typeof res.answer === 'number' ? '⭐' : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbackAnalytics;
