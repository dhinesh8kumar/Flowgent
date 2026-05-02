// prisma/seed-services.ts
// Run with: npm run db:seed:services
// Adds sample services + tenant rules so the AI has real pricing to work with.

import { PrismaClient, ServiceCategory } from '@prisma/client'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  console.log('Seeding services...')

  // Get first tenant (from the existing seed)
  const tenant = await prisma.tenant.findFirst({ where: { isActive: true } })
  if (!tenant) throw new Error('No tenant found — run npm run db:seed first')

  console.log(`Adding services for tenant: ${tenant.name}`)

  // ── Services ──────────────────────────────────────────────
  const services = [
    {
      serviceName: 'Sweet Water Tanker — 10KL',
      serviceCode: 'SWT-10KL',
      category: ServiceCategory.WATER_TANKER,
      capacity: '10KL',
      basePrice: 700,
      pricePerKL: 70,
      unit: 'INR',
      minimumOrder: 5,
      deliveryAreas: ['Kondapur', 'Gachibowli', 'Madhapur', 'HITEC City', 'Miyapur', 'Kukatpally'],
      slotsAvailable: ['morning', 'afternoon', 'evening'],
      additionalCharges: { nightSurcharge: 100, expressFee: 150 },
      leadTimeHours: 2,
      description: 'Potable sweet water for drinking and domestic use',
    },
    {
      serviceName: 'Sweet Water Tanker — 12KL',
      serviceCode: 'SWT-12KL',
      category: ServiceCategory.WATER_TANKER,
      capacity: '12KL',
      basePrice: 800,
      pricePerKL: 67,
      unit: 'INR',
      minimumOrder: 8,
      deliveryAreas: ['Kondapur', 'Gachibowli', 'Madhapur', 'HITEC City', 'Miyapur', 'Kukatpally', 'Manikonda'],
      slotsAvailable: ['morning', 'afternoon', 'evening'],
      additionalCharges: { nightSurcharge: 100 },
      leadTimeHours: 3,
      description: 'Large capacity sweet water — better value per KL',
    },
    {
      serviceName: 'Construction Water',
      serviceCode: 'CWT-12KL',
      category: ServiceCategory.CONSTRUCTION_WATER,
      capacity: '12KL',
      basePrice: 500,
      pricePerKL: 42,
      unit: 'INR',
      minimumOrder: 10,
      deliveryAreas: ['All Hyderabad areas'],
      slotsAvailable: ['morning', 'afternoon'],
      additionalCharges: {},
      leadTimeHours: 4,
      description: 'Non-potable water for construction sites',
    },
  ]

  for (const svc of services) {
    await prisma.service.upsert({
      where: { tenantId_serviceCode: { tenantId: tenant.id, serviceCode: svc.serviceCode } },
      update: svc,
      create: { ...svc, tenantId: tenant.id },
    })
    console.log(`  ✓ ${svc.serviceName}`)
  }

  // ── Tenant rules ──────────────────────────────────────────
  await prisma.tenantRules.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      cancellationPolicy: 'Free cancellation up to 2 hours before scheduled delivery',
      paymentTerms: 'Cash on delivery or UPI (GPay/PhonePe)',
      operatingHours: '6 AM – 9 PM, 7 days a week including holidays',
      serviceAreas: 'All areas within Greater Hyderabad',
      specialNotes: 'Prices may vary during summer (April–June) due to high demand',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    },
  })
  console.log('  ✓ Tenant rules')

  console.log('\nDone! Services seeded successfully.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

// ═══════════════════════════════════════════════════════════════
// USAGE GUIDE — HOW TO SWITCH BETWEEN SCENARIOS
// ═══════════════════════════════════════════════════════════════

/*
═══════════════════════════════════════════════════════════════
SCENARIO A: Production — AI uses DB pricing
═══════════════════════════════════════════════════════════════
1. Run migrations:
     npm run db:push

2. Seed services:
     npx ts-node --project tsconfig.seed.json prisma/seed-services.ts

3. In webhook.ts (or instagram.ts / telegram.ts):
     messageRouter.processIncomingMessage({
       tenant, fromPhone, messageText, channel, sender,
       // manualPricingContext is NOT passed → uses DB automatically
     })

4. AI will now quote prices from the `services` table.
   Update prices in DB → AI quotes new prices immediately (no redeploy needed).

═══════════════════════════════════════════════════════════════
SCENARIO B: POC/Testing — AI uses manual pricing context
═══════════════════════════════════════════════════════════════
1. No DB setup needed. Just pass manualPricingContext:

     messageRouter.processIncomingMessage({
       tenant, fromPhone, messageText, channel, sender,
       manualPricingContext: {
         services: [
           {
             serviceName: 'Sweet Water 5000 Gallons',
             capacity: '5000 Gallons',
             basePrice: 150,
             unit: 'AED',
             deliveryAreas: ['JLT', 'Dubai Marina', 'Downtown Dubai'],
           },
         ],
         rules: {
           currency: 'AED',
           timezone: 'Asia/Dubai',
           operatingHours: '7 AM – 10 PM',
           paymentTerms: 'Cash or bank transfer',
         },
       },
     })

2. To quickly test from the booking service directly:
     const pricingService = new PricingService(prisma)
     const ctx = await pricingService.getPricingForAI('tenant-id', manualContext)
     console.log(ctx.services)  // verify what AI will see

═══════════════════════════════════════════════════════════════
ADDING A NEW SERVICE TYPE (e.g., AC Cleaning)
═══════════════════════════════════════════════════════════════
1. Add to ServiceCategory enum in schema.prisma:
     AC_CLEANING

2. Run: npm run db:push

3. Insert a service row:
     INSERT INTO services (tenant_id, service_name, service_code, category, base_price, unit, ...)
     VALUES ('tenant-id', 'AC Deep Cleaning', 'AC-CLEAN-1', 'AC_CLEANING', 199, 'AED', ...)

4. That's it — AI will automatically include it in pricing context and handle bookings for it.

*/
