export interface JwtPayload {
  userId: string;
  email: string;
}

export interface ScheduleEmailBody {
  from: string;
  to: string[];
  subject: string;
  body: string;
  scheduledAt: string;         // ISO date string
  delayBetweenEmails: number;  // seconds between each email
  hourlyLimit: number;         // max emails per hour (0 = use global default)
}

export interface EmailJobData {
  emailId: string;
  userId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  idempotencyKey: string;
  senderKey: string;           // for per-sender rate limiting
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;        // ms until next window opens
}
