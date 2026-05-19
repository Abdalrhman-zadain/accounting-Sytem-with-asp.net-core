-- POS roles, permissions, and username-based authentication support

CREATE TYPE "PosAccessRoleCode" AS ENUM ('CASHIER', 'ACCOUNTANT');

CREATE TYPE "PosPermissionCode" AS ENUM (
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
  'VIEW_INVENTORY_MOVEMENTS'
);

ALTER TABLE "User" ADD COLUMN "username" TEXT;
UPDATE "User" SET "username" = LOWER("email") WHERE "username" IS NULL;
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

CREATE TABLE "PosAccessRole" (
  "id" TEXT NOT NULL,
  "code" "PosAccessRoleCode" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosAccessRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosPermission" (
  "id" TEXT NOT NULL,
  "code" "PosPermissionCode" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosAccessRolePermission" (
  "id" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosAccessRolePermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserPosAccessRole" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPosAccessRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE UNIQUE INDEX "PosAccessRole_code_key" ON "PosAccessRole"("code");
CREATE UNIQUE INDEX "PosPermission_code_key" ON "PosPermission"("code");
CREATE UNIQUE INDEX "PosAccessRolePermission_roleId_permissionId_key" ON "PosAccessRolePermission"("roleId", "permissionId");
CREATE INDEX "PosAccessRolePermission_permissionId_idx" ON "PosAccessRolePermission"("permissionId");
CREATE UNIQUE INDEX "UserPosAccessRole_userId_roleId_key" ON "UserPosAccessRole"("userId", "roleId");
CREATE INDEX "UserPosAccessRole_roleId_idx" ON "UserPosAccessRole"("roleId");

ALTER TABLE "PosAccessRolePermission"
  ADD CONSTRAINT "PosAccessRolePermission_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "PosAccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PosAccessRolePermission"
  ADD CONSTRAINT "PosAccessRolePermission_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "PosPermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPosAccessRole"
  ADD CONSTRAINT "UserPosAccessRole_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPosAccessRole"
  ADD CONSTRAINT "UserPosAccessRole_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "PosAccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
