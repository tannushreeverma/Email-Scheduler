import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { slackService } from '../services/slack.service';
import { env } from '../config/env';

const router = Router();

/**
 * GET /api/slack/connect
 * Redirect to Slack OAuth authorize URL.
 * User must be authenticated.
 */
router.get('/connect', authMiddleware, (req: Request, res: Response) => {
  const url = slackService.getAuthorizeUrl(req.user!.id);
  res.redirect(url);
});

/**
 * GET /api/slack/callback
 * Handle Slack OAuth callback.
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      res.status(400).json({ success: false, message: 'Missing code or state' });
      return;
    }

    const userId = state as string;
    await slackService.handleCallback(code as string, userId);

    // Redirect back to frontend
    res.redirect(`${env.frontendUrl}/scheduled?slack=connected`);
  } catch (error) {
    console.error('Slack callback error:', error);
    res.redirect(`${env.frontendUrl}/scheduled?slack=error`);
  }
});

/**
 * POST /api/slack/disconnect
 * Disconnect Slack integration.
 */
router.post('/disconnect', authMiddleware, async (req: Request, res: Response) => {
  try {
    await slackService.disconnect(req.user!.id);
    res.json({ success: true, data: null, message: 'Slack disconnected' });
  } catch (error) {
    console.error('Slack disconnect error:', error);
    res.status(500).json({ success: false, message: 'Failed to disconnect Slack' });
  }
});

/**
 * GET /api/slack/status
 * Check if Slack is connected for the current user.
 */
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const status = await slackService.getStatus(req.user!.id);
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Slack status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get Slack status' });
  }
});

export default router;
