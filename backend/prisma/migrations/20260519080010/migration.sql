DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'PosAccessRole'
  ) THEN
    ALTER TABLE "PosAccessRole" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'PosPermission'
  ) THEN
    ALTER TABLE "PosPermission" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;
