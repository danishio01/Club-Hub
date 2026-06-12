import Notification from '../models/notificationModel.js';
import * as notificationService from '../services/notificationService.js';

export const registerToken = async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token || typeof token !== 'string' || token.length < 20) {
            return res.status(400).json({ success: false, message: 'FCM Token key missing.' });
        }
        console.info('[FCM] Token registration endpoint hit', {
            userId: String(req.user._id),
            tokenSuffix: token.slice(-12)
        });
        
        const success = await notificationService.registerDeviceToken(req.user._id, token);
        
        if (success) {
            return res.status(200).json({ success: true, message: 'Device token added successfully.' });
        } else {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
    } catch (error) {
        console.error("Error in registerToken controller:", error);
        return res.status(500).json({ success: false, message: 'Server processing failure registering client token.' });
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
    await notificationService.dispatchNotification({
        recipients: [req.user._id],
        title: 'ClubHub Notification Test',
        message: 'Push delivery and foreground notification sound are working.',
        type: 'SYSTEM'
    });
    return res.status(200).json({ success: true, message: 'Test notification dispatched.' });
};

export const getPushStatus = async (req, res) => {
    const tokenCount = Array.isArray(req.user.fcmTokens) ? req.user.fcmTokens.length : 0;
    return res.status(200).json({
        success: true,
        data: { registered: tokenCount > 0, tokenCount }
    });
};
