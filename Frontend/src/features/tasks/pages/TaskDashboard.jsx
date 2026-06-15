import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../api/axiosInstance';
import '../../students/style/Students.scss';
import { formatDate } from '../../../utils/dateFormat';
import useAuthorizedTasks from '../hooks/useAuthorizedTasks';
import SearchableSelect from '../../../components/common/SearchableSelect';
const dateInputValue = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';

const TaskDashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const { tasks, isLoading: loading, refresh } = useAuthorizedTasks();

    const assignTo = async (task, assignee, dueAt = task.dueAt) => {
        await axiosInstance.patch(`/tasks/${task._id}/assign`, { assignee, dueAt: dueAt || null });
        window.dispatchEvent(new CustomEvent('clubhub:tasks-mutated'));
        refresh();
    };

    const takeOver = async (task) => {
        await axiosInstance.patch(`/tasks/${task._id}/take-over`);
        window.dispatchEvent(new CustomEvent('clubhub:tasks-mutated'));
        refresh();
    };

    const updateDueDate = async (task, dueAt) => {
        await axiosInstance.patch(`/tasks/${task._id}/schedule`, { dueAt: dueAt || null });
        window.dispatchEvent(new CustomEvent('clubhub:tasks-mutated'));
        refresh();
    };

    const openWorkspace = async (task) => {
        if (['assigned', 'reopened'].includes(task.status)) {
            await axiosInstance.patch(`/tasks/${task._id}/status`, { status: 'in_progress' });
        }
        const eventId = task.event?._id;
        const routes = {
            poster: `/president/grafik/events/${eventId}/banner`,
            gallery_upload: `/president/grafik/events/${eventId}/gallery`,
            attendance: `/president/pr/events/${eventId}`,
            social_media: `/president/pr/events/${eventId}/share`
        };
        navigate(routes[task.type] || '/president/tasks');
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading assigned work...</div>;

    return (
        <div className="students-page">
            <div className="page-header-actions">
                <div className="title-section">
                    <h1>Event Work Assignments</h1>
                    <p>Realtime poster, attendance, social-media, and gallery responsibilities.</p>
                </div>
            </div>
            <div className="table-container">
                <table className="data-table">
                    <thead><tr><th>Event</th><th>Task</th><th>Responsible Club</th><th>Assignee</th><th>Dates</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        {tasks.map((task) => {
                            const isResponsiblePresident = task.responsibleClub?.president === user?._id || task.responsibleClub?.president?._id === user?._id;
                            const canIntervene = ['faculty_coordinator', 'admin'].includes(user?.role);
                            const candidates = [task.responsibleClub?.president, ...(task.responsibleClub?.members || [])].filter(Boolean);
                            const isLocked = ['completed', 'cancelled'].includes(task.status)
                                || (task.type === 'poster' && ['submitted_to_faculty', 'submitted_to_hod'].includes(task.stage));
                            return (
                                <tr key={task._id}>
                                    <td>{task.event?.title}</td>
                                    <td style={{ textTransform: 'capitalize' }}>{task.type.replace('_', ' ')}</td>
                                    <td>{task.responsibleClub?.name}</td>
                                    <td>
                                        {task.assignee?.name || 'Unassigned'}
                                        {task.assignee?.usn && <div className="student-usn">{task.assignee.usn}</div>}
                                        {task.audit?.some((entry) => entry.action === 'president_takeover') && <div className="student-usn">President handled / taken over</div>}
                                    </td>
                                    <td>
                                        <div>Assigned: {formatDate(task.assignedAt)}</div>
                                        <div>Due: {formatDate(task.dueAt)}</div>
                                    </td>
                                    <td>{(task.stage || task.status).replaceAll('_', ' ')}</td>
                                    <td>
                                        <div className="task-actions">
                                            {(isResponsiblePresident || canIntervene) && !isLocked && (
                                                <>
                                                    <SearchableSelect value={task.assignee?._id || ''} onChange={(value) => assignTo(task, value)} placeholder={`Search assignee for ${task.type}`} options={candidates.map((member) => ({ value: member._id, label: `${member.name} (${member.usn})` }))} />
                                                    {task.assignee && <input aria-label={`Due date for ${task.type}`} type="date" defaultValue={dateInputValue(task.dueAt)} onChange={(event) => updateDueDate(task, event.target.value)} />}
                                                </>
                                            )}
                                            {isResponsiblePresident && task.assignee?._id !== user?._id && !isLocked && <button className="btn-secondary" onClick={() => takeOver(task)}>Take Over</button>}
                                            {task.assignee?._id === user?._id && !isLocked && <button className="btn-primary" onClick={() => openWorkspace(task)}>Start</button>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {tasks.length === 0 && <div style={{ padding: 40, textAlign: 'center' }}>No work assignments yet.</div>}
            </div>
        </div>
    );
};

export default TaskDashboard;
