import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReportByEventApi, saveReportDraftApi, submitReportApi } from '../service/reportService';
import '../style/ReportEditor.scss';

const ReportEditor = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    
    const [report, setReport] = useState(null);
    const [content, setContent] = useState({
        summary: '', objectives: '', activities: '',
        participation: '', outcomes: '', challenges: '',
        conclusion: '', additionalRemarks: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const initializeReport = async () => {
            try {
                setIsLoading(true);
                const data = await getReportByEventApi(eventId);
                if (isMounted) {
                    setReport(data);
                    setContent(data.content);
                }
            } catch (error) {
                console.error(error);
                if (isMounted) navigate('/president/events');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        initializeReport();

        return () => {
            isMounted = false;
        };
    }, [eventId, navigate]);

    const handleInputChange = (field, value) => {
        setContent(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveDraft = async () => {
        setIsSaving(true);
        try {
            await saveReportDraftApi(eventId, content);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            await submitReportApi(eventId, content);
            navigate('/president/events');
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="loading-state">Initializing Report Platform...</div>;
    if (!report) return null;

    const isLocked = report.status === 'submitted' || report.status === 'reviewed';

    const renderSection = (title, field, placeholder) => (
        <div className="editor-section">
            <label>{title}</label>
            <textarea
                value={content[field]}
                onChange={(e) => handleInputChange(field, e.target.value)}
                placeholder={placeholder}
                disabled={isLocked}
                rows={4}
            />
        </div>
    );

    return (
        <div className="report-editor-page">
            <div className="editor-header">
                <div>
                    <span className={`status-badge ${report.status}`}>{report.status}</span>
                    <h1>Event Post-Action Report</h1>
                    <p>Documenting: <strong>{report.event?.title}</strong></p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
                    {!isLocked && (
                        <>
                            <button className="btn-secondary" onClick={handleSaveDraft} disabled={isSaving}>
                                <i className="ri-save-line"></i> {isSaving ? 'Saving...' : 'Save Draft'}
                            </button>
                            <button className="btn-primary" onClick={handleSubmit} disabled={isSaving}>
                                <i className="ri-send-plane-fill"></i> Submit to Admin
                            </button>
                        </>
                    )}
                    {report.pdfUrl && (
                        <a href={report.pdfUrl} target="_blank" rel="noreferrer" className="btn-download">
                            <i className="ri-file-pdf-line"></i> View Generated PDF
                        </a>
                    )}
                </div>
            </div>

            {report.adminRemarks && (
                <div className="admin-remarks-banner">
                    <i className="ri-feedback-fill"></i>
                    <div>
                        <strong>Admin Feedback:</strong>
                        <p>{report.adminRemarks}</p>
                    </div>
                </div>
            )}

            <div className="editor-canvas">
                {renderSection('1. Event Summary', 'summary', 'Provide a brief 3-4 sentence overview of the event...')}
                {renderSection('2. Core Objectives', 'objectives', 'What were the main goals of this event?')}
                {renderSection('3. Activities Conducted', 'activities', 'List the specific activities, speakers, or topics covered...')}
                {renderSection('4. Participation & Engagement', 'participation', 'Discuss the crowd turnout, engagement levels, and overall atmosphere...')}
                {renderSection('5. Key Outcomes', 'outcomes', 'What did the students gain? What was the final result?')}
                {renderSection('6. Challenges Faced', 'challenges', 'Logistical, technical, or participation challenges encountered...')}
                {renderSection('7. Conclusion', 'conclusion', 'Final thoughts on the event success...')}
                {renderSection('8. Additional Remarks', 'additionalRemarks', 'Any other information, budget notes, or future recommendations...')}
            </div>
        </div>
    );
};

export default ReportEditor;