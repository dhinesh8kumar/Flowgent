// src/routes/webhook.ts (UPDATED)
// Now uses MessageRouter — same router works for all channels.
// WhatsApp sender is defined here; Instagram/Telegram define their own senders.

import { Router, Request, Response } from 'express'
import { WhatsAppWebhookBody } from '../types'
import { resolveTenantFromPhoneId } from '../middleware/tenant'
import { MessageRouter, ChannelSender } from '../services/MessageRouter'
import { sendTextMessage, markMessageRead, getTenantWAConfig } from '../services/whatsapp'
import { logger } from '../utils/logger'
import prisma from '../utils/prisma'
import { Tenant } from '@prisma/client'

const router = Router()
const messageRouter = new MessageRouter(prisma)

// ── GET /webhook — Meta verification ─────────────────────────
router.get('/', (req: Request, res: Response): void => {
  const mode      = req.query['hub.mode']
  const token     = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified')
    res.status(200).send(challenge)
    return
  }
  res.status(403).json({ error: 'Verification failed' })
})

// ── POST /webhook — Inbound messages ─────────────────────────
router.post('/', async (req: Request, res: Response): Promise<void> => {
  // Always respond 200 immediately (Meta retries on timeout)
  res.status(200).json({ status: 'received' })

  const body = req.body as WhatsAppWebhookBody
  if (body.object !== 'whatsapp_business_account') return

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue

          const value = change.value
          if (!value) continue
          const phoneNumberId = value.metadata?.phone_number_id
          if (!phoneNumberId) continue

      const tenant = await resolveTenantFromPhoneId(phoneNumberId)
      if (!tenant) {
        logger.warn(`No tenant for phone_number_id: ${phoneNumberId}`)
        continue
      }

      for (const message of value.messages ?? []) {
        if (message.type !== 'text' && message.type !== 'interactive') continue

        const messageText = message.text?.body
          ?? message.interactive?.button_reply?.title
          ?? ''
        const contact = value.contacts?.[0]

        // Build the WhatsApp channel sender for this tenant
        const sender = buildWhatsAppSender(tenant, phoneNumberId)

        // ════════════════════════════════════════════════════
        // SCENARIO A — Production: DB pricing (default)
        // ════════════════════════════════════════════════════
          messageRouter.processIncomingMessage({
            tenant,
            fromPhone: message.from ?? '',
            messageText,
            messageId: message.id,
            customerName: contact?.profile?.name,
            channel: 'whatsapp',
          sender,
          // manualPricingContext: undefined  ← uses DB
        }).catch(err => logger.error(`Failed to process message ${message.id}`, err))

        // ════════════════════════════════════════════════════
        // SCENARIO B — POC/Testing: uncomment and edit below
        // to use manual pricing instead of DB
        // ════════════════════════════════════════════════════
        /*
        messageRouter.processIncomingMessage({
          tenant,
          fromPhone: message.from,
          messageText,
          messageId: message.id,
          customerName: contact?.profile?.name,
          channel: 'whatsapp',
          sender,
          manualPricingContext: {
            services: [
              {
                serviceName: 'Sweet Water Tanker',
                serviceCode: 'SWT-10KL',
                capacity: '10KL',
                basePrice: 700,
                pricePerKL: 70,
                unit: 'INR',
                minimumOrder: 5,
                deliveryAreas: ['Kondapur', 'Gachibowli', 'Madhapur', 'HITEC City'],
                slotsAvailable: ['morning', 'afternoon', 'evening'],
                additionalCharges: { nightSurcharge: 100 },
              },
              {
                serviceName: 'Construction Water',
                serviceCode: 'CWT-12KL',
                capacity: '12KL',
                basePrice: 800,
                unit: 'INR',
                deliveryAreas: ['All Hyderabad areas'],
              },
            ],
            rules: {
              operatingHours: '6 AM – 9 PM, 7 days a week',
              paymentTerms: 'Cash on delivery or UPI',
              cancellationPolicy: 'Free cancellation up to 2 hours before delivery',
              currency: 'INR',
              timezone: 'Asia/Kolkata',
            },
          },
        }).catch(err => logger.error(`Failed to process message ${message.id}`, err))
        */
      }
    }
  }
})

// ── WhatsApp sender factory ───────────────────────────────────
// Creates a ChannelSender for WhatsApp using tenant's config.
// Instagram and Telegram will have their own sender factories.
function buildWhatsAppSender(tenant: Tenant, phoneNumberIdOverride?: string): ChannelSender {
  const { phoneNumberId, accessToken } = getTenantWAConfig(tenant)
  const pid = phoneNumberIdOverride ?? phoneNumberId

  return {
    async sendText(to: string, message: string): Promise<void> {
      await sendTextMessage({ phoneNumberId: pid, accessToken, to, message })
    },
    async markRead(messageId: string): Promise<void> {
      await markMessageRead(pid, accessToken, messageId)
    },
  }
}

export default router
