import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { authenticate, requireAdmin } from '../middleware/tenant';
import { AuthenticatedRequest } from '../types';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tankers = await prisma.tanker.findMany({
    where: { tenantId: req.tenantId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { bookings: true } } },
  });
  sendSuccess(res, tankers);
});

router.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const schema = z.object({
    vehicleNo: z.string().min(3).toUpperCase(),
    capacityKL: z.number().int().min(1).max(50),
    driverName: z.string().min(2),
    driverPhone: z.string().min(10),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { sendError(res, parsed.error.message, 400); return; }

  const existing = await prisma.tanker.findUnique({
    where: { tenantId_vehicleNo: { tenantId: req.tenantId!, vehicleNo: parsed.data.vehicleNo } },
  });
  if (existing) { sendError(res, 'Vehicle number already exists', 409); return; }

  const tanker = await prisma.tanker.create({ data: { ...parsed.data, tenantId: req.tenantId! } });
  sendSuccess(res, tanker, 'Tanker added', 201);
});

router.patch('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tanker = await prisma.tanker.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!tanker) { sendError(res, 'Tanker not found', 404); return; }
  const updated = await prisma.tanker.update({ where: { id: req.params.id }, data: req.body });
  sendSuccess(res, updated);
});

router.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tanker = await prisma.tanker.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!tanker) { sendError(res, 'Tanker not found', 404); return; }
  await prisma.tanker.delete({ where: { id: req.params.id } });
  sendSuccess(res, null, 'Tanker removed');
});

export default router;
