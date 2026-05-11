// src/routes/instagram.ts
// Instagram DM webhook handler — uses the SAME MessageRouter as WhatsApp.
// Only the sender (how messages are sent back) differs.

import { Router, Request, Response } from 'express'
import axios from 'axios'
import { MessageRouter } from '../services/MessageRouter'
import { resolveTenantFromPhoneId } from '../middleware/tenant'
import { logger } from '../utils/logger'
import prisma from '../utils/prisma'

const router = Router()
const messageRouter = new MessageRouter(prisma)

const IG_API_VERSION = 'v19.0'
const IG_BASE = `https://graph.facebook.com/${IG_API_VERSION}`

router.get('/', (req: Request, res: Response): void => {
  if (req.query['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge'])
    return
  }
  res.sendStatus(403)
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  res.sendStatus(200)

  const body = req.body
  if (body.object !== 'instagram') return

  for (const entry of body.entry ?? []) {
    for (const messaging of entry.messaging ?? []) {
      const senderId: string = messaging.sender?.id
      const messageText: string = messaging.message?.text ?? ''
      if (!senderId || !messageText) continue

      // For Instagram, resolve tenant from a configured IG page ID
      // Store ig_page_id on the Tenant model (add as a field if needed)
      const tenant = await prisma.tenant.findFirst({ where: { isActive: true } })
      if (!tenant) continue

      // Instagram sender
      const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN ?? process.env.WHATSAPP_ACCESS_TOKEN ?? ''

      const sender = {
        async sendText(to: string, message: string): Promise<void> {
          try {
            await axios.post(`${IG_BASE}/me/messages`, {
              recipient: { id: to },
              message: { text: message },
            }, { headers: { Authorization: `Bearer ${accessToken}` } })
          } catch (err) {
            logger.error('Instagram sendText failed', err)
          }
        },
      }

      messageRouter.processIncomingMessage({
        tenant,
        fromPhone: senderId,            // Instagram uses sender ID not phone
        messageText,
        channel: 'instagram',
        sender,
        // Add manualPricingContext here for POC
      }).catch(err => logger.error('Instagram message processing failed', err))
    }
  }
})

export default router

// ═══════════════════════════════════════════════════════════════════

// src/routes/telegram.ts
// Telegram bot webhook handler — uses the SAME MessageRouter.

import TelegramRouter from 'express'
import TelegramAxios from 'axios'
import { MessageRouter as TgMessageRouter } from '../services/MessageRouter'
import prisma from '../utils/prisma'
import { logger as TgLogger } from '../utils/logger'

const telegramRouter = TelegramRouter.Router()
const tgMessageRouter = new TgMessageRouter(prisma)

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ''
const TG_BASE = `https://api.telegram.org/bot${TG_TOKEN}`

telegramRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  res.sendStatus(200)

  const update = req.body
  const message = update.message ?? update.edited_message
  if (!message?.text) return

  const chatId = String(message.chat.id)
  const messageText: string = message.text
  const customerName: string = message.from?.first_name

  // Resolve tenant from Telegram bot token (one bot = one tenant)
  // You can store telegram_bot_token on Tenant model
  const tenant = await prisma.tenant.findFirst({ where: { isActive: true } })
  if (!tenant) return

  const sender = {
    async sendText(to: string, msg: string): Promise<void> {
      try {
        await TelegramAxios.post(`${TG_BASE}/sendMessage`, {
          chat_id: to,
          text: msg,
          parse_mode: 'Markdown',
        })
      } catch (err) {
        TgLogger.error('Telegram sendText failed', err)
      }
    },
  }

  tgMessageRouter.processIncomingMessage({
    tenant,
    fromPhone: chatId,              // Telegram uses chat_id not phone
    messageText,
    customerName,
    channel: 'telegram',
    sender,
    // Add manualPricingContext here for POC
  }).catch(err => TgLogger.error('Telegram message processing failed', err))
})

export { telegramRouter }
