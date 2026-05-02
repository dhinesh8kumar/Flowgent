// src/services/PricingService.ts
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import {
  ManualPricingContext,
  ManualPricingContextSchema,
  NormalisedService,
  NormalisedTenantRules,
  TenantPricingContext,
} from '../types/pricing'

const DEFAULT_RULES: NormalisedTenantRules = {
  cancellationPolicy: 'Free cancellation up to 2 hours before delivery',
  paymentTerms: 'Cash on delivery or UPI',
  operatingHours: '6 AM – 9 PM, 7 days a week',
  serviceAreas: 'All areas within the city',
  specialNotes: '',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
}

export class PricingService {
  constructor(private readonly prisma: PrismaClient) {}

  async getPricingForAI(
    tenantId: string,
    manualContext?: ManualPricingContext
  ): Promise<TenantPricingContext> {
    // Validate manual context if provided
    let validatedManual: ManualPricingContext | undefined
    if (manualContext) {
      const parsed = ManualPricingContextSchema.safeParse(manualContext)
      if (!parsed.success) {
        logger.warn('Invalid manualPricingContext — ignoring', parsed.error.flatten())
      } else {
        validatedManual = parsed.data as ManualPricingContext
      }
    }

    const [tenantName, dbServices, tenantContextText] = await Promise.all([
      this.fetchTenantName(tenantId),
      this.fetchServicesFromDB(tenantId),
      this.fetchTenantContext(tenantId),
    ])

    const hasDbServices = dbServices.length > 0

    let services: NormalisedService[]
    let source: TenantPricingContext['source']

    if (hasDbServices) {
      services = dbServices
      source = 'database'
    } else if (validatedManual) {
      services = this.normaliseManualServices(validatedManual.services)
      source = 'manual'
    } else {
      services = []
      source = 'manual'
      logger.warn(`No pricing found for tenant ${tenantId}`)
    }

    // Build rules from tenant context text or manual or default
    const rules = this.buildRulesFromContext(tenantContextText, validatedManual)

    return {
      tenantId,
      tenantName,
      services,
      rules,
      fetchedAt: new Date().toISOString(),
      source,
    }
  }

  private async fetchTenantName(tenantId: string): Promise<string> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      })
      return tenant?.name ?? 'Water Tanker Service'
    } catch {
      return 'Water Tanker Service'
    }
  }

  private async fetchServicesFromDB(tenantId: string): Promise<NormalisedService[]> {
    try {
      const now = new Date()
      const rows = await this.prisma.service.findMany({
        where: {
          tenantId,
          isActive: true,
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
        },
        orderBy: { basePrice: 'asc' },
      })

      return rows.map((r) => ({
        serviceName: r.serviceName,
        serviceCode: r.serviceCode ?? r.serviceName.toLowerCase().replace(/\s+/g, '-'),
        category: 'WATER_TANKER',
        capacity: r.capacity ?? '',
        basePrice: r.basePrice,
        pricePerKL: r.pricePerKL ?? null,
        unit: r.unit,
        minimumOrder: r.minimumOrder ?? null,
        deliveryAreas: r.deliveryAreas,
        slotsAvailable: r.slotsAvailable,
        additionalCharges: (r.additionalCharges as Record<string, number>) ?? {},
        description: r.description ?? '',
        leadTimeHours: r.leadTimeHours,
      }))
    } catch (err) {
      logger.error('fetchServicesFromDB failed', err)
      return []
    }
  }

  // Fetch the single context text blob for this tenant
  private async fetchTenantContext(tenantId: string): Promise<string | null> {
    try {
      const row = await this.prisma.tenantContext.findUnique({
        where: { tenantId },
        select: { context: true },
      })
      return row?.context ?? null
    } catch {
      return null
    }
  }

  // Build rules — tenant context text takes priority, then manual, then defaults
  private buildRulesFromContext(
    contextText: string | null,
    manual?: ManualPricingContext
  ): NormalisedTenantRules {
    if (contextText) {
      // Extract currency and timezone hints from context text if present
      const currency = contextText.includes('AED') ? 'AED'
        : contextText.includes('USD') ? 'USD' : 'INR'
      const timezone = contextText.includes('Dubai') ? 'Asia/Dubai'
        : contextText.includes('Kolkata') ? 'Asia/Kolkata' : 'Asia/Kolkata'

      return {
        ...DEFAULT_RULES,
        specialNotes: contextText,  // inject full context as specialNotes for AI
        currency,
        timezone,
      }
    }

    if (manual?.rules) {
      return {
        cancellationPolicy: manual.rules.cancellationPolicy ?? DEFAULT_RULES.cancellationPolicy,
        paymentTerms: manual.rules.paymentTerms ?? DEFAULT_RULES.paymentTerms,
        operatingHours: manual.rules.operatingHours ?? DEFAULT_RULES.operatingHours,
        serviceAreas: manual.rules.serviceAreas ?? DEFAULT_RULES.serviceAreas,
        specialNotes: manual.rules.specialNotes ?? '',
        currency: manual.rules.currency ?? 'INR',
        timezone: manual.rules.timezone ?? 'Asia/Kolkata',
      }
    }

    return DEFAULT_RULES
  }

  private normaliseManualServices(
    entries: ManualPricingContext['services']
  ): NormalisedService[] {
    return entries.map((s) => ({
      serviceName: s.serviceName,
      serviceCode: s.serviceCode ?? s.serviceName.toLowerCase().replace(/\s+/g, '-'),
      category: s.category ?? 'WATER_TANKER',
      capacity: s.capacity ?? '',
      basePrice: s.basePrice,
      pricePerKL: s.pricePerKL ?? null,
      unit: s.unit ?? 'INR',
      minimumOrder: s.minimumOrder ?? null,
      deliveryAreas: s.deliveryAreas ?? [],
      slotsAvailable: s.slotsAvailable ?? ['morning', 'afternoon', 'evening'],
      additionalCharges: s.additionalCharges ?? {},
      description: s.description ?? '',
      leadTimeHours: 2,
    }))
  }

  buildPricingContextForAI(ctx: TenantPricingContext): string {
    if (ctx.services.length === 0) {
      return 'Pricing information is not available. Please contact us directly for a quote.'
    }
    const lines = ctx.services.map((s) => {
      const extras = Object.entries(s.additionalCharges)
        .map(([k, v]) => `${k}: +${s.unit} ${v}`)
        .join(', ')
      return [
        `• ${s.serviceName}${s.capacity ? ` (${s.capacity})` : ''}`,
        `  Base price: ${s.unit} ${s.basePrice}`,
        s.pricePerKL ? `  Per KL: ${s.unit} ${s.pricePerKL}` : null,
        s.minimumOrder ? `  Min order: ${s.minimumOrder} KL` : null,
        s.deliveryAreas.length ? `  Areas: ${s.deliveryAreas.join(', ')}` : null,
        extras ? `  Extra charges: ${extras}` : null,
        s.description ? `  Note: ${s.description}` : null,
      ].filter(Boolean).join('\n')
    })
    return lines.join('\n\n')
  }
}