import express from 'express';
import cors from 'cors';
import adminRoutes from './routes/adminRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import clubRoutes from './routes/clubRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/clubs', clubRoutes);

export default app;