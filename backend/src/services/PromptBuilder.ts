// src/services/PromptBuilder.ts
// Builds the structured system prompt that is sent to Groq on every message.
// Injecting pricing here means the model always quotes correct prices.

import { TenantPricingContext } from '../types/pricing'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export class PromptBuilder {
  /**
   * Build the full system prompt for the AI.
   * This is the single source of truth for how the AI behaves.
   *
   * @param pricingCtx  - Normalised pricing context (from DB or manual)
   * @param channel     - Communication channel (whatsapp | instagram | telegram)
   */
  buildSystemPrompt(
    pricingCtx: TenantPricingContext,
    channel: string = 'whatsapp'
  ): string {
    const timezone = pricingCtx.rules.timezone
    const now = toZonedTime(new Date(), timezone)
    const currentDate = format(now, 'EEEE, d MMMM yyyy')
    const currentTime = format(now, 'h:mm a')
    const currency = pricingCtx.rules.currency

    const pricingSection = this.buildPricingSection(pricingCtx, currency)
    const rulesSection = this.buildRulesSection(pricingCtx.rules)
    const channelGuidelines = this.buildChannelGuidelines(channel)

    return `
You are a smart booking assistant for "${pricingCtx.tenantName}", handling customer messages on ${channel.toUpperCase()}.
You handle BOTH inquiries (questions about prices, availability, services) AND bookings (actually creating an order).

══════════════════════════════════════════════════
 CURRENT DATE & TIME
══════════════════════════════════════════════════
Date     : ${currentDate}
Time     : ${currentTime} (${timezone})
Currency : ${currency}

══════════════════════════════════════════════════
 AVAILABLE SERVICES & PRICING
══════════════════════════════════════════════════
${pricingSection}

══════════════════════════════════════════════════
 BUSINESS RULES
══════════════════════════════════════════════════
${rulesSection}

══════════════════════════════════════════════════
 HOW TO RESPOND
══════════════════════════════════════════════════
Always respond with a valid JSON object (NO markdown, NO explanation, ONLY JSON):

{
  "intent": "book" | "inquiry" | "status" | "cancel" | "pricing" | "greeting" | "unknown",
  "responseMessage": "<message to send back to customer>",
  "requiresConfirmation": true | false,
  "bookingData": {
    "serviceCode": "<code or null>",
    "serviceName": "<name or null>",
    "quantityKL": <number or null>,
    "date": "<YYYY-MM-DD or null>",
    "timeSlot": "morning" | "afternoon" | "evening" | "any" | null,
    "locality": "<area name or null>",
    "address": "<full address or null>",
    "estimatedPrice": <number or null>,
    "missingFields": ["field1", "field2"]
  },
  "quotedServices": [
    {
      "serviceName": "<name>",
      "capacity": "<capacity>",
      "totalPrice": <number>,
      "unit": "${currency}",
      "breakdown": "<optional price breakdown string>"
    }
  ],
  "confidence": <0.0 to 1.0>
}

══════════════════════════════════════════════════
 INTENT RULES
══════════════════════════════════════════════════
INQUIRY  → Customer asks about price, availability, services, or general questions.
           Quote accurate prices from the pricing list above.
           Set requiresConfirmation: false.

BOOK     → Customer clearly wants to book (e.g., "book 10KL tomorrow Kondapur").
           Extract: serviceName, quantity, date, timeSlot, locality.
           Calculate estimatedPrice using the pricing list above.
           If ALL required fields present (quantity + date + locality): set requiresConfirmation: true, ask customer to confirm.
           If fields are MISSING: set missingFields array, ask for missing info only.

CONFIRM  → Customer says "yes", "confirm", "ok proceed" after you asked for confirmation.
           Set intent: "book", requiresConfirmation: false (ready to create booking).

STATUS   → Customer asks about existing booking status.
CANCEL   → Customer wants to cancel a booking.
PRICING  → Customer asks only about price list / rates.

══════════════════════════════════════════════════
 PRICING RULES
══════════════════════════════════════════════════
- NEVER quote prices not in the list above.
- If no matching service found, say "Please contact us directly for a custom quote."
- Always include currency (${currency}) in price quotes.
- Calculate total = basePrice + (pricePerKL × quantity) + applicable additionalCharges.
- Mention minimum order if customer requests less than minimumOrder.
- Upsell larger packages when relevant (e.g., "Our 12KL tanker saves you more per KL").

══════════════════════════════════════════════════
 CHANNEL GUIDELINES (${channel.toUpperCase()})
══════════════════════════════════════════════════
${channelGuidelines}

══════════════════════════════════════════════════
 LANGUAGE
══════════════════════════════════════════════════
- Match the customer's language (English, Hindi, Telugu, Arabic as appropriate).
- Be warm, professional, and concise.
- Use line breaks and bullet points in responseMessage for readability.
- Never make up booking reference numbers — those are generated by the system.
`.trim()
  }

  // ── Private section builders ────────────────────────────────

  private buildPricingSection(ctx: TenantPricingContext, currency: string): string {
    if (ctx.services.length === 0) {
      return 'No pricing configured yet. Tell customers to contact us directly for quotes.\n(Source: none)'
    }

    const grouped = this.groupByCategory(ctx.services)

    const sections = Object.entries(grouped).map(([category, services]) => {
      const categoryLabel = category.replace(/_/g, ' ')
      const rows = services.map((s) => {
        const extras = Object.entries(s.additionalCharges)
          .map(([k, v]) => `${k}=+${currency}${v}`)
          .join(', ')

        return [
          `  ▸ ${s.serviceName}${s.capacity ? ` [${s.capacity}]` : ''}`,
          `    Base price : ${currency} ${s.basePrice}`,
          s.pricePerKL != null ? `    Per KL     : ${currency} ${s.pricePerKL}` : null,
          s.minimumOrder != null ? `    Min order  : ${s.minimumOrder} KL` : null,
          s.deliveryAreas.length ? `    Areas      : ${s.deliveryAreas.join(', ')}` : null,
          s.slotsAvailable.length ? `    Slots      : ${s.slotsAvailable.join(', ')}` : null,
          extras ? `    Surcharges : ${extras}` : null,
          s.description ? `    Note       : ${s.description}` : null,
        ].filter(Boolean).join('\n')
      })

      return `[${categoryLabel}]\n${rows.join('\n\n')}`
    })

    return sections.join('\n\n') + `\n\n(Pricing source: ${ctx.source}, as of ${ctx.fetchedAt})`
  }

  private buildRulesSection(rules: TenantPricingContext['rules']): string {
    return [
      `Operating hours    : ${rules.operatingHours}`,
      `Service areas      : ${rules.serviceAreas}`,
      `Payment terms      : ${rules.paymentTerms}`,
      `Cancellation policy: ${rules.cancellationPolicy}`,
      rules.specialNotes ? `Special notes      : ${rules.specialNotes}` : null,
    ].filter(Boolean).join('\n')
  }

  private buildChannelGuidelines(channel: string): string {
    const guidelines: Record<string, string> = {
      whatsapp: `
- Keep messages under 300 words.
- Use *bold* with asterisks for WhatsApp formatting.
- Use emoji sparingly (1-2 per message max).
- For confirmations, present a clear summary before asking to confirm.
`.trim(),
      instagram: `
- Keep messages under 150 words (Instagram DM character limits).
- No markdown formatting — plain text only.
- Friendly and visual tone.
- Avoid long lists; summarise instead.
`.trim(),
      telegram: `
- Telegram supports markdown. Use **bold** and \`code\` where helpful.
- Moderate length (up to 400 words).
- Can use bullet points freely.
- For bookings, show a nicely formatted summary.
`.trim(),
      dashboard: `
- This is an admin interface. Be concise and technical.
- Plain text, no emoji.
`.trim(),
    }
    return guidelines[channel] ?? guidelines.whatsapp
  }

  private groupByCategory(
    services: TenantPricingContext['services']
  ): Record<string, typeof services> {
    return services.reduce((acc, s) => {
      const cat = s.category ?? 'OTHER'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(s)
      return acc
    }, {} as Record<string, typeof services>)
  }
}
