import { Router, Response } from 'express'
import prisma from '../utils/prisma'
import { sendSuccess, sendError } from '../utils/response'
import { authenticate } from '../middleware/tenant'
import { AuthenticatedRequest } from '../types'

const router = Router()
router.use(authenticate)

// GET /customers — list all customers for the tenant
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const customers = await prisma.customer.findMany({
    where: { tenantId: req.tenantId },
    orderBy: { createdAt: 'desc' },
  }).catch(() => [])
  sendSuccess(res, customers)
})

// GET /customers/:id — single customer with booking history
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const customer = await prisma.customer.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId },
    include: {
      bookings: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })
  if (!customer) { sendError(res, 'Customer not found', 404); return }
  sendSuccess(res, customer)
})

export default router