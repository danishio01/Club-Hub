import Notification from '../models/notificationModel.js';
import * as notificationService from '../services/notificationService.js';

export const registerToken = async (req, res) => {
    try {
        const { token, device, clientUserId, clientRole } = req.body;
        const authUserId = String(req.user._id || req.user.id);
        
        if (!token || typeof token !== 'string' || token.length < 20) {
            return res.status(400).json({ success: false, message: 'FCM Token key missing.' });
        }
        console.info('[FCM] Token registration endpoint hit', {
            userId: authUserId,
            role: req.user.role,
            clientUserId: clientUserId ? String(clientUserId) : null,
            clientRole: clientRole || null,
            identityMatches: !clientUserId || String(clientUserId) === authUserId,
            tokenSuffix: token.slice(-12)
        });
        if (clientUserId && String(clientUserId) !== authUserId) {
            console.warn('[FCM] Frontend/backend current-user identity mismatch; authenticated user remains authoritative.', {
                authUserId,
                clientUserId: String(clientUserId)
            });
        }
        
        const success = await notificationService.registerDeviceToken(req.user._id, token, {
            ...device,
            userAgent: req.get('user-agent')
        });
        
        if (success) {
            return res.status(200).json({ success: true, message: 'Device token added successfully.' });
        } else {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
    } catch (error) {
        console.error("Error in registerToken controller:", error);
        return res.status(error.code === 'INVALID_FCM_TOKEN' ? 409 : 500).json({
            success: false,
            code: error.code,
            message: error.code === 'INVALID_FCM_TOKEN'
                ? error.message
                : 'Server processing failure registering client token.'
        });
    }
};

export const clearToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ success: false, message: 'FCM Token key missing.' });
        }
        await notificationService.clearDeviceToken(req.user._id, token);
        return res.status(200).json({ success: true, message: 'Device token cleared.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error handling user token purging operations.' });
    }
};

export const getMyNotifications = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skipIndex = (page - 1) * limit;

        const total = await Notification.countDocuments({ recipient: req.user._id });
        const alerts = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 })
            .skip(skipIndex)
            .limit(limit);

        const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

        return res.status(200).json({
            success: true,
            data: {
                notifications: alerts,
                pagination: { total, page, limit, pages: Math.ceil(total / limit) },
                unreadCount
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server database read processing fault.' });
    }
};

export const markRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: req.user._id },
            { isRead: true }
        );
        return res.status(200).json({ success: true, message: 'Notification state marked read.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update alert record target status.' });
    }
};

export const markAllRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true }
        );
        return res.status(200).json({ success: true, message: 'All user alerts set to read.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Bulk system modification failure.' });
    }
};

export const sendTestNotification = async (req, res) => {
    const authUserId = req.user._id || req.user.id;
    console.info('[AUTH USER]', { userId: String(authUserId), role: req.user.role });
    console.info('[FCM TEST USER ID]', String(authUserId));
    const delivery = await notificationService.dispatchNotification({
        recipients: [req.user._id],
        title: 'ClubHub Notification Test',
        message: 'Push delivery and foreground notification sound are working.',
        type: 'SYSTEM'
    });
    return res.status(200).json({ success: true, data: delivery, message: 'Test notification dispatched.' });
};

export const sendFirebaseOnlyTest = async (req, res) => {
    const authUserId = req.user._id || req.user.id;
    console.info('[AUTH USER]', { userId: String(authUserId), role: req.user.role });
    console.info('[FCM TEST USER ID]', String(authUserId));
    const result = await notificationService.sendFirebaseOnlyTest(authUserId);
    return res.status(result.requested > 0 ? 200 : 409).json({
        success: result.success > 0,
        data: {
            validTokenCount: result.requested,
            firebaseAttemptedCount: result.requested,
            firebaseSuccessCount: result.success,
            firebaseFailureCount: result.failed,
            errors: result.errors
        },
        message: result.success > 0 ? 'Firebase push delivered.' : result.errors[0]
    });
};

export const sendCurrentBrowserTokenTest = async (req, res) => {
    const authUserId = req.user._id || req.user.id;
    const { token, tokenSuffix, userId, role, deviceId } = req.body;
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ success: false, message: 'Current browser FCM token is required.' });
    }
    if (userId && String(userId) !== String(authUserId)) {
        return res.status(403).json({ success: false, message: 'Current browser user identity does not match authenticated user.' });
    }
    console.info('[FCM][CURRENT-BROWSER] Exact-token test requested', {
        userId: String(authUserId),
        role: req.user.role,
        deviceId,
        suppliedSuffix: tokenSuffix,
        actualSuffix: token.slice(-12),
        suffixMatches: !tokenSuffix || tokenSuffix === token.slice(-12)
    });
    const result = await notificationService.sendCurrentBrowserTokenTest({
        userId: authUserId,
        role: role || req.user.role,
        token,
        deviceId
    });
    return res.status(result.firebaseSuccessCount > 0 ? 200 : 409).json({
        success: result.firebaseSuccessCount > 0,
        data: result,
        message: result.firebaseSuccessCount > 0
            ? 'Firebase push sent directly to this browser token.'
            : `Current browser token test failed: ${result.firebaseErrorCode}`
    });
};

export const getPushStatus = async (req, res) => {
    const tokenCount = await notificationService.countDeviceTokens(req.user._id);
    console.info('[FCM] Push status checked', {
        userId: String(req.user._id),
        role: req.user.role,
        activeTokenCount: tokenCount
    });
    return res.status(200).json({
        success: true,
        data: { registered: tokenCount > 0, tokenCount }
    });
};
