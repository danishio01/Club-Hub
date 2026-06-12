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
    playNotificationSound,
    requestAndRegisterPushNotifications,
    unlockNotificationSound
} from '../service/fcmClient';
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
    
    const { notifications, unreadCount, pagination, isLoading } = useSelector((state) => state.notifications);

    const syncAlerts = useCallback(async (targetPage = 1) => {
        dispatch(fetchAlertsStart());
        try {
            const data = await fetchMyNotificationsApi(targetPage, 10);
            dispatch(fetchAlertsSuccess(data));
        } catch (err) {
            dispatch(fetchAlertsFailure(err.message));
        }
    }, [dispatch]);

    useEffect(() => {
        syncAlerts(page);
    }, [page, syncAlerts]);

    useEffect(() => {
        let cleanup = () => {};
        initializePushNotifications(() => syncAlerts(1))
            .then(async (unsubscribe) => {
                cleanup = unsubscribe;
                setPushStatus(await fetchPushStatusApi());
            })
            .catch((error) => console.error('[FCM] Initialization failed', error));
        return () => cleanup();
    }, [syncAlerts]);

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
                return;
            }
            if (Notification.permission === 'granted') {
                await sendTestNotificationApi();
                setSoundMessage('Test push sent. Keep this tab open to verify foreground sound.');
            } else {
                await playNotificationSound();
                setSoundMessage('Foreground sound played. Push remains blocked by notification permission.');
            }
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
                            Push: {pushStatus?.registered ? `connected (${pushStatus.tokenCount} device)` : 'not connected'}
                        </div>
                        {permission === 'default' && (
                            <button className="enable-push-button" onClick={enablePushNotifications}>
                                Enable browser notifications
                            </button>
                        )}
                        {permission === 'denied' && (
                            <div className="permission-warning">
                                Browser notifications are blocked. Enable them in site settings.
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
