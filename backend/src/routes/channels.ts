import { Router, Request, Response } from 'express'

const router = Router()

// Instagram and Telegram webhook handlers are intentionally disabled for now.
// WhatsApp continues to run through src/routes/webhook.ts, which is the only
// active channel route mounted in src/index.ts.
router.all('*', (_req: Request, res: Response): void => {
  res.status(501).json({
    success: false,
    error: 'Additional channels are disabled. WhatsApp is the only active channel.',
  })
})

export default router
