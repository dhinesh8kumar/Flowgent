import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { authenticate, requireAdmin } from '../middleware/tenant';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    tenantName: z.string().min(2),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
    adminName: z.string().min(2),
    adminEmail: z.string().email(),
    adminPassword: z.string().min(8),
    city: z.string().optional().default('Hyderabad'),
    whatsappPhoneId: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { sendError(res, parsed.error.errors.map((e) => e.message).join('; '), 400); return; }

  const { tenantName, slug, adminName, adminEmail, adminPassword, city, whatsappPhoneId } = parsed.data;

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) { sendError(res, `Slug "${slug}" is already taken`, 409); return; }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName, slug, city, whatsappPhoneId,
      users: { create: { name: adminName, email: adminEmail, passwordHash, role: 'ADMIN' } },
    },
    include: { users: { select: { id: true, email: true, role: true } } },
  });

  sendSuccess(res, { tenant }, 'Tenant created', 201);
});

router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.tenantId },
    include: { _count: { select: { users: true, tankers: true, bookings: true, customers: true } } },
  });
  if (!tenant) { sendError(res, 'Tenant not found', 404); return; }
  sendSuccess(res, tenant);
});

router.patch('/me', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    city: z.string().optional(),
    whatsappPhoneId: z.string().optional(),
    whatsappToken: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { sendError(res, parsed.error.message, 400); return; }

  const updated = await prisma.tenant.update({ where: { id: req.tenantId }, data: parsed.data });
  sendSuccess(res, updated, 'Tenant updated');
});

export default router;
