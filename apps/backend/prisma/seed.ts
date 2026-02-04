import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test admin user
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { tgId: BigInt(999999999) },
    update: {
      adminRole: AdminRole.SUPERADMIN,
      passwordHash,
      username: 'admin',
    },
    create: {
      tgId: BigInt(999999999),
      username: 'admin',
      adminRole: AdminRole.SUPERADMIN,
      passwordHash,
    },
  });

  console.log('Created admin user:', admin.username);
  console.log('Login credentials:');
  console.log('  Username: admin');
  console.log('  Password: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
