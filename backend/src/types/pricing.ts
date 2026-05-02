// src/types/pricing.ts
// All types for the dynamic pricing + AI context system

import { z } from 'zod'
import { ServiceCategory } from '@prisma/client'

// ── Manual pricing context (for POC / testing) ────────────────
// Pass this when the tenant hasn't added pricing to DB yet.
export interface ManualServiceEntry {
  serviceName: string           // "Sweet Water Tanker"
  serviceCode?: string          // "SWT-10KL"
  category?: string             // "WATER_TANKER"
  capacity?: string             // "10KL"
  basePrice: number             // 700
  pricePerKL?: number           // 70 per KL
  unit?: string                 // "INR" | "AED"
  minimumOrder?: number         // 5 (KL)
  deliveryAreas?: string[]      // ["Kondapur", "Gachibowli"]
  slotsAvailable?: string[]     // ["morning", "afternoon"]
  additionalCharges?: Record<string, number>  // { nightSurcharge: 100 }
  description?: string
}

export interface ManualTenantRules {
  cancellationPolicy?: string
  paymentTerms?: string
  operatingHours?: string
  serviceAreas?: string
  specialNotes?: string
  currency?: string
  timezone?: string
}

// The full manual context object you pass to override DB pricing
export interface ManualPricingContext {
  services: ManualServiceEntry[]
  rules?: ManualTenantRules
}

// ── Normalised pricing entry (used by AI regardless of source) ─
// Both DB and manual sources are normalised to this shape
// before being passed to the AI prompt builder.
export interface NormalisedService {
  serviceName: string
  serviceCode: string
  category: string
  capacity: string
  basePrice: number
  pricePerKL: number | null
  unit: string
  minimumOrder: number | null
  deliveryAreas: string[]
  slotsAvailable: string[]
  additionalCharges: Record<string, number>
  description: string
  leadTimeHours: number
}

export interface NormalisedTenantRules {
  cancellationPolicy: string
  paymentTerms: string
  operatingHours: string
  serviceAreas: string
  specialNotes: string
  currency: string
  timezone: string
}

// Everything the AI needs about pricing for one tenant
export interface TenantPricingContext {
  tenantId: string
  tenantName: string
  services: NormalisedService[]
  rules: NormalisedTenantRules
  fetchedAt: string           // ISO timestamp
  source: 'database' | 'manual' | 'mixed'
}

// ── AI reply types ────────────────────────────────────────────
export interface ParsedAIReply {
  intent: MessageIntent
  responseMessage: string       // message to send back to customer
  bookingData?: BookingData     // present only if intent === 'book'
  quotedServices?: QuotedService[]
  confidence: number
  requiresConfirmation: boolean // true = ask customer to confirm before booking
}

export type MessageIntent =
  | 'book'
  | 'inquiry'
  | 'status'
  | 'cancel'
  | 'pricing'
  | 'greeting'
  | 'unknown'

export type MessageChannel = 'whatsapp' | 'instagram' | 'telegram' | 'dashboard'

export interface BookingData {
  serviceCode?: string
  serviceName?: string
  quantityKL?: number
  date?: string               // ISO date YYYY-MM-DD
  timeSlot?: string
  locality?: string
  address?: string
  estimatedPrice?: number
  missingFields: string[]
}

export interface QuotedService {
  serviceName: string
  capacity: string
  totalPrice: number
  unit: string
  breakdown?: string
}

// ── Zod schemas for validation ────────────────────────────────
export const ManualServiceEntrySchema = z.object({
  serviceName: z.string().min(1),
  serviceCode: z.string().optional(),
  category: z.string().optional(),
  capacity: z.string().optional(),
  basePrice: z.number().min(0),
  pricePerKL: z.number().optional(),
  unit: z.string().optional().default('INR'),
  minimumOrder: z.number().int().optional(),
  deliveryAreas: z.array(z.string()).optional().default([]),
  slotsAvailable: z.array(z.string()).optional().default(['morning', 'afternoon', 'evening']),
  additionalCharges: z.record(z.number()).optional().default({}),
  description: z.string().optional(),
})

export const ManualPricingContextSchema = z.object({
  services: z.array(ManualServiceEntrySchema).min(1),
  rules: z.object({
    cancellationPolicy: z.string().optional(),
    paymentTerms: z.string().optional(),
    operatingHours: z.string().optional(),
    serviceAreas: z.string().optional(),
    specialNotes: z.string().optional(),
    currency: z.string().optional().default('INR'),
    timezone: z.string().optional().default('Asia/Kolkata'),
  }).optional(),
})

// Input to generateContextualReply
export const GenerateReplyInputSchema = z.object({
  message: z.string().min(1),
  tenantId: z.string().uuid(),
  channel: z.enum(['whatsapp', 'instagram', 'telegram', 'dashboard']).default('whatsapp'),
  customerName: z.string().optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
  pendingBookingContext: z.record(z.unknown()).optional().default({}),
  manualPricingContext: ManualPricingContextSchema.optional(),
})

export type GenerateReplyInput = z.infer<typeof GenerateReplyInputSchema>
