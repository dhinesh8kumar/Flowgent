import { WhatsAppMessage, WhatsAppContact, ParsedBookingIntent } from '../types';
import { Tenant, Customer, Conversation, Message } from '@prisma/client';
import { parseBookingIntent } from './ai';
import { sendTextMessage, sendButtonMessage, markMessageRead, getTenantWAConfig } from './whatsapp';
import { upsertCustomer, getOrCreateConversation, saveMessage, updateConversationState, createBooking } from './booking';
import { logger } from '../utils/logger';
import prisma from '../utils/prisma';

export const processInboundMessage = async (
  tenant: Tenant,
  message: WhatsAppMessage,
  contact?: WhatsAppContact
): Promise<void> => {
  const { phoneNumberId, accessToken } = getTenantWAConfig(tenant);
  const fromPhone = message.from;
  const messageText = message.text?.body ?? message.interactive?.button_reply?.title ?? '';

  try {
    await markMessageRead(phoneNumberId, accessToken, message.id);

    const customer = await upsertCustomer(tenant.id, fromPhone, contact?.profile?.name);

    if (customer.isBlocked) {
      logger.warn(`Blocked customer attempted contact: ${fromPhone}`);
      return;
    }

    const conversation = await getOrCreateConversation(tenant.id, customer.id);

    await saveMessage({
      conversationId: conversation.id,
      waMessageId: message.id,
      direction: 'INBOUND',
      content: messageText,
    });

    const recentMessages = [...conversation.messages].reverse().slice(0, 6);
    const aiContext = {
      customerName: customer.name ?? undefined,
      previousMessages: recentMessages.map((m) => ({
        role: (m.direction === 'INBOUND' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
      pendingBooking: (conversation.context as Record<string, unknown>) ?? {},
    };

    const parsed = await parseBookingIntent(messageText, aiContext);
    const reply = await handleIntent(tenant, customer, conversation, parsed, { phoneNumberId, accessToken, fromPhone });

    if (reply) {
      await saveMessage({ conversationId: conversation.id, direction: 'OUTBOUND', content: reply, isAiGenerated: true });
    }
  } catch (err) {
    logger.error('processInboundMessage error', err);
    await sendTextMessage({
      phoneNumberId, accessToken, to: fromPhone,
      message: 'Sorry, something went wrong. Please try again in a moment.',
    });
  }
};

interface ReplyCtx { phoneNumberId: string; accessToken: string; fromPhone: string; }

type ConversationWithMessages = Conversation & { messages: Message[] };

const handleIntent = async (
  tenant: Tenant,
  customer: Customer,
  conversation: ConversationWithMessages,
  parsed: ParsedBookingIntent,
  ctx: ReplyCtx
): Promise<string> => {
  const { phoneNumberId, accessToken, fromPhone } = ctx;
  const pendingCtx = (conversation.context ?? {}) as Record<string, unknown>;

  switch (parsed.intent) {
    case 'greeting': {
      const name = customer.name ? `Hello ${customer.name}! 👋` : `Hello! 👋`;
      const msg = `${name} Welcome to our water tanker service!\n\n💧 *Book* — "Book 10KL tomorrow in Kondapur"\n📋 *Status* — "Check my booking status"\n💰 *Pricing* — "What are your rates?"\n\nHow can I help you today?`;
      await sendTextMessage({ phoneNumberId, accessToken, to: fromPhone, message: msg });
      await updateConversationState(conversation.id, 'IDLE', {});
      return msg;
    }

    case 'book': {
      const merged = { ...pendingCtx, ...cleanParsed(parsed) };
      const missing = getMissingFields(merged);

      if (missing.length === 0) {
        return handleCreateBooking(tenant, customer, conversation.id, merged, ctx);
      }

      await updateConversationState(conversation.id, 'COLLECTING_INFO', merged);
      await sendTextMessage({ phoneNumberId, accessToken, to: fromPhone, message: parsed.responseMessage });
      return parsed.responseMessage;
    }

    case 'status': {
      const bookings = await prisma.booking.findMany({
        where: { tenantId: tenant.id, customerId: customer.id, status: { notIn: ['DELIVERED', 'CANCELLED'] } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });

      if (bookings.length === 0) {
        const msg = `You have no active bookings. Want to book a tanker? Just say "Book 10KL tomorrow in Kondapur" 💧`;
        await sendTextMessage({ phoneNumberId, accessToken, to: fromPhone, message: msg });
        return msg;
      }

      const lines = bookings.map((b) =>
        `📋 *${b.bookingRef}*\n   💧 ${b.quantityKL} KL • 📅 ${new Date(b.scheduledDate).toLocaleDateString('en-IN')}\n   Status: *${b.status}*`
      );
      const msg = `*Your Active Bookings:*\n\n${lines.join('\n\n')}`;
      await sendTextMessage({ phoneNumberId, accessToken, to: fromPhone, message: msg });
      await updateConversationState(conversation.id, 'IDLE', {});
      return msg;
    }

    case 'pricing': {
      const msg = `💧 *Water Tanker Rates*\n\n• 8 KL  : ₹500–₹700\n• 10 KL : ₹600–₹800\n• 12 KL : ₹700–₹900\n\n_Prices vary by locality._\n\nReady to book? Say "Book 10KL tomorrow in Kondapur" 🙂`;
      await sendTextMessage({ phoneNumberId, accessToken, to: fromPhone, message: msg });
      return msg;
    }

    case 'cancel': {
      const msg = `To cancel, please share your booking reference number (e.g. BK-20240301-0001).`;
      await sendTextMessage({ phoneNumberId, accessToken, to: fromPhone, message: msg });
      return msg;
    }

    default: {
      if (conversation.state === 'COLLECTING_INFO' && Object.keys(pendingCtx).length > 0) {
        const merged = { ...pendingCtx, ...cleanParsed(parsed) };
        if (getMissingFields(merged).length === 0) {
          return handleCreateBooking(tenant, customer, conversation.id, merged, ctx);
        }
        await updateConversationState(conversation.id, 'COLLECTING_INFO', merged);
      }

      await sendTextMessage({ phoneNumberId, accessToken, to: fromPhone, message: parsed.responseMessage });
      return parsed.responseMessage;
    }
  }
};

const handleCreateBooking = async (
  tenant: Tenant,
  customer: Customer,
  conversationId: string,
  data: Record<string, unknown>,
  ctx: ReplyCtx
): Promise<string> => {
  const { phoneNumberId, accessToken, fromPhone } = ctx;

  try {
    const scheduledDate = new Date(data.date as string);
    if (isNaN(scheduledDate.getTime())) throw new Error('Invalid date');

    const booking = await createBooking({
      tenantId: tenant.id,
      customerId: customer.id,
      quantityKL: Number(data.quantityKL),
      scheduledDate,
      scheduledSlot: data.timeSlot as string ?? 'any',
      deliveryAddress: (data.address ?? data.locality ?? 'To be confirmed') as string,
      locality: data.locality as string,
      source: 'WHATSAPP',
      aiParsed: true,
    });

    const confirmMsg =
      `✅ *Booking Confirmed!*\n\n` +
      `📋 Ref: *${booking.bookingRef}*\n` +
      `💧 ${booking.quantityKL} KL\n` +
      `📅 ${scheduledDate.toLocaleDateString('en-IN')}\n` +
      `📍 ${data.locality ?? data.address}\n\n` +
      `We will call you before dispatch. Thank you! 🙏`;

    await sendButtonMessage({
      phoneNumberId, accessToken, to: fromPhone,
      bodyText: confirmMsg,
      buttons: [
        { id: `cancel_${booking.id}`, title: '❌ Cancel Booking' },
        { id: 'new_booking', title: '➕ New Booking' },
      ],
    });

    await updateConversationState(conversationId, 'IDLE', {});
    return confirmMsg;
  } catch (err) {
    logger.error('handleCreateBooking error', err);
    const msg = `Sorry, I could not create the booking. Please try again.`;
    await sendTextMessage({ phoneNumberId, accessToken, to: fromPhone, message: msg });
    return msg;
  }
};

const cleanParsed = (parsed: ParsedBookingIntent): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (parsed.quantityKL) out.quantityKL = parsed.quantityKL;
  if (parsed.date) out.date = parsed.date;
  if (parsed.timeSlot) out.timeSlot = parsed.timeSlot;
  if (parsed.locality) out.locality = parsed.locality;
  if (parsed.address) out.address = parsed.address;
  return out;
};

const getMissingFields = (data: Record<string, unknown>): string[] => {
  const missing: string[] = [];
  if (!data.quantityKL) missing.push('quantityKL');
  if (!data.date) missing.push('date');
  if (!data.locality && !data.address) missing.push('locality');
  return missing;
};
