import mongoose from 'mongoose';
import Club from '../models/clubModel.js';
import EventTask from '../models/eventTaskModel.js';

export const TASK_TYPES = ['poster', 'attendance', 'social_media', 'gallery_upload'];
export const SPECIAL_ROLES = ['grafik', 'pr'];

export const isStaffUser = (user) => ['admin', 'faculty_coordinator', 'hod'].includes(user?.role);

export const getResponsiblePresidentClubIds = async (user) => {
    if (!user?._id) return [];
    return Club.distinct('_id', { president: user._id });
};

export const buildVisibleTaskFilter = async (user, baseFilter = {}) => {
    if (isStaffUser(user)) return { ...baseFilter };
    const presidentClubIds = await getResponsiblePresidentClubIds(user);
    return {
        $and: [
            baseFilter,
            {
                $or: [
                    { assignee: user._id },
                    ...(presidentClubIds.length ? [{ responsibleClub: { $in: presidentClubIds } }] : [])
                ]
            }
        ]
    };
};

export const canAccessTask = async (task, user) => {
    if (!task || !user) return false;
    if (isStaffUser(user)) return true;
    if (String(task.assignee || '') === String(user._id)) return true;
    return Boolean(await Club.exists({ _id: task.responsibleClub, president: user._id }));
};

export const findAccessibleEventTask = async ({ eventId, types, specialRole, user }) => {
    if (!mongoose.isValidObjectId(eventId)) return null;
    const taskTypes = Array.isArray(types) ? types : [types];
    const baseFilter = {
        event: eventId,
        type: { $in: taskTypes }
    };
    if (specialRole) {
        const clubIds = await Club.distinct('_id', { specialRole });
        baseFilter.responsibleClub = { $in: clubIds };
    }
    return EventTask.findOne(await buildVisibleTaskFilter(user, baseFilter));
};

export const canAccessEventThroughTask = async (eventId, user, types = TASK_TYPES) => Boolean(
    await findAccessibleEventTask({ eventId, types, user })
);
