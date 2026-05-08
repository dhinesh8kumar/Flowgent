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
  operatingHours: '6 AM - 9 PM, 7 days a week',
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
    let validatedManual: ManualPricingContext | undefined
    if (manualContext) {
      const parsed = ManualPricingContextSchema.safeParse(manualContext)
      if (!parsed.success) {
        logger.warn('Invalid manualPricingContext - ignoring', parsed.error.flatten())
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
      return tenant?.name ?? 'Service Business'
    } catch {
      return 'Service Business'
    }
  }

  private async fetchServicesFromDB(tenantId: string): Promise<NormalisedService[]> {
    try {
      const rows = await this.prisma.service.findMany({
        where: { tenantId },
        orderBy: { basePrice: 'asc' },
      })

      return rows.map((row) => ({
        serviceName: row.serviceName,
        serviceCode: row.serviceCode ?? row.serviceName.toLowerCase().replace(/\s+/g, '-'),
        category: 'GENERAL_SERVICE',
        capacity: '',
        basePrice: row.basePrice,
        pricePerKL: null,
        unit: 'INR',
        minimumOrder: null,
        deliveryAreas: [],
        slotsAvailable: [],
        additionalCharges: {},
        description: row.description ?? '',
        leadTimeHours: 2,
      }))
    } catch (err) {
      logger.error('fetchServicesFromDB failed', err)
      return []
    }
  }

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

  private buildRulesFromContext(
    contextText: string | null,
    manual?: ManualPricingContext
  ): NormalisedTenantRules {
    if (contextText) {
      const currency = contextText.includes('AED')
        ? 'AED'
        : contextText.includes('USD')
          ? 'USD'
          : 'INR'

      const timezone = contextText.includes('Dubai') ? 'Asia/Dubai' : 'Asia/Kolkata'

      return {
        ...DEFAULT_RULES,
        specialNotes: contextText,
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
    return entries.map((service) => ({
      serviceName: service.serviceName,
      serviceCode: service.serviceCode ?? service.serviceName.toLowerCase().replace(/\s+/g, '-'),
      category: service.category ?? 'GENERAL_SERVICE',
      capacity: service.capacity ?? '',
      basePrice: service.basePrice,
      pricePerKL: service.pricePerKL ?? null,
      unit: service.unit ?? 'INR',
      minimumOrder: service.minimumOrder ?? null,
      deliveryAreas: service.deliveryAreas ?? [],
      slotsAvailable: service.slotsAvailable ?? [],
      additionalCharges: service.additionalCharges ?? {},
      description: service.description ?? '',
      leadTimeHours: 2,
    }))
  }

  buildPricingContextForAI(ctx: TenantPricingContext): string {
    if (ctx.services.length === 0) {
      return 'Pricing information is not available. Please contact us directly for a quote.'
    }

    const lines = ctx.services.map((service) => [
      `- ${service.serviceName}`,
      `  Price: ${service.unit} ${service.basePrice}`,
      service.description ? `  Note: ${service.description}` : null,
    ].filter(Boolean).join('\n'))

    return lines.join('\n\n')
  }
}
