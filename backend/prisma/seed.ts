import { PrismaClient } from '../src/generated/prisma';
import { runBasicDemoSeed } from './seed-basic-demo';
import { truncateDatabase } from './seed-database';
import { runFoundationSeed } from './seed-foundation';
import { seedPosRegisterDemo } from './seed-pos-register';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning existing database data...');
  await truncateDatabase(prisma);

  const ctx = await runFoundationSeed(prisma);
  await runBasicDemoSeed(prisma, ctx);

  await seedPosRegisterDemo(prisma, {
    adminUserId: ctx.admin.id,
    cashierUserId: ctx.cashier.id,
  });

  console.log('Basic seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
