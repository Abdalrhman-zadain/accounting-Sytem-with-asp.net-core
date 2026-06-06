/**
 * Seed POS add-on groups and product links without wiping the database.
 * Requires POS catalog items from seed-pos-register (e.g. POS-FOD-001).
 */
import { PrismaClient } from '../src/generated/prisma';
import { seedPosAddons } from './seed-pos-addons';

const prisma = new PrismaClient();

async function main() {
  await seedPosAddons(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
