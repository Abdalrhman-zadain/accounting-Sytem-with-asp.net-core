import { PrismaClient, PosAccessRoleCode, PosPermissionCode } from "../src/generated/prisma";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

const cashierPermissionCodes: PosPermissionCode[] = [
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
  "POS_CHANGE_UNIT_PRICE",
  "POS_EDIT_WAITER_CONFIRMED_ORDER",
  "POS_MODIFY_KITCHEN_SENT_LINE",
  "RST_UPDATE_KITCHEN_FROM_CART",
];

async function main() {
  const hashedPassword = await bcrypt.hash("cashier123", 10);

  await prisma.$transaction(async (tx) => {
    const cashierRole = await tx.posAccessRole.upsert({
      where: { code: PosAccessRoleCode.CASHIER },
      update: {
        name: "Cashier",
        description: "Operational POS sales access limited to cashier workflows.",
        isActive: true,
      },
      create: {
        code: PosAccessRoleCode.CASHIER,
        name: "Cashier",
        description: "Operational POS sales access limited to cashier workflows.",
        isActive: true,
      },
    });

    for (const code of cashierPermissionCodes) {
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
            roleId: cashierRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: cashierRole.id,
          permissionId: permission.id,
        },
      });
    }

    const cashier = await tx.user.upsert({
      where: { username: "cashier" },
      update: {
        email: "cashier@genius.com",
        password: hashedPassword,
        name: "POS Cashier",
        isActive: true,
        role: "USER",
      },
      create: {
        username: "cashier",
        email: "cashier@genius.com",
        password: hashedPassword,
        name: "POS Cashier",
        isActive: true,
        role: "USER",
      },
    });

    await tx.userPosAccessRole.upsert({
      where: {
        userId_roleId: {
          userId: cashier.id,
          roleId: cashierRole.id,
        },
      },
      update: {},
      create: {
        userId: cashier.id,
        roleId: cashierRole.id,
      },
    });
  });

  console.log("Cashier user is ready.");
  console.log("username: cashier");
  console.log("password: cashier123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
