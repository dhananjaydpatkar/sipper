import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const defaultPinPlain = process.env.SEED_DEFAULT_PIN || '123456';
  const hashedPin = await bcrypt.hash(defaultPinPlain, 10);

  await prisma.coffeeType.upsert({
    where: { name: 'Black Coffee' },
    update: { current_price_inr: 10.0 },
    create: {
      name: 'Black Coffee',
      current_price_inr: 10.0,
    },
  });

  await prisma.user.upsert({
    where: { phone_number: '+919892187717' },
    update: {},
    create: {
      name: 'System Admin',
      phone_number: '+919892187717',
      role: 'ADMIN',
      pin: hashedPin,
    },
  });

  await prisma.user.upsert({
    where: { phone_number: '+918082757955' },
    update: {},
    create: {
      name: 'Ruban',
      phone_number: '+918082757955',
      role: 'ADMIN',
      pin: hashedPin,
    },
  });

  console.log('Seed complete.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
