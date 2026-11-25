import { Worker, Job, Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { env } from '../config/env';
import { sendEmail } from '../services/email.service';
import { rateLimitService } from '../services/rateLimit.service';
import { slackService } from '../services/slack.service';
import prisma from '../config/database';
import { EMAIL_QUEUE_NAME } from '../services/queue.service';
import type { EmailJobData } from '../types';

/**
 * BullMQ worker that processes email send jobs.
 *
 * Key behaviors:
 *  1. Checks idempotency – skips if the email is already SENT
 *  2. Checks the per-sender hourly rate limit
 *     - If exceeded, delays the job to the next hour window and sends a Slack notification
 *  3. Adds a configurable delay between sends (env.delayBetweenEmailsMs)
 *  4. Sends via Ethereal SMTP
 *
 * Concurrency is configured via WORKER_CONCURRENCY env var (default: 5).
 */
export function createEmailWorker(): Worker {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId, userId, from, to, subject, body, idempotencyKey, senderKey } = job.data;

      console.log(`📧 Processing job ${job.id} → ${to}`);

      // ── 1. Idempotency check ──────────────────────────────────
      const emailRecord = await prisma.email.findUnique({
        where: { id: emailId },
      });

      if (!emailRecord) {
        console.log(`⏭️  Email record ${emailId} not found, skipping`);
        return { skipped: true, reason: 'record_not_found' };
      }

      if (emailRecord.status === 'SENT') {
        console.log(`⏭️  Email ${emailId} already sent, skipping (idempotent)`);
        return { skipped: true, reason: 'already_sent' };
      }

      if (emailRecord.status === 'CANCELLED') {
        console.log(`⏭️  Email ${emailId} was cancelled, skipping`);
        return { skipped: true, reason: 'cancelled' };
      }

      // ── 2. Rate-limit check ───────────────────────────────────
      const rateResult = await rateLimitService.tryConsume(senderKey);

      if (!rateResult.allowed) {
        console.log(
          `🚦 Rate limit reached for ${senderKey}. ` +
          `Delaying job by ${Math.round(rateResult.retryAfterMs / 1000)}s`
        );

        // Send Slack notification (async, non-blocking)
        slackService
          .notifyRateLimitHit(userId, senderKey, env.maxEmailsPerHour, 1)
          .catch(() => {}); // silent

        // Re-add the job with a delay to the next hour window
        const queue = new Queue(EMAIL_QUEUE_NAME, { connection: redisConnection });
        await queue.add('send-email', job.data, {
          delay: rateResult.retryAfterMs + 1000, // +1s buffer
          jobId: `${job.id}-rescheduled-${Date.now()}`,
        });
        await queue.close();

        // Update the scheduled time in DB
        await prisma.email.update({
          where: { id: emailId },
          data: {
            scheduledAt: new Date(Date.now() + rateResult.retryAfterMs + 1000),
          },
        });

        return { rescheduled: true, retryAfterMs: rateResult.retryAfterMs };
      }

      // ── 3. Delay between emails ───────────────────────────────
      if (env.delayBetweenEmailsMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, env.delayBetweenEmailsMs));
      }

      // ── 4. Send email ─────────────────────────────────────────
      const result = await sendEmail(emailId, from, to, subject, body);

      return {
        sent: true,
        messageId: result.messageId,
        previewUrl: result.previewUrl,
      };
    },
    {
      connection: redisConnection,
      concurrency: env.workerConcurrency,
      limiter: {
        max: env.maxEmailsPerHour,
        duration: 3_600_000, // 1 hour
      },
    }
  );

  // ── Event listeners ───────────────────────────────────────────
  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
    // Update DB status on final failure
    if (job && job.attemptsMade >= (job.opts?.attempts || 3)) {
      prisma.email
        .update({
          where: { id: job.data.emailId },
          data: { status: 'FAILED', errorMessage: err.message },
        })
        .catch(console.error);
    }
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  console.log(
    `✅ Email worker started (concurrency: ${env.workerConcurrency}, ` +
    `delay: ${env.delayBetweenEmailsMs}ms, ` +
    `rate limit: ${env.maxEmailsPerHour}/hour)`
  );

  return worker;
}
