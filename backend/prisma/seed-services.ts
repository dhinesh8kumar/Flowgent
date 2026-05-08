import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  console.log('Seeding services...')

  const tenant = await prisma.tenant.findFirst({ where: { isActive: true } })
  if (!tenant) throw new Error('No tenant found - run npm run db:seed first')

  console.log(`Adding services for tenant: ${tenant.name}`)

  const services = [
    {
      serviceName: 'Water Tanker 10KL',
      serviceCode: 'WATER-TANKER-10KL',
      basePrice: 700,
      description: 'Potable sweet water',
    },
    {
      serviceName: 'Water Tanker 12KL',
      serviceCode: 'WATER-TANKER-12KL',
      basePrice: 800,
      description: 'Large capacity sweet water',
    },
    {
      serviceName: 'Construction Water',
      serviceCode: 'CONSTRUCTION-WATER',
      basePrice: 500,
      description: 'Non-potable water for construction sites',
    },
  ]

  for (const service of services) {
    await prisma.service.upsert({
      where: { tenantId_serviceCode: { tenantId: tenant.id, serviceCode: service.serviceCode } },
      update: service,
      create: { ...service, tenantId: tenant.id },
    })
    console.log(`  OK ${service.serviceName}`)
  }

  await prisma.tenantContext.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      context: `Business: ${tenant.name}
Currency: INR

SERVICES:
- Water Tanker 10KL: 700
- Water Tanker 12KL: 800
- Construction Water: 500

Quote only from the saved service list. If a service is missing, ask the customer to contact the business directly.`,
    },
  })

  console.log('Done! Services seeded successfully.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
