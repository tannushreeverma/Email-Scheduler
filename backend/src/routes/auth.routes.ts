import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../config/database';
import { env } from '../config/env';
import { generateToken, authMiddleware } from '../middleware/auth';

const router = Router();
const googleClient = new OAuth2Client(env.googleClientId);

/**
 * GET /api/auth/google
 * Redirect to Google OAuth consent screen.
 */
router.get('/google', (_req: Request, res: Response) => {
  const url = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'profile', 'email'],
    client_id: env.googleClientId,
    redirect_uri: env.googleCallbackUrl,
  });
  res.redirect(url);
});

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback – create/find user, issue JWT, redirect to frontend.
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code) {
      res.status(400).json({ success: false, message: 'Missing authorization code' });
      return;
    }

    // Exchange code for tokens
    const { tokens } = await googleClient.getToken({
      code: code as string,
      redirect_uri: env.googleCallbackUrl,
    });

    // Verify ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: env.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ success: false, message: 'Invalid Google token' });
      return;
    }

    // Upsert user
    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      create: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
        avatar: payload.picture || null,
      },
      update: {
        name: payload.name || payload.email,
        avatar: payload.picture || null,
      },
    });

    const token = generateToken(user.id, user.email);

    // Redirect to frontend with token
    res.redirect(`${env.frontendUrl}/scheduled?token=${token}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect(`${env.frontendUrl}/login?error=oauth_failed`);
  }
});

/**
 * POST /api/auth/login
 * Email + password login (for development/testing).
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required' });
      return;
    }

    // Find or create a dev user (no real password validation for dev)
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0],
          password: password || null,
        },
      });
    }

    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user.
 */
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: req.user,
  });
});

/**
 * POST /api/auth/logout
 * Clear auth cookie.
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('auth_token');
  res.json({ success: true, message: 'Logged out' });
});

export default router;
