import dotenv from 'dotenv';
dotenv.config();

export const env = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Redis
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),

  // Elasticsearch
  elasticsearchUrl: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',

  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',

  // Slack OAuth
  slackClientId: process.env.SLACK_CLIENT_ID || '',
  slackClientSecret: process.env.SLACK_CLIENT_SECRET || '',
  slackRedirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3001/api/slack/callback',

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Worker config
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  delayBetweenEmailsMs: parseInt(process.env.DELAY_BETWEEN_EMAILS_MS || '2000', 10),
  maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR || '200', 10),
};
