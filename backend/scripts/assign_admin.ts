import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function assignAdmin(phoneNumber: string) {
  try {
    const user = await prisma.user.update({
      where: { phone_number: phoneNumber },
      data: { role: Role.ADMIN },
    });
    console.log(`Successfully assigned ADMIN role to user: ${user.name} (${user.phone_number})`);
  } catch (error) {
    console.error(`Failed to assign ADMIN role to ${phoneNumber}:`, error);
  } finally {
    await prisma.$disconnect();
  }
}

const phoneNumber = process.argv[2];

if (!phoneNumber) {
  console.error('Please provide a phone number as an argument.');
  console.log('Usage: npx ts-node scripts/assign_admin.ts <phone_number>');
  process.exit(1);
}

assignAdmin(phoneNumber);
