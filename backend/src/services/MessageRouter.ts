import { PrismaClient, Tenant } from '@prisma/client'
import { createBooking, getOrCreateConversation, saveMessage, updateConversationState, upsertCustomer } from './booking'
import { AIService } from './AIService'
import { logger } from '../utils/logger'
import { ManualPricingContext, MessageChannel, ParsedAIReply } from '../types/pricing'
import { TenantNotificationService } from './TenantNotificationService'

export interface ChannelSender {
  sendText(to: string, message: string): Promise<void>
  sendConfirmation?(to: string, message: string, bookingRef: string): Promise<void>
  markRead?(messageId: string): Promise<void>
}

export class MessageRouter {
  private readonly aiService: AIService
  private readonly tenantNotificationService: TenantNotificationService

  constructor(private readonly prisma: PrismaClient) {
    this.aiService = new AIService(prisma)
    this.tenantNotificationService = new TenantNotificationService()
  }

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
      tenant,
      fromPhone,
      messageText,
      messageId,
      customerName,
      channel,
      sender,
      manualPricingContext,
    } = opts

    logger.info(`[${channel.toUpperCase()}] Incoming from ${fromPhone} -> tenant ${tenant.slug}`)

    try {
      if (messageId && sender.markRead) {
        await sender.markRead(messageId).catch(() => undefined)
      }

      const customer = await upsertCustomer(tenant.id, fromPhone, customerName)

      if (customer.isBlocked) {
        logger.warn(`Blocked customer ${fromPhone} - ignoring`)
        return
      }

      const conversation = await getOrCreateConversation(tenant.id, customer.id)

      await saveMessage({
        conversationId: conversation.id,
        waMessageId: messageId,
        direction: 'INBOUND',
        content: messageText,
      })

      const recentMessages = [...conversation.messages].reverse().slice(0, 8)
      const conversationHistory = recentMessages.map((message) => ({
        role: (message.direction === 'INBOUND' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: message.content,
      }))

      const aiReply = await this.aiService.generateContextualReply({
        message: messageText,
        tenantId: tenant.id,
        channel,
        customerName: customer.name ?? undefined,
        conversationHistory,
        pendingBookingContext: (conversation.context as Record<string, unknown>) ?? {},
        manualPricingContext: manualPricingContext as any,
      })

      const outboundMessage = await this.handleAIReply({
        tenant,
        customer,
        conversation,
        aiReply,
        sender,
        fromPhone,
      })

      if (outboundMessage) {
        await saveMessage({
          conversationId: conversation.id,
          direction: 'OUTBOUND',
          content: outboundMessage,
          isAiGenerated: true,
        })
      }
    } catch (error) {
      logger.error(`[${channel}] processIncomingMessage failed`, error)
      await sender.sendText(fromPhone, 'Sorry, something went wrong. Please try again in a moment.')
    }
  }

  private async handleAIReply(opts: {
    tenant: Tenant
    customer: import('@prisma/client').Customer
    conversation: import('@prisma/client').Conversation & { messages: import('@prisma/client').Message[] }
    aiReply: ParsedAIReply
    sender: ChannelSender
    fromPhone: string
  }): Promise<string> {
    const { tenant, customer, conversation, aiReply, sender, fromPhone } = opts

    switch (aiReply.intent) {
      case 'book': {
        const booking = aiReply.bookingData

        if (booking?.missingFields && booking.missingFields.length > 0) {
          await updateConversationState(
            conversation.id,
            'COLLECTING_INFO',
            this.mergeBookingContext(conversation.context as Record<string, unknown>, booking as unknown as Record<string, unknown>)
          )
          await sender.sendText(fromPhone, aiReply.responseMessage)
          return aiReply.responseMessage
        }

        if (aiReply.requiresConfirmation) {
          await updateConversationState(
            conversation.id,
            'AWAITING_CONFIRMATION',
            this.mergeBookingContext(
              conversation.context as Record<string, unknown>,
              (booking ?? {}) as unknown as Record<string, unknown>
            )
          )
          await sender.sendText(fromPhone, aiReply.responseMessage)
          return aiReply.responseMessage
        }

        if (conversation.state === 'AWAITING_CONFIRMATION' && booking) {
          return this.createBookingAndReply({
            tenant,
            customer,
            conversationId: conversation.id,
            booking: { ...(conversation.context as Record<string, unknown>), ...booking } as unknown as Record<string, unknown>,
            sender,
            fromPhone,
          })
        }

        if (booking && !booking.missingFields?.length) {
          return this.createBookingAndReply({
            tenant,
            customer,
            conversationId: conversation.id,
            booking: booking as unknown as Record<string, unknown>,
            sender,
            fromPhone,
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
      const scheduledDate = new Date(String(booking.date))
      if (isNaN(scheduledDate.getTime())) {
        throw new Error('Invalid date in booking context')
      }

      const rawQuantity = Number(booking.quantity ?? 0)
      const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : undefined
      const unit = booking.unit ? String(booking.unit) : undefined

      const created = await createBooking({
        tenantId: tenant.id,
        customerId: customer.id,
        serviceName: String(booking.serviceName ?? 'Service Booking'),
        quantity,
        unit,
        totalAmount: booking.estimatedPrice ? Number(booking.estimatedPrice) : undefined,
        scheduledDate,
        scheduledSlot: String(booking.timeSlot ?? 'any'),
        deliveryAddress: String(booking.address ?? booking.locality ?? 'To be confirmed'),
        locality: booking.locality ? String(booking.locality) : undefined,
        notes: booking.serviceName ? `Service: ${booking.serviceName}` : undefined,
        source: 'WHATSAPP',
        aiParsed: true,
      })

      await this.tenantNotificationService.sendBookingAlert({
        tenant,
        booking: created,
        customer,
      }).catch((notificationError) => {
        logger.error(`Failed to send tenant alert for booking ${created.bookingRef}`, notificationError)
      })

      const quantityLine = created.quantity != null
        ? `Qty: ${created.quantity}${created.unit ? ` ${created.unit}` : ''}\n`
        : ''

      const confirmMsg =
        `✅ *Booking Confirmed!*\n\n` +
        `📋 Ref: *${created.bookingRef}*\n` +
        `🛠️ Service: *${created.serviceName}*\n` +
        quantityLine +
        `📅 Date: ${scheduledDate.toLocaleDateString('en-IN')}\n` +
        `⏰ Time: ${booking.timeSlot ?? 'Any time'}\n` +
        `📍 Location: ${booking.locality ?? booking.address}\n` +
        (booking.estimatedPrice ? `💰 Estimated: INR ${booking.estimatedPrice}\n` : '') +
        `\n📞 We will call you before dispatch. Thank you! 🙏`

      await updateConversationState(conversationId, 'IDLE', {})
      await sender.sendText(fromPhone, confirmMsg)
      return confirmMsg
    } catch (error) {
      logger.error('createBookingAndReply failed', error)
      const errorMessage = 'Sorry, I could not create your booking. Please call us directly.'
      await sender.sendText(fromPhone, errorMessage)
      return errorMessage
    }
  }

  private mergeBookingContext(
    existing: Record<string, unknown>,
    incoming: Record<string, unknown>
  ): Record<string, unknown> {
    const merged = { ...existing }
    for (const [key, value] of Object.entries(incoming)) {
      if (value != null && value !== '' && key !== 'missingFields') {
        merged[key] = value
      }
    }
    return merged
  }
}
