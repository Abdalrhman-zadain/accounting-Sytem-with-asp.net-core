import {
  PosAccessRoleCode,
  PosPermissionCode,
  type PrismaClient,
} from "../src/generated/prisma";
import * as bcrypt from "bcrypt";

const marketCashierPermissionCodes: PosPermissionCode[] = [
  "POS_OPEN_SESSION",
  "POS_CLOSE_OWN_SESSION",
  "POS_VIEW_POS_SCREEN",
  "POS_SCAN_BARCODE",
  "POS_SEARCH_ITEM",
  "POS_ADD_ITEM_TO_CART",
  "POS_UPDATE_ITEM_QUANTITY",
  "POS_REMOVE_ITEM_FROM_CART",
  "POS_HOLD_SALE",
  "POS_RESUME_OWN_HELD_SALE",
  "POS_VOID_DRAFT_SALE",
  "POS_COMPLETE_SALE",
  "POS_SELECT_PAYMENT_METHOD",
  "POS_PRINT_RECEIPT",
  "POS_VIEW_OWN_SESSION_REPORT",
  "POS_VIEW_COMPLETED_SALES",
  "POS_CHANGE_UNIT_PRICE",
  "POS_CREDIT_SALE",
];

type MarketCashierSeedUser = {
  username: string;
  email: string;
  name: string;
  password: string;
};

const MARKET_CASHIER_USERS: MarketCashierSeedUser[] = [
  {
    username: "market",
    email: "market@genius.com",
    name: "Market Register Cashier",
    password: "market123",
  },
  {
    username: "market_cashier",
    email: "market_cashier@genius.com",
    name: "Market POS Cashier",
    password: "market123",
  },
];

export async function setupPosMarketCashierUser(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "PosAccessRoleCode" ADD VALUE IF NOT EXISTS 'MARKET_CASHIER'`,
  );

  await prisma.$transaction(async (tx) => {
    const marketCashierRole = await tx.posAccessRole.upsert({
      where: { code: PosAccessRoleCode.MARKET_CASHIER },
      update: {
        name: "Market Cashier",
        description:
          "Operational market/retail POS sales access limited to market cashier workflows.",
        isActive: true,
      },
      create: {
        code: PosAccessRoleCode.MARKET_CASHIER,
        name: "Market Cashier",
        description:
          "Operational market/retail POS sales access limited to market cashier workflows.",
        isActive: true,
      },
    });

    for (const code of marketCashierPermissionCodes) {
      const permission = await tx.posPermission.upsert({
        where: { code },
        update: {
          name: code,
          description: code,
        },
        create: {
          code,
          name: code,
          description: code,
        },
      });

      await tx.posAccessRolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: marketCashierRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: marketCashierRole.id,
          permissionId: permission.id,
        },
      });
    }

    for (const seedUser of MARKET_CASHIER_USERS) {
      const hashedPassword = await bcrypt.hash(seedUser.password, 10);

      const marketCashierUser = await tx.user.upsert({
        where: { username: seedUser.username },
        update: {
          email: seedUser.email,
          password: hashedPassword,
          name: seedUser.name,
          isActive: true,
          role: "USER",
        },
        create: {
          username: seedUser.username,
          email: seedUser.email,
          password: hashedPassword,
          name: seedUser.name,
          isActive: true,
          role: "USER",
        },
      });

      // Market register users must have MARKET_CASHIER only — no restaurant POS roles.
      await tx.userPosAccessRole.deleteMany({
        where: { userId: marketCashierUser.id },
      });

      await tx.userPosAccessRole.create({
        data: {
          userId: marketCashierUser.id,
          roleId: marketCashierRole.id,
        },
      });
    }
  });

  console.log("Market cashier users are ready (market POS only).");
  for (const seedUser of MARKET_CASHIER_USERS) {
    console.log(`username: ${seedUser.username}`);
    console.log(`password: ${seedUser.password}`);
  }
  console.log("default route after login: /pos-market/register");
}

async function main() {
  const { PrismaClient } = await import("../src/generated/prisma");
  const prisma = new PrismaClient();
  try {
    await setupPosMarketCashierUser(prisma);
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
