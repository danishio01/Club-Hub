import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    fetchAlertsStart, fetchAlertsSuccess, fetchAlertsFailure, 
    locallyMarkRead, locallyMarkAllRead 
} from '../state/notificationSlice';
import { 
    fetchMyNotificationsApi,
    markNotificationReadApi, markAllNotificationsReadApi, sendTestNotificationApi, sendFirebaseOnlyTestApi,
    sendCurrentBrowserTokenTestApi, fetchPushStatusApi
} from '../service/notificationService';
import {
    initializePushNotifications,
    getPushConfigurationStatus,
    getPushRuntimeStatus,
    getCurrentBrowserPushDiagnostics,
    getCurrentBrowserTokenIdentity,
    playNotificationSound,
    requestAndRegisterPushNotifications,
    setFcmClientIdentity,
    showLocalSystemNotificationTest,
    showSystemNotification,
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
    const [pushRuntimeStatus, setPushRuntimeStatus] = useState(getPushRuntimeStatus());
    const [pushDiagnostics, setPushDiagnostics] = useState(null);
    const recentDeliveries = useRef(new Map());
    
    const { notifications, unreadCount, pagination, isLoading } = useSelector((state) => state.notifications);
    const { user } = useSelector((state) => state.auth);
    const pushConfiguration = getPushConfigurationStatus();
    const pushStatusLabel = !pushConfiguration.valid
        ? 'configuration invalid'
        : permission === 'denied'
            ? 'permission blocked'
            : permission === 'default'
                ? 'permission pending'
                : pushStatus?.registered
                    ? `connected (${pushStatus.tokenCount} device)`
                    : pushRuntimeStatus.message || 'Firebase token is not connected.';

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

        // System display is intentionally before toast/bell deduplication.
        try {
            showSystemNotification({
                title,
                body: message,
                data: { ...data, source },
                tag: `clubhub-${source.toLowerCase()}-${data._id || data.referenceId || Date.now()}`,
                targetUrl: user?.role === 'admin' ? '/admin/dashboard' : (data.url || '/')
            });
        } catch (error) {
            console.error('[SYSTEM NOTIFICATION] Display failed', {
                source,
                permission: 'Notification' in window ? Notification.permission : 'unsupported',
                message: error.message
            });
        }

        const key = `${data.type || ''}:${data.referenceId || ''}:${title}`;
        const lastDelivered = recentDeliveries.current.get(key) || 0;
        if (Date.now() - lastDelivered < 5000) return;
        recentDeliveries.current.set(key, Date.now());

        console.info(`[${source}] Notification received`, { title, type: data.type, referenceId: data.referenceId });
        await playNotificationSound();
        setRealtimeToast({ title, message });
        window.setTimeout(() => setRealtimeToast(null), 5000);
        syncAlerts(1);

    }, [syncAlerts, user]);

    useEffect(() => {
        syncAlerts(page);
    }, [page, syncAlerts]);

    useEffect(() => {
        setFcmClientIdentity({ userId: user?._id || user?.id, role: user?.role });
    }, [user?._id, user?.id, user?.role]);

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

    useEffect(() => {
        const handleStatus = (event) => setPushRuntimeStatus(event.detail);
        window.addEventListener('clubhub:push-status', handleStatus);
        return () => window.removeEventListener('clubhub:push-status', handleStatus);
    }, []);

    const refreshPushDiagnostics = useCallback(async () => {
        const diagnostics = await getCurrentBrowserPushDiagnostics();
        setPushDiagnostics(diagnostics);
        setPermission(diagnostics.notificationPermission);
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(refreshPushDiagnostics, 0);
        window.addEventListener('clubhub:push-diagnostics-changed', refreshPushDiagnostics);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('clubhub:push-diagnostics-changed', refreshPushDiagnostics);
        };
    }, [refreshPushDiagnostics]);

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

    const testFirebasePush = async () => {
        setIsTesting(true);
        try {
            const result = await sendFirebaseOnlyTestApi();
            setSoundMessage(
                `Firebase-only test: ${result.data.firebaseSuccessCount} delivered, ${result.data.firebaseFailureCount} failed.`
            );
            setPushStatus(await fetchPushStatusApi());
        } catch (error) {
            setSoundMessage(error.response?.data?.message || 'Firebase-only push test failed.');
        } finally {
            setIsTesting(false);
        }
    };

    const testCurrentBrowserFirebasePush = async () => {
        setIsTesting(true);
        try {
            const identity = getCurrentBrowserTokenIdentity();
            if (!identity.token) throw new Error('This browser has not generated an FCM token.');
            const result = await sendCurrentBrowserTokenTestApi(identity);
            setSoundMessage(
                `Current browser token ${result.data.sentToTokenSuffix}: `
                + `${result.data.firebaseSuccessCount} delivered, ${result.data.firebaseFailureCount} failed.`
            );
            await refreshPushDiagnostics();
        } catch (error) {
            setSoundMessage(error.response?.data?.message || error.message || 'Current browser Firebase test failed.');
        } finally {
            setIsTesting(false);
        }
    };

    const testLocalSystemNotification = async () => {
        try {
            showLocalSystemNotificationTest();
            setSoundMessage('Local notification requested. If it is not visible, check Chrome and Windows notification settings.');
            await refreshPushDiagnostics();
        } catch (error) {
            setSoundMessage(error.message);
        }
    };

    const displayTime = (value) => value ? new Date(value).toLocaleString() : 'Never';

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
                        <button className="test-sound-button" onClick={testFirebasePush} disabled={isTesting}>
                            Test Firebase push only
                        </button>
                        <button className="test-sound-button" onClick={testCurrentBrowserFirebasePush} disabled={isTesting}>
                            Test Firebase on this browser
                        </button>
                        <button className="test-sound-button" onClick={testLocalSystemNotification} disabled={isTesting}>
                            Test local system notification
                        </button>
                        {pushDiagnostics && (
                            <div className="push-diagnostics">
                                <strong>Current Browser Diagnostics</strong>
                                <span>Permission: {pushDiagnostics.notificationPermission}</span>
                                <span>Secure context: {pushDiagnostics.secureContext ? 'yes' : 'no'}</span>
                                <span>Service worker active: {pushDiagnostics.serviceWorkerActive ? 'yes' : 'no'}</span>
                                <span>FCM token generated: {pushDiagnostics.tokenGenerated ? 'yes' : 'no'}</span>
                                <span>Token suffix: {pushDiagnostics.tokenSuffix || 'none'}</span>
                                <span>Device ID: {pushDiagnostics.deviceId || 'none'}</span>
                                <span>User ID: {pushDiagnostics.userId || 'none'}</span>
                                <span>Role: {pushDiagnostics.role || 'none'}</span>
                                <span>Last token saved: {displayTime(pushDiagnostics.lastTokenSavedTime)}</span>
                                <span>Last foreground FCM: {displayTime(pushDiagnostics.lastForegroundReceivedTime)}</span>
                                <span>Last background FCM: {displayTime(pushDiagnostics.lastBackgroundReceivedTime)}</span>
                                <span>Last system display: {displayTime(pushDiagnostics.lastSystemNotificationDisplayedTime)}</span>
                                {pushDiagnostics.serviceWorkerCount > 1 && (
                                    <span className="diagnostic-warning">Multiple Firebase service workers detected.</span>
                                )}
                                {!pushDiagnostics.notificationSupported && (
                                    <span className="diagnostic-warning">This browser does not support notifications.</span>
                                )}
                                {!pushDiagnostics.secureContext && (
                                    <span className="diagnostic-warning">Push requires HTTPS or localhost.</span>
                                )}
                                <small>
                                    Chrome site notifications must be Allowed for {window.location.host}. Windows notifications
                                    for Chrome must be enabled, and Windows Do Not Disturb/Focus Assist must be off.
                                </small>
                            </div>
                        )}
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
