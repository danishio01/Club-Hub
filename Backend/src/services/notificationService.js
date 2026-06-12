import Notification from '../models/notificationModel.js';
import Student from '../models/studentModel.js';
import Admin from '../models/adminModel.js';
import Registration from '../models/registrationModel.js';
import Event from '../models/eventModel.js';
import Club from '../models/clubModel.js';
import { messaging } from '../config/firebase.js';

export const dispatchNotification = async ({ recipients, title, message, type, referenceId }) => {
    try {
        if (!recipients || recipients.length === 0) {
            console.info('[FCM] Dispatch skipped: no recipients.');
            return;
        }

        const targetUsers = [...new Set((Array.isArray(recipients) ? recipients : [recipients]).map(String))];
        let tokenList = [];
        const dbWrites = [];
        console.info('[FCM] Notification flow started', { type, recipients: targetUsers.length });

        for (const target of targetUsers) {
            let roleModel = 'Student';
            let userObj = await Student.findById(target);
            
            if (!userObj) {
                userObj = await Admin.findById(target);
                if (userObj) roleModel = 'Admin';
            }

            if (userObj) {
                dbWrites.push({
                    recipient: userObj._id,
                    recipientModel: roleModel,
                    title,
                    message,
                    type,
                    referenceId,
                    isRead: false
                });

                if (userObj.fcmTokens && userObj.fcmTokens.length > 0) {
                    tokenList.push(...userObj.fcmTokens);
                }
            }
        }

        if (dbWrites.length > 0) {
            await Notification.insertMany(dbWrites);
            console.info('[FCM] Database notifications saved', { count: dbWrites.length });
        }

        if (messaging && tokenList.length > 0) {
            const uniqueTokens = [...new Set(tokenList)];
            const response = await messaging.sendEachForMulticast({
                tokens: uniqueTokens,
                data: {
                    title,
                    body: message,
                    type,
                    referenceId: referenceId ? String(referenceId) : '',
                    url: '/'
                },
                webpush: {
                    headers: { Urgency: 'high', TTL: '300' }
                }
            });
            console.info('[FCM] Multicast delivery completed', {
                requested: uniqueTokens.length,
                success: response.successCount,
                failed: response.failureCount
            });

            const invalidTokenCodes = new Set([
                'messaging/invalid-registration-token',
                'messaging/registration-token-not-registered'
            ]);
            const invalidTokens = response.responses
                .map((result, index) => invalidTokenCodes.has(result.error?.code) ? uniqueTokens[index] : null)
                .filter(Boolean);

            if (invalidTokens.length > 0) {
                await Promise.all([
                    Student.updateMany({}, { $pull: { fcmTokens: { $in: invalidTokens } } }),
                    Admin.updateMany({}, { $pull: { fcmTokens: { $in: invalidTokens } } })
                ]);
                console.warn('[FCM] Removed invalid device tokens', { count: invalidTokens.length });
            }
        } else {
            console.warn('[FCM] Push send skipped', {
                firebaseAdminReady: Boolean(messaging),
                validTokenCount: tokenList.length
            });
        }
        console.info('[FCM] Notification flow completed', { type });
    } catch (error) {
        console.error('[FCM] Notification dispatch failed:', error);
    }
};

export const registerDeviceToken = async (userId, token) => {
    try {
        let updatedUser = await Student.findByIdAndUpdate(
            userId,
            { $addToSet: { fcmTokens: token } },
            { new: true, select: 'fcmTokens' }
        );
        let model = 'Student';
        if (!updatedUser) {
            model = 'Admin';
            updatedUser = await Admin.findByIdAndUpdate(
                userId,
                { $addToSet: { fcmTokens: token } },
                { new: true, select: 'fcmTokens' }
            );
        }
        if (!updatedUser) return false;

        console.info('[FCM] Device token persisted', {
            userId: String(userId),
            model,
            tokenCount: updatedUser.fcmTokens.length,
            tokenSuffix: token.slice(-12)
        });
        return true;
    } catch (error) {
        console.error("Error in registerDeviceToken service Layer:", error);
        throw error;
    }
};

export const clearDeviceToken = async (userId, token) => {
    const studentResult = await Student.updateOne({ _id: userId }, { $pull: { fcmTokens: token } });
    const adminResult = studentResult.matchedCount
        ? { matchedCount: 0 }
        : await Admin.updateOne({ _id: userId }, { $pull: { fcmTokens: token } });
    const found = Boolean(studentResult.matchedCount || adminResult.matchedCount);
    console.info('[FCM] Device token clear requested', { userId: String(userId), found });
    return found;
};

const getCreatorId = (event) => event.creator?.student?._id || event.creator?.student || null;

