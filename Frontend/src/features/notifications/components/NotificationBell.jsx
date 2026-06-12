import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    fetchAlertsStart, fetchAlertsSuccess, fetchAlertsFailure, 
    locallyMarkRead, locallyMarkAllRead 
} from '../state/notificationSlice';
import { 
    fetchMyNotificationsApi,
    markNotificationReadApi, markAllNotificationsReadApi, sendTestNotificationApi, fetchPushStatusApi
} from '../service/notificationService';
import {
    initializePushNotifications,
    getPushConfigurationStatus,
    playNotificationSound,
    requestAndRegisterPushNotifications,
    unlockNotificationSound
} from '../service/fcmClient';
import { subscribeToRealtimeNotifications } from '../service/socketClient';
import '../style/NotificationBell.scss';

const NotificationBell = () => {
    const dispatch = useDispatch();
    const dropdownRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [permission, setPermission] = useState(
        'Notification' in window ? Notification.permission : 'unsupported'
    );
    const [isTesting, setIsTesting] = useState(false);
    const [pushStatus, setPushStatus] = useState(null);
    const [soundMessage, setSoundMessage] = useState('');
    const [realtimeToast, setRealtimeToast] = useState(null);
    const recentDeliveries = useRef(new Map());
    
    const { notifications, unreadCount, pagination, isLoading } = useSelector((state) => state.notifications);
    const pushConfiguration = getPushConfigurationStatus();
    const pushStatusLabel = !pushConfiguration.valid
        ? 'configuration invalid'
        : permission === 'denied'
            ? 'permission blocked'
            : permission === 'default'
                ? 'permission pending'
                : pushStatus?.registered
                    ? `connected (${pushStatus.tokenCount} device)`
                    : 'not connected';

    const syncAlerts = useCallback(async (targetPage = 1) => {
        dispatch(fetchAlertsStart());
        try {
            const data = await fetchMyNotificationsApi(targetPage, 10);
            dispatch(fetchAlertsSuccess(data));
        } catch (err) {
            dispatch(fetchAlertsFailure(err.message));
        }
    }, [dispatch]);

    const handleLiveNotification = useCallback(async (payload, source) => {
        const data = payload.data || payload;
        const title = payload.notification?.title || data.title || 'ClubHub Notification';
        const message = payload.notification?.body || data.body || data.message || 'A new update is available.';
        const key = `${data.type || ''}:${data.referenceId || ''}:${title}`;
        const lastDelivered = recentDeliveries.current.get(key) || 0;
        if (Date.now() - lastDelivered < 5000) return;
        recentDeliveries.current.set(key, Date.now());

        console.info(`[${source}] Notification received`, { title, type: data.type, referenceId: data.referenceId });
        await playNotificationSound();
        setRealtimeToast({ title, message });
        window.setTimeout(() => setRealtimeToast(null), 5000);
        syncAlerts(1);

        if (source === 'FCM' && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: message,
                icon: 'https://ik.imagekit.io/p4nbkerbz/ClubHub/applogo.png',
                tag: data.referenceId || 'clubhub-foreground',
                data,
                silent: false
            });
            notification.onclick = () => {
                window.focus();
                if (data.url) window.location.assign(data.url);
                notification.close();
            };
        }
    }, [syncAlerts]);

    useEffect(() => {
        syncAlerts(page);
    }, [page, syncAlerts]);

    useEffect(() => {
        let cleanup = () => {};
        initializePushNotifications((payload) => handleLiveNotification(payload, 'FCM'))
            .then(async (unsubscribe) => {
                cleanup = unsubscribe;
                setPushStatus(await fetchPushStatusApi());
            })
            .catch((error) => console.error('[FCM] Initialization failed', error));
        return () => cleanup();
    }, [handleLiveNotification]);

    useEffect(() => subscribeToRealtimeNotifications({
        onNotification: (payload) => handleLiveNotification(payload, 'SOCKET'),
        onEventsChanged: (payload) => {
            console.info('[SOCKET] Event lifecycle update received', payload);
            window.dispatchEvent(new CustomEvent('clubhub:events-changed', { detail: payload }));
        }
    }), [handleLiveNotification]);

    const enablePushNotifications = async () => {
        const result = await requestAndRegisterPushNotifications();
        setPermission(result);
        setPushStatus(await fetchPushStatusApi());
    };

    const toggleOpenState = () => {
        unlockNotificationSound();
        setIsOpen(!isOpen);
        if (!isOpen) syncAlerts(page);
    };

    const testNotificationSound = async () => {
        setIsTesting(true);
        try {
            setSoundMessage('');
            const unlocked = await unlockNotificationSound();
            if (!unlocked) {
                setSoundMessage('Sound is blocked by browser autoplay/site sound settings.');
            }
            await sendTestNotificationApi();
            setSoundMessage(unlocked
                ? (Notification.permission === 'granted'
                    ? 'Test notification sent. Verifying Socket.IO, foreground sound, and FCM push.'
                    : 'Real-time test sent. Socket.IO and sound can work, but background push remains blocked by browser permission.')
                : 'Real-time test sent. Notification arrived, but sound is blocked by browser autoplay/site sound settings.'
            );
        } catch (error) {
            console.error('[FCM] Notification test failed', error);
        } finally {
            setIsTesting(false);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            dispatch(locallyMarkRead(id));
            await markNotificationReadApi(id);
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            dispatch(locallyMarkAllRead());
            await markAllNotificationsReadApi();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="notification-bell-container" ref={dropdownRef}>
            {realtimeToast && (
                <div className="notification-live-toast" role="status">
                    <strong>{realtimeToast.title}</strong>
                    <span>{realtimeToast.message}</span>
                </div>
            )}
            <button className="bell-trigger" onClick={toggleOpenState}>
                <i className="ri-notification-3-line"></i>
                {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notifications-dropdown">
                    <div className="dropdown-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button className="btn-mark-all" onClick={handleMarkAllRead}>
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="dropdown-body">
                        <div className={`push-status ${pushStatus?.registered ? 'connected' : 'disconnected'}`}>
                            Push: {pushStatusLabel}
                        </div>
                        {!pushConfiguration.valid && (
                            <div className="push-configuration-errors">
                                {pushConfiguration.issues.map((issue) => <div key={issue}>{issue}</div>)}
                            </div>
                        )}
                        {permission === 'default' && (
                            <button className="enable-push-button" onClick={enablePushNotifications}>
                                Enable browser notifications
                            </button>
                        )}
                        {permission === 'denied' && (
                            <div className="permission-warning">
                                Notifications are blocked in browser settings. Enable them for {window.location.host}.
                            </div>
                        )}
                        <button className="test-sound-button" onClick={testNotificationSound} disabled={isTesting}>
                            {isTesting ? 'Testing notification...' : 'Test notification sound'}
                        </button>
                        {soundMessage && <div className="sound-test-message">{soundMessage}</div>}
                        {isLoading && <div className="dropdown-hint">Loading alerts...</div>}
                        {!isLoading && notifications.length === 0 && (
                            <div className="dropdown-hint">No notifications present.</div>
                        )}
                        {!isLoading && notifications.map((alert) => (
                            <div 
                                key={alert._id} 
                                className={`notification-item ${alert.isRead ? 'read' : 'unread'}`}
                                onClick={() => handleMarkAsRead(alert._id)}
                            >
                                <div className="item-main">
                                    <div className="item-title">{alert.title}</div>
                                    <div className="item-message">{alert.message}</div>
                                    <div className="item-time">
                                        {new Date(alert.createdAt).toLocaleString()}
                                    </div>
                                </div>
                                {!alert.isRead && <span className="unread-dot"></span>}
                            </div>
                        ))}
                    </div>

                    {pagination.pages > 1 && (
                        <div className="dropdown-footer-pagination">
                            <button 
                                disabled={page === 1} 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                                Prev
                            </button>
                            <span>{page} / {pagination.pages}</span>
                            <button 
                                disabled={page === pagination.pages} 
                                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
