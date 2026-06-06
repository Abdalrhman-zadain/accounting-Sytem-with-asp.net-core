import {
  PosAccessRoleCode,
  PosPermissionCode,
  type PrismaClient,
} from "../src/generated/prisma";
import * as bcrypt from "bcrypt";

const kitchenPermissionCodes: PosPermissionCode[] = [
  "RST_VIEW_KITCHEN_SCREEN",
  "RST_UPDATE_KITCHEN_STATUS",
  "RST_CANCEL_KOT_ITEM",
  "RST_MARK_ITEM_UNAVAILABLE",
];

export async function setupPosKitchenUser(prisma: PrismaClient) {
  const hashedPassword = await bcrypt.hash("kitchen123", 10);

  await prisma.$transaction(async (tx) => {
    const kitchenRole = await tx.posAccessRole.upsert({
      where: { code: PosAccessRoleCode.KITCHEN },
      update: {
        name: "Kitchen",
        description: "Kitchen display only — view and update order preparation status.",
        isActive: true,
      },
      create: {
        code: PosAccessRoleCode.KITCHEN,
        name: "Kitchen",
        description: "Kitchen display only — view and update order preparation status.",
        isActive: true,
      },
    });

    for (const code of kitchenPermissionCodes) {
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
            roleId: kitchenRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: kitchenRole.id,
          permissionId: permission.id,
        },
      });
    }

    const kitchenUser = await tx.user.upsert({
      where: { username: "kitchen" },
      update: {
        email: "kitchen@genius.com",
        password: hashedPassword,
        name: "Kitchen Display",
        isActive: true,
        role: "USER",
      },
      create: {
        username: "kitchen",
        email: "kitchen@genius.com",
        password: hashedPassword,
        name: "Kitchen Display",
        isActive: true,
        role: "USER",
      },
    });

    await tx.userPosAccessRole.upsert({
      where: {
        userId_roleId: {
          userId: kitchenUser.id,
          roleId: kitchenRole.id,
        },
      },
      update: {},
      create: {
        userId: kitchenUser.id,
        roleId: kitchenRole.id,
      },
    });
  });

  console.log("Kitchen user is ready.");
  console.log("username: kitchen");
  console.log("password: kitchen123");
  console.log("default route after login: /pos/kitchen");
}

async function main() {
  const { PrismaClient } = await import("../src/generated/prisma");
  const prisma = new PrismaClient();
  try {
    await setupPosKitchenUser(prisma);
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
