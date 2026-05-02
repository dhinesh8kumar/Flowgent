import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { authenticate } from '../middleware/tenant';
import { AuthenticatedRequest } from '../types';
import { BookingStatus } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.get('/stats/summary', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantId = req.tenantId!;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayBookings, pending, totalRevenue, totalCustomers] = await Promise.all([
    prisma.booking.count({ where: { tenantId, scheduledDate: { gte: today, lt: tomorrow } } }),
    prisma.booking.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.booking.aggregate({ where: { tenantId, status: 'DELIVERED' }, _sum: { totalAmount: true } }),
    prisma.customer.count({ where: { tenantId } }),
  ]);

  sendSuccess(res, {
    todayBookings,
    pendingBookings: pending,
    totalRevenue: totalRevenue._sum.totalAmount ?? 0,
    totalCustomers,
  });
});

router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status, date, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (Number(page) - 1) * Number(limit);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { tenantId: req.tenantId };
  if (status) where.status = status;
  if (date) {
    const d = new Date(date);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    where.scheduledDate = { gte: d, lt: next };
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where, skip, take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, whatsappPhone: true } },
        tanker: { select: { vehicleNo: true, driverName: true, driverPhone: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  sendSuccess(res, {
    bookings,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
  });
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId },
    include: { customer: true, tanker: true },
  });
  if (!booking) { sendError(res, 'Booking not found', 404); return; }
  sendSuccess(res, booking);
});

router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const schema = z.object({
    status: z.nativeEnum(BookingStatus),
    tankerId: z.string().uuid().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { sendError(res, parsed.error.message, 400); return; }

  const booking = await prisma.booking.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!booking) { sendError(res, 'Booking not found', 404); return; }

  const timestamps: Record<string, Date> = {};
  if (parsed.data.status === 'CONFIRMED') timestamps.confirmedAt = new Date();
  if (parsed.data.status === 'DISPATCHED') timestamps.dispatchedAt = new Date();
  if (parsed.data.status === 'DELIVERED') timestamps.deliveredAt = new Date();
  if (parsed.data.status === 'CANCELLED') timestamps.cancelledAt = new Date();

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status: parsed.data.status, ...timestamps, ...(parsed.data.tankerId && { tankerId: parsed.data.tankerId }) },
    include: { customer: true, tanker: true },
  });

  sendSuccess(res, updated, `Booking ${parsed.data.status.toLowerCase()}`);
});

export default router;
