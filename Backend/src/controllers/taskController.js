import EventTask from '../models/eventTaskModel.js';
import Event from '../models/eventModel.js';
import Club from '../models/clubModel.js';
import Admin from '../models/adminModel.js';
import { dispatchNotification, executeDynamicLifecycleBroadcasting } from '../services/notificationService.js';
import { emitToRooms, emitWorkflowUpdate } from '../services/socketService.js';
import { buildVisibleTaskFilter, canAccessTask, SPECIAL_ROLES, TASK_TYPES } from '../services/taskAccessService.js';

const taskPopulate = [
    {
        path: 'event',
        select: 'title description status club creator date time venue bannerUrl gallery galleryStatus eventType price maxParticipants',
        populate: [
            { path: 'club', select: 'name isActive president members' },
            { path: 'creator.student', select: 'name usn email' }
        ]
    },
    { path: 'sourceClub', select: 'name president logoUrl specialRole' },
    {
        path: 'responsibleClub',
        select: 'name president logoUrl specialRole members',
        populate: [
            { path: 'president', select: 'name usn' },
            { path: 'members', select: 'name usn' }
        ]
    },
    { path: 'assignee', select: 'name usn email' },
    { path: 'assignedBy', select: 'name usn' }
];

export const emitTaskChanged = (task, extraRooms = []) => emitToRooms([
    `club:${task.sourceClub}`,
    `club:${task.responsibleClub}`,
    task.assignee ? `user:${task.assignee}` : null,
    ...extraRooms,
    'role:faculty_coordinator',
    'role:hod'
], 'tasks:changed', {
    taskId: String(task._id),
    eventId: String(task.event),
    status: task.status,
    stage: task.stage
});

const notifyTask = async (task, type, title, message, actorId, extraRecipients = []) => {
    const recipients = new Set();
    const sourceClub = await Club.findById(task.sourceClub).select('president');
    const responsibleClub = await Club.findById(task.responsibleClub).select('president members');
    if (sourceClub?.president) recipients.add(String(sourceClub.president));
    if (responsibleClub?.president) recipients.add(String(responsibleClub.president));
    (responsibleClub?.members || []).forEach((member) => recipients.add(String(member)));
    if (task.assignee) recipients.add(String(task.assignee));
    extraRecipients.filter(Boolean).forEach((recipient) => recipients.add(String(recipient)));
    (await Admin.find({ role: 'faculty_coordinator', active: true }).select('_id'))
        .forEach((staff) => recipients.add(String(staff._id)));
    (await Admin.find({ role: 'hod', active: true }).select('_id'))
        .forEach((staff) => recipients.add(String(staff._id)));
    if (actorId) recipients.delete(String(actorId));
    await dispatchNotification({
        recipients: [...recipients],
        title,
        message,
        type,
        referenceId: task.event,
        idempotencyKey: `task:${task._id}:${type}:${task.status}:${task.audit?.length || 0}`
    });
    emitTaskChanged(task, extraRecipients.map((recipient) => `user:${recipient}`));
};

