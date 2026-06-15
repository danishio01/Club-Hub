import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/GrafikDashboard.scss';
import { formatDate } from '../../../utils/dateFormat';
import { takeOverTaskApi } from '../../tasks/service/taskService';
import { useSelector } from 'react-redux';
import useAuthorizedTasks from '../../tasks/hooks/useAuthorizedTasks';

const GrafikDashboard = () => {
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const { tasks, isLoading, refresh } = useAuthorizedTasks({ type: 'poster', specialRole: 'grafik' });

    const takeOver = async (task) => {
        await takeOverTaskApi(task._id);
        await refresh();
    };

    const renderEventCard = (task, badgeClass, statusLabel) => {
        const event = task.event;
        if (!event) return null;
        const isGrafikPresident = user?.role === 'president' && user?.specialClubRole === 'grafik';
        const isLocked = ['completed', 'cancelled'].includes(task.status)
            || ['submitted_to_faculty', 'submitted_to_hod'].includes(task.stage);
        return (
        <div key={task._id} className="grafik-card">
            <div className="card-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="club-badge">{event.club?.name}</span>
                    <span className={`status-badge ${badgeClass}`}>{statusLabel}</span>
                </div>
                <h3>{event.title}</h3>
                <p><i className="ri-user-line"></i> {event.creator?.name || 'Unknown'} ({event.creator?.role || 'N/A'})</p>
                <p><i className="ri-calendar-line"></i> {formatDate(event.date)}</p>
                <p><i className="ri-palette-line"></i> Work: Poster Creation</p>
                <p><i className="ri-user-settings-line"></i> Assigned to: {task?.assignee?.name || 'Unassigned'}</p>
                <p><i className="ri-task-line"></i> Stage: {(task?.stage || task?.status || 'not created').replaceAll('_', ' ')}</p>
                <p><i className="ri-calendar-check-line"></i> Assigned: {formatDate(task?.assignedAt)}</p>
                <p><i className="ri-alarm-warning-line"></i> Due: {formatDate(task?.dueAt)}</p>
            </div>
            
            {event.bannerUrl ? (
                <div className="banner-preview">
                    <img src={event.bannerUrl} alt="Flyer" />
                </div>
            ) : (
                <div className="banner-preview empty">
                    <i className="ri-image-line"></i>
                    <span>No Flyer</span>
                </div>
            )}

            <div className="card-actions">
                {isGrafikPresident && task.assignee?._id !== user?._id && !isLocked && (
                    <button className="btn-manage" onClick={() => takeOver(task)}>
                        <i className="ri-user-star-line"></i> Take Over
                    </button>
                )}
                {!isLocked && <button
                    className="btn-manage" 
                    onClick={() => navigate(`/president/grafik/events/${event._id}/banner`)}
                >
                    <i className="ri-image-edit-line"></i> Open Poster Creation
                </button>}
            </div>
        </div>
    )};

    const activeWork = tasks.filter(task => task.status !== 'completed');
    const completedWork = tasks.filter(task => task.status === 'completed');

    return (
        <div className="grafik-dashboard-page">
            <div className="header-section">
                <h1>Poster Work / Poster Creation</h1>
                <p>Assigned members see their poster tasks. The Grafik President sees the full club queue.</p>
            </div>
            
            {isLoading ? (
                <div className="loading-state">Loading dashboard data...</div>
            ) : activeWork.length === 0 && completedWork.length === 0 ? (
                <div className="placeholder-container">
                    <i className="ri-image-edit-fill placeholder-icon"></i>
                    <h2>{user?.role === 'president' ? 'No active Grafik poster tasks' : 'No poster tasks assigned to you'}</h2>
                </div>
            ) : (
                <div className="dashboard-sections">
                    {activeWork.length > 0 && (
                        <div className="section-block">
                            <h2 className="section-title primary"><i className="ri-magic-line"></i> Assigned Grafik Work</h2>
                            <div className="grafik-grid">
                                {activeWork.map(task => renderEventCard(task, 'pending', task.status))}
                            </div>
                        </div>
                    )}

                    {completedWork.length > 0 && (
                        <div className="section-block">
                            <h2 className="section-title success"><i className="ri-check-double-line"></i> Completed Grafik Work</h2>
                            <div className="grafik-grid">
                                {completedWork.map(task => renderEventCard(task, 'success', 'Completed'))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GrafikDashboard;
