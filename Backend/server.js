import { configDotenv } from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import cron from 'node-cron';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { executeCronPreEventReminders } from './src/services/notificationService.js';
import { setSocketServer } from './src/services/socketService.js';
import { jwtSecret } from './src/config/auth.js';
import Student from './src/models/studentModel.js';
import Admin from './src/models/adminModel.js';
import Club from './src/models/clubModel.js';

configDotenv();
const PORT = 5000;

connectDB();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://club-hub-theta.vercel.app'],
        credentials: true
    }
});

app.set('io', io);
setSocketServer(io);

const getCookie = (cookieHeader, name) => cookieHeader
    ?.split(';')
    .map((part) => part.trim().split('='))
    .find(([key]) => key === name)?.[1];

io.use(async (socket, next) => {
    try {
        const token = getCookie(socket.handshake.headers.cookie, 'jwt');
        if (!token) return next(new Error('Authentication required'));

        const decoded = jwt.verify(decodeURIComponent(token), jwtSecret);
        const isStaff = ['admin', 'faculty_coordinator', 'hod'].includes(decoded.role);
        const user = isStaff
            ? await Admin.findById(decoded.id).select('_id')
            : await Student.findById(decoded.id).select('_id role department');
        if (!user) return next(new Error('User no longer exists'));

        socket.user = {
            id: String(user._id),
            role: isStaff ? decoded.role : user.role,
            department: user.department
        };
        next();
    } catch (error) {
        console.warn('[SOCKET] Authentication failed', { message: error.message });
        next(new Error('Authentication failed'));
    }
});

io.on('connection', async (socket) => {
    socket.join(`user:${socket.user.id}`);
    socket.join(`role:${socket.user.role}`);
    if (socket.user.department) socket.join(`department:${socket.user.department}`);

    if (!['admin', 'faculty_coordinator', 'hod'].includes(socket.user.role)) {
        const clubs = await Club.find({
            $or: [{ president: socket.user.id }, { members: socket.user.id }]
        }).select('_id');
        clubs.forEach((club) => socket.join(`club:${club._id}`));
        const specialClubs = await Club.find({
            specialRole: { $in: ['pr', 'grafik'] },
            $or: [{ president: socket.user.id }, { members: socket.user.id }]
        }).select('specialRole');
        specialClubs.forEach((club) => socket.join(`special:${club.specialRole}`));
    }

    console.info('[SOCKET] Client connected', {
        socketId: socket.id,
        userId: socket.user.id,
        role: socket.user.role
    });
    socket.on('disconnect', (reason) => {
        console.info('[SOCKET] Client disconnected', { socketId: socket.id, reason });
    });
});

cron.schedule('0 * * * *', () => {
    console.log('Automated systems scanning event calendar matrices for dynamic user notifications...');
    executeCronPreEventReminders();
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
