CREATE TABLE "PosRuntimeSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosRuntimeSetting_pkey" PRIMARY KEY ("key")
);

INSERT INTO "PosRuntimeSetting" ("key", "value")
VALUES
    ('POS_POSTING_MODE', 'BY_SESSION'),
    ('POS_COGS_POSTING_ENABLED', 'false')
ON CONFLICT ("key") DO NOTHING;