export const createTaskForEvent = async (event, type, specialRole) => {
    const responsibleClub = await Club.findOne({ specialRole });
    if (!responsibleClub) {
        const error = new Error(`A designated ${specialRole.toUpperCase()} club is required`);
        error.code = 'SPECIAL_CLUB_REQUIRED';
        throw error;
    }
    const defaultAssignee = type === 'social_media' ? responsibleClub.president : null;
    const task = await EventTask.findOneAndUpdate(
        { event: event._id, type },
        {
            $setOnInsert: {
                event: event._id,
                sourceClub: event.club?._id || event.club,
                responsibleClub: responsibleClub._id,
                assignee: defaultAssignee,
                assignedBy: defaultAssignee,
                assignedAt: defaultAssignee ? new Date() : null,
                status: defaultAssignee ? 'assigned' : 'unassigned',
                audit: []
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await notifyTask(task, 'TASK_CREATED', `${type.replace('_', ' ')} task created`, `A new task was created for "${event.title}".`);
    return task;
};

export const activateTaskForEvent = async (event, type, specialRole, actorId) => {
    const task = await createTaskForEvent(event, type, specialRole);
    if (task.status === 'cancelled') task.status = task.assignee ? 'assigned' : 'unassigned';
    const alreadyActivated = task.audit.some((entry) => entry.action === 'activated_on_event_completion');
    if (!alreadyActivated) {
        task.audit.push({
            action: 'activated_on_event_completion',
            actor: actorId,
            actorModel: 'Student',
            note: `Activated when event "${event.title}" completed`
        });
        await task.save();
        await notifyTask(task, 'TASK_ACTIVATED', 'Social-media work activated', `Social-media work for "${event.title}" is ready.`, null);
    }
    return task;
};

export const finalizeTaskForEvent = async (event, type, actorId) => {
    const task = await EventTask.findOne({ event: event._id, type });
    if (!task || task.status === 'completed') return task;
    task.status = 'completed';
    task.stage = 'completed';
    task.completedAt = new Date();
    task.audit.push({
        action: 'completed',
        actor: actorId,
        actorModel: 'Student',
        note: `Automatically finalized when event "${event.title}" completed`
    });
    await task.save();
    await notifyTask(task, 'TASK_COMPLETED', 'Task completed', `The ${type.replace('_', ' ')} task was finalized when "${event.title}" completed.`, actorId);
    return task;
};

const isResponsiblePresident = async (task, user) => Boolean(await Club.exists({ _id: task.responsibleClub, president: user._id }));
const assignmentLocked = (task) => (
    ['completed', 'cancelled'].includes(task.status)
    || (task.type === 'poster' && ['submitted_to_faculty', 'submitted_to_hod'].includes(task.stage))
);

export const getTasks = async (req, res) => {
    const baseFilter = {};
    if (req.query.event) baseFilter.event = req.query.event;
    if (req.query.status) baseFilter.status = req.query.status;
    if (req.query.type) {
        if (!TASK_TYPES.includes(req.query.type)) return res.status(400).json({ success: false, message: 'Invalid task type' });
        baseFilter.type = req.query.type;
    }
    if (req.query.specialRole) {
        if (!SPECIAL_ROLES.includes(req.query.specialRole)) return res.status(400).json({ success: false, message: 'Invalid special club role' });
        baseFilter.responsibleClub = { $in: await Club.distinct('_id', { specialRole: req.query.specialRole }) };
    }
    const filter = await buildVisibleTaskFilter(req.user, baseFilter);
    const tasks = await EventTask.find(filter).populate(taskPopulate).sort({ createdAt: -1 });
    return res.json({ success: true, data: tasks });
};

export const assignTask = async (req, res) => {
    const task = await EventTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (assignmentLocked(task)) return res.status(409).json({ success: false, message: 'This task is locked during approval or after completion' });
    const facultyIntervention = ['admin', 'faculty_coordinator'].includes(req.user.role);
    if (!facultyIntervention && !await isResponsiblePresident(task, req.user)) {
        return res.status(403).json({ success: false, message: 'Only the responsible club President or Faculty Coordinator can assign this task' });
    }
    const member = await Club.exists({
        _id: task.responsibleClub,
        $or: [{ president: req.body.assignee }, { members: req.body.assignee }]
    });
    if (!member) return res.status(400).json({ success: false, message: 'Assignee must belong to the responsible club' });
    task.assignee = req.body.assignee;
    task.assignedBy = req.user._id;
    task.assignedAt = new Date();
    if (req.body.dueAt !== undefined) {
        const dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
        if (dueAt && Number.isNaN(dueAt.getTime())) return res.status(400).json({ success: false, message: 'Invalid task due date' });
        task.dueAt = dueAt;
    }
    task.status = 'assigned';
    task.stage = 'assigned';
    task.audit.push({ action: facultyIntervention ? 'faculty_reassigned' : 'assigned', actor: req.user._id, actorModel: facultyIntervention ? 'Admin' : 'Student', note: req.body.note });
    await task.save();
    await notifyTask(task, 'TASK_ASSIGNED', 'Task assigned', `The ${task.type.replace('_', ' ')} task was assigned.`, req.user._id);
    return res.json({ success: true, data: await EventTask.findById(task._id).populate(taskPopulate) });
};

export const takeOverTask = async (req, res) => {
    const task = await EventTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (!await isResponsiblePresident(task, req.user)) {
        return res.status(403).json({ success: false, message: 'Only the responsible club President can take over this task' });
    }
    if (assignmentLocked(task)) return res.status(409).json({ success: false, message: 'This task is locked during approval or after completion' });
    const previousAssignee = task.assignee;
    task.assignee = req.user._id;
    task.assignedBy = req.user._id;
    task.assignedAt = new Date();
    task.status = 'assigned';
    task.stage = task.stage?.startsWith('rejected_') ? task.stage : 'assigned';
    task.audit.push({
        action: 'president_takeover',
        actor: req.user._id,
        actorModel: 'Student',
        previousAssignee,
        takenOverBy: req.user._id,
        reason: req.body?.reason || null,
        note: req.body?.reason || 'President took over the task'
    });
    await task.save();
    await notifyTask(task, 'TASK_REASSIGNED', 'President took over task', `The ${task.type.replace('_', ' ')} task was taken over by the responsible club President.`, req.user._id, [previousAssignee]);
    return res.json({ success: true, data: await EventTask.findById(task._id).populate(taskPopulate) });
};

export const updateTaskSchedule = async (req, res) => {
    const task = await EventTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (assignmentLocked(task)) return res.status(409).json({ success: false, message: 'This task is locked during approval or after completion' });
    const faculty = ['admin', 'faculty_coordinator'].includes(req.user.role);
    if (!faculty && !await isResponsiblePresident(task, req.user)) {
        return res.status(403).json({ success: false, message: 'Only the responsible club President or Faculty Coordinator can update the due date' });
    }
    const dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
    if (dueAt && Number.isNaN(dueAt.getTime())) return res.status(400).json({ success: false, message: 'Invalid task due date' });
    task.dueAt = dueAt;
    task.audit.push({ action: 'due_date_updated', actor: req.user._id, actorModel: faculty ? 'Admin' : 'Student', note: dueAt ? `Due ${dueAt.toISOString()}` : 'Due date cleared' });
    await task.save();
    await notifyTask(task, 'TASK_UPDATED', 'Task due date updated', `The ${task.type.replace('_', ' ')} task due date was updated.`, req.user._id);
    return res.json({ success: true, data: await EventTask.findById(task._id).populate(taskPopulate) });
};

export const updateTaskStatus = async (req, res) => {
    const task = await EventTask.findById(req.params.id);
    if (!task || !await canAccessTask(task, req.user)) return res.status(404).json({ success: false, message: 'Task not found' });
    if (assignmentLocked(task)) return res.status(409).json({ success: false, message: 'This task is locked during approval or after completion' });
    const faculty = ['admin', 'faculty_coordinator'].includes(req.user.role);
    const responsiblePresident = await isResponsiblePresident(task, req.user);
    if (!faculty && !responsiblePresident && String(task.assignee || '') !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const allowed = faculty || responsiblePresident
        ? ['in_progress', 'reopened', 'cancelled']
        : ['in_progress'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ success: false, message: 'Invalid task transition' });
    task.status = req.body.status;
    if (req.body.status === 'in_progress') task.stage = 'in_progress';
    if (req.body.dueAt !== undefined && (faculty || responsiblePresident)) {
        const dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
        if (dueAt && Number.isNaN(dueAt.getTime())) return res.status(400).json({ success: false, message: 'Invalid task due date' });
        task.dueAt = dueAt;
    }
    task.audit.push({ action: req.body.status, actor: req.user._id, actorModel: faculty ? 'Admin' : 'Student', note: req.body.note });
    await task.save();
    await notifyTask(task, 'TASK_UPDATED', 'Task updated', `The ${task.type.replace('_', ' ')} task is now ${task.status}.`, req.user._id);
    return res.json({ success: true, data: task });
};

export const completeTask = async (req, res) => {
    const task = await EventTask.findById(req.params.id);
    if (!task || !await canAccessTask(task, req.user)) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.type === 'poster') return res.status(400).json({ success: false, message: 'Poster tasks must use the poster approval flow' });
    if (task.status === 'completed') return res.status(409).json({ success: false, message: 'Task is already completed' });
    if (task.status === 'cancelled') return res.status(409).json({ success: false, message: 'Cancelled tasks cannot be completed' });
    if (String(task.assignee || '') !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Only the assigned responsible user can mark this task completed' });
    }

    task.status = 'completed';
    task.stage = 'completed';
    task.completedAt = new Date();
    task.submission = { text: req.body?.text || 'Marked completed', url: req.body?.url || null };
    task.audit.push({ action: 'completed', actor: req.user._id, actorModel: 'Student', note: req.body?.text || 'Marked completed' });
    await task.save();

    const event = await Event.findById(task.event);
    if (event && task.type === 'gallery_upload') {
        event.galleryStatus = 'approved';
        await event.save();
        await executeDynamicLifecycleBroadcasting('GALLERY_APPROVED', event, { idempotencySuffix: String(task.updatedAt?.getTime?.() || Date.now()) });
        emitWorkflowUpdate(event, 'gallery:changed', { galleryStatus: event.galleryStatus });
    }
    await notifyTask(task, 'TASK_COMPLETED', 'Task completed', `The ${task.type.replace('_', ' ')} task was marked completed.`, req.user._id);
    return res.json({ success: true, data: await EventTask.findById(task._id).populate(taskPopulate) });
};

export const submitTask = async (req, res) => {
    const task = await EventTask.findById(req.params.id);
    if (!task || String(task.assignee || '') !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Only the assignee can submit this task' });
    if (task.type !== 'poster') return res.status(400).json({ success: false, message: 'Use Mark Completed for this task' });
    if (!['assigned', 'in_progress', 'reopened'].includes(task.status)) {
        return res.status(409).json({ success: false, message: 'This task is not ready for submission' });
    }
    task.submission = { text: req.body.text || null, url: req.body.url || null };
    task.status = 'submitted';
    task.stage = task.type === 'poster' ? 'submitted_to_president' : 'president_review';
    task.audit.push({ action: 'submitted', actor: req.user._id, actorModel: 'Student', note: req.body.text });
    await task.save();
    const event = task.type === 'poster'
        ? await Event.findByIdAndUpdate(task.event, { status: 'poster_submitted' }, { new: true })
        : task.type === 'gallery_upload'
            ? await Event.findByIdAndUpdate(task.event, { galleryStatus: 'pending' }, { new: true })
            : await Event.findById(task.event);
    await notifyTask(task, 'TASK_SUBMITTED', 'Task submitted for review', `The ${task.type.replace('_', ' ')} task was submitted.`, req.user._id);
    if (event) emitWorkflowUpdate(event, task.type === 'gallery_upload' ? 'gallery:changed' : 'event:updated', {
        status: event.status,
        galleryStatus: event.galleryStatus
    });
    return res.json({ success: true, data: task });
};

export const reviewTask = async (req, res) => {
    const task = await EventTask.findById(req.params.id);
    if (!task || !await isResponsiblePresident(task, req.user)) return res.status(403).json({ success: false, message: 'Only the responsible club President can review this task' });
    if (task.type !== 'poster') return res.status(400).json({ success: false, message: 'This task does not require review' });
    if (!['approved', 'rejected'].includes(req.body.decision)) return res.status(400).json({ success: false, message: 'Invalid decision' });
    if (task.status !== 'submitted') return res.status(409).json({ success: false, message: 'Only submitted work can be reviewed' });
    const posterApproval = task.type === 'poster' && req.body.decision === 'approved';
    task.status = posterApproval ? 'submitted' : req.body.decision === 'approved' ? 'completed' : 'reopened';
    task.stage = req.body.decision === 'approved'
        ? (posterApproval ? 'submitted_to_faculty' : 'completed')
        : 'rejected_by_president';
    task.reviewedBy = req.user._id;
    task.completedAt = req.body.decision === 'approved' && !posterApproval ? new Date() : null;
    task.audit.push({ action: req.body.decision, actor: req.user._id, actorModel: 'Student', note: req.body.reason });
    await task.save();
    const event = await Event.findById(task.event);
    if (event && task.type === 'poster' && posterApproval) event.status = 'pending_faculty';
    if (event && task.type === 'poster' && task.status === 'reopened') event.status = 'pending_grafik_poster';
    if (event && task.type === 'gallery_upload' && task.status === 'completed') event.galleryStatus = 'approved';
    if (event && task.type === 'gallery_upload' && task.status === 'reopened') event.galleryStatus = 'rejected';
    if (event) {
        await event.save();
        if (task.type === 'gallery_upload' && task.status === 'completed') {
            await executeDynamicLifecycleBroadcasting('GALLERY_APPROVED', event);
        }
        emitWorkflowUpdate(event, task.type === 'gallery_upload' ? 'gallery:changed' : 'event:updated', {
            status: event.status,
            galleryStatus: event.galleryStatus
        });
    }
    await notifyTask(
        task,
        req.body.decision === 'approved' ? 'TASK_APPROVED' : 'TASK_REJECTED',
        `Task ${req.body.decision}`,
        `The ${task.type.replace('_', ' ')} task was ${req.body.decision}.`,
        req.user._id
    );
    return res.json({ success: true, data: task });
};

export const reopenPosterTaskAfterStaffRejection = async (event, stage, actorId, reason) => {
    const task = await EventTask.findOne({ event: event._id, type: 'poster' });
    if (!task) return null;
    task.status = task.assignee ? 'reopened' : 'unassigned';
    task.stage = stage;
    task.completedAt = null;
    task.audit.push({
        action: stage,
        actor: actorId,
        actorModel: 'Admin',
        reason,
        note: reason
    });
    await task.save();
    await notifyTask(task, 'TASK_REOPENED', 'Poster correction required', reason, actorId);
    return task;
};
