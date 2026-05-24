import { PrismaClient } from '../src/generated/prisma';
import { truncateDatabase } from './seed-database';
import { runFoundationSeed } from './seed-foundation';
import { seedPosRegisterDemo } from './seed-pos-register';
import { runVolumeSeed } from './seed-volume/index';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Enterprise volume seed (truncates database) ===');
  await truncateDatabase(prisma);

  const foundation = await runFoundationSeed(prisma);
  await runVolumeSeed(prisma, foundation);

  await seedPosRegisterDemo(prisma, {
    adminUserId: foundation.admin.id,
    cashierUserId: foundation.cashier.id,
  });

  console.log('=== Volume seed complete. Login: admin / admin123 ===');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
