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
    client.on('notification:new', onNotification);
    client.on('events:changed', onEventsChanged);

    return () => {
        client.off('notification:new', onNotification);
        client.off('events:changed', onEventsChanged);
    };
};
