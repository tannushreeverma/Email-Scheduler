import { env } from '../config/env';
import prisma from '../config/database';

/**
 * Slack integration service.
 *
 * Flow:
 *  1. User clicks "Connect Slack" → redirected to Slack OAuth authorize URL
 *  2. Slack redirects back with a code → we exchange for access token
 *  3. We store the token + incoming webhook URL in DB
 *  4. When a rate limit is hit, we post a message to the user's Slack
 *
 * If the user hasn't connected Slack, notifications are silently skipped.
 */
class SlackService {
  /**
   * Build the Slack OAuth authorize URL.
   */
  getAuthorizeUrl(userId: string): string {
    const params = new URLSearchParams({
      client_id: env.slackClientId,
      scope: 'incoming-webhook,chat:write',
      redirect_uri: env.slackRedirectUri,
      state: userId, // pass userId so we know who to associate
    });
    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  /**
   * Exchange the OAuth code for an access token and store it.
   */
  async handleCallback(code: string, userId: string): Promise<void> {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.slackClientId,
        client_secret: env.slackClientSecret,
        code,
        redirect_uri: env.slackRedirectUri,
      }),
    });

    const data = (await response.json()) as {
      ok: boolean;
      access_token?: string;
      incoming_webhook?: { url: string; channel_id: string };
      team?: { id: string; name: string };
      error?: string;
    };

    if (!data.ok) {
      throw new Error(`Slack OAuth error: ${data.error}`);
    }

    // Upsert the integration
    await prisma.slackIntegration.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: data.access_token!,
        webhookUrl: data.incoming_webhook?.url || null,
        channelId: data.incoming_webhook?.channel_id || null,
        workspaceName: data.team?.name || null,
        teamId: data.team?.id || null,
      },
      update: {
        accessToken: data.access_token!,
        webhookUrl: data.incoming_webhook?.url || null,
        channelId: data.incoming_webhook?.channel_id || null,
        workspaceName: data.team?.name || null,
        teamId: data.team?.id || null,
        connectedAt: new Date(),
      },
    });
  }

  /**
   * Send a Slack notification that a sender's hourly rate limit was hit.
   * Silently skips if the user hasn't connected Slack.
   */
  async notifyRateLimitHit(
    userId: string,
    sender: string,
    limit: number,
    delayedCount: number
  ): Promise<void> {
    try {
      const integration = await prisma.slackIntegration.findUnique({
        where: { userId },
      });

      if (!integration || !integration.webhookUrl) {
        // User hasn't connected Slack – skip silently
        return;
      }

      const message = {
        text: `⚠️ *Rate Limit Reached* for sender \`${sender}\``,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `⚠️ *Rate Limit Reached*\n\n• *Sender:* \`${sender}\`\n• *Hourly Limit:* ${limit} emails/hour\n• *Delayed Jobs:* ${delayedCount} email(s) rescheduled to next hour\n• *Time:* ${new Date().toISOString()}`,
            },
          },
        ],
      };

      await fetch(integration.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      console.log(`🔔 Slack notification sent for rate limit on ${sender}`);
    } catch (error) {
      console.warn('⚠️  Slack notification failed:', (error as Error).message);
      // Don't throw – Slack failure should not break the email pipeline
    }
  }

  /**
   * Disconnect Slack for a user.
   */
  async disconnect(userId: string): Promise<void> {
    await prisma.slackIntegration.deleteMany({ where: { userId } });
  }

  /**
   * Check if Slack is connected for a user.
   */
  async getStatus(userId: string): Promise<{ connected: boolean; workspace?: string }> {
    const integration = await prisma.slackIntegration.findUnique({
      where: { userId },
    });

    if (!integration) {
      return { connected: false };
    }

    return {
      connected: true,
      workspace: integration.workspaceName || undefined,
    };
  }
}

export const slackService = new SlackService();
