import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Ensure AppSettings
  await prisma.appSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton'
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('Development environment detected. Seeding default admins...');
    const adminEmails = ['kauanpaiva@kspgroup.com', 'kauanpaivasza@gmail.com'];
    
    for (const email of adminEmails) {
      const hashedPassword = await bcrypt.hash('Kauan1234!', 10);
      
      await prisma.user.upsert({
        where: { email },
        update: {
          password: hashedPassword,
          name: 'Kauan Paiva',
          role: 'ADMIN',
          accountStatus: 'ACTIVE',
          isActive: true,
        },
        create: {
          email,
          password: hashedPassword,
          name: 'Kauan Paiva',
          role: 'ADMIN',
          accountStatus: 'ACTIVE',
          isActive: true,
        },
      });
    }
  } else {
    // In production, we assume admins are created via secure commands or initial migrations without defaults.
    console.log('Production environment detected. Skipping insecure default admin seed.');
  }

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
