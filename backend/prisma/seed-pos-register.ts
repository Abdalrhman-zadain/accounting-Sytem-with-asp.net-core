import {
  InventoryItemType,
  Prisma,
  PrismaClient,
} from '../src/generated/prisma';
import { seedPosAddons } from './seed-pos-addons';

type PosProductSeed = {
  id?: string;
  code: string;
  name: string;
  description?: string;
  barcode?: string;
  category: string;
  salesPrice: number;
  purchasePrice: number;
  stockMain: number;
  stockBranch?: number;
  type?: InventoryItemType;
  trackInventory?: boolean;
  reorderLevel?: number;
  groupCode: string;
  categoryCode: string;
  favorite?: boolean;
  itemImageUrl?: string;
  unitOfMeasure?: string;
  sellByWeight?: boolean;
  minSalesQuantity?: number;
};

type PosGroupSeed = {
  code: string;
  name: string;
};

const POS_ITEM_GROUPS: PosGroupSeed[] = [
  { code: 'MENU-ASNAF', name: 'الأصناف' },
  { code: 'MENU-SNACKS', name: 'السناكات' },
  { code: 'MENU-FATTAH', name: 'الفتات' },
  { code: 'MENU-APPETIZERS', name: 'المقبلات' },
  { code: 'MENU-DRINKS', name: 'المشروبات' },
  { code: 'MENU-MEALS', name: 'الوجبات' },
  { code: 'MENU-ADDONS', name: 'الاضافات' },
];

const POS_ITEM_CATEGORIES: Array<PosGroupSeed & { itemGroupCode: string }> = [
  { code: 'MENU-ASNAF', name: 'الأصناف', itemGroupCode: 'MENU-ASNAF' },
  { code: 'MENU-SNACKS', name: 'السناكات', itemGroupCode: 'MENU-SNACKS' },
  { code: 'MENU-FATTAH', name: 'الفتات', itemGroupCode: 'MENU-FATTAH' },
  { code: 'MENU-APPETIZERS', name: 'المقبلات', itemGroupCode: 'MENU-APPETIZERS' },
  { code: 'MENU-DRINKS', name: 'المشروبات', itemGroupCode: 'MENU-DRINKS' },
  { code: 'MENU-MEALS', name: 'الوجبات', itemGroupCode: 'MENU-MEALS' },
  { code: 'MENU-ADDONS', name: 'الاضافات', itemGroupCode: 'MENU-ADDONS' },
];

const POS_PRODUCTS: PosProductSeed[] = [
  {
    id: 'MENU-FOOD-001',
    code: 'MENU-001',
    name: 'آبوات',
    description: 'آبوات - السعر للكيلو',
    category: 'الأصناف',
    salesPrice: 10,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-ASNAF',
    categoryCode: 'MENU-ASNAF',
    itemImageUrl: '/images/menu/ayot.png',
    unitOfMeasure: 'KG',
    sellByWeight: true,
    minSalesQuantity: 0.125,
    favorite: true,
  },
  {
    id: 'MENU-FOOD-002',
    code: 'MENU-002',
    name: 'صينية لحمة راس',
    description: 'صينية لحمة راس مع بصل ومخلل',
    category: 'الأصناف',
    salesPrice: 3.5,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-ASNAF',
    categoryCode: 'MENU-ASNAF',
    itemImageUrl: '/images/menu/lahmet-ras-tray.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-FOOD-003',
    code: 'MENU-003',
    name: 'رأس خروف',
    description: 'رأس خروف - صينية مع سلطة وحمص ومخلل',
    category: 'الأصناف',
    salesPrice: 7,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-ASNAF',
    categoryCode: 'MENU-ASNAF',
    itemImageUrl: '/images/menu/ras-kharouf.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-FOOD-004',
    code: 'MENU-004',
    name: 'طحالات',
    description: 'طحالات - عدد 1',
    category: 'الأصناف',
    salesPrice: 2,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-ASNAF',
    categoryCode: 'MENU-ASNAF',
    itemImageUrl: '/images/menu/tihalat.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-FOOD-005',
    code: 'MENU-005',
    name: 'فوارع',
    description: 'فوارع - السعر للكيلو',
    category: 'الأصناف',
    salesPrice: 10,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-ASNAF',
    categoryCode: 'MENU-ASNAF',
    itemImageUrl: '/images/menu/fawaregh.png',
    unitOfMeasure: 'KG',
    sellByWeight: true,
    minSalesQuantity: 0.25,
    favorite: true,
  },
  {
    id: 'MENU-FOOD-006',
    code: 'MENU-006',
    name: 'كرشات',
    description: 'كرشات - السعر للكيلو',
    category: 'الأصناف',
    salesPrice: 10,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-ASNAF',
    categoryCode: 'MENU-ASNAF',
    itemImageUrl: '/images/menu/karshat.png',
    unitOfMeasure: 'KG',
    sellByWeight: true,
    minSalesQuantity: 0.125,
    favorite: true,
  },
  {
    id: 'MENU-FOOD-007',
    code: 'MENU-007',
    name: 'مقدم خروف',
    description: 'مقدم خروف - عدد 1',
    category: 'الأصناف',
    salesPrice: 1,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-ASNAF',
    categoryCode: 'MENU-ASNAF',
    itemImageUrl: '/images/menu/moqadam-kharouf.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-FOOD-008',
    code: 'MENU-008',
    name: 'زغاليل محشي فريكة أو أرز',
    description: 'زغاليل محشي فريكة أو أرز مع مخلل ولبن',
    category: 'الأصناف',
    salesPrice: 4.3,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-ASNAF',
    categoryCode: 'MENU-ASNAF',
    itemImageUrl: '/images/menu/hamam-mahshi.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-FOOD-009',
    code: 'MENU-009',
    name: 'أقلاب خروف محشية',
    description: 'أقلاب خروف محشية مع مخلل ولبن',
    category: 'الأصناف',
    salesPrice: 3.6,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-ASNAF',
    categoryCode: 'MENU-ASNAF',
    itemImageUrl: '/images/menu/aqlab-kharouf.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-FOOD-010',
    code: 'MENU-010',
    name: 'نخاعات',
    description: 'نخاعات - شوي / سلق / قلي',
    category: 'الأصناف',
    salesPrice: 2,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-ASNAF',
    categoryCode: 'MENU-ASNAF',
    itemImageUrl: '/images/menu/nkhaat.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-FOOD-011',
    code: 'MENU-011',
    name: 'مشكل معلاق',
    description: 'مشكل معلاق',
    category: 'الأصناف',
    salesPrice: 2,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-ASNAF',
    categoryCode: 'MENU-ASNAF',
    itemImageUrl: '/images/menu/mix-maalaq.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-FOOD-012',
    code: 'MENU-012',
    name: 'مقادم عجل',
    description: 'مقادم عجل - عدد 1',
    category: 'الأصناف',
    salesPrice: 2.5,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-ASNAF',
    categoryCode: 'MENU-ASNAF',
    itemImageUrl: '/images/menu/moqadam-ejel.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-FOOD-013',
    code: 'MENU-013',
    name: 'مسخن',
    description: 'ربع دجاج مسخن بالمكسرات مع حمص وشوربة وعلبة لبن ومخلل',
    category: 'الأصناف',
    salesPrice: 2.6,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-ASNAF',
    categoryCode: 'MENU-ASNAF',
    itemImageUrl: '/images/menu/musakhan.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-FOOD-014',
    code: 'MENU-014',
    name: 'لسانات',
    description: 'لسانات - شوي / سلق / برسن، يضاف نصف دينار للبرسن',
    category: 'الأصناف',
    salesPrice: 2,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-ASNAF',
    categoryCode: 'MENU-ASNAF',
    itemImageUrl: '/images/menu/lasanat.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-FOOD-015',
    code: 'MENU-015',
    name: 'عصب عجل مجروم',
    description: 'عصب عجل مجروم - سلق / شوي',
    category: 'الأصناف',
    salesPrice: 2.5,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-ASNAF',
    categoryCode: 'MENU-ASNAF',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-SNACK-001',
    code: 'SNACK-001',
    name: 'سناك لحمة راس',
    description: 'سناك لحمة راس',
    category: 'السناكات',
    salesPrice: 1.5,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-SNACKS',
    categoryCode: 'MENU-SNACKS',
    itemImageUrl: '/images/menu/snack-lahmet-ras.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-SNACK-002',
    code: 'SNACK-002',
    name: 'سناك طحال',
    description: 'سناك طحال',
    category: 'السناكات',
    salesPrice: 1.5,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-SNACKS',
    categoryCode: 'MENU-SNACKS',
    itemImageUrl: '/images/menu/snack-tihal.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-SNACK-003',
    code: 'SNACK-003',
    name: 'سناك لسانات',
    description: 'سناك لسانات',
    category: 'السناكات',
    salesPrice: 1.5,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-SNACKS',
    categoryCode: 'MENU-SNACKS',
    itemImageUrl: '/images/menu/snack-lasanat.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-SNACK-004',
    code: 'SNACK-004',
    name: 'سناك نخاعات',
    description: 'سناك نخاعات',
    category: 'السناكات',
    salesPrice: 1.5,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-SNACKS',
    categoryCode: 'MENU-SNACKS',
    itemImageUrl: '/images/menu/snack-nkhaat.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-FATTAH-001',
    code: 'FATTAH-001',
    name: 'فتة سادة لشخص واحد',
    description: 'فتة سادة لشخص واحد',
    category: 'الفتات',
    salesPrice: 1,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-FATTAH',
    categoryCode: 'MENU-FATTAH',
    itemImageUrl: '/images/menu/fattah-sada.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-FATTAH-002',
    code: 'MENU-FATTAH-002',
    name: 'فتة لسانات لشخص واحد',
    description: 'فتة لسانات لشخص واحد',
    category: 'الفتات',
    salesPrice: 2.5,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-FATTAH',
    categoryCode: 'MENU-FATTAH',
    itemImageUrl: '/images/menu/fattah-lasanat.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-FATTAH-003',
    code: 'MENU-FATTAH-003',
    name: 'فتة مقادم لشخص واحد',
    description: 'فتة مقادم لشخص واحد',
    category: 'الفتات',
    salesPrice: 2.5,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-FATTAH',
    categoryCode: 'MENU-FATTAH',
    itemImageUrl: '/images/menu/fattah-moqadam.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-FATTAH-004',
    code: 'MENU-FATTAH-004',
    name: 'فتة مخاصي لشخص واحد',
    description: 'فتة مخاصي لشخص واحد',
    category: 'الفتات',
    salesPrice: 2.5,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-FATTAH',
    categoryCode: 'MENU-FATTAH',
    itemImageUrl: '/images/menu/fattah-makhasi.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-FATTAH-005',
    code: 'MENU-FATTAH-005',
    name: 'فتة نخاعات لشخص واحد',
    description: 'فتة نخاعات لشخص واحد',
    category: 'الفتات',
    salesPrice: 2.5,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-FATTAH',
    categoryCode: 'MENU-FATTAH',
    itemImageUrl: '/images/menu/fattah-nkhaat.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-FATTAH-006',
    code: 'MENU-FATTAH-006',
    name: 'فتة لحمة راس لشخص واحد',
    description: 'فتة لحمة راس لشخص واحد',
    category: 'الفتات',
    salesPrice: 2.5,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-FATTAH',
    categoryCode: 'MENU-FATTAH',
    itemImageUrl: '/images/menu/fattah-lahmet-ras.png',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-APP-001',
    code: 'MENU-APP-001',
    name: 'سلطة بالطحينية',
    description: 'سلطة بالطحينية',
    category: 'المقبلات',
    salesPrice: 1,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-APPETIZERS',
    categoryCode: 'MENU-APPETIZERS',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-APP-002',
    code: 'MENU-APP-002',
    name: 'سلطة عربية',
    description: 'سلطة عربية',
    category: 'المقبلات',
    salesPrice: 1,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-APPETIZERS',
    categoryCode: 'MENU-APPETIZERS',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-APP-003',
    code: 'MENU-APP-003',
    name: 'سلطة خيار باللبن',
    description: 'سلطة خيار باللبن',
    category: 'المقبلات',
    salesPrice: 1,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-APPETIZERS',
    categoryCode: 'MENU-APPETIZERS',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-APP-004',
    code: 'MENU-APP-004',
    name: 'تبولة',
    description: 'تبولة',
    category: 'المقبلات',
    salesPrice: 1,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-APPETIZERS',
    categoryCode: 'MENU-APPETIZERS',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-APP-005',
    code: 'MENU-APP-005',
    name: 'يلنجي خضار 200 غم',
    description: 'يلنجي خضار 200 غم',
    category: 'المقبلات',
    salesPrice: 2,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-APPETIZERS',
    categoryCode: 'MENU-APPETIZERS',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-APP-006',
    code: 'MENU-APP-006',
    name: 'شوربة فريكة 500 غم',
    description: 'شوربة فريكة 500 غم',
    category: 'المقبلات',
    salesPrice: 1,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-APPETIZERS',
    categoryCode: 'MENU-APPETIZERS',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-APP-007',
    code: 'MENU-APP-007',
    name: 'شوربة لبن 500 غم',
    description: 'شوربة لبن 500 غم',
    category: 'المقبلات',
    salesPrice: 1,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-APPETIZERS',
    categoryCode: 'MENU-APPETIZERS',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-APP-008',
    code: 'MENU-APP-008',
    name: 'شوربة روس 500 غم',
    description: 'شوربة روس 500 غم',
    category: 'المقبلات',
    salesPrice: 1,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-APPETIZERS',
    categoryCode: 'MENU-APPETIZERS',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-APP-009',
    code: 'MENU-APP-009',
    name: 'علبة طحينية',
    description: 'علبة طحينية',
    category: 'المقبلات',
    salesPrice: 0.25,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-APPETIZERS',
    categoryCode: 'MENU-APPETIZERS',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-DRINK-001',
    code: 'MENU-DRINK-001',
    name: 'مشروبات غازية 330 مل',
    description: 'مشروبات غازية 330 مل',
    category: 'المشروبات',
    salesPrice: 0.4,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-DRINKS',
    categoryCode: 'MENU-DRINKS',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-DRINK-002',
    code: 'MENU-DRINK-002',
    name: 'مياه معدنية 300 مل',
    description: 'مياه معدنية 300 مل',
    category: 'المشروبات',
    salesPrice: 0.25,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-DRINKS',
    categoryCode: 'MENU-DRINKS',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-DRINK-003',
    code: 'MENU-DRINK-003',
    name: 'لبن رايب',
    description: 'لبن رايب',
    category: 'المشروبات',
    salesPrice: 0.25,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-DRINKS',
    categoryCode: 'MENU-DRINKS',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-DRINK-004',
    code: 'MENU-DRINK-004',
    name: 'لبن شنينة',
    description: 'لبن شنينة',
    category: 'المشروبات',
    salesPrice: 0.5,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-DRINKS',
    categoryCode: 'MENU-DRINKS',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-DRINK-005',
    code: 'MENU-DRINK-005',
    name: 'عصير معلب طبيعي',
    description: 'عصير معلب طبيعي',
    category: 'المشروبات',
    salesPrice: 0.5,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-DRINKS',
    categoryCode: 'MENU-DRINKS',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-DRINK-006',
    code: 'MENU-DRINK-006',
    name: 'لبن عيران',
    description: 'لبن عيران',
    category: 'المشروبات',
    salesPrice: 0.5,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-DRINKS',
    categoryCode: 'MENU-DRINKS',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-MEAL-001',
    code: 'MENU-MEAL-001',
    name: 'وجبة كرشيب',
    description: 'نصف راس خروف + 1 مقادم + 1 كرش + 250 غرام فوارع + شوربة + خبز + مخلل + ليمونة',
    category: 'الوجبات',
    salesPrice: 8.5,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-MEALS',
    categoryCode: 'MENU-MEALS',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-MEAL-002',
    code: 'MENU-MEAL-002',
    name: 'وجبة عائلية',
    description: 'راس خروف مع مخ (1) + 4 مقادم + 4 كرش + 500 غرام فوارع + فتة خبز + شوربة + خبز + مخلل + ليمونة',
    category: 'الوجبات',
    salesPrice: 25,
    purchasePrice: 0,
    stockMain: 100,
    stockBranch: 50,
    groupCode: 'MENU-MEALS',
    categoryCode: 'MENU-MEALS',
    unitOfMeasure: 'PCS',
  },
  {
    id: 'MENU-ADDON-001',
    code: 'MENU-ADDON-001',
    name: 'اضافات اللبن',
    description: 'خدمة إضافية مستقلة لخيارات اللبن في POS',
    category: 'الاضافات',
    salesPrice: 0.25,
    purchasePrice: 0,
    stockMain: 0,
    stockBranch: 0,
    type: InventoryItemType.SERVICE,
    trackInventory: false,
    groupCode: 'MENU-ADDONS',
    categoryCode: 'MENU-ADDONS',
    unitOfMeasure: 'SERVICE',
  },
];

