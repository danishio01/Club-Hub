import { io } from 'socket.io-client';
import { API_ORIGIN } from '../../../api/axiosInstance';

let socket;

const getSocket = () => {
    if (socket) return socket;

    socket = io(API_ORIGIN, {
        withCredentials: true,
        transports: ['websocket', 'polling']
    });
    socket.on('connect', () => console.info('[SOCKET] Connected', { socketId: socket.id }));
    socket.on('disconnect', (reason) => console.info('[SOCKET] Disconnected', { reason }));
    socket.on('connect_error', (error) => console.error('[SOCKET] Connection failed', error.message));
    return socket;
};

export const subscribeToRealtimeNotifications = ({ onNotification, onEventsChanged }) => {
    const client = getSocket();
    const workflowEvents = [
        'registrations:changed',
        'attendance:changed',
        'event:updated',
        'gallery:changed',
        'report:changed'
    ];
    const forwardWorkflowEvent = (eventName) => (payload) => {
        console.info(`[SOCKET] ${eventName} received`, payload);
        window.dispatchEvent(new CustomEvent('clubhub:workflow-changed', { detail: { eventName, ...payload } }));
        window.dispatchEvent(new CustomEvent(`clubhub:${eventName}`, { detail: payload }));
    };
    const workflowHandlers = workflowEvents.map((eventName) => [eventName, forwardWorkflowEvent(eventName)]);
    const notificationHandler = (payload) => {
        console.info('[SOCKET] notification:new received', payload);
        onNotification(payload);
    };
    client.on('notification:new', notificationHandler);
    client.on('events:changed', onEventsChanged);
    workflowHandlers.forEach(([eventName, handler]) => client.on(eventName, handler));

    return () => {
        client.off('notification:new', notificationHandler);
        client.off('events:changed', onEventsChanged);
        workflowHandlers.forEach(([eventName, handler]) => client.off(eventName, handler));
    };
};
