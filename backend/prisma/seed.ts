import { PrismaClient } from '../src/generated/prisma';
import { truncateDatabase } from './seed-database';
import { runFoundationSeed } from './seed-foundation';
import { seedPosMarketDemo } from './seed-pos-market';
import { seedMarketPosRuntimeSettings } from './seed-market-pos-settings';
import { seedPosRegisterDemo } from './seed-pos-register';
import { setupPosKitchenUser } from './setup-pos-kitchen';
import { setupPosMarketCashierUser } from './setup-pos-market-cashier';
import { setupPosWaiterUser } from './setup-pos-waiter';

import { seedOpeningJournalEntry } from './seed-opening-entry';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning existing database data...');
  await truncateDatabase(prisma);

  const ctx = await runFoundationSeed(prisma);

  await seedOpeningJournalEntry(prisma, ctx);

  await seedPosRegisterDemo(prisma, {
    adminUserId: ctx.admin.id,
    cashierUserId: ctx.cashier.id,
  });

  await seedPosMarketDemo(prisma, {
    adminUserId: ctx.admin.id,
  });

  await seedMarketPosRuntimeSettings(prisma);

  await setupPosKitchenUser(prisma);
  await setupPosWaiterUser(prisma);
  await setupPosMarketCashierUser(prisma);

  console.log('Basic seed complete.');
  console.log('POS logins: cashier/cashier123 (restaurant), market/market123 (market POS only), kitchen/kitchen123, waiter/waiter123, admin from foundation seed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