async function allocateNextAccountCode(
  prisma: PrismaClient,
  parentId: string,
): Promise<string> {
  const parent = await prisma.account.findUniqueOrThrow({
    where: { id: parentId },
    select: { code: true },
  });

  const lastSibling = await prisma.account.findFirst({
    where: { parentAccountId: parentId },
    orderBy: { code: 'desc' },
    select: { code: true },
  });

  let nextCodeCandidate: string;
  if (lastSibling) {
    const codeStr = lastSibling.code;
    const match = codeStr.match(/^(.*?)(\d+)$/);
    if (match) {
      const [, prefix, digits] = match;
      const nextNum = (BigInt(digits) + 1n).toString();
      nextCodeCandidate = prefix + nextNum.padStart(digits.length, '0');
    } else {
      nextCodeCandidate = `${codeStr}_1`;
    }
  } else {
    nextCodeCandidate = `${parent.code}001`;
  }

  let code = nextCodeCandidate;
  while (true) {
    const taken = await prisma.account.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!taken) {
      return code;
    }
    const match = code.match(/^(.*?)(\d+)$/);
    if (match) {
      const [, prefix, digits] = match;
      const nextNum = (BigInt(digits) + 1n).toString();
      code = prefix + nextNum.padStart(digits.length, '0');
    } else {
      code = `${code}_1`;
    }
  }
}

