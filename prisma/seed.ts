import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
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

  // Ensure AppSettings
  await prisma.appSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton'
    }
  });

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
