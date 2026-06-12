import { configDotenv } from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { executeCronPreEventReminders } from './src/services/notificationService.js';

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

io.on('connection', (socket) => {
    socket.on('disconnect', () => {});
});

cron.schedule('0 * * * *', () => {
    console.log('Automated systems scanning event calendar matrices for dynamic user notifications...');
    executeCronPreEventReminders();
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
