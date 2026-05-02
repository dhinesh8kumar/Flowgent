import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { signToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { authenticate } from '../middleware/tenant';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { sendError(res, 'Invalid email or password format', 400); return; }

  const { email, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { email, isActive: true },
    include: { tenant: true },
  });

  if (!user || !user.tenant.isActive) { sendError(res, 'Invalid credentials', 401); return; }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) { sendError(res, 'Invalid credentials', 401); return; }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const token = signToken({ userId: user.id, tenantId: user.tenantId, role: user.role });
  const { passwordHash: _ph, ...safeUser } = user;

  sendSuccess(res, { token, user: safeUser, tenant: user.tenant });
});

router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  sendSuccess(res, { user: req.user, tenant: req.tenant });
});

router.post('/change-password', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const schema = z.object({ currentPassword: z.string(), newPassword: z.string().min(8) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { sendError(res, parsed.error.message, 400); return; }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) { sendError(res, 'User not found', 404); return; }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) { sendError(res, 'Current password is incorrect', 400); return; }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

  sendSuccess(res, null, 'Password updated');
});

export default router;
