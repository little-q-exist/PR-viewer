import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './shared/db';

const PORT = process.env.PORT || 3000;

async function start(): Promise<void> {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
