import { PrismaClient } from '../../src/generated/prisma';

type PosSettingSeed = {
  key: string;
  value: string;
};

async function upsertSetting(prisma: PrismaClient, key: string, value: string) {
  await prisma.posRuntimeSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/**
 * Seeds default POS GL payment/revenue mappings from foundation accounts so
 * market preflight and golden-path checks pass on a fresh demo database.
 */
export async function seedMarketPosRuntimeSettings(prisma: PrismaClient) {
  const [mainCash, arabBank, salesRevenue, salesTaxPayable] = await Promise.all([
    prisma.account.findUnique({ where: { code: '1111001' }, select: { id: true } }),
    prisma.account.findUnique({ where: { code: '1112001' }, select: { id: true } }),
    prisma.account.findUnique({ where: { code: '4110001' }, select: { id: true } }),
    prisma.account.findUnique({ where: { code: '2110001' }, select: { id: true } }),
  ]);

  if (!mainCash || !salesRevenue) {
    console.warn(
      'seedMarketPosRuntimeSettings: foundation accounts missing (1111001 / 4110001). Skipping POS mappings.',
    );
    return;
  }

  const settings: PosSettingSeed[] = [
    { key: 'POS_POSTING_MODE', value: 'BY_INVOICE' },
    { key: 'POS_MAPPING_CASH_ACCOUNT_ID', value: mainCash.id },
    { key: 'POS_MAPPING_SALES_REVENUE_ACCOUNT_ID', value: salesRevenue.id },
  ];

  if (arabBank) {
    settings.push({ key: 'POS_MAPPING_CARD_ACCOUNT_ID', value: arabBank.id });
  }
  if (salesTaxPayable) {
    settings.push({ key: 'POS_MAPPING_OUTPUT_VAT_ACCOUNT_ID', value: salesTaxPayable.id });
  }

  for (const setting of settings) {
    await upsertSetting(prisma, setting.key, setting.value);
  }

  console.log(`Market POS runtime settings seeded (${settings.length} keys).`);
}
