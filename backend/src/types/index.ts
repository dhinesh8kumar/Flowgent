import { Request } from 'express'
import { Tenant, User } from '@prisma/client'

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