export async function seedPosRegisterDemo(
  prisma: PrismaClient,
  options: { adminUserId: string; cashierUserId: string },
) {
  console.log('Seeding POS register demo (warehouses, products, customers, cashier favorites, add-ons)...');

  const [
    inventoryAccount,
    salesAccount,
    operatingExpenses,
    tradeReceivableAccount,
    taxableTreatment,
    vat16,
  ] = await Promise.all([
    prisma.account.findUniqueOrThrow({ where: { code: '1131001' } }),
    prisma.account.findUniqueOrThrow({ where: { code: '4110001' } }),
    prisma.account.findUniqueOrThrow({ where: { code: '5100000' } }),
    prisma.account.findUniqueOrThrow({ where: { code: '1121001' } }),
    prisma.taxTreatment.findFirstOrThrow({ where: { code: 'TAXABLE' } }),
    prisma.tax.findUniqueOrThrow({ where: { taxCode: 'VAT16' } }),
  ]);

  const units = await prisma.inventoryUnitOfMeasure.findMany();
  const getUnit = (code: string) =>
    units.find((unit) => unit.code === code) ??
    units.find((unit) => unit.code === 'PCS')!;

  let cogsAccount = await prisma.account.findUnique({ where: { code: '5130001' } });
  if (!cogsAccount) {
    cogsAccount = await prisma.account.create({
      data: {
        code: '5130001',
        name: 'Cost of Goods Sold',
        nameAr: 'تكلفة البضاعة المباعة',
        type: 'EXPENSE',
        subtype: 'Expense',
        isPosting: true,
        isActive: true,
        parentAccountId: operatingExpenses.id,
        createdById: options.adminUserId,
      },
    });
  }

  const mainWarehouse = await prisma.inventoryWarehouse.upsert({
    where: { code: 'WH-MAIN' },
    update: {
      name: 'Main Store — Amman / المخزن الرئيسي',
      address: 'Amman HQ',
      isActive: true,
      isTransit: false,
    },
    create: {
      code: 'WH-MAIN',
      name: 'Main Store — Amman / المخزن الرئيسي',
      address: 'Amman HQ',
      responsiblePerson: 'Store Manager',
      isActive: true,
      isTransit: false,
    },
  });

  const branchWarehouse = await prisma.inventoryWarehouse.upsert({
    where: { code: 'WH-IRB' },
    update: {
      name: 'Irbid Branch Store / فرع إربد',
      address: 'Irbid Branch',
      isActive: true,
      isTransit: false,
    },
    create: {
      code: 'WH-IRB',
      name: 'Irbid Branch Store / فرع إربد',
      address: 'Irbid Branch',
      responsiblePerson: 'Branch Manager',
      isActive: true,
      isTransit: false,
    },
  });

  const itemGroupIds = new Map<string, string>();
  for (const group of POS_ITEM_GROUPS) {
    const row = await prisma.inventoryItemGroup.upsert({
      where: { code: group.code },
      update: {
        name: group.name,
        isActive: true,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesAccount.id,
      },
      create: {
        code: group.code,
        name: group.name,
        isActive: true,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesAccount.id,
      },
      select: { id: true, code: true },
    });
    itemGroupIds.set(row.code, row.id);
  }

  const itemCategoryIds = new Map<string, string>();
  for (const category of POS_ITEM_CATEGORIES) {
    const itemGroupId = itemGroupIds.get(category.itemGroupCode);
    if (!itemGroupId) {
      throw new Error(`Missing POS item group ${category.itemGroupCode} while seeding categories.`);
    }
    const row = await prisma.inventoryItemCategory.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        itemGroupId,
        isActive: true,
      },
      create: {
        code: category.code,
        name: category.name,
        itemGroupId,
        isActive: true,
      },
      select: { id: true, code: true },
    });
    itemCategoryIds.set(row.code, row.id);
  }

  const favoriteItemIds: string[] = [];

  for (const product of POS_PRODUCTS) {
    const trackInventory =
      product.trackInventory ?? product.type !== InventoryItemType.SERVICE;
    const itemType = product.type ?? InventoryItemType.FINISHED_GOOD;
    const unit = getUnit(
      product.unitOfMeasure || (itemType === InventoryItemType.SERVICE ? 'SERVICE' : 'PCS'),
    );
    const purchasePrice = product.purchasePrice;
    const totalStock = product.stockMain + (product.stockBranch ?? 0);
    const totalValue = totalStock * purchasePrice;
    const sellByWeight = product.sellByWeight ?? unit.code === 'KG';
    const minSalesQty = product.minSalesQuantity ?? (sellByWeight ? 0.001 : 1);

    const item = await prisma.inventoryItem.upsert({
      where: { code: product.code },
      update: {
        name: product.name,
        description: product.description || product.category,
        barcode: product.barcode ?? null,
        category: product.category,
        unitOfMeasure: unit.code,
        unitOfMeasureId: unit.id,
        itemGroupId: itemGroupIds.get(product.groupCode) ?? null,
        itemCategoryId: itemCategoryIds.get(product.categoryCode) ?? null,
        type: itemType,
        inventoryAccountId: trackInventory ? inventoryAccount.id : null,
        cogsAccountId: trackInventory ? cogsAccount.id : null,
        salesAccountId: salesAccount.id,
        itemImageUrl: product.itemImageUrl ?? null,
        defaultSalesPrice: new Prisma.Decimal(product.salesPrice),
        defaultPurchasePrice: new Prisma.Decimal(purchasePrice),
        currencyCode: 'JOD',
        taxable: true,
        defaultTaxId: vat16.id,
        trackInventory,
        reorderLevel: new Prisma.Decimal(product.reorderLevel ?? 5),
        reorderQuantity: new Prisma.Decimal(10),
        preferredWarehouseId: mainWarehouse.id,
        preferredWarehouseCode: mainWarehouse.code,
        isActive: true,
        onHandQuantity: trackInventory ? new Prisma.Decimal(totalStock) : new Prisma.Decimal(0),
        valuationAmount: trackInventory ? new Prisma.Decimal(totalValue) : new Prisma.Decimal(0),
        allowFractionalQuantity: sellByWeight,
        minSalesQuantity: new Prisma.Decimal(minSalesQty),
      },
      create: {
        id: product.id,
        code: product.code,
        name: product.name,
        description: product.description || product.category,
        barcode: product.barcode ?? null,
        category: product.category,
        unitOfMeasure: unit.code,
        unitOfMeasureId: unit.id,
        itemGroupId: itemGroupIds.get(product.groupCode) ?? null,
        itemCategoryId: itemCategoryIds.get(product.categoryCode) ?? null,
        type: itemType,
        inventoryAccountId: trackInventory ? inventoryAccount.id : null,
        cogsAccountId: trackInventory ? cogsAccount.id : null,
        salesAccountId: salesAccount.id,
        itemImageUrl: product.itemImageUrl ?? null,
        defaultSalesPrice: new Prisma.Decimal(product.salesPrice),
        defaultPurchasePrice: new Prisma.Decimal(purchasePrice),
        currencyCode: 'JOD',
        taxable: true,
        defaultTaxId: vat16.id,
        trackInventory,
        reorderLevel: new Prisma.Decimal(product.reorderLevel ?? 5),
        reorderQuantity: new Prisma.Decimal(10),
        preferredWarehouseId: mainWarehouse.id,
        preferredWarehouseCode: mainWarehouse.code,
        isActive: true,
        onHandQuantity: trackInventory ? new Prisma.Decimal(totalStock) : new Prisma.Decimal(0),
        valuationAmount: trackInventory ? new Prisma.Decimal(totalValue) : new Prisma.Decimal(0),
        allowFractionalQuantity: sellByWeight,
        minSalesQuantity: new Prisma.Decimal(minSalesQty),
      },
    });

    if (product.favorite) {
      favoriteItemIds.push(item.id);
    }

    if (!trackInventory) {
      continue;
    }

    const upsertBalance = async (warehouseId: string, quantity: number) => {
      if (quantity <= 0) {
        return;
      }
      const value = quantity * purchasePrice;
      await prisma.inventoryWarehouseBalance.upsert({
        where: {
          itemId_warehouseId: {
            itemId: item.id,
            warehouseId,
          },
        },
        update: {
          onHandQuantity: new Prisma.Decimal(quantity),
          valuationAmount: new Prisma.Decimal(value),
        },
        create: {
          itemId: item.id,
          warehouseId,
          onHandQuantity: new Prisma.Decimal(quantity),
          valuationAmount: new Prisma.Decimal(value),
        },
      });
    };

    await upsertBalance(mainWarehouse.id, product.stockMain);
    if (product.stockBranch && product.stockBranch > 0) {
      await upsertBalance(branchWarehouse.id, product.stockBranch);
    }
  }

  const walkInCustomer = await prisma.customer.upsert({
    where: { code: 'POS-WALKIN' },
    update: {
      name: 'POS Walk-in Customer / زبون عابر',
      isActive: true,
      taxTreatmentId: taxableTreatment.id,
    },
    create: {
      code: 'POS-WALKIN',
      name: 'POS Walk-in Customer / زبون عابر',
      taxTreatmentId: taxableTreatment.id,
      creditLimit: 0,
      receivableAccountId: tradeReceivableAccount.id,
      isActive: true,
    },
  });

  await prisma.customer.upsert({
    where: { code: 'CUS-DEMO-01' },
    update: {
      name: 'Ahmed Ali / أحمد علي',
      isActive: true,
      taxTreatmentId: taxableTreatment.id,
      creditLimit: new Prisma.Decimal(500),
    },
    create: {
      code: 'CUS-DEMO-01',
      name: 'Ahmed Ali / أحمد علي',
      contactInfo: '+962 79 000 0001',
      taxTreatmentId: taxableTreatment.id,
      creditLimit: new Prisma.Decimal(500),
      receivableAccountId: tradeReceivableAccount.id,
      isActive: true,
    },
  });

  await prisma.customer.upsert({
    where: { code: 'CUS-DEMO-02' },
    update: {
      name: 'Sara Market / سارة ماركت',
      isActive: true,
      taxTreatmentId: taxableTreatment.id,
      creditLimit: new Prisma.Decimal(2000),
    },
    create: {
      code: 'CUS-DEMO-02',
      name: 'Sara Market / سارة ماركت',
      contactInfo: 'Wholesale customer demo',
      taxTreatmentId: taxableTreatment.id,
      creditLimit: new Prisma.Decimal(2000),
      receivableAccountId: tradeReceivableAccount.id,
      isActive: true,
    },
  });

  const createAccountIfMissing = async (
    code: string,
    name: string,
    nameAr: string,
    type: string,
    subtype: string,
    parentId: string,
    useDynamicCode: boolean = false,
  ) => {
    let acc;
    if (useDynamicCode) {
      acc = await prisma.account.findFirst({
        where: {
          parentAccountId: parentId,
          nameAr,
        },
      });
      if (!acc) {
        const newCode = await allocateNextAccountCode(prisma, parentId);
        acc = await prisma.account.create({
          data: {
            code: newCode,
            name,
            nameAr,
            type: type as any,
            subtype,
            isPosting: true,
            isActive: true,
            parentAccountId: parentId,
            createdById: options.adminUserId,
            allowManualPosting: true,
          },
        });
      }
    } else {
      acc = await prisma.account.findUnique({ where: { code } });
      if (!acc) {
        acc = await prisma.account.create({
          data: {
            code,
            name,
            nameAr,
            type: type as any,
            subtype,
            isPosting: true,
            isActive: true,
            parentAccountId: parentId,
            createdById: options.adminUserId,
          },
        });
      }
    }
    return acc;
  };

  const tradeReceivablesParent = await prisma.account.findUniqueOrThrow({
    where: { code: '1121000' },
  });

  const talabatAcc = await createAccountIfMissing(
    '1121002',
    'Talabat Receivable',
    'ذمم طلبات',
    'ASSET',
    'Receivable',
    tradeReceivablesParent.id,
    true,
  );
  const careemAcc = await createAccountIfMissing(
    '1121003',
    'Careem Receivable',
    'ذمم كريم',
    'ASSET',
    'Receivable',
    tradeReceivablesParent.id,
    true,
  );
  const jahezAcc = await createAccountIfMissing(
    '1121004',
    'Ashyaai Receivable',
    'ذمم أشيائي',
    'ASSET',
    'Receivable',
    tradeReceivablesParent.id,
    true,
  );
  const commissionAcc = await createAccountIfMissing(
    '5100013',
    'Delivery Commission Expense',
    'مصروف عمولات التوصيل',
    'EXPENSE',
    'Expense',
    operatingExpenses.id,
  );
  const serviceFeeAcc = await createAccountIfMissing(
    '5100014',
    'Delivery Service Fees Expense',
    'مصروف رسوم خدمات التوصيل',
    'EXPENSE',
    'Expense',
    operatingExpenses.id,
  );

  const deliveryCompanies = [
    {
      id: 'dc_talabat',
      name: 'Talabat',
      arabicName: 'طلبات',
      receivableAccountId: talabatAcc.id,
      commissionRate: 15.0,
      commissionAccountId: commissionAcc.id,
      serviceFeeAccountId: serviceFeeAcc.id,
    },
    {
      id: 'dc_careem',
      name: 'Careem',
      arabicName: 'كريم',
      receivableAccountId: careemAcc.id,
      commissionRate: 12.0,
      commissionAccountId: commissionAcc.id,
      serviceFeeAccountId: serviceFeeAcc.id,
    },
    {
      id: 'dc_ashyaai',
      name: 'Ashyaai',
      arabicName: 'أشيائي',
      receivableAccountId: jahezAcc.id,
      commissionRate: 18.0,
      commissionAccountId: commissionAcc.id,
      serviceFeeAccountId: serviceFeeAcc.id,
    },
  ];

  for (const dc of deliveryCompanies) {
    await prisma.deliveryCompany.upsert({
      where: { name: dc.name },
      update: {
        arabicName: dc.arabicName,
        receivableAccountId: dc.receivableAccountId,
        commissionRate: new Prisma.Decimal(dc.commissionRate),
        commissionAccountId: dc.commissionAccountId,
        serviceFeeAccountId: dc.serviceFeeAccountId,
        isActive: true,
      },
      create: {
        id: dc.id,
        name: dc.name,
        arabicName: dc.arabicName,
        receivableAccountId: dc.receivableAccountId,
        commissionRate: new Prisma.Decimal(dc.commissionRate),
        commissionAccountId: dc.commissionAccountId,
        serviceFeeAccountId: dc.serviceFeeAccountId,
        isActive: true,
      },
    });
  }

  const restaurantTables = [
    { tableNumber: 'T1', capacity: 2 },
    { tableNumber: 'T2', capacity: 4 },
    { tableNumber: 'T3', capacity: 4 },
    { tableNumber: 'T4', capacity: 6 },
    { tableNumber: 'T5', capacity: 8 },
    { tableNumber: 'T6', capacity: 2 },
    { tableNumber: 'T7', capacity: 4 },
    { tableNumber: 'T8', capacity: 4 },
    { tableNumber: 'T9', capacity: 6 },
    { tableNumber: 'T10', capacity: 6 },
    { tableNumber: 'T11', capacity: 8 },
    { tableNumber: 'T12', capacity: 10 },
  ];

  for (const tbl of restaurantTables) {
    await prisma.posTable.upsert({
      where: { tableNumber: tbl.tableNumber },
      update: {
        capacity: tbl.capacity,
        status: 'AVAILABLE',
      },
      create: {
        tableNumber: tbl.tableNumber,
        capacity: tbl.capacity,
        status: 'AVAILABLE',
      },
    });
  }

  const deliveryDrivers = [
    { id: 'drv_samer', name: 'Samer Jaber / سامر جابر', phone: '+962790000010' },
    { id: 'drv_tareq', name: 'Tareq Omar / طارق عمر', phone: '+962790000011' },
  ];

  for (const drv of deliveryDrivers) {
    await prisma.deliveryDriver.upsert({
      where: { id: drv.id },
      update: {
        name: drv.name,
        phone: drv.phone,
        isActive: true,
      },
      create: {
        id: drv.id,
        name: drv.name,
        phone: drv.phone,
        isActive: true,
      },
    });
  }

  for (const itemId of favoriteItemIds) {
    try {
      await prisma.posUserFavoriteItem.upsert({
        where: {
          userId_itemId: {
            userId: options.cashierUserId,
            itemId,
          },
        },
        update: {},
        create: {
          userId: options.cashierUserId,
          itemId,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('PosUserFavoriteItem')) {
        console.warn(
          'Skipping cashier favorites (PosUserFavoriteItem table missing — apply latest POS migration).',
        );
        break;
      }
      throw error;
    }
  }

  await seedPosAddons(prisma);

  console.log(
    `POS register demo ready: ${POS_PRODUCTS.length} products, ${POS_ITEM_GROUPS.length} groups, warehouses ${mainWarehouse.code}/${branchWarehouse.code}, customers including ${walkInCustomer.code}.`,
  );
  console.log('Cashier login: cashier / cashier123 — open shift, pick WH-MAIN.');
}
