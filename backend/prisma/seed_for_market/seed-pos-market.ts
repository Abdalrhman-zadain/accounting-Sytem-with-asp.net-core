import {
  PosAccessRoleCode,
  PosPermissionCode,
  PrismaClient,
} from '../../src/generated/prisma';
import * as bcrypt from 'bcrypt';

export const MARKET_SNACKS_GROUP_CODE = 'MARKET-SNACKS';
export const REP_AMER_CODE = 'REP-AMER';

/** Item group + category required by market showcase and Shouq catalog seeds. */
export async function ensureMarketSnackFoundation(prisma: PrismaClient) {
  const group = await prisma.inventoryItemGroup.upsert({
    where: { code: MARKET_SNACKS_GROUP_CODE },
    update: {
      name: 'سناكات',
      description: 'Market snacks',
      isActive: true,
    },
    create: {
      id: 'GRP-MARKET-SNACKS',
      code: MARKET_SNACKS_GROUP_CODE,
      name: 'سناكات',
      description: 'Market snacks',
      isActive: true,
    },
  });

  await prisma.inventoryItemCategory.upsert({
    where: { code: MARKET_SNACKS_GROUP_CODE },
    update: {
      name: 'سناكات',
      description: 'Market snacks',
      itemGroupId: group.id,
      isActive: true,
    },
    create: {
      id: 'CAT-MARKET-SNACKS',
      code: MARKET_SNACKS_GROUP_CODE,
      name: 'سناكات',
      description: 'Market snacks',
      itemGroupId: group.id,
      isActive: true,
    },
  });
}

export async function seedPosMarketDemo(
  prisma: PrismaClient,
  _options: { adminUserId: string },
) {
  console.log('Seeding market POS Amer sales rep...');

  await ensureMarketSnackFoundation(prisma);

  const amerRep = await prisma.salesRepresentative.upsert({
    where: { code: REP_AMER_CODE },
    update: {
      name: 'مندوب عامر / Amer Sales Rep',
      phone: '+962 79 200 0000',
      status: 'ACTIVE',
    },
    create: {
      code: REP_AMER_CODE,
      name: 'مندوب عامر / Amer Sales Rep',
      phone: '+962 79 200 0000',
      status: 'ACTIVE',
    },
  });

  await seedAmerRepUser(prisma, amerRep.id);

  console.log(
    'Market POS: seeded Amer sales rep. Run seed after opening inventory to load WH-AMER stock onto the rep car.',
  );
}

const marketRepPermissionCodes: PosPermissionCode[] = [
  'POS_OPEN_SESSION',
  'POS_CLOSE_OWN_SESSION',
  'POS_VIEW_POS_SCREEN',
  'POS_SCAN_BARCODE',
  'POS_SEARCH_ITEM',
  'POS_ADD_ITEM_TO_CART',
  'POS_UPDATE_ITEM_QUANTITY',
  'POS_REMOVE_ITEM_FROM_CART',
  'POS_HOLD_SALE',
  'POS_RESUME_OWN_HELD_SALE',
  'POS_VOID_DRAFT_SALE',
  'POS_COMPLETE_SALE',
  'POS_SELECT_PAYMENT_METHOD',
  'POS_PRINT_RECEIPT',
  'POS_VIEW_OWN_SESSION_REPORT',
  'POS_VIEW_COMPLETED_SALES',
  'POS_CHANGE_UNIT_PRICE',
  'POS_CREDIT_SALE',
  'POS_MARKET_VIEW_RECEIVABLES',
  'POS_MARKET_COLLECT_RECEIVABLE',
  'POS_MARKET_AMEND_SALE',
];

async function seedAmerRepUser(prisma: PrismaClient, salesRepId: string) {
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "PosAccessRoleCode" ADD VALUE IF NOT EXISTS 'MARKET_REP'`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "PosPermissionCode" ADD VALUE IF NOT EXISTS 'POS_MARKET_VIEW_RECEIVABLES'`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "PosPermissionCode" ADD VALUE IF NOT EXISTS 'POS_MARKET_COLLECT_RECEIVABLE'`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "PosPermissionCode" ADD VALUE IF NOT EXISTS 'POS_MARKET_AMEND_SALE'`,
  );

  await prisma.$transaction(async (tx) => {
    const marketRepRole = await tx.posAccessRole.upsert({
      where: { code: PosAccessRoleCode.MARKET_REP },
      update: {
        name: 'Market Sales Rep',
        description:
          'Market field sales rep — sell on credit and collect receivables.',
        isActive: true,
      },
      create: {
        code: PosAccessRoleCode.MARKET_REP,
        name: 'Market Sales Rep',
        description:
          'Market field sales rep — sell on credit and collect receivables.',
        isActive: true,
      },
    });

    for (const code of marketRepPermissionCodes) {
      const permission = await tx.posPermission.upsert({
        where: { code },
        update: { name: code, description: code },
        create: { code, name: code, description: code },
      });
      await tx.posAccessRolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: marketRepRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: marketRepRole.id,
          permissionId: permission.id,
        },
      });
    }

    const hashedPassword = await bcrypt.hash('amer123', 10);
    const amerRepUser = await tx.user.upsert({
      where: { username: 'amer' },
      update: {
        email: 'amer@genius.com',
        password: hashedPassword,
        name: 'مندوب عامر',
        salesRepId,
        isActive: true,
        role: 'USER',
      },
      create: {
        username: 'amer',
        email: 'amer@genius.com',
        password: hashedPassword,
        name: 'مندوب عامر',
        salesRepId,
        isActive: true,
        role: 'USER',
      },
    });

    await tx.userPosAccessRole.deleteMany({ where: { userId: amerRepUser.id } });
    await tx.userPosAccessRole.create({
      data: {
        userId: amerRepUser.id,
        roleId: marketRepRole.id,
      },
    });
  });

  console.log('Amer rep user ready: amer / amer123 (default route /pos-market/receivables)');
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.findFirst({
      where: { username: 'admin' },
      select: { id: true },
    });
    if (!admin) {
      throw new Error('Admin user not found. Run the main seed first.');
    }
    await seedPosMarketDemo(prisma, { adminUserId: admin.id });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
