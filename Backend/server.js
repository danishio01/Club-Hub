import { configDotenv } from 'dotenv';
configDotenv()
import app from './src/app.js';
import connectDB from './src/config/db.js';

const PORT = 5000;

connectDB();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});