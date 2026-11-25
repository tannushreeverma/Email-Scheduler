import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { authMiddleware } from '../middleware/auth';
import { scheduleEmails } from '../services/queue.service';
import { elasticsearchService } from '../services/elasticsearch.service';
import prisma from '../config/database';
import type { ScheduleEmailBody } from '../types';

const router = Router();

// All email routes require authentication
router.use(authMiddleware);

// Multer for CSV upload (in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv') || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and TXT files are allowed'));
    }
  },
});

/**
 * POST /api/emails/schedule
 * Schedule a batch of emails.
 */
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const body = req.body as ScheduleEmailBody;

    if (!body.to || body.to.length === 0) {
      res.status(400).json({ success: false, message: 'At least one recipient is required' });
      return;
    }
    if (!body.subject) {
      res.status(400).json({ success: false, message: 'Subject is required' });
      return;
    }
    if (!body.scheduledAt) {
      res.status(400).json({ success: false, message: 'Scheduled time is required' });
      return;
    }

    const result = await scheduleEmails(req.user!.id, body);

    res.status(201).json({
      success: true,
      message: `${result.emailIds.length} email(s) scheduled successfully`,
      jobIds: result.jobIds,
      emailIds: result.emailIds,
    });
  } catch (error) {
    console.error('Schedule error:', error);
    res.status(500).json({ success: false, message: 'Failed to schedule emails' });
  }
});

/**
 * GET /api/emails/scheduled
 * List scheduled emails for the current user.
 */
router.get('/scheduled', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string | undefined;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      userId: req.user!.id,
      status: 'SCHEDULED',
    };

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { toAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.email.findMany({
        where: where as any,
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.email.count({ where: where as any }),
    ]);

    res.json({
      success: true,
      data: {
        items: items.map(mapEmailToResponse),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Fetch scheduled error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch scheduled emails' });
  }
});

/**
 * GET /api/emails/sent
 * List sent emails for the current user.
 */
router.get('/sent', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string | undefined;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      userId: req.user!.id,
      status: 'SENT',
    };

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { toAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.email.findMany({
        where: where as any,
        orderBy: { sentAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.email.count({ where: where as any }),
    ]);

    res.json({
      success: true,
      data: {
        items: items.map(mapEmailToResponse),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Fetch sent error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sent emails' });
  }
});

/**
 * GET /api/emails/cancelled
 * List cancelled emails for the current user.
 */
router.get('/cancelled', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string | undefined;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      userId: req.user!.id,
      status: 'CANCELLED',
    };

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { toAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.email.findMany({
        where: where as any,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.email.count({ where: where as any }),
    ]);

    res.json({
      success: true,
      data: {
        items: items.map(mapEmailToResponse),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Fetch cancelled error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cancelled emails' });
  }
});

/**
 * GET /api/emails/failed
 * List failed emails for the current user.
 */
router.get('/failed', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string | undefined;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      userId: req.user!.id,
      status: 'FAILED',
    };

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { toAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.email.findMany({
        where: where as any,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.email.count({ where: where as any }),
    ]);

    res.json({
      success: true,
      data: {
        items: items.map(mapEmailToResponse),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Fetch failed error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch failed emails' });
  }
});

/**
 * GET /api/emails/counts
 * Return email counts by status for the current user.
 */
router.get('/counts', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const [scheduled, sent, cancelled, failed] = await Promise.all([
      prisma.email.count({ where: { userId, status: 'SCHEDULED' } }),
      prisma.email.count({ where: { userId, status: 'SENT' } }),
      prisma.email.count({ where: { userId, status: 'CANCELLED' } }),
      prisma.email.count({ where: { userId, status: 'FAILED' } }),
    ]);

    res.json({
      success: true,
      data: { scheduled, sent, cancelled, failed },
    });
  } catch (error) {
    console.error('Fetch counts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch email counts' });
  }
});

/**
 * GET /api/emails/search
 * Full-text search via Elasticsearch.
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      res.status(400).json({ success: false, message: 'Search query is required' });
      return;
    }

    const result = await elasticsearchService.searchEmails(req.user!.id, query);

    res.json({
      success: true,
      data: result.hits.map((hit) => hit._source),
      total: result.total,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

/**
 * GET /api/emails/:id
 * Get a single email by ID.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const email = await prisma.email.findFirst({
      where: { id: req.params.id as string, userId: req.user!.id },
    });

    if (!email) {
      res.status(404).json({ success: false, message: 'Email not found' });
      return;
    }

    res.json({ success: true, data: mapEmailToResponse(email) });
  } catch (error) {
    console.error('Fetch email error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch email' });
  }
});

/**
 * DELETE /api/emails/:id
 * Cancel a scheduled email.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const email = await prisma.email.findFirst({
      where: { id: req.params.id as string, userId: req.user!.id, status: 'SCHEDULED' },
    });

    if (!email) {
      res.status(404).json({ success: false, message: 'Scheduled email not found' });
      return;
    }

    await prisma.email.update({
      where: { id: email.id },
      data: { status: 'CANCELLED' },
    });

    // Note: The BullMQ job will check status before sending and skip CANCELLED emails

    res.json({ success: true, data: null, message: 'Email cancelled' });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel email' });
  }
});

/**
 * POST /api/emails/upload-leads
 * Parse a CSV/TXT file and extract email addresses.
 */
router.post('/upload-leads', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const content = req.file.buffer.toString('utf-8');
    let emails: string[] = [];

    // Try CSV parsing first
    try {
      const records = parse(content, {
        columns: false,
        skip_empty_lines: true,
        trim: true,
      }) as string[][];

      // Extract emails from all columns/rows
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      for (const row of records) {
        for (const cell of row) {
          const matches = cell.match(emailRegex);
          if (matches) emails.push(...matches);
        }
      }
    } catch {
      // Fall back to regex extraction on the whole text
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = content.match(emailRegex);
      if (matches) emails = matches;
    }

    // Deduplicate
    emails = [...new Set(emails)];

    res.json({
      success: true,
      data: { emails, count: emails.length },
    });
  } catch (error) {
    console.error('Upload leads error:', error);
    res.status(500).json({ success: false, message: 'Failed to parse file' });
  }
});

// ── Helper ──────────────────────────────────────────────────────
function mapEmailToResponse(email: any) {
  return {
    id: email.id,
    from: email.fromAddress,
    to: email.toAddress,
    subject: email.subject,
    body: email.body,
    status: email.status.toLowerCase(),
    scheduledAt: email.scheduledAt.toISOString(),
    sentAt: email.sentAt?.toISOString() || null,
    etherealUrl: email.etherealUrl || null,
    createdAt: email.createdAt.toISOString(),
    updatedAt: email.updatedAt.toISOString(),
  };
}

export default router;
