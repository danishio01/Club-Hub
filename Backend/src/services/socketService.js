let socketServer;

export const setSocketServer = (io) => {
    socketServer = io;
};

export const emitToUsers = (userIds, eventName, payload) => {
    if (!socketServer) {
        console.warn('[SOCKET] Emit skipped: socket server is not initialized.', { eventName });
        return;
    }

    const recipients = [...new Set(userIds.map(String))];
    recipients.forEach((userId) => socketServer.to(`user:${userId}`).emit(eventName, payload));
    console.info('[SOCKET] Event emitted', { eventName, recipientCount: recipients.length });
};
