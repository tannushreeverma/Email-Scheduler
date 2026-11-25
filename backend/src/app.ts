import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import emailRoutes from './routes/email.routes';
import slackRoutes from './routes/slack.routes';
import { getEmailQueue } from './services/queue.service';

export function createApp() {
  const app = express();

  // ── Middleware ───────────────────────────────────────────────
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // Allow any localhost origin in development
      if (env.nodeEnv === 'development' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      // Allow the configured frontend URL
      if (origin === env.frontendUrl) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ── BullMQ Dashboard ───────────────────────────────────────
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(getEmailQueue()) as any],
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  // ── API Routes ──────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/emails', emailRoutes);
  app.use('/api/slack', slackRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ── Error Handler ───────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