const getRelatedPresidentId = async (event) => {
    if (event.club?.president) return event.club.president._id || event.club.president;
    const clubId = event.club?._id || event.club;
    if (!clubId) return null;
    const club = await Club.findById(clubId).select('president');
    return club?.president || null;
};

const getEventDepartment = async (event) => {
    const presidentId = await getRelatedPresidentId(event);
    if (presidentId) {
        const president = await Student.findById(presidentId).select('department');
        if (president?.department) return president.department;
    }

    const creatorId = getCreatorId(event);
    if (creatorId) {
        const creator = await Student.findById(creatorId).select('department');
        if (creator?.department) return creator.department;
    }
    return null;
};

const getRelevantGrafikIds = async (event) => {
    const department = await getEventDepartment(event);
    const departmentGrafik = department ? await Student.find({ role: 'grafik', department }).select('_id') : [];
    if (departmentGrafik.length > 0) return departmentGrafik.map((user) => user._id);

    const allGrafik = await Student.find({ role: 'grafik' }).select('_id');
    if (department) {
        console.warn('[FCM] No department-specific Grafik user found; falling back to all Grafik users.', { department });
    }
    return allGrafik.map((user) => user._id);
};

export const executeDynamicLifecycleBroadcasting = async (eventType, contextData, { dryRun = false } = {}) => {
    try {
        let title = "ClubHub Notification";
        let message = "";
        let recipients = [];
        let referenceId = contextData._id;

        switch (eventType) {
            case 'EVENT_CREATED':
                title = "New Event Proposal Added";
                message = `New event proposal "${contextData.title}" was submitted for verification.`;
                const targetedClub = await contextData.populate('club');
                if (targetedClub.club?.president) recipients.push(targetedClub.club.president);
                break;

            case 'EVENT_APPROVED':
                title = "Event Ready for Poster Design";
                message = `Event "${contextData.title}" was approved and is ready for poster generation.`;
                recipients = await getRelevantGrafikIds(contextData);
                break;

            case 'EVENT_REJECTED':
                title = "Event Proposal Rejected by President";
                message = `Your event proposal "${contextData.title}" was rejected by the club president.`;
                if (getCreatorId(contextData)) recipients.push(getCreatorId(contextData));
                break;

            case 'ADMIN_EVENT_REJECTED':
                title = "Event Details Rejected by Admin";
                message = `Event details for "${contextData.title}" require corrections before approval.`;
                if (getCreatorId(contextData)) recipients.push(getCreatorId(contextData));
                if (await getRelatedPresidentId(contextData)) recipients.push(await getRelatedPresidentId(contextData));
                break;

            case 'FLYER_GENERATED':
                title = "Event Flyer Complete";
                message = `The flyer layout design for "${contextData.title}" is generated and ready for validation review.`;
                const adminsList = await Admin.find({});
                recipients = adminsList.map(a => a._id);
                break;

            case 'FLYER_REJECTED':
                title = "Flyer Changes Required";
                message = `The flyer design for "${contextData.title}" was rejected by Admin and requires Grafik changes.`;
                recipients = await getRelevantGrafikIds(contextData);
                break;

            case 'FLYER_APPROVED':
                title = "New Event Published";
                message = `A new campaign has launched: "${contextData.title}" is now open for registration entries.`;
                if (getCreatorId(contextData)) recipients.push(getCreatorId(contextData));
                const activeClub = await contextData.populate('club');
                if (activeClub.club?.president) recipients.push(activeClub.club.president);
                
                const prTeam = await Student.find({ role: 'pr' });
                prTeam.forEach(pr => recipients.push(pr._id));
                recipients.push(...await getRelevantGrafikIds(contextData));
                const allSystemStudents = await Student.find({ role: 'student' });
                allSystemStudents.forEach(s => recipients.push(s._id));
                break;

            case 'REPORT_SUBMITTED':
                title = "Post-Event Summary Ready";
                message = `A Post-Event performance report has been compiled and submitted for event "${contextData.title}".`;
                const targetAdmins = await Admin.find({});
                recipients = targetAdmins.map(a => a._id);
                break;

            case 'REPORT_APPROVED':
                title = "Post-Action Report Accepted";
                message = `The institutional metrics summary for event "${contextData.title}" has been successfully approved.`;
                if (contextData.creator?.student) recipients.push(contextData.creator.student);
                const reportingClub = await contextData.populate('club');
                if (reportingClub.club?.president) recipients.push(reportingClub.club.president);
                const prOfficers = await Student.find({ role: 'pr' });
                prOfficers.forEach(pr => recipients.push(pr._id));
                break;

            case 'REPORT_REJECTED':
                title = "Report Correction Needed";
                message = `The post-action text for event "${contextData.title}" was rejected and requires corrections.`;
                if (contextData.creator?.student) recipients.push(contextData.creator.student);
                const underlyingClub = await contextData.populate('club');
                if (underlyingClub.club?.president) recipients.push(underlyingClub.club.president);
                break;

            case 'GALLERY_UPLOADED':
                title = "Post-Event Photos Submitted";
                message = `Post-event imagery assets for "${contextData.title}" are uploaded and awaiting confirmation audits.`;
                if (contextData.creator?.student) recipients.push(contextData.creator.student);
                const sourceClub = await contextData.populate('club');
                if (sourceClub.club?.president) recipients.push(sourceClub.club.president);
                const appAdmins = await Admin.find({});
                appAdmins.forEach(a => recipients.push(a._id));
                const prStaff = await Student.find({ role: 'pr' });
                prStaff.forEach(pr => recipients.push(pr._id));
                break;

            case 'GALLERY_APPROVED':
                title = "Official Gallery Published";
                message = `The post-event photos gallery for "${contextData.title}" is now live.`;
                if (contextData.creator?.student) recipients.push(contextData.creator.student);
                const parentClub = await contextData.populate('club');
                if (parentClub.club?.president) recipients.push(parentClub.club.president);
                const prUsers = await Student.find({ role: 'pr' });
                prUsers.forEach(pr => recipients.push(pr._id));
                const generalStudents = await Student.find({ role: 'student' });
                generalStudents.forEach(s => recipients.push(s._id));
                break;

            case 'GALLERY_REJECTED':
                title = "Gallery Assets Rejected";
                message = `The photo compilation for "${contextData.title}" was rejected. Please review file scaling parameters.`;
                if (contextData.creator?.student) recipients.push(contextData.creator.student);
                const contextClub = await contextData.populate('club');
                if (contextClub.club?.president) recipients.push(contextClub.club.president);
                const prEmployees = await Student.find({ role: 'pr' });
                prEmployees.forEach(pr => recipients.push(pr._id));
                break;
        }

        const uniqueRecipients = [...new Set(recipients.map(String))];
        const resolvedNotification = {
            recipients: uniqueRecipients,
            title,
            message,
            type: eventType,
            referenceId
        };

        if (dryRun) return resolvedNotification;

        if (uniqueRecipients.length > 0) {
            console.info('[FCM] Lifecycle recipients resolved', {
                eventType,
                eventId: String(referenceId),
                recipientCount: uniqueRecipients.length
            });
            await dispatchNotification(resolvedNotification);
        }
        return resolvedNotification;
    } catch (err) {
        console.error("Workflow automation system hit a payload processing exception block:", err);
        return null;
    }
};

