import { PosAddonSelectionType, Prisma, PrismaClient } from '../src/generated/prisma';

type AddonOptionSeed = {
  name: string;
  nameAr?: string;
  priceAdjustment: number;
};

type AddonGroupSeed = {
  code: string;
  name: string;
  nameAr?: string;
  selectionType: PosAddonSelectionType;
  isRequired?: boolean;
  minSelections?: number;
  maxSelections?: number | null;
  sortOrder: number;
  options: AddonOptionSeed[];
};

/** Product item codes (from seed-pos-register) → addon group codes */
const ITEM_ADDON_LINKS: Record<string, string[]> = {
  'POS-FOD-001': ['EXTRAS', 'COOKING'],
  'POS-FOD-002': ['SNACK_EXTRAS'],
  'POS-FOD-003': ['SNACK_EXTRAS'],
  'POS-DRK-001': ['DRINK_SIZE'],
  'POS-DRK-002': ['DRINK_SIZE'],
  'POS-DRK-003': ['DRINK_SIZE'],
  'POS-DRK-004': ['DRINK_SIZE'],
  'OFFER-SUMMER': ['EXTRAS', 'DRINK_SIZE'],
};

const ADDON_GROUPS: AddonGroupSeed[] = [
  {
    code: 'EXTRAS',
    name: 'Extras',
    nameAr: 'إضافات',
    selectionType: PosAddonSelectionType.MULTIPLE,
    isRequired: false,
    minSelections: 0,
    maxSelections: 5,
    sortOrder: 1,
    options: [
      { name: 'Extra cheese', nameAr: 'جبنة إضافية', priceAdjustment: 0.5 },
      { name: 'Extra sauce', nameAr: 'صلصة إضافية', priceAdjustment: 0.25 },
      { name: 'Pickles', nameAr: 'مخلل', priceAdjustment: 0.15 },
      { name: 'No onion', nameAr: 'بدون بصل', priceAdjustment: 0 },
    ],
  },
  {
    code: 'COOKING',
    name: 'Cooking level',
    nameAr: 'درجة النضج',
    selectionType: PosAddonSelectionType.SINGLE,
    isRequired: true,
    minSelections: 1,
    sortOrder: 2,
    options: [
      { name: 'Rare', nameAr: 'نادر', priceAdjustment: 0 },
      { name: 'Medium', nameAr: 'متوسط', priceAdjustment: 0 },
      { name: 'Well done', nameAr: 'ناضج جيداً', priceAdjustment: 0 },
    ],
  },
  {
    code: 'DRINK_SIZE',
    name: 'Size',
    nameAr: 'الحجم',
    selectionType: PosAddonSelectionType.SINGLE,
    isRequired: false,
    sortOrder: 3,
    options: [
      { name: 'Regular', nameAr: 'عادي', priceAdjustment: 0 },
      { name: 'Large', nameAr: 'كبير', priceAdjustment: 0.5 },
    ],
  },
  {
    code: 'SNACK_EXTRAS',
    name: 'Snack extras',
    nameAr: 'إضافات الوجبات الخفيفة',
    selectionType: PosAddonSelectionType.MULTIPLE,
    isRequired: false,
    minSelections: 0,
    maxSelections: 4,
    sortOrder: 4,
    options: [
      { name: 'Extra nuts', nameAr: 'مكسرات إضافية', priceAdjustment: 0.35 },
      { name: 'Caramel drizzle', nameAr: 'صلصة كراميل', priceAdjustment: 0.25 },
      { name: 'Share box', nameAr: 'علبة مشاركة', priceAdjustment: 0.5 },
      { name: 'No salt', nameAr: 'بدون ملح', priceAdjustment: 0 },
    ],
  },
];

export async function seedPosAddons(prisma: PrismaClient) {
  console.log('Seeding POS add-on groups and product links...');

  const groupByCode = new Map<string, string>();

  for (const seed of ADDON_GROUPS) {
    const group = await prisma.posAddonGroup.upsert({
      where: { code: seed.code },
      update: {
        name: seed.name,
        nameAr: seed.nameAr ?? null,
        selectionType: seed.selectionType,
        isRequired: seed.isRequired ?? false,
        minSelections: seed.minSelections ?? 0,
        maxSelections: seed.maxSelections ?? null,
        sortOrder: seed.sortOrder,
        isActive: true,
      },
      create: {
        code: seed.code,
        name: seed.name,
        nameAr: seed.nameAr ?? null,
        selectionType: seed.selectionType,
        isRequired: seed.isRequired ?? false,
        minSelections: seed.minSelections ?? 0,
        maxSelections: seed.maxSelections ?? null,
        sortOrder: seed.sortOrder,
        isActive: true,
      },
    });

    groupByCode.set(seed.code, group.id);

    await prisma.posAddonOption.deleteMany({ where: { groupId: group.id } });
    if (seed.options.length) {
      await prisma.posAddonOption.createMany({
        data: seed.options.map((option, index) => ({
          groupId: group.id,
          name: option.name,
          nameAr: option.nameAr ?? null,
          priceAdjustment: new Prisma.Decimal(option.priceAdjustment),
          sortOrder: index,
          isActive: true,
        })),
      });
    }
  }

  let linkedProducts = 0;

  for (const [itemCode, groupCodes] of Object.entries(ITEM_ADDON_LINKS)) {
    const item = await prisma.inventoryItem.findUnique({
      where: { code: itemCode },
      select: { id: true, name: true },
    });
    if (!item) {
      console.warn(`  Skipping add-ons for missing item ${itemCode}`);
      continue;
    }

    const groupIds = groupCodes
      .map((code) => groupByCode.get(code))
      .filter((id): id is string => Boolean(id));

    await prisma.posItemAddonGroup.deleteMany({ where: { itemId: item.id } });
    if (groupIds.length) {
      await prisma.posItemAddonGroup.createMany({
        data: groupIds.map((groupId, sortOrder) => ({
          itemId: item.id,
          groupId,
          sortOrder,
        })),
      });
    }

    linkedProducts += 1;
    console.log(`  ${itemCode} (${item.name}): ${groupCodes.join(', ')}`);
  }

  console.log(
    `POS add-ons ready: ${ADDON_GROUPS.length} groups, ${linkedProducts} products linked.`,
  );
  console.log(
    'Try: Chicken Sandwich, Chocolate Bar / شوكولاتة, Cola — tap product on POS register.',
  );
}
