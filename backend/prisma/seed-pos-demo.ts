/**
 * Add POS catalog/stock/customers without wiping the database.
 * Requires existing chart-of-accounts seed data and a cashier user.
 */
import { PrismaClient } from '../src/generated/prisma';
import { seedPosRegisterDemo } from './seed-pos-register';

const prisma = new PrismaClient();

async function main() {
  const cashier = await prisma.user.findUnique({
    where: { username: 'cashier' },
    select: { id: true },
  });
  if (!cashier) {
    throw new Error('Cashier user not found. Run npm run seed:cashier or full npm run seed first.');
  }

  const admin =
    (await prisma.user.findUnique({
      where: { username: 'admin' },
      select: { id: true },
    })) ?? cashier;

  await seedPosRegisterDemo(prisma, {
    adminUserId: admin.id,
    cashierUserId: cashier.id,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
