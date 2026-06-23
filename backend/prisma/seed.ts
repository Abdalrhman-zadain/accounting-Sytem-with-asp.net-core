import { PrismaClient } from '../src/generated/prisma';
import { truncateDatabase } from '../prisma/seed-database';

import { runFoundationSeed } from '../prisma/seed-foundation';
import { seedPosRegisterDemo } from '../prisma/seed-pos-register';
import { setupPosKitchenUser } from '../prisma/setup-pos-kitchen';
import { setupPosWaiterUser } from '../prisma/setup-pos-waiter';

export async function runSabinaSeed(prisma: PrismaClient) {
  console.log('Cleaning existing database data...');
  await truncateDatabase(prisma);

  const ctx = await runFoundationSeed(prisma);

  await seedPosRegisterDemo(prisma, {
    adminUserId: ctx.admin.id,
    cashierUserId: ctx.cashier.id,
  });

  await setupPosKitchenUser(prisma);
  await setupPosWaiterUser(prisma);

  console.log('Basic seed complete.');
  console.log('POS logins: cashier/cashier123, kitchen/kitchen123, waiter/waiter123, admin from foundation seed.');
}

const prisma = new PrismaClient();

async function main() {
  await runSabinaSeed(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });