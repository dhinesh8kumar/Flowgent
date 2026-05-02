import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  console.log('Seeding services...')

  const tenant = await prisma.tenant.findFirst({ where: { isActive: true } })
  if (!tenant) throw new Error('No tenant found — run npm run db:seed first')

  console.log(`Adding services for tenant: ${tenant.name}`)

  const services = [
    {
      serviceName: 'Sweet Water Tanker — 10KL',
      serviceCode: 'SWT-10KL',
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

  // Upsert tenant context (single text blob the AI uses)
  await prisma.tenantContext.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      context: `Business: ${tenant.name}, Hyderabad
Operating Hours: 6 AM – 9 PM, 7 days a week including holidays

SERVICES & PRICING:
- Sweet Water 10KL: ₹700 (₹70/KL, min 5KL)
- Sweet Water 12KL: ₹800 (₹67/KL, min 8KL)
- Construction Water 12KL: ₹500 (₹42/KL, min 10KL)

DELIVERY AREAS: Kondapur, Gachibowli, Madhapur, HITEC City, Miyapur, Kukatpally, Manikonda

RULES:
- Minimum order: 5KL for sweet water, 10KL for construction water
- Cancellation: Free up to 2 hours before scheduled delivery
- Payment: Cash on delivery or UPI (GPay / PhonePe)
- Night surcharge: ₹100 extra after 8 PM
- Express delivery: ₹150 extra (same day within 2 hours)
- Prices may vary during summer (April–June) due to high demand`,
    },
  })
  console.log('  ✓ Tenant context')

  console.log('\nDone! Services seeded successfully.')
  console.log('Tenant:', tenant.name)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())