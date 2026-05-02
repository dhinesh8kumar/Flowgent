import { PrismaClient, UserRole, Plan } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'sri-balaji-waters' },
    update: {},
    create: {
      name: 'Sri Balaji Waters',
      slug: 'sri-balaji-waters',
      city: 'Hyderabad',
      plan: Plan.GROWTH,
      isActive: true,
    },
  });
  console.log('Tenant:', tenant.name, tenant.id);

  const hash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@sribalaji.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Balaji Admin',
      email: 'admin@sribalaji.com',
      passwordHash: hash,
      role: UserRole.ADMIN,
    },
  });
  console.log('Admin:', admin.email);

  await prisma.tanker.upsert({
    where: { tenantId_vehicleNo: { tenantId: tenant.id, vehicleNo: 'TS09EA1234' } },
    update: {},
    create: {
      tenantId: tenant.id,
      vehicleNo: 'TS09EA1234',
      capacityKL: 12,
      driverName: 'Ravi Kumar',
      driverPhone: '9876543210',
    },
  });

  await prisma.tanker.upsert({
    where: { tenantId_vehicleNo: { tenantId: tenant.id, vehicleNo: 'TS09EB5678' } },
    update: {},
    create: {
      tenantId: tenant.id,
      vehicleNo: 'TS09EB5678',
      capacityKL: 8,
      driverName: 'Suresh Reddy',
      driverPhone: '9876543211',
    },
  });

  console.log('Done!');
  console.log('Login: admin@sribalaji.com / admin123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
