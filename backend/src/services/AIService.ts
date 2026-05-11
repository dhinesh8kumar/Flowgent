// src/services/AIService.ts
// The single AI handler for ALL channels (WhatsApp, Instagram, Telegram).
// Accepts optional manualPricingContext for POC/testing.

import Groq from 'groq-sdk'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { PricingService } from './PricingService'
import { PromptBuilder } from './PromptBuilder'
import {
  GenerateReplyInput,
  GenerateReplyInputSchema,
  ParsedAIReply,
  ManualPricingContext,
} from '../types/pricing'

const MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'

// Graceful fallback when AI fails entirely
const FALLBACK_REPLY: ParsedAIReply = {
  intent: 'unknown',
  responseMessage:
    'Sorry, I could not process your message right now. Please try again in a moment or call us directly.',
  requiresConfirmation: false,
  confidence: 0,
}

export class AIService {
  private readonly groq: Groq
  private readonly pricingService: PricingService
  private readonly promptBuilder: PromptBuilder

  constructor(prisma: PrismaClient) {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    this.pricingService = new PricingService(prisma)
    this.promptBuilder = new PromptBuilder()
  }

  // ── PUBLIC: Main entry point ────────────────────────────────
  /**
   * Generate a contextual AI reply for any incoming message on any channel.
   *
   * ─────────────────────────────────────────────────────────────
   * HOW TO USE — SCENARIO A (Production, DB pricing):
   * ─────────────────────────────────────────────────────────────
   *   const reply = await aiService.generateContextualReply({
   *     message: "Book 10KL sweet water tomorrow morning Kondapur",
   *     tenantId: "uuid-here",
   *     channel: "whatsapp",
   *     customerName: "Ravi",
   *     conversationHistory: [...],
   *   })
   *
   * ─────────────────────────────────────────────────────────────
   * HOW TO USE — SCENARIO B (POC/Testing, manual pricing):
   * ─────────────────────────────────────────────────────────────
   *   const reply = await aiService.generateContextualReply({
   *     message: "What is the price for 5000 gallon sweet water in JLT?",
   *     tenantId: "uuid-here",
   *     channel: "whatsapp",
   *     manualPricingContext: {
   *       services: [
   *         {
   *           serviceName: "Sweet Water Tanker",
   *           capacity: "5000 Gallons",
   *           basePrice: 150,
   *           unit: "AED",
   *           deliveryAreas: ["JLT", "Dubai Marina", "Downtown Dubai"],
   *         },
   *         {
   *           serviceName: "Construction Water",
   *           capacity: "10000 Gallons",
   *           basePrice: 250,
   *           unit: "AED",
   *         },
   *       ],
   *       rules: {
   *         operatingHours: "7 AM – 10 PM",
   *         paymentTerms: "Cash or bank transfer",
   *         currency: "AED",
   *         timezone: "Asia/Dubai",
   *       },
   *     },
   *   })
   */
  async generateContextualReply(input: GenerateReplyInput): Promise<ParsedAIReply> {
    // Validate input
    const parsed = GenerateReplyInputSchema.safeParse(input)
    if (!parsed.success) {
      logger.warn('generateContextualReply: invalid input', parsed.error.flatten())
      return FALLBACK_REPLY
    }

    const {
      message,
      tenantId,
      channel,
      customerName,
      conversationHistory,
      pendingBookingContext,
      manualPricingContext,
    } = parsed.data

    try {
      // ── Step 1: Fetch pricing (DB first, manual fallback) ───
      const pricingCtx = await this.pricingService.getPricingForAI(
        tenantId,
        manualPricingContext as ManualPricingContext | undefined
      )

      // ── Step 2: Build system prompt with pricing injected ───
      const systemPrompt = this.promptBuilder.buildSystemPrompt(pricingCtx, channel)

      // ── Step 3: Build conversation messages ────────────────
      const messages: any[] = []

      // Include recent conversation for multi-turn context
      if (conversationHistory.length > 0) {
        messages.push(...conversationHistory.slice(-8).map((m) => ({
          role: m.role,
          content: m.content,
        })))
      }

      // Enrich user message with pending booking context if mid-flow
      let enrichedMessage = message
      if (pendingBookingContext && Object.keys(pendingBookingContext).length > 0) {
        enrichedMessage = this.enrichMessageWithPricing(message, pendingBookingContext)
      }

      messages.push({ role: 'user', content: enrichedMessage })

      // ── Step 4: Call Groq ───────────────────────────────────
      logger.debug('Calling Groq', { tenantId, channel, intent: 'tbd', messageLen: message.length })

      const completion = await this.groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 600,
        temperature: 0.15,       // Low = consistent JSON + accurate pricing
        response_format: { type: 'json_object' },
      })

      // ── Step 5: Parse and return ────────────────────────────
      const rawJson = completion.choices[0]?.message?.content ?? '{}'
      const aiReply = this.parseAIResponse(rawJson, message)

      logger.info(`AI reply generated`, {
        tenantId,
        channel,
        intent: aiReply.intent,
        confidence: aiReply.confidence,
        pricingSource: pricingCtx.source,
      })

      return aiReply

    } catch (err) {
      logger.error('generateContextualReply failed', err)
      return FALLBACK_REPLY
    }
  }

  // ── Private helpers ─────────────────────────────────────────

  /**
   * Enriches the user message with pending booking context.
   * Helps the model understand mid-booking state without re-asking.
   */
  private enrichMessageWithPricing(
    message: string,
    pendingCtx: Record<string, unknown>
  ): string {
    const ctxSummary = Object.entries(pendingCtx)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')

    if (!ctxSummary) return message

    return `[Booking in progress — collected so far: ${ctxSummary}]\nCustomer says: ${message}`
  }

  /**
   * Safely parse the AI JSON response.
   * Returns graceful fallback if JSON is malformed.
   */
  private parseAIResponse(rawJson: string, originalMessage: string): ParsedAIReply {
    try {
      const data = JSON.parse(rawJson)

      return {
        intent: data.intent ?? 'unknown',
        responseMessage: data.responseMessage ?? FALLBACK_REPLY.responseMessage,
        requiresConfirmation: data.requiresConfirmation ?? false,
        bookingData: data.bookingData ?? undefined,
        quotedServices: data.quotedServices ?? undefined,
        confidence: typeof data.confidence === 'number' ? data.confidence : 0.5,
      }
    } catch (err) {
      logger.error('Failed to parse AI JSON response', { rawJson, err })
      return { ...FALLBACK_REPLY }
    }
  }
}
