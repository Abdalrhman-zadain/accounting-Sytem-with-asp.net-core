import { PosAddonSelectionType, Prisma, PrismaClient } from '../src/generated/prisma';

type AddonOptionSeed = {
  name: string;
  nameAr?: string;
  priceAdjustment: number;
};

type AddonGroupSeed = {
  id?: string;
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

type ItemAddonLinkSeed = {
  id?: string;
  itemCode: string;
  groupCode: string;
  sortOrder: number;
};

type ResolvedItemAddonLink = {
  id?: string;
  itemId: string;
  groupId: string;
  sortOrder: number;
};

const ITEM_ADDON_LINKS: ItemAddonLinkSeed[] = [
  { id: 'cmq5gy4qq01mfetf5gm1f2bsy', itemCode: 'MENU-FOOD-003', groupCode: 'COOKING_TYPE', sortOrder: 0 },
  { id: 'cmq5gy4qq01mgetf5dc7r3ttp', itemCode: 'MENU-FOOD-003', groupCode: 'YOGURT_ADDON', sortOrder: 1 },
  { id: 'cmq5gyk2e01mietf5kmypn8iq', itemCode: 'MENU-FOOD-002', groupCode: 'YOGURT_ADDON', sortOrder: 0 },
  { id: 'cmq5gynpg01mjetf5s658eo2c', itemCode: 'MENU-FOOD-001', groupCode: 'COOKING_TYPE', sortOrder: 0 },
  { id: 'cmq5gynpg01mketf577saw6a8', itemCode: 'MENU-FOOD-001', groupCode: 'YOGURT_ADDON', sortOrder: 1 },
  { id: 'cmq5gywwc01mletf5mm0cwk5h', itemCode: 'MENU-FOOD-006', groupCode: 'COOKING_TYPE', sortOrder: 0 },
  { id: 'cmq5gywwc01mmetf5skjz1p0f', itemCode: 'MENU-FOOD-006', groupCode: 'YOGURT_ADDON', sortOrder: 1 },
  { id: 'cmq5gz1sf01mnetf5rxpyh7mr', itemCode: 'MENU-FOOD-005', groupCode: 'COOKING_TYPE', sortOrder: 0 },
  { id: 'cmq5gz1sf01moetf5pgyjxfva', itemCode: 'MENU-FOOD-005', groupCode: 'YOGURT_ADDON', sortOrder: 1 },
  { id: 'cmq5gz9lj01mpetf5xt70v8z4', itemCode: 'MENU-FOOD-004', groupCode: 'YOGURT_ADDON', sortOrder: 0 },
  { id: 'cmq5gzno401mqetf5gch9djqm', itemCode: 'MENU-FOOD-007', groupCode: 'COOKING_TYPE', sortOrder: 0 },
  { id: 'cmq5gzno401mretf52boro4kt', itemCode: 'MENU-FOOD-007', groupCode: 'YOGURT_ADDON', sortOrder: 1 },
  { id: 'cmq5gzu3a01msetf5xj38l7tk', itemCode: 'MENU-FOOD-012', groupCode: 'COOKING_TYPE', sortOrder: 0 },
  { id: 'cmq5gzu3a01mtetf5w3wewz3k', itemCode: 'MENU-FOOD-012', groupCode: 'YOGURT_ADDON', sortOrder: 1 },
  { id: 'cmq5h0dqd01muetf5irva5ze0', itemCode: 'MENU-FOOD-010', groupCode: 'COOKING_TYPE', sortOrder: 0 },
  { id: 'cmq5h0dqd01mvetf56a7ghpxo', itemCode: 'MENU-FOOD-010', groupCode: 'YOGURT_ADDON', sortOrder: 1 },
  { id: 'cmq5h0kiv01mwetf54gze5jke', itemCode: 'MENU-FOOD-014', groupCode: 'COOKING_TYPE', sortOrder: 0 },
  { id: 'cmq5h0kiv01mxetf5q0u35fgs', itemCode: 'MENU-FOOD-014', groupCode: 'YOGURT_ADDON', sortOrder: 1 },
  { itemCode: 'MENU-FOOD-015', groupCode: 'COOKING_TYPE', sortOrder: 0 },
  { id: 'cmq5hnoul01yuetf59gbi3qm4', itemCode: 'MENU-FOOD-009', groupCode: 'COOKING_TYPE', sortOrder: 0 },
  { id: 'cmq5hnoul01yvetf5cp25nxji', itemCode: 'MENU-FOOD-009', groupCode: 'RICE_FRIKEH', sortOrder: 1 },
  { id: 'cmq5ho6mi01ywetf52xdbmqrv', itemCode: 'MENU-FOOD-008', groupCode: 'RICE_FRIKEH', sortOrder: 0 },
  { id: 'cmq5hrylk01z4etf5zg11kha2', itemCode: 'MENU-FATTAH-006', groupCode: 'S_W_K', sortOrder: 0 },
  { id: 'cmq5hs7tl01z5etf5587vh8fr', itemCode: 'MENU-FATTAH-002', groupCode: 'S_W_K', sortOrder: 0 },
  { id: 'cmq5hsc6l01z6etf53cz1putd', itemCode: 'MENU-FATTAH-004', groupCode: 'S_W_K', sortOrder: 0 },
  { id: 'cmq5hsgj001z7etf54p4whekj', itemCode: 'MENU-FATTAH-003', groupCode: 'S_W_K', sortOrder: 0 },
  { id: 'cmq5hskf901z8etf57qgqvezg', itemCode: 'MENU-FATTAH-005', groupCode: 'S_W_K', sortOrder: 0 },
  { id: 'cmq5hw4xj01zwetf5bgvwdq21', itemCode: 'MENU-FATTAH-001', groupCode: 'S_W_K_F', sortOrder: 0 },
  { itemCode: 'MENU-MEAL-001', groupCode: 'COOKING_TYPE', sortOrder: 0 },
  { itemCode: 'MENU-MEAL-001', groupCode: 'YOGURT_ADDON_MEALS', sortOrder: 1 },
  { itemCode: 'MENU-MEAL-002', groupCode: 'COOKING_TYPE', sortOrder: 0 },
  { itemCode: 'MENU-MEAL-002', groupCode: 'YOGURT_ADDON_MEALS', sortOrder: 1 },
];

const ADDON_GROUPS: AddonGroupSeed[] = [
  {
    id: 'cmq3rv1mv00g4et5lmzdik8u1',
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
    id: 'cmq3rv1n900g9et5lsiy9wcs9',
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
    id: 'cmq3rv1nh00gdet5lhh576ry4',
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
    id: 'cmq3rv1nn00gget5lhwrp2mjy',
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
  {
    id: 'cmq5g7k0g01lwetf5q2v5l7db',
    code: 'COOKING_TYPE',
    name: 'Cooking type',
    nameAr: 'نوع الطبخ',
    selectionType: PosAddonSelectionType.SINGLE,
    isRequired: true,
    minSelections: 1,
    sortOrder: 0,
    options: [
      { name: 'Grilled', nameAr: 'شوي', priceAdjustment: 0 },
      { name: 'Boiled', nameAr: 'سلق', priceAdjustment: 0 },
    ],
  },
  {
    id: 'cmq5gve9i01mcetf50reagtng',
    code: 'YOGURT_ADDON',
    name: 'Yogurt add-on',
    nameAr: 'إضافة لبن',
    selectionType: PosAddonSelectionType.SINGLE,
    isRequired: false,
    minSelections: 0,
    sortOrder: 0,
    options: [
      { name: 'Add yogurt', nameAr: 'إضافة لبن', priceAdjustment: 0.5 },
    ],
  },
  {
    code: 'YOGURT_ADDON_MEALS',
    name: 'Yogurt add-on (meals)',
    nameAr: 'إضافة لبن للوجبات',
    selectionType: PosAddonSelectionType.SINGLE,
    isRequired: false,
    minSelections: 0,
    sortOrder: 1,
    options: [
      { name: 'Add yogurt', nameAr: 'إضافة لبن', priceAdjustment: 1 },
    ],
  },
  {
    id: 'cmq5hk1ol01ypetf51jdno8c6',
    code: 'RICE_FRIKEH',
    name: 'Rice and freekeh',
    nameAr: 'رز و فريكة',
    selectionType: PosAddonSelectionType.SINGLE,
    isRequired: false,
    minSelections: 0,
    sortOrder: 0,
    options: [
      { name: 'Rice', nameAr: 'رز', priceAdjustment: 0 },
      { name: 'Freekeh', nameAr: 'فريكة', priceAdjustment: 0 },
    ],
  },
  {
    id: 'cmq5hq5mh01yxetf5xkv0zgsf',
    code: 'S_W_K',
    name: 'Small, Medium, Large',
    nameAr: 'صغير، وسط، كبير',
    selectionType: PosAddonSelectionType.SINGLE,
    isRequired: false,
    minSelections: 0,
    sortOrder: 0,
    options: [
      { name: 'Small', nameAr: 'صغير', priceAdjustment: 0 },
      { name: 'Medium', nameAr: 'وسط', priceAdjustment: 2.5 },
      { name: 'Large', nameAr: 'كبير', priceAdjustment: 5 },
    ],
  },
  {
    id: 'cmq5htjrt01z9etf5pq8nd9bs',
    code: 'S_W_K_F',
    name: 'Small, Medium, Large',
    nameAr: 'صغير، وسط، كبير',
    selectionType: PosAddonSelectionType.SINGLE,
    isRequired: false,
    minSelections: 0,
    sortOrder: 0,
    options: [
      { name: 'Small', nameAr: 'صغير', priceAdjustment: 0 },
      { name: 'Medium', nameAr: 'وسط', priceAdjustment: 1 },
      { name: 'Large', nameAr: 'كبير', priceAdjustment: 2 },
    ],
  },
  {
    id: 'cmq5hzlq3020letf5m2ju6hme',
    code: 'HALF_HEAD',
    name: 'Half head',
    nameAr: 'نص رأس',
    selectionType: PosAddonSelectionType.SINGLE,
    isRequired: false,
    minSelections: 0,
    sortOrder: 0,
    options: [],
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
        id: seed.id,
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

  const linksByItemCode = new Map<string, ItemAddonLinkSeed[]>();
  for (const link of ITEM_ADDON_LINKS) {
    const existing = linksByItemCode.get(link.itemCode);
    if (existing) {
      existing.push(link);
    } else {
      linksByItemCode.set(link.itemCode, [link]);
    }
  }

  let linkedProducts = 0;

  for (const [itemCode, links] of Array.from(linksByItemCode.entries())) {
    const item = await prisma.inventoryItem.findFirst({
      where: {
        OR: [{ id: itemCode }, { code: itemCode }],
      },
      select: { id: true, name: true },
    });
    if (!item) {
      console.warn(`  Skipping add-ons for missing item ${itemCode}`);
      continue;
    }

    const validLinks: ResolvedItemAddonLink[] = [];
    for (const link of links) {
      const groupId = groupByCode.get(link.groupCode);
      if (!groupId) {
        console.warn(`  Skipping missing addon group ${link.groupCode} for item ${itemCode}`);
        continue;
      }

      validLinks.push({
        id: link.id,
        itemId: item.id,
        groupId,
        sortOrder: link.sortOrder,
      });
    }

    const desiredGroupIds = Array.from(
      new Set(validLinks.map((link) => link.groupId)),
    );

    await prisma.posItemAddonGroup.deleteMany({
      where: {
        itemId: item.id,
        groupId: { notIn: desiredGroupIds },
      },
    });

    for (const link of validLinks) {
      const existingLink = await prisma.posItemAddonGroup.findUnique({
        where: {
          itemId_groupId: {
            itemId: link.itemId,
            groupId: link.groupId,
          },
        },
        select: { id: true },
      });

      if (existingLink) {
        await prisma.posItemAddonGroup.update({
          where: { id: existingLink.id },
          data: { sortOrder: link.sortOrder },
        });
        continue;
      }

      await prisma.posItemAddonGroup.create({
        data: {
          id: link.id,
          itemId: link.itemId,
          groupId: link.groupId,
          sortOrder: link.sortOrder,
        },
      });
    }

    linkedProducts += 1;
    console.log(`  ${itemCode} (${item.name}): ${links.map((link) => link.groupCode).join(', ')}`);
  }

  console.log(
    `POS add-ons ready: ${ADDON_GROUPS.length} groups, ${linkedProducts} products linked.`,
  );
  console.log(
    'Try: Chicken Sandwich, Chocolate Bar / شوكولاتة, Cola — tap product on POS register.',
  );
}
