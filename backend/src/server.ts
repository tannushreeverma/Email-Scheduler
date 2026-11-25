import { createApp } from './app';
import { env } from './config/env';
import { initElasticsearch } from './config/elasticsearch';
import { getEmailTransporter } from './config/ethereal';
import { restoreOrphanedJobs } from './services/queue.service';
import { createEmailWorker } from './workers/email.worker';
import prisma from './config/database';

async function main() {
  console.log('🚀 Starting ReachInbox Email Scheduler...\n');

  // ── 1. Initialize Ethereal (fake SMTP) ──────────────────────
  await getEmailTransporter();

  // ── 2. Initialize Elasticsearch index ───────────────────────
  await initElasticsearch();

  // ── 3. Create Express app ───────────────────────────────────
  const app = createApp();

  // ── 4. Start email worker (runs in-process) ─────────────────
  const worker = createEmailWorker();

  // ── 5. Restore orphaned jobs after restart ──────────────────
  const restored = await restoreOrphanedJobs();
  if (restored > 0) {
    console.log(`🔄 Restored ${restored} orphaned scheduled emails`);
  }

  // ── 6. Start HTTP server ────────────────────────────────────
  const server = app.listen(env.port, () => {
    console.log(`\n✅ Server running on http://localhost:${env.port}`);
    console.log(`📊 BullMQ Dashboard: http://localhost:${env.port}/admin/queues`);
    console.log(`📡 API Base: http://localhost:${env.port}/api`);
    console.log(`🌐 Frontend: ${env.frontendUrl}\n`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${env.port} is already in use. Kill the other process or change PORT in .env`);
    } else {
      console.error('❌ Server error:', err);
    }
    process.exit(1);
  });

  // ── Graceful shutdown ───────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    server.close();
    await worker.close();
    await prisma.$disconnect();

    console.log('👋 Goodbye');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
