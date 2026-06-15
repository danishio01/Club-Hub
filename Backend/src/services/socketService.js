let socketServer;

export const setSocketServer = (io) => {
    socketServer = io;
};

export const emitToUsers = (userIds, eventName, payload) => {
    if (!socketServer) {
        console.warn('[SOCKET] Emit skipped: socket server is not initialized.', { eventName });
        return 0;
    }

    const recipients = [...new Set(userIds.map(String))];
    recipients.forEach((userId) => socketServer.to(`user:${userId}`).emit(eventName, payload));
    console.info('[SOCKET] Event emitted', { eventName, recipientCount: recipients.length });
    return recipients.length;
};

export const emitToRooms = (rooms, eventName, payload) => {
    if (!socketServer) {
        console.warn('[SOCKET] Emit skipped: socket server is not initialized.', { eventName });
        return;
    }
    const targets = [...new Set(rooms.filter(Boolean))];
    targets.forEach((room) => socketServer.to(room).emit(eventName, payload));
    console.info('[SOCKET] Workflow event emitted', { eventName, roomCount: targets.length });
};

export const emitWorkflowUpdate = (event, eventName, extra = {}) => {
    const clubId = event?.club?._id || event?.club;
    const presidentId = event?.club?.president?._id || event?.club?.president;
    const creatorId = event?.creator?.student?._id || event?.creator?.student;
    emitToRooms([
        'role:admin',
        'role:faculty_coordinator',
        'role:hod',
        'special:pr',
        'special:grafik',
        'role:student',
        clubId ? `club:${clubId}` : null,
        presidentId ? `user:${presidentId}` : null,
        creatorId ? `user:${creatorId}` : null
    ], eventName, {
        eventId: String(event?._id || extra.eventId || ''),
        ...extra
    });
};
