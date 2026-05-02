// src/services/MessageRouter.ts
// Orchestrates the full message flow for ANY channel:
//   Inbound message → fetch pricing → AI reply → possibly create booking
//
// Used by: WhatsApp webhook, Instagram DM handler, Telegram bot handler
// All three call processIncomingMessage() — one function to rule them all.

import { PrismaClient, Tenant } from '@prisma/client'
import { AIService } from './AIService'
import { upsertCustomer, getOrCreateConversation, saveMessage, updateConversationState, createBooking } from './booking'
import { logger } from '../utils/logger'
import { ManualPricingContext, MessageChannel, ParsedAIReply } from '../types/pricing'

// Channel-specific send functions — each channel implements this interface
export interface ChannelSender {
  sendText(to: string, message: string): Promise<void>
  sendConfirmation?(to: string, message: string, bookingRef: string): Promise<void>
  markRead?(messageId: string): Promise<void>
}

export class MessageRouter {
  private readonly aiService: AIService

  constructor(private readonly prisma: PrismaClient) {
    this.aiService = new AIService(prisma)
  }

  /**
   * ═══════════════════════════════════════════════════════════
   * MAIN ENTRY POINT — call this from any channel handler
   * ═══════════════════════════════════════════════════════════
   *
   * WhatsApp usage (no manual pricing — uses DB):
   *   await router.processIncomingMessage({
   *     tenant, fromPhone: '919876543210',
   *     messageText: 'Book 10KL tomorrow Kondapur',
   *     messageId: 'wamid.xxx',
   *     channel: 'whatsapp',
   *     sender,
   *   })
   *
   * POC/Testing (manual pricing override):
   *   await router.processIncomingMessage({
   *     tenant, fromPhone: '919876543210',
   *     messageText: 'What is price for sweet water?',
   *     channel: 'whatsapp',
   *     sender,
   *     manualPricingContext: {
   *       services: [{ serviceName: 'Sweet Water 10KL', basePrice: 700, unit: 'INR' }],
   *       rules: { currency: 'INR' },
   *     },
   *   })
   */
  async processIncomingMessage(opts: {
    tenant: Tenant
    fromPhone: string
    messageText: string
    messageId?: string
    customerName?: string
    channel: MessageChannel
    sender: ChannelSender
    manualPricingContext?: ManualPricingContext
  }): Promise<void> {
    const {
      tenant, fromPhone, messageText, messageId,
      customerName, channel, sender, manualPricingContext,
    } = opts

    logger.info(`[${channel.toUpperCase()}] Incoming from ${fromPhone} → tenant ${tenant.slug}`)

    try {
      // ── 1. Mark as read (best effort) ──────────────────────
      if (messageId && sender.markRead) {
        await sender.markRead(messageId).catch(() => {/* non-fatal */})
      }

      // ── 2. Upsert customer ─────────────────────────────────
      const customer = await upsertCustomer(tenant.id, fromPhone, customerName)

      if (customer.isBlocked) {
        logger.warn(`Blocked customer ${fromPhone} — ignoring`)
        return
      }

      // ── 3. Get/create conversation (maintains FSM state) ───
      const conversation = await getOrCreateConversation(tenant.id, customer.id)

      // ── 4. Save inbound message ────────────────────────────
      await saveMessage({
        conversationId: conversation.id,
        waMessageId: messageId,
        direction: 'INBOUND',
        content: messageText,
      })

      // ── 5. Build conversation history for AI ───────────────
      const recentMessages = [...conversation.messages].reverse().slice(0, 8)
      const conversationHistory = recentMessages.map((m) => ({
        role: (m.direction === 'INBOUND' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      }))

      // ── 6. Call AI with pricing context ────────────────────
      const aiReply = await this.aiService.generateContextualReply({
        message: messageText,
        tenantId: tenant.id,
        channel,
        customerName: customer.name ?? undefined,
        conversationHistory,
        pendingBookingContext: (conversation.context as Record<string, unknown>) ?? {},
        manualPricingContext,
      })

      // ── 7. Route based on AI intent ────────────────────────
      const outboundMessage = await this.handleAIReply({
        tenant, customer, conversation,
        aiReply, channel, sender, fromPhone,
      })

      // ── 8. Save outbound message ───────────────────────────
      if (outboundMessage) {
        await saveMessage({
          conversationId: conversation.id,
          direction: 'OUTBOUND',
          content: outboundMessage,
          isAiGenerated: true,
        })
      }

    } catch (err) {
      logger.error(`[${channel}] processIncomingMessage failed`, err)
      await sender.sendText(fromPhone, 'Sorry, something went wrong. Please try again in a moment.')
    }
  }

  // ── Private: Route AI reply to correct action ───────────────

  private async handleAIReply(opts: {
    tenant: Tenant
    customer: import('@prisma/client').Customer
    conversation: import('@prisma/client').Conversation & { messages: import('@prisma/client').Message[] }
    aiReply: ParsedAIReply
    channel: MessageChannel
    sender: ChannelSender
    fromPhone: string
  }): Promise<string> {
    const { tenant, customer, conversation, aiReply, sender, fromPhone } = opts

    switch (aiReply.intent) {
      case 'book': {
        const booking = aiReply.bookingData

        // If AI needs more info → just send response message, update FSM
        if (booking?.missingFields && booking.missingFields.length > 0) {
          await updateConversationState(
            conversation.id,
            'COLLECTING_INFO',
            this.mergeBookingContext(conversation.context as Record<string, unknown>, booking)
          )
          await sender.sendText(fromPhone, aiReply.responseMessage)
          return aiReply.responseMessage
        }

        // If AI has all info but wants confirmation from customer
        if (aiReply.requiresConfirmation) {
          await updateConversationState(
            conversation.id,
            'AWAITING_CONFIRMATION',
            this.mergeBookingContext(conversation.context as Record<string, unknown>, booking ?? {})
          )
          await sender.sendText(fromPhone, aiReply.responseMessage)
          return aiReply.responseMessage
        }

        // Customer confirmed → create booking
        if (conversation.state === 'AWAITING_CONFIRMATION' && booking) {
          return this.createBookingAndReply({
            tenant, customer, conversationId: conversation.id,
            booking: { ...(conversation.context as Record<string, unknown>), ...booking },
            sender, fromPhone,
          })
        }

        // Direct booking (high confidence, all fields present)
        if (booking && !booking.missingFields?.length) {
          return this.createBookingAndReply({
            tenant, customer, conversationId: conversation.id,
            booking, sender, fromPhone,
          })
        }

        await sender.sendText(fromPhone, aiReply.responseMessage)
        return aiReply.responseMessage
      }

      case 'inquiry':
      case 'pricing':
      case 'status':
      case 'cancel':
      case 'greeting':
      default: {
        // Reset FSM to IDLE for non-booking intents
        if (['greeting', 'pricing', 'inquiry'].includes(aiReply.intent)) {
          await updateConversationState(conversation.id, 'IDLE', {})
        }
        await sender.sendText(fromPhone, aiReply.responseMessage)
        return aiReply.responseMessage
      }
    }
  }

  private async createBookingAndReply(opts: {
    tenant: Tenant
    customer: import('@prisma/client').Customer
    conversationId: string
    booking: Record<string, unknown>
    sender: ChannelSender
    fromPhone: string
  }): Promise<string> {
    const { tenant, customer, conversationId, booking, sender, fromPhone } = opts

    try {
      const scheduledDate = new Date(booking.date as string)
      if (isNaN(scheduledDate.getTime())) throw new Error('Invalid date in booking context')

      const created = await createBooking({
        tenantId: tenant.id,
        customerId: customer.id,
        quantityKL: Number(booking.quantityKL ?? 0),
        scheduledDate,
        scheduledSlot: (booking.timeSlot as string) ?? 'any',
        deliveryAddress: (booking.address ?? booking.locality ?? 'To be confirmed') as string,
        locality: booking.locality as string | undefined,
        notes: booking.serviceName ? `Service: ${booking.serviceName}` : undefined,
        source: 'WHATSAPP',
        aiParsed: true,
      })

      const confirmMsg =
        `✅ *Booking Confirmed!*\n\n` +
        `📋 Ref: *${created.bookingRef}*\n` +
        `💧 ${created.quantityKL} KL\n` +
        `📅 ${scheduledDate.toLocaleDateString('en-IN')}\n` +
        `⏰ ${booking.timeSlot ?? 'Any time'}\n` +
        `📍 ${booking.locality ?? booking.address}\n` +
        (booking.estimatedPrice ? `💰 Estimated: ₹${booking.estimatedPrice}\n` : '') +
        `\nWe will call you before dispatch. Thank you! 🙏`

      await updateConversationState(conversationId, 'IDLE', {})
      await sender.sendText(fromPhone, confirmMsg)
      return confirmMsg

    } catch (err) {
      logger.error('createBookingAndReply failed', err)
      const errMsg = 'Sorry, I could not create your booking. Please call us directly.'
      await sender.sendText(fromPhone, errMsg)
      return errMsg
    }
  }

  private mergeBookingContext(
    existing: Record<string, unknown>,
    incoming: Record<string, unknown>
  ): Record<string, unknown> {
    // Only overwrite non-null incoming values
    const merged = { ...existing }
    for (const [k, v] of Object.entries(incoming)) {
      if (v != null && v !== '' && k !== 'missingFields') {
        merged[k] = v
      }
    }
    return merged
  }
}
