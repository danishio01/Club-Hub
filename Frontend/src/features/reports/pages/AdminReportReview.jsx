import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllAdminReportsList, reviewReportApi } from '../service/reportService';
import '../style/AdminReportReview.scss';

const AdminReportReview = () => {
    const dispatch = useDispatch();
    const { reports, isLoading } = useSelector((state) => state.reports);
    
    const [selectedReport, setSelectedReport] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadReports = useCallback(() => {
        dispatch(getAllAdminReportsList());
    }, [dispatch]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const handleReviewSubmit = async () => {
        setIsSubmitting(true);
        try {
            await reviewReportApi(selectedReport._id, remarks);
            alert("Report successfully marked as reviewed.");
            setSelectedReport(null);
            setRemarks('');
            loadReports();
        } catch (error) {
            console.error(error);
            alert("Failed to submit review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderTextSection = (title, content) => (
        <div className="report-block">
            <h4>{title}</h4>
            <p>{content || <span className="no-data">Not provided</span>}</p>
        </div>
    );

    const renderReportDetails = () => (
        <div className="report-modal-overlay">
            <div className="report-modal-container">
                <div className="modal-header">
                    <div>
                        <h2>{selectedReport.event?.title}</h2>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', textTransform: 'capitalize' }}>
                            Submitted by {selectedReport.president?.name} ({selectedReport.president?.role}) from {selectedReport.club?.name}
                        </p>
                    </div>
                    <button className="close-btn" onClick={() => setSelectedReport(null)}><i className="ri-close-line"></i></button>
                </div>
                <div className="modal-body">
                    <div className="report-content-grid">
                        {renderTextSection('1. Activity/Event Name', selectedReport.content.activityName)}
                        {renderTextSection('2. Thrust Area', selectedReport.content.thrustArea)}
                        {renderTextSection('3. Level of Activity', selectedReport.content.level)}
                        {renderTextSection('4. Semester', selectedReport.content.semester)}
                        {renderTextSection('5. Quarter', selectedReport.content.quarter)}
                        {renderTextSection('6. Date', selectedReport.content.date)}
                        {renderTextSection('7. Duration', selectedReport.content.duration)}
                        {renderTextSection('8. Faculty Participations', selectedReport.content.facultyCount)}
                        {renderTextSection('9. Student Participations', selectedReport.content.studentCount)}
                        {renderTextSection('10. Funds Utilized', selectedReport.content.fundsUtilized)}
                        {renderTextSection('11. Department', selectedReport.content.department)}
                    </div>
                    
                    <hr className="divider" />
                    {renderTextSection('12. Objective', selectedReport.content.objective)}
                    {renderTextSection('13. Summary', selectedReport.content.summary)}
                    {renderTextSection('14. Benefits', selectedReport.content.benefits)}

                    <hr className="divider" />
                    <div className="report-block">
                        <h4>Attachments & Proofs</h4>
                        <p className="no-data">Event Flyer, Photo Gallery, Attendance Sheet, and Feedback Analytics are automatically compiled and embedded in the generated PDF.</p>
                    </div>

                    <hr className="divider" />
                    <div className="report-block">
                        <h4>19. Resource Persons</h4>
                        {selectedReport.content.resourcePersons && selectedReport.content.resourcePersons.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {selectedReport.content.resourcePersons.map((rp, i) => (
                                    <div key={i} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#475569' }}>
                                        <strong>Speaker {i + 1}:</strong> {rp.name || 'N/A'} <br/>
                                        <strong>Industry:</strong> {rp.industry || 'N/A'} | <strong>Designation:</strong> {rp.designation || 'N/A'} <br/>
                                        <strong>Contact:</strong> {rp.mobile || 'N/A'} / {rp.email || 'N/A'} <br/>
                                        <strong>Address:</strong> {rp.address || 'N/A'}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-data">No resource persons listed.</p>
                        )}
                    </div>

                    <hr className="divider" />
                    {renderTextSection('20. Faculty Coordinators', selectedReport.content.facultyCoordinators)}
                    {renderTextSection('21. Student Coordinators', selectedReport.content.studentCoordinators)}

                    {selectedReport.pdfUrl && (
                        <div className="pdf-download-section" style={{ marginTop: '24px' }}>
                            <i className="ri-file-pdf-fill"></i>
                            <div>
                                <strong>System Generated PDF Available</strong>
                                <a href={selectedReport.pdfUrl} target="_blank" rel="noreferrer">Download / View Document</a>
                            </div>
                        </div>
                    )}

                    <div className="admin-remarks-input" style={{ marginTop: '24px' }}>
                        <label>Admin Feedback / Remarks</label>
                        <textarea 
                            rows="3" 
                            placeholder="Add internal remarks or feedback for the club..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            disabled={selectedReport.status === 'reviewed'}
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={() => setSelectedReport(null)}>Close</button>
                    {selectedReport.status === 'submitted' && (
                        <button className="btn-primary" onClick={handleReviewSubmit} disabled={isSubmitting}>
                            {isSubmitting ? 'Processing...' : 'Mark as Reviewed'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="admin-report-review-page">
            <div className="page-header">
                <h1>Report Reviews</h1>
                <p>Review and archive Institutional Post-Action Event Reports submitted by Club Presidents.</p>
            </div>

            {isLoading ? (
                <div className="empty-state">Loading submitted reports...</div>
            ) : reports.length === 0 ? (
                <div className="empty-state">
                    <i className="ri-file-list-3-line" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}></i>
                    <h3>No Reports Available</h3>
                    <p>There are currently no submitted reports waiting for your review.</p>
                </div>
            ) : (
                <div className="reports-grid">
                    {reports.map(report => (
                        <div key={report._id} className="report-card">
                            <div className="card-header">
                                <span className={`status-badge ${report.status}`}>{report.status}</span>
                                <span className="date-text">{new Date(report.submittedAt).toLocaleDateString()}</span>
                            </div>
                            <h3>{report.event?.title}</h3>
                            <div className="meta-text">
                                <i className="ri-team-line"></i> {report.club?.name}
                            </div>
                            <div className="meta-text" style={{ textTransform: 'capitalize' }}>
                                <i className="ri-user-line"></i> Submitted by {report.president?.name} ({report.president?.role})
                            </div>
                            <button className="btn-primary outline" onClick={() => {
                                setSelectedReport(report);
                                setRemarks(report.adminRemarks || '');
                            }}>
                                Open Report
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {selectedReport && renderReportDetails()}
        </div>
    );
};

export default AdminReportReview;