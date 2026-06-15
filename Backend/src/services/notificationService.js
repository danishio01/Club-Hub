import Notification from '../models/notificationModel.js';
import Student from '../models/studentModel.js';
import Admin from '../models/adminModel.js';
import Registration from '../models/registrationModel.js';
import Event from '../models/eventModel.js';
import Club from '../models/clubModel.js';
import NotificationToken from '../models/notificationTokenModel.js';
import { messaging } from '../config/firebase.js';
import { emitToUsers } from './socketService.js';

export const dispatchNotification = async ({ recipients, title, message, type, referenceId, idempotencyKey }) => {
    const delivery = {
        dbDeliveredCount: 0,
        socketDeliveredCount: 0,
        firebaseAttemptedCount: 0,
        firebaseSuccessCount: 0,
        firebaseFailureCount: 0,
        validTokenCount: 0
    };
    try {
        if (!recipients || recipients.length === 0) {
            console.info('[FCM] Dispatch skipped: no recipients.');
            return delivery;
        }

        const targetUsers = [...new Set((Array.isArray(recipients) ? recipients : [recipients]).map(String))];
        const legacyTokens = [];
        const legacyTokenModels = new Map();
        const dbWrites = [];
        console.info('[FCM] Notification flow started', { type, recipients: targetUsers.length });

        const alreadyDelivered = idempotencyKey
            ? new Set((await Notification.find({ recipient: { $in: targetUsers }, idempotencyKey }).select('recipient')).map((item) => String(item.recipient)))
            : new Set();
        for (const target of targetUsers) {
            let roleModel = 'Student';
            let userObj = await Student.findById(target);
            
            if (!userObj) {
                userObj = await Admin.findById(target);
                if (userObj) roleModel = 'Admin';
            }

            if (userObj && !alreadyDelivered.has(target)) {
                dbWrites.push({
                    recipient: userObj._id,
                    recipientModel: roleModel,
                    title,
                    message,
                    type,
                    referenceId,
                    isRead: false,
                    idempotencyKey
                });
                if (Array.isArray(userObj.fcmTokens)) {
                    legacyTokens.push(...userObj.fcmTokens);
                    userObj.fcmTokens.forEach((token) => legacyTokenModels.set(token, roleModel));
                }

            }
        }

        if (dbWrites.length > 0) {
            const savedNotifications = await Notification.insertMany(dbWrites);
            delivery.dbDeliveredCount = savedNotifications.length;
            console.info('[FCM] Database notifications saved', { count: dbWrites.length });
            savedNotifications.forEach((notification) => {
                delivery.socketDeliveredCount += emitToUsers(
                    [notification.recipient],
                    'notification:new',
                    notification.toObject()
                );
            });
            if (referenceId && /^(EVENT_|ADMIN_EVENT_|FLYER_)/.test(type)) {
                emitToUsers(targetUsers, 'events:changed', { type, referenceId: String(referenceId) });
            }
        }

        console.info('[FCM] Looking for tokens for recipientIds', { recipientIds: targetUsers });
        const allTokenDocuments = await NotificationToken.find({ userId: { $in: targetUsers } })
            .select('token userId userModel role active');
        console.info('[FCM] Token lookup result', {
            recipientIds: targetUsers,
            tokenCount: allTokenDocuments.length,
            tokenUsers: allTokenDocuments.map((entry) => ({
                userId: String(entry.userId),
                role: entry.role,
                userModel: entry.userModel,
                active: entry.active !== false,
                tokenSuffix: entry.token?.slice(-12)
            }))
        });
        const tokenDocuments = allTokenDocuments.filter((entry) => entry.active !== false);
        targetUsers.forEach((userId) => {
            const userTokens = allTokenDocuments.filter((entry) => String(entry.userId) === userId);
            if (userTokens.length === 0) {
                console.warn('[FCM] No NotificationToken found for recipient userId', { userId });
            } else if (userTokens.every((entry) => entry.active === false)) {
                console.warn('[FCM] Recipient only has inactive NotificationToken records', { userId });
            } else {
                console.info('[FCM] NotificationToken lookup matched recipient', {
                    userId,
                    tokenCount: userTokens.filter((entry) => entry.active !== false).length,
                    roles: [...new Set(userTokens.map((entry) => entry.role))],
                    userModels: [...new Set(userTokens.map((entry) => entry.userModel))]
                });
                if (userTokens.some((entry) => entry.role === 'president')) {
                    console.info('[FCM][PRESIDENT] Active token lookup matched', {
                        userId,
                        tokenCount: userTokens.filter((entry) => entry.active !== false).length,
                        userModel: userTokens[0].userModel
                    });
                }
            }
        });
        const tokenList = [...new Set([
            ...tokenDocuments.map((entry) => entry.token),
            ...legacyTokens
        ].filter(Boolean))];
        delivery.validTokenCount = tokenList.length;
        console.info('[FCM] Recipient users and tokens resolved', {
            recipientUsersFound: dbWrites.length,
            validTokenCount: tokenList.length
        });

        if (messaging && tokenList.length > 0) {
            const uniqueTokens = [...new Set(tokenList)];
            delivery.firebaseAttemptedCount = uniqueTokens.length;
            const tokenModels = new Map(tokenDocuments.map((entry) => [entry.token, entry.userModel]));
            const tokenOwners = new Map(tokenDocuments.map((entry) => [entry.token, entry]));
            const response = await messaging.sendEach(uniqueTokens.map((token) => {
                const tokenOwner = tokenOwners.get(token);
                const url = (tokenModels.get(token) || legacyTokenModels.get(token)) === 'Admin'
                    ? (tokenOwner?.role === 'hod' ? '/hod/dashboard' : '/faculty/dashboard')
                    : '/';
                return {
                    token,
                    notification: { title, body: message },
                    data: {
                        title,
                        body: message,
                        type,
                        referenceId: referenceId ? String(referenceId) : '',
                        url
                    },
                    webpush: {
                        headers: { Urgency: 'high', TTL: '300' },
                        notification: {
                            title,
                            body: message,
                            icon: 'https://ik.imagekit.io/p4nbkerbz/ClubHub/applogo.png',
                            badge: 'https://ik.imagekit.io/p4nbkerbz/ClubHub/applogo.png',
                            tag: `${type}:${referenceId ? String(referenceId) : idempotencyKey || 'clubhub-background'}`,
                            renotify: false
                        }
                    }
                };
            }));
            console.info('[FCM] Multicast delivery completed', {
                requested: uniqueTokens.length,
                success: response.successCount,
                failed: response.failureCount
            });
            delivery.firebaseSuccessCount = response.successCount;
            delivery.firebaseFailureCount = response.failureCount;
            response.responses.forEach((result, index) => {
                if (result.success) {
                    const owner = tokenOwners.get(uniqueTokens[index]);
                    console.info('[FCM] Token delivery succeeded', {
                        userId: owner ? String(owner.userId) : 'legacy-token',
                        role: owner?.role || 'unknown',
                        tokenSuffix: uniqueTokens[index].slice(-12)
                    });
                } else {
                    console.error('[FCM] Token delivery failed', {
                        tokenSuffix: uniqueTokens[index].slice(-12),
                        code: result.error?.code || 'unknown',
                        message: result.error?.message || 'Unknown Firebase delivery error'
                    });
                }
            });

            const invalidTokenCodes = new Set([
                'messaging/invalid-argument',
                'messaging/invalid-registration-token',
                'messaging/registration-token-not-registered'
            ]);
            const invalidTokens = response.responses
                .map((result, index) => invalidTokenCodes.has(result.error?.code) ? uniqueTokens[index] : null)
                .filter(Boolean);

            if (invalidTokens.length > 0) {
                await Promise.all([
                    NotificationToken.deleteMany({ token: { $in: invalidTokens } }),
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
        console.info('[FCM] Notification flow completed', { type, delivery });
        return delivery;
    } catch (error) {
        console.error('[FCM] Notification dispatch failed:', error);
        return delivery;
    }
};

export const registerDeviceToken = async (userId, token, device = {}) => {
    try {
        const existingCurrentOwner = await NotificationToken.exists({
            token,
            userId,
            active: { $ne: false }
        });
        if (!existingCurrentOwner && messaging) {
            try {
                await messaging.send({ token, data: { validation: 'clubhub-token-registration' } }, true);
            } catch (error) {
                const invalidTokenCodes = new Set([
                    'messaging/invalid-argument',
                    'messaging/invalid-registration-token',
                    'messaging/registration-token-not-registered'
                ]);
                if (invalidTokenCodes.has(error?.code)) {
                    const invalidTokenError = new Error('Firebase rejected this browser token. Generate a fresh token.');
                    invalidTokenError.code = 'INVALID_FCM_TOKEN';
                    throw invalidTokenError;
                }
                throw error;
            }
        }

        // A browser FCM token represents one installation and must have one current owner.
        const [studentOwnerCleanup, adminOwnerCleanup] = await Promise.all([
            Student.updateMany({ _id: { $ne: userId }, fcmTokens: token }, { $pull: { fcmTokens: token } }),
            Admin.updateMany({ _id: { $ne: userId }, fcmTokens: token }, { $pull: { fcmTokens: token } })
        ]);
        if (studentOwnerCleanup.modifiedCount || adminOwnerCleanup.modifiedCount) {
            console.warn('[FCM] Reassigned browser token from previous account', {
                newUserId: String(userId),
                previousStudentOwnersCleared: studentOwnerCleanup.modifiedCount,
                previousAdminOwnersCleared: adminOwnerCleanup.modifiedCount,
                tokenSuffix: token.slice(-12)
            });
        }

        let updatedUser = await Student.findByIdAndUpdate(
            userId,
            { $addToSet: { fcmTokens: token } },
            { returnDocument: 'after', select: 'fcmTokens role' }
        );
        let model = 'Student';
        if (!updatedUser) {
            model = 'Admin';
            updatedUser = await Admin.findByIdAndUpdate(
                userId,
                { $addToSet: { fcmTokens: token } },
                { returnDocument: 'after', select: 'fcmTokens' }
            );
        }
        if (!updatedUser) return false;

        if (device.deviceId) {
            const replacedTokens = await NotificationToken.find({
                userId,
                deviceId: device.deviceId,
                token: { $ne: token }
            }).select('token');
            const replacedTokenValues = replacedTokens.map((entry) => entry.token);
            if (replacedTokenValues.length > 0) {
                await Promise.all([
                    NotificationToken.deleteMany({ _id: { $in: replacedTokens.map((entry) => entry._id) } }),
                    Student.updateMany({}, { $pull: { fcmTokens: { $in: replacedTokenValues } } }),
                    Admin.updateMany({}, { $pull: { fcmTokens: { $in: replacedTokenValues } } })
                ]);
                console.info('[FCM] Replaced older tokens for current browser installation', {
                    userId: String(userId),
                    deviceId: device.deviceId,
                    removedCount: replacedTokenValues.length
                });
            }
        }

        await NotificationToken.findOneAndUpdate(
            { token },
            {
                userId,
                userModel: model,
                role: model === 'Admin' ? 'admin' : updatedUser.role,
                userAgent: device.userAgent,
                platform: device.platform,
                deviceLabel: device.deviceLabel,
                deviceId: device.deviceId,
                active: true,
                lastSeenAt: new Date()
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        console.info('[FCM] Device token persisted', {
            userId: String(userId),
            userModel: model,
            role: model === 'Admin' ? 'admin' : updatedUser.role,
            tokenCount: updatedUser.fcmTokens.length,
            tokenSuffix: token.slice(-12)
        });
        const savedTokens = await NotificationToken.find({
            userId,
            active: { $ne: false }
        }).select('role userModel token');
        console.info('[FCM] Tokens available after save', {
            userId: String(userId),
            count: savedTokens.length,
            roles: savedTokens.map((entry) => entry.role),
            userModels: savedTokens.map((entry) => entry.userModel),
            tokenSuffixes: savedTokens.map((entry) => entry.token.slice(-12))
        });
        if (updatedUser.role === 'president') {
            console.info('[FCM][PRESIDENT] Token registered', {
                userId: String(userId),
                model,
                role: updatedUser.role,
                tokenCount: updatedUser.fcmTokens.length
            });
        }
        return true;
    } catch (error) {
        console.error("Error in registerDeviceToken service Layer:", error);
        throw error;
    }
};

export const clearDeviceToken = async (userId, token) => {
    await NotificationToken.deleteOne({ userId, token });
    const studentResult = await Student.updateOne({ _id: userId }, { $pull: { fcmTokens: token } });
    const adminResult = studentResult.matchedCount
        ? { matchedCount: 0 }
        : await Admin.updateOne({ _id: userId }, { $pull: { fcmTokens: token } });
    const found = Boolean(studentResult.matchedCount || adminResult.matchedCount);
    console.info('[FCM] Device token clear requested', { userId: String(userId), found });
    return found;
};

export const countDeviceTokens = (userId) => NotificationToken.countDocuments({ userId, active: { $ne: false } });

export const sendCurrentBrowserTokenTest = async ({ userId, role, token, deviceId }) => {
    const tokenDocument = await NotificationToken.findOne({
        userId,
        token,
        active: { $ne: false }
    }).select('token role userModel deviceId');
    const tokenSuffix = token?.slice(-12);

    if (!tokenDocument) {
        console.warn('[FCM][CURRENT-BROWSER] Token ownership lookup failed', {
            userId: String(userId),
            role,
            deviceId,
            tokenSuffix
        });
        return {
            firebaseSuccessCount: 0,
            firebaseFailureCount: 1,
            sentToTokenSuffix: tokenSuffix,
            firebaseErrorCode: 'TOKEN_NOT_REGISTERED_TO_CURRENT_USER'
        };
    }
    if (deviceId && tokenDocument.deviceId && tokenDocument.deviceId !== deviceId) {
        console.warn('[FCM][CURRENT-BROWSER] Device identity mismatch', {
            userId: String(userId),
            role,
            requestedDeviceId: deviceId,
            storedDeviceId: tokenDocument.deviceId,
            tokenSuffix
        });
        return {
            firebaseSuccessCount: 0,
            firebaseFailureCount: 1,
            sentToTokenSuffix: tokenSuffix,
            firebaseErrorCode: 'DEVICE_ID_MISMATCH'
        };
    }
    if (!messaging) {
        return {
            firebaseSuccessCount: 0,
            firebaseFailureCount: 1,
            sentToTokenSuffix: tokenSuffix,
            firebaseErrorCode: 'FIREBASE_ADMIN_NOT_READY'
        };
    }

    try {
        await messaging.send({
            token,
            notification: {
                title: 'ClubHub Current Browser Test',
                body: 'Firebase delivered this push directly to this browser token.'
            },
            data: {
                title: 'ClubHub Current Browser Test',
                body: 'Firebase delivered this push directly to this browser token.',
                type: 'SYSTEM',
                referenceId: '',
                url: tokenDocument.userModel === 'Admin' ? '/faculty/dashboard' : '/',
                diagnostic: 'current-browser-token'
            },
            webpush: {
                headers: { Urgency: 'high', TTL: '300' },
                notification: {
                    title: 'ClubHub Current Browser Test',
                    body: 'Firebase delivered this push directly to this browser token.',
                    icon: 'https://ik.imagekit.io/p4nbkerbz/ClubHub/applogo.png',
                    badge: 'https://ik.imagekit.io/p4nbkerbz/ClubHub/applogo.png',
                    tag: `clubhub-current-browser-${deviceId || tokenSuffix}`,
                    renotify: true
                }
            }
        });
        console.info('[FCM][CURRENT-BROWSER] Token delivery succeeded', {
            userId: String(userId),
            role: tokenDocument.role,
            deviceId: tokenDocument.deviceId,
            tokenSuffix
        });
        return {
            firebaseSuccessCount: 1,
            firebaseFailureCount: 0,
            sentToTokenSuffix: tokenSuffix,
            firebaseErrorCode: null
        };
    } catch (error) {
        console.error('[FCM][CURRENT-BROWSER] Token delivery failed', {
            userId: String(userId),
            role: tokenDocument.role,
            deviceId: tokenDocument.deviceId,
            tokenSuffix,
            code: error?.code
        });
        if ([
            'messaging/invalid-argument',
            'messaging/invalid-registration-token',
            'messaging/registration-token-not-registered'
        ].includes(error?.code)) {
            await Promise.all([
                NotificationToken.deleteOne({ token }),
                Student.updateMany({}, { $pull: { fcmTokens: token } }),
                Admin.updateMany({}, { $pull: { fcmTokens: token } })
            ]);
        }
        return {
            firebaseSuccessCount: 0,
            firebaseFailureCount: 1,
            sentToTokenSuffix: tokenSuffix,
            firebaseErrorCode: error?.code || 'UNKNOWN_FIREBASE_ERROR'
        };
    }
};

export const sendFirebaseOnlyTest = async (userId) => {
    const tokenDocuments = await NotificationToken.find({ userId, active: { $ne: false } }).select('token role userModel');
    const tokens = [...new Set(tokenDocuments.map((entry) => entry.token).filter(Boolean))];
    console.info('[FCM][TEST] Current-user Firebase-only test lookup', {
        userId: String(userId),
        roles: [...new Set(tokenDocuments.map((entry) => entry.role))],
        userModels: [...new Set(tokenDocuments.map((entry) => entry.userModel))],
        validTokenCount: tokens.length
    });
    if (!messaging || tokens.length === 0) {
        return { requested: tokens.length, success: 0, failed: 0, errors: ['No active NotificationToken found for logged-in user.'] };
    }

    const tokenModels = new Map(tokenDocuments.map((entry) => [entry.token, entry.userModel]));
    const response = await messaging.sendEach(tokens.map((token) => ({
        token,
        notification: {
            title: 'ClubHub Firebase Push Test',
            body: 'This message was sent through Firebase only.'
        },
        data: {
            title: 'ClubHub Firebase Push Test',
            body: 'This message was sent through Firebase only.',
            type: 'SYSTEM',
            referenceId: '',
            url: tokenModels.get(token) === 'Admin' ? '/faculty/dashboard' : '/'
        },
        webpush: {
            headers: { Urgency: 'high', TTL: '300' },
            notification: {
                title: 'ClubHub Firebase Push Test',
                body: 'This message was sent through Firebase only.',
                icon: 'https://ik.imagekit.io/p4nbkerbz/ClubHub/applogo.png',
                badge: 'https://ik.imagekit.io/p4nbkerbz/ClubHub/applogo.png',
                tag: 'clubhub-firebase-test',
                renotify: true
            }
        }
    })));
    const errors = response.responses
        .filter((result) => !result.success)
        .map((result) => `${result.error?.code || 'unknown'}: ${result.error?.message || 'Unknown error'}`);
    const invalidTokenCodes = new Set([
        'messaging/invalid-argument',
        'messaging/invalid-registration-token',
        'messaging/registration-token-not-registered'
    ]);
    const invalidTokens = response.responses
        .map((result, index) => invalidTokenCodes.has(result.error?.code) ? tokens[index] : null)
        .filter(Boolean);
    if (invalidTokens.length > 0) {
        await Promise.all([
            NotificationToken.deleteMany({ token: { $in: invalidTokens } }),
            Student.updateMany({}, { $pull: { fcmTokens: { $in: invalidTokens } } }),
            Admin.updateMany({}, { $pull: { fcmTokens: { $in: invalidTokens } } })
        ]);
        console.warn('[FCM][TEST] Removed invalid device tokens', {
            userId: String(userId),
            count: invalidTokens.length
        });
    }
    console.info('[FCM][TEST] Firebase-only delivery completed', {
        requested: tokens.length,
        success: response.successCount,
        failed: response.failureCount
    });
    response.responses.forEach((result, index) => {
        console.info(result.success ? '[FCM][TEST] Token delivery succeeded' : '[FCM][TEST] Token delivery failed', {
            tokenSuffix: tokens[index].slice(-12),
            code: result.error?.code
        });
    });
    return { requested: tokens.length, success: response.successCount, failed: response.failureCount, errors };
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

const getSpecialClubUserIds = async (specialRole) => {
    const club = await Club.findOne({ specialRole }).select('president members');
    if (!club) return [];
    return [club.president, ...(club.members || [])].filter(Boolean);
};

const getRelevantGrafikIds = () => getSpecialClubUserIds('grafik');

export const executeDynamicLifecycleBroadcasting = async (eventType, contextData, { dryRun = false, actorId, actorRole, idempotencySuffix } = {}) => {
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
                title = "Event Details Rejected by Faculty Coordinator";
                message = `Event details for "${contextData.title}" require corrections before approval.`;
                if (getCreatorId(contextData)) recipients.push(getCreatorId(contextData));
                if (await getRelatedPresidentId(contextData)) recipients.push(await getRelatedPresidentId(contextData));
                break;

            case 'FACULTY_APPROVED':
                title = "Event Awaiting HOD Approval";
                message = `Faculty Coordinator approved "${contextData.title}". Final HOD approval is required.`;
                recipients.push(...(await Admin.find({ role: 'hod', active: true }).select('_id')).map((user) => user._id));
                if (await getRelatedPresidentId(contextData)) recipients.push(await getRelatedPresidentId(contextData));
                break;

            case 'HOD_APPROVED':
                title = "New Event Published";
                message = `"${contextData.title}" received final HOD approval and is open for registration.`;
                if (getCreatorId(contextData)) recipients.push(getCreatorId(contextData));
                if (await getRelatedPresidentId(contextData)) recipients.push(await getRelatedPresidentId(contextData));
                recipients.push(...await getSpecialClubUserIds('pr'));
                recipients.push(...await getSpecialClubUserIds('grafik'));
                recipients.push(...(await Student.find({ role: 'student' }).select('_id')).map((user) => user._id));
                break;

            case 'HOD_REJECTED':
                title = "Event Rejected by HOD";
                message = `"${contextData.title}" requires correction after HOD review.`;
                if (getCreatorId(contextData)) recipients.push(getCreatorId(contextData));
                if (await getRelatedPresidentId(contextData)) recipients.push(await getRelatedPresidentId(contextData));
                recipients.push(...(await Admin.find({ role: 'faculty_coordinator', active: true }).select('_id')).map((user) => user._id));
                break;

            case 'FLYER_GENERATED':
                title = "Event Flyer Complete";
                message = `The flyer layout design for "${contextData.title}" is generated and ready for validation review.`;
                const adminsList = await Admin.find({});
                recipients = adminsList.map(a => a._id);
                break;

            case 'FLYER_REJECTED':
                title = "Flyer Changes Required";
                message = `The flyer design for "${contextData.title}" was rejected by the Faculty Coordinator and requires Grafik changes.`;
                recipients = await getRelevantGrafikIds(contextData);
                break;

            case 'FLYER_APPROVED':
                title = "New Event Published";
                message = `A new campaign has launched: "${contextData.title}" is now open for registration entries.`;
                if (getCreatorId(contextData)) recipients.push(getCreatorId(contextData));
                const activeClub = await contextData.populate('club');
                if (activeClub.club?.president) recipients.push(activeClub.club.president);
                
                recipients.push(...await getSpecialClubUserIds('pr'));
                recipients.push(...await getRelevantGrafikIds(contextData));
                const allSystemStudents = await Student.find({ role: 'student' });
                allSystemStudents.forEach(s => recipients.push(s._id));
                break;

            case 'REPORT_SUBMITTED':
                title = "Post-Event Summary Ready";
                message = `A Post-Event performance report has been compiled and submitted for event "${contextData.title}".`;
                const targetAdmins = await Admin.find({});
                recipients = targetAdmins.map(a => a._id);
                if (actorRole !== 'president' && await getRelatedPresidentId(contextData)) {
                    recipients.push(await getRelatedPresidentId(contextData));
                }
                break;

            case 'EVENT_COMPLETED':
                title = "Post-Event Photos Required";
                message = `Event "${contextData.title}" is complete. Upload post-event photos and continue the reporting workflow.`;
                recipients.push(...(await Admin.find({}).select('_id')).map((user) => user._id));
                recipients.push(...await getSpecialClubUserIds('pr'));
                recipients.push(...await getRelevantGrafikIds(contextData));
                if (await getRelatedPresidentId(contextData)) recipients.push(await getRelatedPresidentId(contextData));
                if (actorRole === 'president' && getCreatorId(contextData) && String(getCreatorId(contextData)) !== String(actorId)) {
                    recipients.push(getCreatorId(contextData));
                }
                break;

            case 'REPORT_APPROVED':
                title = "Post-Action Report Accepted";
                message = `The institutional metrics summary for event "${contextData.title}" has been successfully approved.`;
                if (contextData.creator?.student) recipients.push(contextData.creator.student);
                const reportingClub = await contextData.populate('club');
                if (reportingClub.club?.president) recipients.push(reportingClub.club.president);
                recipients.push(...await getSpecialClubUserIds('pr'));
                break;

            case 'REPORT_REJECTED':
                title = "Report Correction Needed";
                message = `The post-action text for event "${contextData.title}" was rejected and requires corrections.`;
                if (contextData.creator?.student) recipients.push(contextData.creator.student);
                const underlyingClub = await contextData.populate('club');
                if (underlyingClub.club?.president) recipients.push(underlyingClub.club.president);
                recipients.push(...(await Admin.find({ role: { $in: ['faculty_coordinator', 'hod'] }, active: true }).select('_id')).map((user) => user._id));
                break;

            case 'REPORT_EDITED':
                title = "Post-Event Report Updated";
                message = `The post-event report for "${contextData.title}" was edited and requires tracking.`;
                recipients.push(...(await Admin.find({ role: { $in: ['faculty_coordinator', 'hod'] }, active: true }).select('_id')).map((user) => user._id));
                break;

            case 'GALLERY_UPLOADED':
                title = "Post-Event Photos Submitted";
                message = `Post-event imagery assets for "${contextData.title}" are uploaded and awaiting confirmation audits.`;
                if (getCreatorId(contextData)) recipients.push(getCreatorId(contextData));
                const sourceClub = await contextData.populate('club');
                if (sourceClub.club?.president) recipients.push(sourceClub.club.president);
                const appAdmins = await Admin.find({});
                appAdmins.forEach(a => recipients.push(a._id));
                recipients.push(...await getSpecialClubUserIds('pr'));
                break;

            case 'GALLERY_APPROVED':
                title = "Official Gallery Published";
                message = `The post-event photos gallery for "${contextData.title}" is now live.`;
                if (contextData.creator?.student) recipients.push(contextData.creator.student);
                const parentClub = await contextData.populate('club');
                if (parentClub.club?.president) recipients.push(parentClub.club.president);
                recipients.push(...await getSpecialClubUserIds('pr'));
                const generalStudents = await Student.find({ role: 'student' });
                generalStudents.forEach(s => recipients.push(s._id));
                break;

            case 'GALLERY_REJECTED':
                title = "Gallery Assets Rejected";
                message = `The photo compilation for "${contextData.title}" was rejected. Please review file scaling parameters.`;
                if (contextData.creator?.student) recipients.push(contextData.creator.student);
                const contextClub = await contextData.populate('club');
                if (contextClub.club?.president) recipients.push(contextClub.club.president);
                recipients.push(...await getSpecialClubUserIds('pr'));
                break;
        }

        const uniqueRecipients = [...new Set(recipients.map(String))];
        const resolvedNotification = {
            recipients: uniqueRecipients,
            title,
            message,
            type: eventType,
            referenceId,
            idempotencyKey: `lifecycle:${eventType}:${referenceId}${idempotencySuffix ? `:${idempotencySuffix}` : ''}`
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
