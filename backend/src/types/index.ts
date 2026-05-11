import { Request } from 'express'
import { Tenant, User } from '@prisma/client'
import { JwtPayload as JsonWebTokenPayload } from 'jsonwebtoken'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface AuthenticatedRequest extends Request {
  user?: Omit<User, 'passwordHash'>
  tenant?: Tenant
  tenantId?: string
}

export interface JwtPayload extends JsonWebTokenPayload {
  userId: string
  tenantId: string
  role: string
}

export interface WhatsAppWebhookBody {
  object: string
  entry?: Array<{
    changes?: Array<{
      field?: string
      value?: {
        metadata?: { phone_number_id?: string }
        messages?: Array<{
          from?: string
          id?: string
          type?: string
          text?: { body?: string }
          interactive?: { button_reply?: { title?: string } }
        }>
        contacts?: Array<{ profile?: { name?: string } }>
      }
    }>
  }>
}
