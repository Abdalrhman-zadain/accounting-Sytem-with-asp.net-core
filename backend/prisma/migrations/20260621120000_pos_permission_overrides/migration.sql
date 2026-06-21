-- Add post-confirm and system permission codes
ALTER TYPE "PosPermissionCode" ADD VALUE IF NOT EXISTS 'POS_ADD_ITEM_AFTER_WAITER_CONFIRM';
ALTER TYPE "PosPermissionCode" ADD VALUE IF NOT EXISTS 'POS_EDIT_WAITER_CONFIRMED_ORDER';
ALTER TYPE "PosPermissionCode" ADD VALUE IF NOT EXISTS 'POS_MODIFY_KITCHEN_SENT_LINE';
ALTER TYPE "PosPermissionCode" ADD VALUE IF NOT EXISTS 'RST_UPDATE_KITCHEN_FROM_CART';
ALTER TYPE "PosPermissionCode" ADD VALUE IF NOT EXISTS 'SYS_MANAGE_USERS';

-- Permission override effect enum
DO $$ BEGIN
  CREATE TYPE "PosPermissionOverrideEffect" AS ENUM ('GRANT', 'DENY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Per-user permission overrides
CREATE TABLE IF NOT EXISTS "UserPosPermissionOverride" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "effect" "PosPermissionOverrideEffect" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserPosPermissionOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserPosPermissionOverride_userId_permissionId_key"
  ON "UserPosPermissionOverride"("userId", "permissionId");
CREATE INDEX IF NOT EXISTS "UserPosPermissionOverride_permissionId_idx"
  ON "UserPosPermissionOverride"("permissionId");

DO $$ BEGIN
  ALTER TABLE "UserPosPermissionOverride"
    ADD CONSTRAINT "UserPosPermissionOverride_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UserPosPermissionOverride"
    ADD CONSTRAINT "UserPosPermissionOverride_permissionId_fkey"
    FOREIGN KEY ("permissionId") REFERENCES "PosPermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
