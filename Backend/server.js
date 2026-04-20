import { configDotenv } from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import app from './src/app.js';
import connectDB from './src/config/db.js';

configDotenv();
const PORT = 5000;

connectDB();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173',
            'https://club-hub-theta.vercel.app'],
        credentials: true
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    socket.on('disconnect', () => {});
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});