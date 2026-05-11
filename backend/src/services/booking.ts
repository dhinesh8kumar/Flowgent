import { BookingSource, BookingStatus } from '@prisma/client'
import prisma from '../utils/prisma'
import { logger } from '../utils/logger'

const generateBookingRef = (): string => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  const ms = Date.now().toString().slice(-4)
  return `BK-${dateStr}-${ms}${random}`
}

export interface CreateBookingInput {
  tenantId: string
  customerId: string
  serviceName: string
  quantityKL: number
  unit?: string
  totalAmount?: number
  scheduledDate: Date
  scheduledSlot?: string
  deliveryAddress: string
  locality?: string
  notes?: string
  source?: BookingSource
  aiParsed?: boolean
}

export const createBooking = async (input: CreateBookingInput) => {
  const bookingRef = generateBookingRef()
  const quantity = Number.isFinite(input.quantityKL) && input.quantityKL > 0
    ? input.quantityKL
    : null

  const booking = await prisma.booking.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      bookingRef,
      serviceName: input.serviceName,
      quantity,
      unit: quantity ? input.unit ?? 'KL' : input.unit ?? null,
      totalAmount: input.totalAmount ?? null,
      scheduledDate: input.scheduledDate,
      scheduledSlot: input.scheduledSlot,
      deliveryAddress: input.deliveryAddress,
      locality: input.locality,
      notes: input.notes,
      status: BookingStatus.PENDING,
      source: input.source ?? BookingSource.WHATSAPP,
      aiParsed: input.aiParsed ?? false,
    },
    include: { customer: true },
  })

  await prisma.customer.update({
    where: { id: input.customerId },
    data: {
      totalBookings: { increment: 1 },
      ...(input.locality ? { locality: input.locality } : {}),
      ...(input.deliveryAddress ? { address: input.deliveryAddress } : {}),
    },
  })

  logger.info(`Booking created: ${bookingRef}`)
  return booking
}

export const upsertCustomer = async (tenantId: string, whatsappPhone: string, name?: string) => {
  return prisma.customer.upsert({
    where: { tenantId_whatsappPhone: { tenantId, whatsappPhone } },
    update: { ...(name && { name }) },
    create: { tenantId, whatsappPhone, name },
  })
}

export const getOrCreateConversation = async (tenantId: string, customerId: string) => {
  return prisma.conversation.upsert({
    where: { tenantId_customerId: { tenantId, customerId } },
    update: { lastMessageAt: new Date() },
    create: { tenantId, customerId, state: 'IDLE', context: {} as any },
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 10 } },
  })
}

export const saveMessage = async (opts: {
  conversationId: string
  waMessageId?: string
  direction: 'INBOUND' | 'OUTBOUND'
  content: string
  isAiGenerated?: boolean
}) => {
  return prisma.message.create({
    data: {
      conversationId: opts.conversationId,
      waMessageId: opts.waMessageId,
      direction: opts.direction,
      content: opts.content,
      isAiGenerated: opts.isAiGenerated ?? false,
    },
  })
}

export const updateConversationState = async (
  conversationId: string,
  state: string,
  context: Record<string, unknown>
) => {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { state, context: context as any, lastMessageAt: new Date() },
  })
}
