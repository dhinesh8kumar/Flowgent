import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { authenticate, requireAdmin } from '../middleware/tenant'
import { AuthenticatedRequest } from '../types'
import { sendError, sendSuccess } from '../utils/response'

const router = Router()

const serviceSchema = z.object({
  serviceName: z.string().trim().min(1),
  serviceCode: z.string().trim().min(1).optional(),
  basePrice: z.number().min(0),
  description: z.string().trim().optional().nullable(),
})

const tenantContextSchema = z.object({
  context: z.string().trim().default(''),
})

const toServiceCode = (serviceName: string): string => {
  const slug = serviceName
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase()

  return `${slug || 'SERVICE'}-${Date.now()}`
}

router.use(authenticate)

router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const services = await prisma.service.findMany({
    where: { tenantId: req.tenantId! },
    orderBy: { updatedAt: 'desc' },
  })

  sendSuccess(res, services)
})

router.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = serviceSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, 'Invalid service data', 400)
    return
  }

  const payload = parsed.data
  const serviceCode = payload.serviceCode ?? toServiceCode(payload.serviceName)

  try {
    const created = await prisma.service.create({
      data: {
        tenantId: req.tenantId!,
        serviceName: payload.serviceName,
        serviceCode,
        basePrice: payload.basePrice,
        description: payload.description ?? null,
      },
    })

    sendSuccess(res, created, 'Service created', 201)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      sendError(res, 'A service with this code already exists', 409)
      return
    }

    throw error
  }
})

router.patch('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = serviceSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, 'Invalid service data', 400)
    return
  }

  const existing = await prisma.service.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId! },
  })

  if (!existing) {
    sendError(res, 'Service not found', 404)
    return
  }

  const payload = parsed.data

  try {
    const updated = await prisma.service.update({
      where: { id: existing.id },
      data: {
        serviceName: payload.serviceName,
        serviceCode: payload.serviceCode ?? existing.serviceCode,
        basePrice: payload.basePrice,
        description: payload.description ?? null,
      },
    })

    sendSuccess(res, updated, 'Service updated')
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      sendError(res, 'A service with this code already exists', 409)
      return
    }

    throw error
  }
})

router.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const existing = await prisma.service.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId! },
  })

  if (!existing) {
    sendError(res, 'Service not found', 404)
    return
  }

  await prisma.service.delete({ where: { id: existing.id } })
  sendSuccess(res, null, 'Service deleted')
})

router.get('/context/current', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const tenantContext = await prisma.tenantContext.findUnique({
    where: { tenantId: req.tenantId! },
  })

  sendSuccess(res, tenantContext ?? { context: '' })
})

router.patch('/context/current', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = tenantContextSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, 'Invalid AI notes', 400)
    return
  }

  const updated = await prisma.tenantContext.upsert({
    where: { tenantId: req.tenantId! },
    update: { context: parsed.data.context },
    create: {
      tenantId: req.tenantId!,
      context: parsed.data.context,
    },
  })

  sendSuccess(res, updated, 'AI notes saved')
})

export default router
