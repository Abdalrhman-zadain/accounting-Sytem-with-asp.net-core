import {
  PosAccessRoleCode,
  PosPermissionCode,
  type PrismaClient,
} from '../src/generated/prisma';

const accountantPermissionCodes: PosPermissionCode[] = [
  'POS_VIEW_COMPLETED_SALES',
  'POS_VIEW_PENDING_ACCOUNTING',
  'POS_VIEW_POS_INVOICE_DETAILS',
  'POS_VIEW_POS_PAYMENTS',
  'POS_VIEW_POS_INVENTORY_MOVEMENTS',
  'POS_VIEW_SESSIONS',
  'POS_VIEW_SESSION_REPORT',
  'POS_APPROVE_ACCOUNTING',
  'POS_REJECT_ACCOUNTING',
  'POS_POST_BY_INVOICE',
  'POS_POST_BY_SESSION',
  'POS_VIEW_POS_REPORTS',
  'POS_EXPORT_POS_REPORTS',
  'VIEW_JOURNAL_ENTRIES',
  'VIEW_GENERAL_LEDGER',
  'VIEW_INVENTORY_MOVEMENTS',
  'POS_CREDIT_SALE',
  'POS_SELL_NEGATIVE_STOCK',
  'POS_CHANGE_UNIT_PRICE',
  'RST_TRANSFER_TABLE',
  'RST_MERGE_TABLES',
  'RST_SPLIT_BILL',
  'RST_ASSIGN_DRIVER',
  'RST_CANCEL_KOT_ITEM',
  'RST_REPRINT_KOT',
  'RST_VIEW_KITCHEN_SCREEN',
  'RST_UPDATE_KITCHEN_STATUS',
  'RST_MARK_ITEM_UNAVAILABLE',
  'RST_OVERRIDE_SERVICE_CHARGE',
  'RST_CANCEL_RESTAURANT_ORDER',
  'RST_VIEW_RESTAURANT_REPORTS',
  'POS_CORRECT_ORDER_TYPE',
  'POS_APPROVE_CORRECTION',
  'POS_REOPEN_SESSION',
  'POS_MARKET_VIEW_RECEIVABLES',
  'POS_MARKET_COLLECT_RECEIVABLE',
  'POS_MARKET_MANAGE_REP_LOADS',
  'POS_MARKET_REP_STOCKTAKE',
];

export async function setupAdminAccountantRole(prisma: PrismaClient) {
  await prisma.$transaction(async (tx) => {
    const accountantRole = await tx.posAccessRole.upsert({
      where: { code: PosAccessRoleCode.ACCOUNTANT },
      update: {
        name: 'Accountant',
        description: 'POS accounting review, reporting, and posting access.',
        isActive: true,
      },
      create: {
        code: PosAccessRoleCode.ACCOUNTANT,
        name: 'Accountant',
        description: 'POS accounting review, reporting, and posting access.',
        isActive: true,
      },
    });

    for (const code of accountantPermissionCodes) {
      const permission = await tx.posPermission.upsert({
        where: { code },
        update: { name: code, description: code },
        create: { code, name: code, description: code },
      });
      await tx.posAccessRolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: accountantRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: accountantRole.id,
          permissionId: permission.id,
        },
      });
    }

    const admin = await tx.user.findUniqueOrThrow({
      where: { username: 'admin' },
      select: { id: true },
    });

    await tx.userPosAccessRole.deleteMany({
      where: {
        userId: admin.id,
        roleId: accountantRole.id,
      },
    });
    await tx.userPosAccessRole.create({
      data: {
        userId: admin.id,
        roleId: accountantRole.id,
      },
    });
  });

  console.log('Admin accountant POS role ready: admin / admin123');
}
