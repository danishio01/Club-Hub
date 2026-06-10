import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReportByEventApi, saveReportDraftApi, submitReportApi } from '../service/reportService';
import { getEventByIdApi, getEventRegistrationsApi } from '../../events/service/eventService';
import axiosInstance from '../../../api/axiosInstance';
import '../style/ReportEditor.scss';

const ReportEditor = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    
    const [report, setReport] = useState(null);
    const [event, setEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [analytics, setAnalytics] = useState(null);

    const [content, setContent] = useState({
        activityName: '', thrustArea: '', level: '', semester: '', quarter: '', date: '', duration: '',
        facultyCount: '', studentCount: '', fundsUtilized: '', department: '',
        objective: '', summary: '', benefits: '',
        resourcePersons: [],
        facultyCoordinators: '', studentCoordinators: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        let isMounted = true;
        
        const initializeReportData = async () => {
            try {
                setIsLoading(true);
                const data = await getReportByEventApi(eventId);
                const evData = await getEventByIdApi(eventId);
                const regData = await getEventRegistrationsApi(eventId);
                
                let analyticsData = null;
                try {
                    const res = await axiosInstance.get(`/feedback/analytics/${eventId}`);
                    analyticsData = res.data.data;
                } catch (e) {
                    console.error("No feedback data compiled for report preview", e);
                }

                if (isMounted) {
                    setReport(data);
                    setEvent(evData);
                    setRegistrations(regData);
                    setAnalytics(analyticsData);

                    if (data.content) {
                        setContent(prev => ({
                            ...prev,
                            ...data.content,
                            resourcePersons: data.content.resourcePersons || []
                        }));
                    }
                }
            } catch (error) {
                console.error(error);
                if (isMounted) {
                    alert("Failed to load report platform.");
                    navigate('/president/events');
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        initializeReportData();

        return () => {
            isMounted = false;
        };
    }, [eventId, navigate]);

    const handleInputChange = (field, value) => {
        setContent(prev => ({ ...prev, [field]: value }));
    };

    const handleAddResourcePerson = () => {
        setContent(prev => ({
            ...prev,
            resourcePersons: [...prev.resourcePersons, { name: '', industry: '', designation: '', mobile: '', email: '', address: '' }]
        }));
    };

    const handleRemoveResourcePerson = (index) => {
        setContent(prev => ({
            ...prev,
            resourcePersons: prev.resourcePersons.filter((_, i) => i !== index)
        }));
    };

    const handleResourcePersonChange = (index, field, value) => {
        setContent(prev => {
            const updatedPersons = [...prev.resourcePersons];
            updatedPersons[index] = { ...updatedPersons[index], [field]: value };
            return { ...prev, resourcePersons: updatedPersons };
        });
    };

    const handleSaveDraft = async () => {
        setIsSaving(true);
        try {
            await saveReportDraftApi(eventId, content);
            alert("Draft saved successfully.");
        } catch (error) {
            console.error(error);
            alert("Failed to save draft.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async () => {
        if(window.confirm("Submit final report? You will not be able to edit it after submission.")) {
            setIsSaving(true);
            try {
                await submitReportApi(eventId, { content });
                alert("Report successfully generated and submitted to Admin.");
                navigate('/president/events');
            } catch (error) {
                console.error(error);
                alert("Failed to submit report.");
            } finally {
                setIsSaving(false);
            }
        }
    };

    if (isLoading) return <div className="loading-state">Initializing Report Platform...</div>;
    if (!report || !event) return null;

    const isLocked = report.status === 'submitted' || report.status === 'reviewed';
    const presentCount = registrations.filter(r => r.status === 'Attended').length;
    const absentCount = registrations.length - presentCount;
    const feedbackRecords = registrations.filter(r => r.feedbackResponses && r.feedbackResponses.length > 0);

    const renderInput = (title, field, placeholder, type = 'text') => (
        <div className="editor-section">
            <label>{title}</label>
            <input
                type={type}
                value={content[field] || ''}
                onChange={(e) => handleInputChange(field, e.target.value)}
                placeholder={placeholder}
                disabled={isLocked}
            />
        </div>
    );

    const renderTextarea = (title, field, placeholder) => (
        <div className="editor-section">
            <label>{title}</label>
            <textarea
                value={content[field] || ''}
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
                    <h1>Institutional Event Report</h1>
                    <p>Documenting: <strong>{report.event?.title}</strong></p>
                    <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
                        Last updated by: <strong>{report.president?.name}</strong> ({report.president?.usn}) - <span style={{textTransform: 'capitalize'}}>{report.president?.role}</span>
                    </p>
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
                <h3 className="section-title">A. Basic Event Details</h3>
                <div className="form-grid">
                    {renderInput('1. Activity/Event Name', 'activityName', 'Full name of the event')}
                    {renderInput('2. Thrust Area of the Event', 'thrustArea', 'e.g., Entrepreneurship, Innovation')}
                    {renderInput('3. Level of Activity', 'level', 'e.g., Institute, National, International')}
                    {renderInput('4. Semester', 'semester', 'e.g., Even, Odd')}
                    {renderInput('5. Quarter', 'quarter', 'e.g., Q1, Q2')}
                    {renderInput('6. Date', 'date', 'DD/MM/YYYY')}
                    {renderInput('7. Duration', 'duration', 'e.g., 2 Hours, 1 Day')}
                    {renderInput('8. Number of Faculty Participations', 'facultyCount', 'e.g., 5', 'number')}
                    {renderInput('9. Number of Students Participated', 'studentCount', 'e.g., 120', 'number')}
                    {renderInput('10. Funds Utilized', 'fundsUtilized', 'e.g., ₹5000 / Nil')}
                    {renderInput('11. Department', 'department', 'e.g., CSE, ISE')}
                </div>

                <h3 className="section-title">B. Descriptive Details</h3>
                {renderTextarea('12. Objective', 'objective', 'State the purpose aligned with IIC focus areas...')}
                {renderTextarea('13. Summary', 'summary', 'Describe the execution flow, sessions, and implementations...')}
                {renderTextarea('14. Benefits', 'benefits', 'Explain knowledge gained, skills developed, innovation exposure...')}

                <h3 className="section-title">C. Attachments & Proofs Evidence Preview</h3>
                
                <div className="preview-block" style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#0f172a' }}>1. Event Flyer</h4>
                    {event.bannerUrl ? (
                        <img src={event.bannerUrl} alt="Flyer Evidence" style={{ maxHeight: '250px', maxWidth: '100%', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                    ) : (
                        <div style={{ color: '#dc2626', fontWeight: 600 }}>Not Uploaded</div>
                    )}
                </div>

                <div className="preview-block" style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#0f172a' }}>2. Photo Collage Gallery</h4>
                    {event.gallery && event.gallery.length > 0 ? (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {event.gallery.map(img => (
                                <img key={img.fileId} src={img.url} alt="Gallery Snapshot" style={{ height: '90px', width: '90px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: '#dc2626', fontWeight: 600 }}>Post-event photos not uploaded.</div>
                    )}
                </div>

                <div className="preview-block" style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#0f172a' }}>3. Attendance Sheet Sync</h4>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <span style={{background: 'white', padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9rem'}}>Registered Count: <strong>{registrations.length}</strong></span>
                        <span style={{background: '#dcfce7', padding: '6px 12px', borderRadius: '4px', color: '#166534', fontSize: '0.9rem', fontWeight: 500}}>Present Count: <strong>{presentCount}</strong></span>
                        <span style={{background: '#fee2e2', padding: '6px 12px', borderRadius: '4px', color: '#991b1b', fontSize: '0.9rem', fontWeight: 500}}>Absent Count: <strong>{absentCount}</strong></span>
                    </div>
                    {registrations.length > 0 ? (
                        <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead style={{ background: '#f1f5f9' }}>
                                    <tr>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Student Name</th>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>USN</th>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Registration Status</th>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Attendance Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registrations.map(reg => (
                                        <tr key={reg._id} style={{ borderTop: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '10px' }}>{reg.student?.name}</td>
                                            <td style={{ padding: '10px', fontFamily: 'monospace' }}>{reg.student?.usn}</td>
                                            <td style={{ padding: '10px' }}>Registered</td>
                                            <td style={{ padding: '10px', color: reg.status === 'Attended' ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                                                {reg.status === 'Attended' ? 'Present' : 'Absent'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ color: '#64748b', fontStyle: 'italic' }}>No registrations available.</div>
                    )}
                </div>

                <div className="preview-block" style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: '700', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>4. Feedback Metrics & Analytics Summary</h4>
                    {analytics && analytics.total > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <h5 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#1e293b' }}>Section 1: Feedback Statistics</h5>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                    {analytics.analytics.filter(q => q.type === 'rating').map(q => (
                                        <div key={q.id} style={{ background: 'white', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                                            <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginBottom: '4px' }}>{q.text}</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>Average Rating: {q.average} / 5</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '10px 0' }} />

                            <div>
                                <h5 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#1e293b' }}>Section 2: MCQ / Option Questions</h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {analytics.analytics.filter(q => q.type === 'mcq').map(q => (
                                        <div key={q.id} style={{ background: 'white', padding: '14px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                                            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '8px', fontSize: '0.9rem' }}>{q.text}</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '10px' }}>
                                                {Object.entries(q.breakdown || {}).map(([opt, count]) => {
                                                    const pct = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
                                                    return (
                                                        <div key={opt} style={{ fontSize: '0.9rem', color: '#475569' }}>
                                                            <strong>{opt}</strong>: {count} Students ({pct}%)
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '10px 0' }} />

                            <div>
                                <h5 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#1e293b' }}>Section 3: Individual Student Responses</h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {feedbackRecords.map((reg, sIdx) => (
                                        <div key={reg._id || sIdx} style={{ background: 'white', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '0.95rem', color: '#0f172a', marginBottom: '4px' }}>
                                                <strong>Student:</strong> {reg.student?.name || 'Anonymous'}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '10px' }}>
                                                <strong>USN:</strong> {reg.student?.usn || 'N/A'}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginBottom: '6px', paddingLeft: '8px', borderLeft: '2px solid #cbd5e1' }}>
                                                Responses:
                                            </div>
                                            <div style={{ paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {reg.feedbackResponses?.map((resp, rIdx) => {
                                                    const templateQ = event.feedbackQuestions?.find(q => q.id === resp.questionId);
                                                    const isRating = templateQ ? templateQ.type === 'rating' : typeof resp.answer === 'number';
                                                    return (
                                                        <div key={resp.questionId || rIdx} style={{ fontSize: '0.9rem', color: '#334155' }}>
                                                            <span style={{ color: '#475569', fontStyle: 'italic' }}>{resp.questionText}</span>
                                                            <div style={{ color: '#0f172a', fontWeight: '500', marginTop: '2px', paddingLeft: '10px' }}>
                                                                {isRating ? `${resp.answer}/5` : Array.isArray(resp.answer) ? resp.answer.join(', ') : resp.answer}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ color: '#64748b', fontStyle: 'italic' }}>No feedback submitted for this event.</div>
                    )}
                </div>

                <div className="section-header-flex" style={{ marginTop: '24px' }}>
                    <h3 className="section-title">15. Details of Resource Person(s) / Speakers</h3>
                    {!isLocked && (
                        <button className="btn-add-small" onClick={handleAddResourcePerson}>
                            <i className="ri-add-line"></i> Add Speaker
                        </button>
                    )}
                </div>
                
                {content.resourcePersons.map((rp, index) => (
                    <div key={index} className="resource-person-card">
                        <div className="card-top">
                            <h4>Resource Person {index + 1}</h4>
                            {!isLocked && (
                                <button className="btn-remove" onClick={() => handleRemoveResourcePerson(index)}>
                                    <i className="ri-delete-bin-line"></i> Remove
                                </button>
                            )}
                        </div>
                        <div className="form-grid">
                            <div className="editor-section">
                                <label>Name</label>
                                <input type="text" value={rp.name} onChange={(e) => handleResourcePersonChange(index, 'name', e.target.value)} disabled={isLocked} />
                            </div>
                            <div className="editor-section">
                                <label>Industry/Company/Organization</label>
                                <input type="text" value={rp.industry} onChange={(e) => handleResourcePersonChange(index, 'industry', e.target.value)} disabled={isLocked} />
                            </div>
                            <div className="editor-section">
                                <label>Designation</label>
                                <input type="text" value={rp.designation} onChange={(e) => handleResourcePersonChange(index, 'designation', e.target.value)} disabled={isLocked} />
                            </div>
                            <div className="editor-section">
                                <label>Mobile Number</label>
                                <input type="text" value={rp.mobile} onChange={(e) => handleResourcePersonChange(index, 'mobile', e.target.value)} disabled={isLocked} />
                            </div>
                            <div className="editor-section">
                                <label>Email ID</label>
                                <input type="email" value={rp.email} onChange={(e) => handleResourcePersonChange(index, 'email', e.target.value)} disabled={isLocked} />
                            </div>
                            <div className="editor-section">
                                <label>Address</label>
                                <input type="text" value={rp.address} onChange={(e) => handleResourcePersonChange(index, 'address', e.target.value)} disabled={isLocked} />
                            </div>
                        </div>
                    </div>
                ))}
                {content.resourcePersons.length === 0 && <p className="empty-hint">No resource persons added yet.</p>}

                <h3 className="section-title" style={{ marginTop: '20px' }}>D. Coordination</h3>
                {renderTextarea('16. Names of Faculty Coordinators', 'facultyCoordinators', 'List all faculty coordinators (comma-separated or line-by-line)...')}
                {renderTextarea('17. Names of Student Coordinators', 'studentCoordinators', 'List all student coordinators (comma-separated or line-by-line)...')}
            </div>
        </div>
    );
};

export default ReportEditor;