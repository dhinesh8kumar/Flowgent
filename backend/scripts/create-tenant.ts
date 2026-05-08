// scripts/create-tenant.ts
// Run with: npx ts-node --project tsconfig.seed.json scripts/create-tenant.ts
//
// Edit the TENANT config below and run the script.
// It will create the tenant and print the login credentials.

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─────────────────────────────────────────────
// EDIT THIS for each new client
// ─────────────────────────────────────────────
const TENANT = {
  companyName:   'Galaxy A/C Services',
  city:          'Hyderabad',
  adminName:     'Ramesh Kumar',
  adminEmail:    'rockstardhinesh8@gmail.com',
  adminPassword: 'ChangeMe@123',      // they should change this on first login
}
// ─────────────────────────────────────────────

async function main() {
  console.log(`\nCreating tenant: ${TENANT.companyName}...`)

  // Check email not already used
  const existing = await prisma.user.findFirst({
    where: { email: TENANT.adminEmail }
  })
  if (existing) {
    console.error(`❌ Email ${TENANT.adminEmail} already exists`)
    process.exit(1)
  }

  // Generate unique slug
  const baseSlug = TENANT.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  let slug = baseSlug
  const slugExists = await prisma.tenant.findUnique({ where: { slug } })
  if (slugExists) {
    slug = `${baseSlug}-${Math.random().toString(36).substring(2, 5)}`
  }

  const passwordHash = await bcrypt.hash(TENANT.adminPassword, 10)

  const tenant = await prisma.tenant.create({
    data: {
      name:     TENANT.companyName,
      slug,
      city:     TENANT.city,
      isActive: true,
      users: {
        create: {
          name:         TENANT.adminName,
          email:        TENANT.adminEmail,
          passwordHash,
          role:         'ADMIN',
        },
      },
    },
    include: {
      users: { select: { id: true, email: true } },
    },
  })

  console.log('\n✅ Tenant created successfully!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Company   : ${tenant.name}`)
  console.log(`Tenant ID : ${tenant.id}`)
  console.log(`Slug      : ${tenant.slug}`)
  console.log('─────────────────────────────────────────────')
  console.log(`Login URL : https://your-dashboard.com/login`)
  console.log(`Email     : ${TENANT.adminEmail}`)
  console.log(`Password  : ${TENANT.adminPassword}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\nShare the email and password with the client.')
  console.log('Ask them to change the password after first login.\n')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())