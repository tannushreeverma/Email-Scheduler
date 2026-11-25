import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { redisConnection } from '../config/redis';
import prisma from '../config/database';
import { rateLimitService } from './rateLimit.service';
import type { ScheduleEmailBody, EmailJobData } from '../types';

export const EMAIL_QUEUE_NAME = 'email-queue';

let emailQueue: Queue | null = null;

export function getEmailQueue(): Queue {
  if (!emailQueue) {
    emailQueue = new Queue(EMAIL_QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });

    console.log('✅ BullMQ email queue initialized');
  }
  return emailQueue;
}

/**
 * Schedules a batch of emails as individual BullMQ delayed jobs.
 *
 * For each recipient:
 *  - Creates a row in the DB (status = SCHEDULED)
 *  - Computes the delay so the job fires at `scheduledAt + index * delayBetweenEmails`
 *  - Adds the job with that delay to BullMQ
 *
 * The delayBetweenEmails spaces sends apart; the hourlyLimit is enforced
 * at execution time by the worker via Redis rate-limit counters.
 */
export async function scheduleEmails(
  userId: string,
  payload: ScheduleEmailBody
): Promise<{ jobIds: string[]; emailIds: string[] }> {
  const queue = getEmailQueue();
  const scheduledTime = new Date(payload.scheduledAt);
  const now = new Date();
  const jobIds: string[] = [];
  const emailIds: string[] = [];

  // Store the per-sender hourly limit in Redis so the worker can enforce it
  if (payload.hourlyLimit > 0) {
    await rateLimitService.setSenderHourlyLimit(payload.from, payload.hourlyLimit);
  }

  for (let i = 0; i < payload.to.length; i++) {
    const recipient = payload.to[i];
    const idempotencyKey = `${userId}:${payload.from}:${recipient}:${payload.subject}:${scheduledTime.toISOString()}`;

    // Check idempotency – skip if this exact email is already scheduled
    const existing = await prisma.email.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      console.log(`⏭️  Skipping duplicate: ${recipient} (idempotency key exists)`);
      emailIds.push(existing.id);
      if (existing.jobId) jobIds.push(existing.jobId);
      continue;
    }

    // Calculate per-email delay offset
    const delayOffsetMs = i * (payload.delayBetweenEmails * 1000);
    const emailScheduledAt = new Date(scheduledTime.getTime() + delayOffsetMs);
    const delayMs = Math.max(0, emailScheduledAt.getTime() - now.getTime());

    // Create DB record first
    const emailRecord = await prisma.email.create({
      data: {
        userId,
        fromAddress: payload.from,
        toAddress: recipient,
        subject: payload.subject,
        body: payload.body,
        status: 'SCHEDULED',
        scheduledAt: emailScheduledAt,
        idempotencyKey,
      },
    });

    // Build job data
    const jobData: EmailJobData = {
      emailId: emailRecord.id,
      userId,
      from: payload.from,
      to: recipient,
      subject: payload.subject,
      body: payload.body,
      idempotencyKey,
      senderKey: payload.from,
    };

    const jobId = `email-${emailRecord.id}-${uuidv4().slice(0, 8)}`;

    // Add to BullMQ with computed delay
    await queue.add('send-email', jobData, {
      jobId,
      delay: delayMs,
    });

    // Update DB with the job ID
    await prisma.email.update({
      where: { id: emailRecord.id },
      data: { jobId },
    });

    jobIds.push(jobId);
    emailIds.push(emailRecord.id);
  }

  return { jobIds, emailIds };
}

/**
 * On server restart, re-queue any SCHEDULED emails whose jobs may have
 * been lost. BullMQ persists to Redis, so most will survive. This catches
 * edge cases where the server crashed between DB write and queue.add.
 */
export async function restoreOrphanedJobs(): Promise<number> {
  const queue = getEmailQueue();
  const now = new Date();

  // Find SCHEDULED emails that might not have a valid BullMQ job
  const orphaned = await prisma.email.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { gte: now },
    },
  });

  let restored = 0;

  for (const email of orphaned) {
    // Check if the job still exists in BullMQ
    if (email.jobId) {
      const existingJob = await queue.getJob(email.jobId);
      if (existingJob) continue; // Job is still in Redis, skip
    }

    const delayMs = Math.max(0, email.scheduledAt.getTime() - now.getTime());
    const jobId = `email-${email.id}-restored-${uuidv4().slice(0, 8)}`;

    const jobData: EmailJobData = {
      emailId: email.id,
      userId: email.userId,
      from: email.fromAddress,
      to: email.toAddress,
      subject: email.subject,
      body: email.body,
      idempotencyKey: email.idempotencyKey,
      senderKey: email.fromAddress,
    };

    await queue.add('send-email', jobData, {
      jobId,
      delay: delayMs,
    });

    await prisma.email.update({
      where: { id: email.id },
      data: { jobId },
    });

    restored++;
  }

  if (restored > 0) {
    console.log(`🔄 Restored ${restored} orphaned email jobs`);
  }

  return restored;
}

export async function closeQueue(): Promise<void> {
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
  }
}
