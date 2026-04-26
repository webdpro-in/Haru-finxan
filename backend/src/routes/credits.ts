/**
 * Credits route — balance + (stub) upgrade.
 */

import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { creditsService, PAID_CREDITS } from '../services/CreditsService.js';

export const creditsRouter = express.Router();

creditsRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const balance = await creditsService.balance(req.user!.userId);
  res.json({ credits: balance });
});

/**
 * Stub upgrade endpoint. In production this would webhook off Stripe / Razorpay.
 * For the hackathon demo it just grants PAID_CREDITS so judges can see the flow.
 */
creditsRouter.post('/upgrade', authenticate, async (req: AuthRequest, res: Response) => {
  const balance = await creditsService.grant(req.user!.userId, PAID_CREDITS, 'upgrade');
  res.json({ credits: balance, plan: 'paid' });
});
