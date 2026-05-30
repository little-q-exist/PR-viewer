import express from 'express';
import cors from 'cors';
import { apiLimiter } from './shared/middleware/rateLimiter';
import authRoutes from './modules/auth/routes';
import githubRoutes from './modules/github/routes';
import reviewRoutes from './modules/pull-request/routes';

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());
app.use(apiLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/pull-requests', githubRoutes);
app.use('/reviews', reviewRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
