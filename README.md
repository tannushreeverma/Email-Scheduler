# ReachInbox – Full-Stack Email Job Scheduler

A production-grade email scheduler service + dashboard built for the ReachInbox hiring assignment.

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌───────────┐
│   React UI  │───▶│  Express API │───▶│ PostgreSQL│
│  (Vite/TS)  │    │  (TypeScript)│    │  (Prisma) │
└─────────────┘    └──────┬───────┘    └───────────┘
                          │
                   ┌──────▼───────┐    ┌───────────┐
                   │   BullMQ     │───▶│   Redis   │
                   │   Worker     │    │ (persist) │
                   └──────┬───────┘    └───────────┘
                          │
                   ┌──────▼───────┐    ┌───────────────┐
                   │  Nodemailer  │    │ Elasticsearch │
                   │  (Ethereal)  │    │  (search)     │
                   └──────────────┘    └───────────────┘
```

## Tech Stack

| Layer        | Technology                                        |
|--------------|---------------------------------------------------|
| Frontend     | React 18, TypeScript, Tailwind CSS, Vite           |
| Backend      | Express.js, TypeScript                             |
| Queue        | BullMQ (backed by Redis)                           |
| Database     | PostgreSQL (Prisma ORM)                            |
| Search       | Elasticsearch 8.x                                 |
| SMTP         | Ethereal Email (fake SMTP for testing)             |
| Auth         | Google OAuth 2.0, JWT                              |
| Notifications| Slack OAuth (webhook on rate-limit hit)            |
| Infra        | Docker Compose (Redis, Postgres, Elasticsearch)    |

---

## Quick Start

### 1. Prerequisites

- Node.js ≥ 18
- Docker & Docker Compose

### 2. Start Infrastructure

```bash
docker-compose up -d
```

This starts Redis (6379), PostgreSQL (5432), and Elasticsearch (9200).

### 3. Backend Setup

```bash
cd backend
cp .env.example .env        # Edit with your Google/Slack OAuth credentials
npm install
npx prisma generate
npx prisma db push           # Create tables
npm run dev                  # Starts server + worker on :3001
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev                  # Starts on :5173
```

### 5. Open

- **Dashboard**: http://localhost:5173
- **BullMQ Admin**: http://localhost:3001/admin/queues
- **API Health**: http://localhost:3001/api/health

---

## Scheduling & Queue Design

### No Cron Jobs

All scheduling uses **BullMQ delayed jobs**. When a user schedules emails:

1. Each recipient gets a row in PostgreSQL (`status = SCHEDULED`)
2. A BullMQ job is added with a computed `delay` (ms until `scheduledAt`)
3. BullMQ persists the job in Redis – survives server restarts
4. On restart, `restoreOrphanedJobs()` re-queues any DB records whose Redis job was lost

### Delay Between Emails

- **Default: 2 seconds** between individual email sends (configurable via `DELAY_BETWEEN_EMAILS_MS`)
- Each recipient's email is offset by `index × delayBetweenEmails` from the base `scheduledAt`
- The worker also adds a `setTimeout` delay before each send

### Idempotency

- Each email has a unique `idempotencyKey = userId:from:to:subject:scheduledAt`
- The worker checks DB status before sending – if already `SENT`, it skips
- Duplicate schedule requests are detected and deduplicated

### Persistence Across Restarts

- BullMQ stores jobs in Redis with `appendonly` persistence
- On server startup, `restoreOrphanedJobs()` scans for `SCHEDULED` emails in DB and re-creates any missing BullMQ jobs
- No emails are duplicated or lost

---

## Rate Limiting

### Per-Sender Hourly Limit

- **Default: 200 emails/hour** (configurable via `MAX_EMAILS_PER_HOUR`)
- Per-sender overrides stored in Redis (`rate_limit_config:<sender>`)
- Counter key: `rate_limit:<sender>:<hourWindow>` with 2-hour TTL

### How It Works

1. Worker calls `rateLimitService.tryConsume(sender)` before each send
2. Uses **atomic Redis `INCR`** – safe across multiple workers/instances
3. If limit exceeded:
   - Job is **rescheduled to the next hour window** (not dropped)
   - Order is preserved as much as possible
   - A **Slack notification** is sent to the user (if connected)

### Configuration

```env
MAX_EMAILS_PER_HOUR=200          # Global default
WORKER_CONCURRENCY=5             # Parallel job processing
DELAY_BETWEEN_EMAILS_MS=2000     # Min 2 seconds between sends
```

---

## Slack Notifications

### Setup

1. Create a Slack App at https://api.slack.com/apps
2. Add OAuth scopes: `incoming-webhook`, `chat:write`
3. Set redirect URL to `http://localhost:3001/api/slack/callback`
4. Add `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` to `.env`

