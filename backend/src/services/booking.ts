import prisma from '../utils/prisma';
import { BookingSource, BookingStatus } from '@prisma/client';
import { logger } from '../utils/logger';

let _counter = 0;

const generateBookingRef = (): string => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  const ms = Date.now().toString().slice(-4)
  return `BK-${dateStr}-${ms}${random}`
}

export interface CreateBookingInput {
  tenantId: string;
  customerId: string;
  quantityKL: number;
  scheduledDate: Date;
  scheduledSlot?: string;
  deliveryAddress: string;
  locality?: string;
  notes?: string;
  source?: BookingSource;
  aiParsed?: boolean;
}

export const createBooking = async (input: CreateBookingInput) => {
  const bookingRef = generateBookingRef();
  const booking = await prisma.booking.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      bookingRef,
      quantityKL: input.quantityKL,
      scheduledDate: input.scheduledDate,
      scheduledSlot: input.scheduledSlot,
      deliveryAddress: input.deliveryAddress,
      locality: input.locality,
      notes: input.notes,
      status: BookingStatus.PENDING,
      source: input.source ?? BookingSource.WHATSAPP,
      aiParsed: input.aiParsed ?? false,
    },
    include: { customer: true, tanker: true },
  });

  await prisma.customer.update({
    where: { id: input.customerId },
    data: { totalBookings: { increment: 1 } },
  });

  logger.info(`Booking created: ${bookingRef}`);
  return booking;
};

export const upsertCustomer = async (tenantId: string, whatsappPhone: string, name?: string) => {
  return prisma.customer.upsert({
    where: { tenantId_whatsappPhone: { tenantId, whatsappPhone } },
    update: { ...(name && { name }) },
    create: { tenantId, whatsappPhone, name },
  });
};

export const getOrCreateConversation = async (tenantId: string, customerId: string) => {
  return prisma.conversation.upsert({
    where: { tenantId_customerId: { tenantId, customerId } },
    update: { lastMessageAt: new Date() },
    create: { tenantId, customerId, state: 'IDLE', context: {} },
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 10 } },
  });
};

export const saveMessage = async (opts: {
  conversationId: string;
  waMessageId?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  content: string;
  isAiGenerated?: boolean;
}) => {
  return prisma.message.create({
    data: {
      conversationId: opts.conversationId,
      waMessageId: opts.waMessageId,
      direction: opts.direction,
      content: opts.content,
      isAiGenerated: opts.isAiGenerated ?? false,
    },
  });
};

export const updateConversationState = async (
  conversationId: string,
  state: string,
  context: Record<string, unknown>
) => {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { state, context, lastMessageAt: new Date() },
  });
};
