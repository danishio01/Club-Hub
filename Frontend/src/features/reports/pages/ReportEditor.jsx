import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReportByEventApi, saveReportDraftApi, submitReportApi } from '../service/reportService';
import '../style/ReportEditor.scss';

const ReportEditor = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    
    const [report, setReport] = useState(null);
    const [content, setContent] = useState({
        activityName: '', thrustArea: '', level: '', semester: '', quarter: '', date: '', duration: '',
        facultyCount: '', studentCount: '', fundsUtilized: '', department: '',
        objective: '', summary: '', benefits: '',
        registrationDetails: '', feedbackDetails: '', flyers: '', photoCollage: '',
        socialMedia: { instagram: '', facebook: '', twitter: '' },
        resourcePersons: [],
        facultyCoordinators: '', studentCoordinators: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const loadReport = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await getReportByEventApi(eventId);
            setReport(data);
            if (data.content) {
                setContent(prev => ({
                    ...prev,
                    ...data.content,
                    socialMedia: data.content.socialMedia || { instagram: '', facebook: '', twitter: '' },
                    resourcePersons: data.content.resourcePersons || []
                }));
            }
        } catch (error) {
            console.error(error);
            alert("Failed to load report platform.");
            navigate('/president/events');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, navigate]);

    useEffect(() => {
        loadReport();
    }, [loadReport]);

    const handleInputChange = (field, value) => {
        setContent(prev => ({ ...prev, [field]: value }));
    };

    const handleSocialMediaChange = (platform, value) => {
        setContent(prev => ({
            ...prev,
            socialMedia: { ...prev.socialMedia, [platform]: value }
        }));
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
    if (!report) return null;

    const isLocked = report.status === 'submitted' || report.status === 'reviewed';

    const renderInput = (title, field, placeholder, type = 'text') => (
        <div className="editor-section">
            <label>{title}</label>
            <input
                type={type}
                value={content[field]}
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
                    <h1>Institutional Event Report</h1>
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

                <h3 className="section-title">C. Attachments & Proofs (Drive/Cloud Links)</h3>
                <div className="form-grid">
                    {renderInput('15. Registration / Attendance Sheet Link', 'registrationDetails', 'URL to attendance sheet')}
                    {renderInput('16. Feedback Form / Graphs Link', 'feedbackDetails', 'URL to feedback analysis')}
                    {renderInput('17. Event Flyers Link', 'flyers', 'URL to promotional materials')}
                    {renderInput('18. Photo Collage Link', 'photoCollage', 'URL to event photos')}
                </div>

                <h3 className="section-title">19. Social Media Handles</h3>
                <div className="form-grid">
                    <div className="editor-section">
                        <label>Instagram Link</label>
                        <input type="text" value={content.socialMedia.instagram} onChange={(e) => handleSocialMediaChange('instagram', e.target.value)} disabled={isLocked} />
                    </div>
                    <div className="editor-section">
                        <label>Facebook Link</label>
                        <input type="text" value={content.socialMedia.facebook} onChange={(e) => handleSocialMediaChange('facebook', e.target.value)} disabled={isLocked} />
                    </div>
                    <div className="editor-section">
                        <label>Twitter Link</label>
                        <input type="text" value={content.socialMedia.twitter} onChange={(e) => handleSocialMediaChange('twitter', e.target.value)} disabled={isLocked} />
                    </div>
                </div>

                <div className="section-header-flex">
                    <h3 className="section-title">20. Details of Resource Person(s) / Speakers</h3>
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
                {renderTextarea('21. Names of Faculty Coordinators', 'facultyCoordinators', 'List all faculty coordinators (comma-separated or line-by-line)...')}
                {renderTextarea('22. Names of Student Coordinators', 'studentCoordinators', 'List all student coordinators (comma-separated or line-by-line)...')}
            </div>
        </div>
    );
};

export default ReportEditor;