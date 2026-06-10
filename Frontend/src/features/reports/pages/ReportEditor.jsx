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
                    console.error("No analytics found", e);
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
                await submitReportApi(eventId, content);
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

                <h3 className="section-title">C. Attachments & Proofs (Data Preview)</h3>
                
                <div className="preview-block">
                    <h4>1. Event Flyer</h4>
                    {event.bannerUrl ? (
                        <img src={event.bannerUrl} alt="Flyer" style={{ maxHeight: '200px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    ) : (
                        <div className="preview-empty">Not Uploaded</div>
                    )}
                </div>

                <div className="preview-block">
                    <h4>2. Post Event Photos (Gallery)</h4>
                    {event.gallery && event.gallery.length > 0 ? (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {event.gallery.map(img => (
                                <img key={img.fileId} src={img.url} alt="Gallery" style={{ height: '80px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                            ))}
                        </div>
                    ) : (
                        <div className="preview-empty">Post-event photos not uploaded.</div>
                    )}
                </div>

                <div className="preview-block">
                    <h4>3. Attendance & Registration Sheet</h4>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                        <span style={{background: '#f1f5f9', padding: '4px 10px', borderRadius: '4px'}}>Total: <strong>{registrations.length}</strong></span>
                        <span style={{background: '#dcfce7', padding: '4px 10px', borderRadius: '4px', color: '#166534'}}>Present: <strong>{presentCount}</strong></span>
                        <span style={{background: '#fee2e2', padding: '4px 10px', borderRadius: '4px', color: '#991b1b'}}>Absent: <strong>{absentCount}</strong></span>
                    </div>
                    {registrations.length > 0 ? (
                        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>Student Name</th>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>USN</th>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>Dept</th>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>Registration</th>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>Attendance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registrations.slice(0, 5).map(reg => (
                                        <tr key={reg._id} style={{ borderTop: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '8px' }}>{reg.student?.name}</td>
                                            <td style={{ padding: '8px' }}>{reg.student?.usn}</td>
                                            <td style={{ padding: '8px' }}>{reg.student?.department}</td>
                                            <td style={{ padding: '8px' }}>Registered</td>
                                            <td style={{ padding: '8px', color: reg.status === 'Attended' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                                                {reg.status === 'Attended' ? 'Present' : 'Absent'}
                                            </td>
                                        </tr>
                                    ))}
                                    {registrations.length > 5 && <tr><td colSpan="5" style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>+{registrations.length - 5} more entries...</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="preview-empty">No registrations available.</div>
                    )}
                </div>

                <div className="preview-block">
                    <h4>4. Feedback Analytics</h4>
                    {analytics && analytics.total > 0 ? (
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Total Feedback Submissions: {analytics.total}</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                                {analytics.analytics.filter(q => q.type === 'rating').map(q => (
                                    <div key={q.id} style={{ background: 'white', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}>
                                        <div style={{ color: '#475569', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.text}</div>
                                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{q.average} ⭐</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="preview-empty">No feedback submitted for this event.</div>
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