### Flow

1. User clicks **"Connect Slack"** in the dashboard
2. Real OAuth flow → Slack authorize → callback stores token + webhook URL
3. When a sender's hourly limit is hit, the worker calls `slackService.notifyRateLimitHit()`
4. A message is posted to the user's Slack workspace with sender, limit, and delayed count
5. If Slack is not connected, the notification is silently skipped (no crash)
6. User can disconnect/reconnect without redeployment

---

## Elasticsearch Search

Emails are indexed in Elasticsearch for full-text search:

- **Index**: `emails`
- **Searchable fields**: `subject` (boosted 2×), `body`, `toAddress`, `fromAddress`
- **Fuzzy matching** enabled
- API endpoint: `GET /api/emails/search?q=<query>`
- Gracefully degrades if ES is unavailable

---

## API Endpoints

### Auth
| Method | Endpoint                      | Description              |
|--------|-------------------------------|--------------------------|
| GET    | `/api/auth/google`            | Google OAuth redirect    |
| GET    | `/api/auth/google/callback`   | Google OAuth callback    |
| POST   | `/api/auth/login`             | Email/password login     |
| GET    | `/api/auth/me`                | Get current user         |
| POST   | `/api/auth/logout`            | Logout                   |

### Emails
| Method | Endpoint                      | Description              |
|--------|-------------------------------|--------------------------|
| POST   | `/api/emails/schedule`        | Schedule email batch     |
| GET    | `/api/emails/scheduled`       | List scheduled emails    |
| GET    | `/api/emails/sent`            | List sent emails         |
| GET    | `/api/emails/search?q=`       | Full-text search (ES)    |
| GET    | `/api/emails/:id`             | Get email details        |
| DELETE | `/api/emails/:id`             | Cancel scheduled email   |
| POST   | `/api/emails/upload-leads`    | Parse CSV for emails     |

### Slack
| Method | Endpoint                      | Description              |
|--------|-------------------------------|--------------------------|
| GET    | `/api/slack/connect`          | Start Slack OAuth        |
| GET    | `/api/slack/callback`         | Slack OAuth callback     |
| POST   | `/api/slack/disconnect`       | Disconnect Slack         |
| GET    | `/api/slack/status`           | Check connection status  |

---

## Behavior Under Load (1000+ emails)

When 1000+ emails are scheduled for roughly the same time:

1. Each email gets a staggered delay (`index × delayBetweenEmails`)
2. BullMQ processes them with configurable concurrency (default: 5 parallel)
3. The per-sender rate limit (200/hour) gates throughput
4. Excess jobs are automatically rescheduled to the next hour window
5. Slack notifications fire when limits are hit
6. Redis counters are atomic – safe with multiple worker instances

---

## Project Structure

```
├── docker-compose.yml          # Redis, Postgres, Elasticsearch
├── backend/
│   ├── prisma/schema.prisma    # Database schema
│   ├── src/
│   │   ├── config/             # DB, Redis, ES, Ethereal config
│   │   ├── middleware/         # Auth (JWT), error handler
│   │   ├── routes/             # Auth, Email, Slack routes
│   │   ├── services/           # Queue, Email, RateLimit, ES, Slack
│   │   ├── workers/            # BullMQ email worker
│   │   ├── types/              # TypeScript interfaces
│   │   ├── app.ts              # Express app + Bull Board
│   │   └── server.ts           # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             # Button, Input, Badge, Avatar, etc.
│   │   │   ├── layout/         # Sidebar, Header, DashboardLayout
│   │   │   └── email/          # EmailList, EmailListItem, SendLater
│   │   ├── pages/              # Login, Scheduled, Sent, Compose, Detail
│   │   ├── services/api.ts     # Axios API client
│   │   ├── context/            # AuthContext (Google OAuth + JWT)
│   │   ├── hooks/              # React Query hooks
│   │   └── types/              # TypeScript interfaces
│   └── package.json
└── README.md
```