export const executeCronPreEventReminders = async () => {
    try {
        const timestampBoundaryStart = new Date();
        const timestampBoundaryEnd = new Date(timestampBoundaryStart.getTime() + 25 * 60 * 60 * 1000);
        
        const activePublishedEvents = await Event.find({
            status: 'approved',
            date: { $gte: timestampBoundaryStart, $lte: timestampBoundaryEnd }
        });

        const currentSystemTime = new Date().getTime();

        for (const event of activePublishedEvents) {
            const eventTimeParts = event.time.split(':');
            const eventTargetTimestamp = new Date(event.date);
            if (eventTimeParts.length === 2) {
                eventTargetTimestamp.setHours(parseInt(eventTimeParts[0]), parseInt(eventTimeParts[1]), 0, 0);
            }

            const totalHoursDifference = (eventTargetTimestamp.getTime() - currentSystemTime) / (1000 * 60 * 60);
            let dispatchNeeded = false;
            let reminderMessage = "";

            if (totalHoursDifference > 23 && totalHoursDifference <= 24) {
                dispatchNeeded = true;
                reminderMessage = `Reminder: "${event.title}" begins in exactly 24 hours at the designated venue: ${event.venue}.`;
            } else if (totalHoursDifference > 0.8 && totalHoursDifference <= 1.1) {
                dispatchNeeded = true;
                reminderMessage = `Final Call: "${event.title}" starts in 1 hour at location: ${event.venue}. Please bring your attendance dashboard QR ready.`;
            }

            if (dispatchNeeded) {
                const attendeesList = await Registration.find({ event: event._id });
                const studentUserIds = attendeesList.map(reg => reg.student);

                if (studentUserIds.length > 0) {
                    await dispatchNotification({
                        recipients: studentUserIds,
                        title: `Upcoming Event Notice: ${event.title}`,
                        message: reminderMessage,
                        type: 'SYSTEM',
                        referenceId: event._id
                    });
                }
            }
        }
    } catch (err) {
        console.error("Cron evaluation context execution block collapsed:", err);
    }
};
