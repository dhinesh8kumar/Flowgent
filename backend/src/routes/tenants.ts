import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { authenticate, requireAdmin } from '../middleware/tenant';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.tenantId },
    include: {
      _count: {
        select: { users: true, bookings: true, customers: true },
      },
    },
  })
  if (!tenant) { sendError(res, 'Tenant not found', 404); return }
  sendSuccess(res, tenant)
})
 
// ── PATCH /tenants/me ─────────────────────────────────────────
router.patch('/me', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const schema = z.object({
    name:            z.string().min(2).optional(),
    city:            z.string().optional(),
  })
 
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { sendError(res, parsed.error.message, 400); return }
 
  const updated = await prisma.tenant.update({
    where: { id: req.tenantId },
    data: parsed.data,
  })
 
  sendSuccess(res, updated, 'Settings saved')
})

export default router;
