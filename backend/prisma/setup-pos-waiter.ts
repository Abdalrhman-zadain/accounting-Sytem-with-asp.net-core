import {
  PosAccessRoleCode,
  PosPermissionCode,
  type PrismaClient,
} from "../src/generated/prisma";
import * as bcrypt from "bcrypt";

const waiterPermissionCodes: PosPermissionCode[] = [
  "RST_VIEW_TABLE_SCREEN",
  "RST_OPEN_TABLE_ORDER",
  "RST_SEND_KOT",
  "RST_VIEW_WAITER_ORDERS",
  "RST_UPDATE_WAITER_ORDER_STATUS",
  "POS_HOLD_SALE",
  "POS_SEARCH_ITEM",
  "POS_ADD_ITEM_TO_CART",
  "POS_UPDATE_ITEM_QUANTITY",
  "POS_REMOVE_ITEM_FROM_CART",
  "POS_VIEW_POS_SCREEN",
  "POS_ADD_ITEM_AFTER_WAITER_CONFIRM",
];

export async function setupPosWaiterUser(prisma: PrismaClient) {
  const hashedPassword = await bcrypt.hash("waiter123", 10);

  await prisma.$transaction(async (tx) => {
    const waiterRole = await tx.posAccessRole.upsert({
      where: { code: PosAccessRoleCode.WAITER },
      update: {
        name: "Waiter",
        description: "Table ordering and send-to-kitchen only — no payment.",
        isActive: true,
      },
      create: {
        code: PosAccessRoleCode.WAITER,
        name: "Waiter",
        description: "Table ordering and send-to-kitchen only — no payment.",
        isActive: true,
      },
    });

    for (const code of waiterPermissionCodes) {
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
            roleId: waiterRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: waiterRole.id,
          permissionId: permission.id,
        },
      });
    }

    const waiterUser = await tx.user.upsert({
      where: { username: "waiter" },
      update: {
        email: "waiter@genius.com",
        password: hashedPassword,
        name: "Floor Waiter",
        isActive: true,
        role: "USER",
      },
      create: {
        username: "waiter",
        email: "waiter@genius.com",
        password: hashedPassword,
        name: "Floor Waiter",
        isActive: true,
        role: "USER",
      },
    });

    await tx.userPosAccessRole.upsert({
      where: {
        userId_roleId: {
          userId: waiterUser.id,
          roleId: waiterRole.id,
        },
      },
      update: {},
      create: {
        userId: waiterUser.id,
        roleId: waiterRole.id,
      },
    });
  });

  console.log("Waiter user is ready.");
  console.log("username: waiter");
  console.log("password: waiter123");
  console.log("default route after login: /pos/waiter/tables");
}

async function main() {
  const { PrismaClient } = await import("../src/generated/prisma");
  const prisma = new PrismaClient();
  try {
    await setupPosWaiterUser(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
