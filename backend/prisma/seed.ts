import { PrismaClient } from '../src/generated/prisma';
import { truncateDatabase } from './seed-database';
import { runFoundationSeed } from './seed-foundation';
import { seedPosMarketDemo } from './seed-pos-market';
import { seedAmerRepCarLoad } from './seed-amer-rep-load';
import { seedMarketPosRuntimeSettings } from './seed-market-pos-settings';
import { setupAdminAccountantRole } from './setup-admin-accountant';

import { seedOpeningJournalEntry } from './seed-opening-entry';
import { seedOpeningInventoryFromWorkbook } from './seed-opening-inventory';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning existing database data...');
  await truncateDatabase(prisma);

  const ctx = await runFoundationSeed(prisma);

  await seedOpeningJournalEntry(prisma, ctx);

  await seedOpeningInventoryFromWorkbook(prisma);

  await seedPosMarketDemo(prisma, {
    adminUserId: ctx.admin.id,
  });

  await seedAmerRepCarLoad(prisma);

  await seedMarketPosRuntimeSettings(prisma);

  await setupAdminAccountantRole(prisma);

  console.log('Basic seed complete.');
  console.log('Logins: admin / admin123 (ERP + accountant), amer / amer123 (market rep).');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
