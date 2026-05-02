import { Router, Request, Response } from 'express'
import { WhatsAppWebhookBody } from '../types'
import { resolveTenantFromPhoneId } from '../middleware/tenant'
import { MessageRouter } from '../services/MessageRouter'
import { sendTextMessage, markMessageRead, getTenantWAConfig } from '../services/whatsapp'
import { logger } from '../utils/logger'
import prisma from '../utils/prisma'

const router = Router()
const messageRouter = new MessageRouter(prisma)

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

router.post('/', async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ status: 'received' })

  const body = req.body as WhatsAppWebhookBody
  if (body.object !== 'whatsapp_business_account') return

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue

      const value = change.value
      const phoneNumberId = value.metadata?.phone_number_id
      if (!phoneNumberId) continue

      const tenant = await resolveTenantFromPhoneId(phoneNumberId)
      if (!tenant) {
        logger.warn(`No tenant for phone_number_id: ${phoneNumberId}`)
        continue
      }

      const { phoneNumberId: pid, accessToken } = getTenantWAConfig(tenant)

      const sender = {
        async sendText(to: string, message: string): Promise<void> {
          await sendTextMessage({ phoneNumberId: pid, accessToken, to, message })
        },
        async markRead(messageId: string): Promise<void> {
          await markMessageRead(pid, accessToken, messageId)
        },
      }

      for (const message of value.messages ?? []) {
        if (message.type !== 'text' && message.type !== 'interactive') continue

        const messageText = message.text?.body
          ?? message.interactive?.button_reply?.title
          ?? ''
        const contact = value.contacts?.[0]

        messageRouter.processIncomingMessage({
          tenant,
          fromPhone: message.from,
          messageText,
          messageId: message.id,
          customerName: contact?.profile?.name,
          channel: 'whatsapp',
          sender,
          // ── To use manual pricing instead of DB, uncomment: ──
          // manualPricingContext: {
          //   services: [
          //     { serviceName: 'Sweet Water 10KL', basePrice: 700, unit: 'INR',
          //       deliveryAreas: ['Kondapur', 'Gachibowli'] }
          //   ],
          //   rules: { currency: 'INR', operatingHours: '6AM-9PM' }
          // }
        }).catch(err => logger.error(`Failed to process message ${message.id}`, err))
      }
    }
  }
})

export default router