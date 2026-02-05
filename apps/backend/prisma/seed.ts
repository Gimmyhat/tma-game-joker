import { PrismaClient, AdminRole, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test admin user
  const passwordHash = await bcrypt.hash('admin123', 10);

  // Find existing admin by username or create new
  const existingAdmin = await prisma.user.findFirst({
    where: { username: 'admin' },
  });

  let admin: User;
  if (existingAdmin) {
    // Update existing admin's password and role
    admin = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        adminRole: AdminRole.SUPERADMIN,
        passwordHash,
      },
    });
    console.log('Updated existing admin user:', admin.username);
  } else {
    // Create new admin user
    admin = await prisma.user.create({
      data: {
        tgId: BigInt(999999999),
        username: 'admin',
        adminRole: AdminRole.SUPERADMIN,
        passwordHash,
      },
    });
    console.log('Created new admin user:', admin.username);
  }

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
