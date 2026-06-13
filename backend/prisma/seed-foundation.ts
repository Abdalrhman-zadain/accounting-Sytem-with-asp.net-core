import { PosAccessRoleCode, PosPermissionCode, PrismaClient, type FiscalPeriod, type FiscalYear, type User } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export type FoundationContext = {
  admin: User;
  cashier: User;
  fiscalYear: FiscalYear;
  period1: FiscalPeriod;
  period4: FiscalPeriod;
  periodByYearMonth: Map<string, string>;
  accounts: {
    mainCash: { id: string };
    arabBank: { id: string };
    islamicBank: { id: string };
    customers: { id: string };
    customerReceivables: { id: string };
    suppliers: { id: string };
    salesRevenue: { id: string };
    salesTaxPayable: { id: string };
    rentExpense: { id: string };
    salariesExpense: { id: string };
    salariesPayable: { id: string };
    ownerCapital: { id: string };
    merchandiseInventory: { id: string };
    payables: { id: string };
  };
  registers: {
    cash: { id: string };
    arabBank: { id: string };
    islamicBank: { id: string };
  };
  taxTreatmentTaxableId: string;
  segmentOptions: {
    departments: string[];
    branches: string[];
    projects: string[];
  };
};

const cashierPermissionCodes: PosPermissionCode[] = [
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
  'POS_CHANGE_UNIT_PRICE',
];

export async function runFoundationSeed(prisma: PrismaClient): Promise<FoundationContext> {
  console.log('Seeding foundation dataset (COA, masters, users)...');

  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@genius.com',
      password: hashedPassword,
      name: 'Genius Admin',
      role: 'ADMIN',
    },
  });

  console.log('Admin user created: admin / admin123');

  const cashierRole = await prisma.posAccessRole.upsert({
    where: { code: PosAccessRoleCode.CASHIER },
    update: {
      name: 'Cashier',
      description: 'Operational POS sales access limited to cashier workflows.',
      isActive: true,
    },
    create: {
      code: PosAccessRoleCode.CASHIER,
      name: 'Cashier',
      description: 'Operational POS sales access limited to cashier workflows.',
      isActive: true,
    },
  });

  for (const code of cashierPermissionCodes) {
    const permission = await prisma.posPermission.upsert({
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

    await prisma.posAccessRolePermission.upsert({
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

  const cashierPassword = await bcrypt.hash('cashier123', 10);
  const cashier = await prisma.user.create({
    data: {
      username: 'cashier',
      email: 'cashier@genius.com',
      password: cashierPassword,
      name: 'POS Cashier',
      role: 'USER',
      posAccessRoles: {
        create: [{ roleId: cashierRole.id }],
      },
    },
  });

  console.log(`Cashier user created: ${cashier.username} / cashier123`);

  const segmentDefinitions = [
    { index: 1, name: 'Company', description: 'Enterprise Legal Entity' },
    { index: 2, name: 'Natural Account', description: 'Core GL Account Code' },
    { index: 3, name: 'Department', description: 'Functional Cost Center' },
    { index: 4, name: 'Branch', description: 'Geographical Location' },
    { index: 5, name: 'Project', description: 'Specific Project or Client Code' },
  ];

  for (const definition of segmentDefinitions) {
    await prisma.segmentDefinition.create({ data: definition });
  }

  const definitions = await prisma.segmentDefinition.findMany();
  const getDefinitionId = (index: number) => definitions.find((item) => item.index === index)?.id ?? '';

  await prisma.segmentValue.create({
    data: {
      definitionId: getDefinitionId(1),
      code: '01',
      name: 'Genius Demo Company',
    },
  });

  const departments = [
    { code: '00', name: 'Corporate' },
    { code: '10', name: 'Operations' },
    { code: '20', name: 'Sales' },
    { code: '30', name: 'Finance' },
  ];
  for (const department of departments) {
    await prisma.segmentValue.create({
      data: { definitionId: getDefinitionId(3), ...department },
    });
  }

  const branches = [
    { code: 'AMM', name: 'Amman Headquarters' },
    { code: 'IRB', name: 'Irbid Branch' },
  ];
  for (const branch of branches) {
    await prisma.segmentValue.create({
      data: { definitionId: getDefinitionId(4), ...branch },
    });
  }

  const projects = [
    { code: '000', name: 'General Operations' },
    { code: 'ERP', name: 'ERP Rollout' },
  ];
  for (const project of projects) {
    await prisma.segmentValue.create({
      data: { definitionId: getDefinitionId(5), ...project },
    });
  }

  const naturalAccounts = [
    { code: '1110', name: 'Cash' },
    { code: '1120', name: 'Bank' },
    { code: '1210', name: 'Accounts Receivable' },
    { code: '2110', name: 'Accounts Payable' },
    { code: '3110', name: 'Capital' },
    { code: '4110', name: 'Sales Revenue' },
    { code: '5110', name: 'Rent Expense' },
    { code: '5120', name: 'Salaries Expense' },
  ];
  for (const naturalAccount of naturalAccounts) {
    await prisma.segmentValue.create({
      data: { definitionId: getDefinitionId(2), ...naturalAccount },
    });
  }

  await prisma.accountSubtype.createMany({
    data: [
      { name: 'Bank' },
      { name: 'Cash' },
      { name: 'Receivable' },
      { name: 'Payable' },
      { name: 'Equity' },
      { name: 'Revenue' },
      { name: 'Expense' },
    ],
  });

  await prisma.paymentMethodType.createMany({
    data: [{ name: 'Bank' }, { name: 'Cash' }],
  });

  await prisma.journalEntryType.createMany({
    data: [{ name: 'General' }, { name: 'Receipt' }, { name: 'Payment' }, { name: 'Transfer' }],
  });

  const fiscalYear = await prisma.fiscalYear.create({
    data: {
      year: 2026,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      status: 'OPEN',
    },
  });

  for (let month = 1; month <= 12; month += 1) {
    await prisma.fiscalPeriod.create({
      data: {
        fiscalYearId: fiscalYear.id,
        periodNumber: month,
        name: `Period ${month.toString().padStart(2, '0')} - 2026`,
        startDate: new Date(2026, month - 1, 1),
        endDate: new Date(2026, month, 0),
        status: 'OPEN',
      },
    });
  }

  const period1 = await prisma.fiscalPeriod.findFirstOrThrow({ where: { fiscalYearId: fiscalYear.id, periodNumber: 1 } });
  const period4 = await prisma.fiscalPeriod.findFirstOrThrow({ where: { fiscalYearId: fiscalYear.id, periodNumber: 4 } });

  const createAccount = (data: {
    code: string;
    name: string;
    nameAr?: string;
    type: AccountType;
    isPosting: boolean;
    subtype?: string;
    parentAccountId?: string;
  }) =>
    prisma.account.upsert({
      where: { code: data.code },
      update: {
        ...data,
        createdById: admin.id,
      },
      create: {
        ...data,
        createdById: admin.id,
      },
    });

  const assets = await createAccount({ code: '1000000', name: 'Assets', nameAr: 'الاصول', type: 'ASSET', isPosting: false });
  const liabilities = await createAccount({
    code: '2000000',
    name: 'Liabilities',
    nameAr: 'الخصوم',
    type: 'LIABILITY',
    isPosting: false,
  });
  const equity = await createAccount({
    code: '3000000',
    name: 'Equity',
    nameAr: 'حقوق الملكية',
    type: 'EQUITY',
    isPosting: false,
  });
  const revenue = await createAccount({
    code: '4000000',
    name: 'Revenue',
    nameAr: 'الايرادات',
    type: 'REVENUE',
    isPosting: false,
  });
  const expenses = await createAccount({
    code: '5000000',
    name: 'Expenses',
    nameAr: 'المصروفات',
    type: 'EXPENSE',
    isPosting: false,
  });

  const currentAssets = await createAccount({
    code: '1100000',
    name: 'Current Assets',
    nameAr: 'الأصول المتداولة',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: assets.id,
  });
  const cashAndCashEquivalents = await createAccount({
    code: '1110000',
    name: 'Cash and Cash Equivalents',
    nameAr: 'النقد وما في حكمه',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: currentAssets.id,
  });
  const cashOnHand = await createAccount({
    code: '1111000',
    name: 'Cash on Hand',
    nameAr: 'النقد في الصندوق',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: cashAndCashEquivalents.id,
  });
  const bankAccounts = await createAccount({
    code: '1112000',
    name: 'Bank Accounts',
    nameAr: 'الحسابات البنكية',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: cashAndCashEquivalents.id,
  });
  const digitalWallets = await createAccount({
    code: '1113000',
    name: 'Digital Wallets',
    nameAr: 'المحافظ الإلكترونية',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: cashAndCashEquivalents.id,
  });
  const paymentGateways = await createAccount({
    code: '1114000',
    name: 'Payment Gateways',
    nameAr: 'بوابات الدفع',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: cashAndCashEquivalents.id,
  });
  const receivables = await createAccount({
    code: '1120000',
    name: 'Accounts Receivable',
    nameAr: 'الذمم المدينة',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: currentAssets.id,
  });
  const inventory = await createAccount({
    code: '1130000',
    name: 'Inventory',
    nameAr: 'المخزون',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: currentAssets.id,
  });
  const taxRecoverables = await createAccount({
    code: '1140000',
    name: 'Tax Recoverables',
    nameAr: 'ضرائب قابلة للاسترداد',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: currentAssets.id,
  });
  const nonCurrentAssets = await createAccount({
    code: '1200000',
    name: 'Non-current Assets',
    nameAr: 'الأصول غير المتداولة',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: assets.id,
  });
  const fixedAssets = await createAccount({
    code: '1210000',
    name: 'Fixed Assets',
    nameAr: 'الأصول الثابتة',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: nonCurrentAssets.id,
  });
  const currentLiabilities = await createAccount({
    code: '2100000',
    name: 'Current Liabilities',
    nameAr: 'مطلوبات متداولة',
    type: 'LIABILITY',
    isPosting: false,
    parentAccountId: liabilities.id,
  });
  const payables = await createAccount({
    code: '2110000',
    name: 'Accounts Payable',
    nameAr: 'الذمم الدائنة',
    type: 'LIABILITY',
    isPosting: false,
    parentAccountId: currentLiabilities.id,
  });
  const otherPayables = await createAccount({
    code: '2120000',
    name: 'Other Payables',
    nameAr: 'ذمم دائنة أخرى',
    type: 'LIABILITY',
    isPosting: false,
    parentAccountId: currentLiabilities.id,
  });
  const employeePayables = await createAccount({
    code: '2130000',
    name: 'Employee Payables',
    nameAr: 'ذمم الموظفين',
    type: 'LIABILITY',
    isPosting: false,
    parentAccountId: currentLiabilities.id,
  });
  const nonCurrentLiabilities = await createAccount({
    code: '2200000',
    name: 'Non-current Liabilities',
    nameAr: 'مطلوبات غير متداولة',
    type: 'LIABILITY',
    isPosting: false,
    parentAccountId: liabilities.id,
  });
  await createAccount({
    code: '2210000',
    name: 'Long-term Loans',
    nameAr: 'قروض طويلة الأجل',
    type: 'LIABILITY',
    isPosting: false,
    parentAccountId: nonCurrentLiabilities.id,
  });
  await createAccount({
    code: '2220000',
    name: 'Other Long-term Liabilities',
    nameAr: 'التزامات طويلة الأجل أخرى',
    type: 'LIABILITY',
    isPosting: false,
    parentAccountId: nonCurrentLiabilities.id,
  });
  const sales = await createAccount({
    code: '4100000',
    name: 'Sales',
    nameAr: 'المبيعات',
    type: 'REVENUE',
    isPosting: false,
    parentAccountId: revenue.id,
  });
  const operatingExpenses = await createAccount({
    code: '5100000',
    name: 'Operating Expenses',
    nameAr: 'المصروفات التشغيلية',
    type: 'EXPENSE',
    isPosting: false,
    parentAccountId: expenses.id,
  });
  const salesRevenue = await createAccount({
    code: '4110001',
    name: 'Sales Revenue',
    nameAr: 'ايرادات المبيعات',
    type: 'REVENUE',
    isPosting: true,
    subtype: 'Revenue',
    parentAccountId: sales.id,
  });
  const rentExpense = await createAccount({
    code: '5110001',
    name: 'Rent Expense',
    nameAr: 'مصروف الايجار',
    type: 'EXPENSE',
    isPosting: true,
    subtype: 'Expense',
    parentAccountId: operatingExpenses.id,
  });
  const salariesExpense = await createAccount({
    code: '5120001',
    name: 'Salaries Expense',
    nameAr: 'مصروف الرواتب',
    type: 'EXPENSE',
    isPosting: true,
    subtype: 'Expense',
    parentAccountId: operatingExpenses.id,
  });
  const cogsAccount = await createAccount({
    code: '5130001',
    name: 'Cost of Goods Sold',
    nameAr: 'تكلفة البضاعة المباعة',
    type: 'EXPENSE',
    isPosting: true,
    subtype: 'Expense',
    parentAccountId: operatingExpenses.id,
  });

  const mainCash = await createAccount({
    code: '1111001',
    name: 'Main Cash',
    nameAr: 'الصندوق الرئيسي',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Cash',
    parentAccountId: cashOnHand.id,
  });
  await createAccount({
    code: '1111002',
    name: 'Petty Cash',
    nameAr: 'صندوق المصاريف النثرية',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Cash',
    parentAccountId: cashOnHand.id,
  });
  await createAccount({
    code: '1111003',
    name: 'Branch Cash - Amman',
    nameAr: 'صندوق فرع عمّان',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Cash',
    parentAccountId: cashOnHand.id,
  });
  await createAccount({
    code: '1111004',
    name: 'Branch Cash - Irbid',
    nameAr: 'صندوق فرع إربد',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Cash',
    parentAccountId: cashOnHand.id,
  });
  await createAccount({
    code: '1111005',
    name: 'Cash Drawer',
    nameAr: 'درج الكاش',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Cash',
    parentAccountId: cashOnHand.id,
  });
  await createAccount({
    code: '1111006',
    name: 'Cash in Transit',
    nameAr: 'نقدية بالطريق',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Cash',
    parentAccountId: cashOnHand.id,
  });
  const arabBank = await createAccount({
    code: '1112001',
    name: 'Arab Bank - JOD',
    nameAr: 'البنك العربي',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Bank',
    parentAccountId: bankAccounts.id,
  });
  const islamicBank = await createAccount({
    code: '1112002',
    name: 'Islamic Bank - JOD',
    nameAr: 'البنك الاسلامي',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Bank',
    parentAccountId: bankAccounts.id,
  });
  await createAccount({
    code: '1112003',
    name: 'Bank of Jordan - JOD',
    nameAr: 'بنك الأردن - دينار',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Bank',
    parentAccountId: bankAccounts.id,
  });
  await createAccount({
    code: '1112004',
    name: 'Cairo Amman Bank - JOD',
    nameAr: 'بنك القاهرة عمان - دينار',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Bank',
    parentAccountId: bankAccounts.id,
  });
  await createAccount({
    code: '1112005',
    name: 'Bank Account - USD',
    nameAr: 'حساب بنكي - دولار',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Bank',
    parentAccountId: bankAccounts.id,
  });
  await createAccount({
    code: '1112006',
    name: 'Bank Account - EUR',
    nameAr: 'حساب بنكي - يورو',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Bank',
    parentAccountId: bankAccounts.id,
  });
  await createAccount({
    code: '1112007',
    name: 'Bank Account - SAR',
    nameAr: 'حساب بنكي - ريال سعودي',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Bank',
    parentAccountId: bankAccounts.id,
  });
  await createAccount({
    code: '1112008',
    name: 'Bank Account - AED',
    nameAr: 'حساب بنكي - درهم إماراتي',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Bank',
    parentAccountId: bankAccounts.id,
  });
  await createAccount({
    code: '1113001',
    name: 'CliQ Wallet',
    nameAr: 'محفظة كليك',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: digitalWallets.id,
  });
  await createAccount({
    code: '1113002',
    name: 'Zain Cash',
    nameAr: 'زين كاش',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: digitalWallets.id,
  });
  await createAccount({
    code: '1113003',
    name: 'Orange Money',
    nameAr: 'أورنج موني',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: digitalWallets.id,
  });
  await createAccount({
    code: '1113004',
    name: 'Digital Wallet - Other',
    nameAr: 'محفظة إلكترونية أخرى',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: digitalWallets.id,
  });
  await createAccount({
    code: '1114001',
    name: 'Stripe',
    nameAr: 'سترايب',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: paymentGateways.id,
  });
  await createAccount({
    code: '1114002',
    name: 'PayPal',
    nameAr: 'باي بال',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: paymentGateways.id,
  });
  await createAccount({
    code: '1114003',
    name: 'HyperPay',
    nameAr: 'هايبر باي',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: paymentGateways.id,
  });
  await createAccount({
    code: '1114004',
    name: 'Tap Payments',
    nameAr: 'تاب',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: paymentGateways.id,
  });
  await createAccount({
    code: '1114005',
    name: 'Payment Gateway - Other',
    nameAr: 'بوابة دفع أخرى',
    type: 'ASSET',
    isPosting: true,
    parentAccountId: paymentGateways.id,
  });
  await createAccount({
    code: '1131001',
    name: 'Merchandise Inventory',
    nameAr: 'مخزون بضاعة مشتراة لإعادة البيع',
    type: 'ASSET',
    subtype: 'Inventory',
    isPosting: true,
    parentAccountId: inventory.id,
  });
  await createAccount({
    code: '1131002',
    name: 'Raw Materials Inventory',
    nameAr: 'مخزون مواد خام',
    type: 'ASSET',
    subtype: 'Inventory',
    isPosting: true,
    parentAccountId: inventory.id,
  });
  await createAccount({
    code: '1131003',
    name: 'Operating Supplies Inventory',
    nameAr: 'مخزون مواد تشغيلية',
    type: 'ASSET',
    subtype: 'Inventory',
    isPosting: true,
    parentAccountId: inventory.id,
  });
  await createAccount({
    code: '1131004',
    name: 'Spare Parts Inventory',
    nameAr: 'مخزون قطع غيار',
    type: 'ASSET',
    subtype: 'Inventory',
    isPosting: true,
    parentAccountId: inventory.id,
  });
  const customerReceivables = await createAccount({
    code: '1121000',
    name: 'Customer Receivables',
    nameAr: 'ذمم عملاء',
    type: 'ASSET',
    isPosting: false,
    parentAccountId: receivables.id,
  });
  const customers = await createAccount({
    code: '1121001',
    name: 'Trade Customers',
    nameAr: 'العملاء',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Receivable',
    parentAccountId: customerReceivables.id,
  });
  const suppliers = await createAccount({
    code: '2110001',
    name: 'Suppliers',
    nameAr: 'الموردون',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: payables.id,
  });
  const salesTaxByRate = await createAccount({
    code: '2121000',
    name: 'Sales Tax Payables',
    nameAr: 'أمانات ضريبة المبيعات',
    type: 'LIABILITY',
    isPosting: false,
    parentAccountId: otherPayables.id,
  });
  await createAccount({
    code: '2122000',
    name: 'Other General Payables',
    nameAr: 'ذمم دائنة أخرى عامة',
    type: 'LIABILITY',
    isPosting: false,
    parentAccountId: otherPayables.id,
  });

  const salesTaxPayable = await createAccount({
    code: '2121001',
    name: 'Sales Tax Payable 16%',
    nameAr: 'أمانات ضريبة المبيعات 16%',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: salesTaxByRate.id,
  });
  const inputVatRecoverable = await createAccount({
    code: '1141001',
    name: 'Input VAT Recoverable',
    nameAr: 'ضريبة مدخلات قابلة للاسترداد',
    type: 'ASSET',
    isPosting: true,
    subtype: 'Receivable',
    parentAccountId: taxRecoverables.id,
  });

  await createAccount({
    code: '2121002',
    name: 'Sales Tax Payable 10%',
    nameAr: 'أمانات ضريبة المبيعات 10%',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: salesTaxByRate.id,
  });

  await createAccount({
    code: '2121003',
    name: 'Sales Tax Payable 8%',
    nameAr: 'أمانات ضريبة المبيعات 8%',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: salesTaxByRate.id,
  });

  await createAccount({
    code: '2121004',
    name: 'Sales Tax Payable 5%',
    nameAr: 'أمانات ضريبة المبيعات 5%',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: salesTaxByRate.id,
  });

  await createAccount({
    code: '2121005',
    name: 'Sales Tax Payable 4%',
    nameAr: 'أمانات ضريبة المبيعات 4%',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: salesTaxByRate.id,
  });

  await createAccount({
    code: '2121006',
    name: 'Sales Tax Payable 2%',
    nameAr: 'أمانات ضريبة المبيعات 2%',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: salesTaxByRate.id,
  });

  await createAccount({
    code: '2121007',
    name: 'Sales Tax Payable 1%',
    nameAr: 'أمانات ضريبة المبيعات 1%',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: salesTaxByRate.id,
  });
  await createAccount({
    code: '2130001',
    name: 'Salaries Payable',
    nameAr: 'رواتب مستحقة الدفع',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: employeePayables.id,
  });
  await createAccount({
    code: '2130002',
    name: 'Commissions Payable',
    nameAr: 'عمولات مستحقة الدفع',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: employeePayables.id,
  });
  await createAccount({
    code: '2130003',
    name: 'Other Employee Payables',
    nameAr: 'مستحقات موظفين أخرى',
    type: 'LIABILITY',
    isPosting: true,
    subtype: 'Payable',
    parentAccountId: employeePayables.id,
  });

  await prisma.tax.createMany({
    data: [
      {
        taxCode: 'VAT16',
        taxName: 'ضريبة مبيعات 16%',
        rate: 16,
        taxType: 'SALES',
        taxAccountId: salesTaxPayable.id,
        isActive: true,
      },
      {
        taxCode: 'VAT0',
        taxName: 'ضريبة صفرية',
        rate: 0,
        taxType: 'ZERO_RATED',
        taxAccountId: null,
        isActive: true,
      },
      {
        taxCode: 'EXEMPT',
        taxName: 'معفى من الضريبة',
        rate: 0,
        taxType: 'EXEMPT',
        taxAccountId: null,
        isActive: true,
      },
    ],
  });

  const [vat16, vat0, exemptTax] = await Promise.all([
    prisma.tax.findUniqueOrThrow({ where: { taxCode: 'VAT16' } }),
    prisma.tax.findUniqueOrThrow({ where: { taxCode: 'VAT0' } }),
    prisma.tax.findUniqueOrThrow({ where: { taxCode: 'EXEMPT' } }),
  ]);

  const creditNoteTypeSeeds = [
    {
      code: 'CN-DISCOUNT',
      name: 'خصم ما بعد البيع',
      effect: 'FINANCIAL_ONLY' as const,
      linkedInvoiceRequirement: 'REQUIRED' as const,
      affectsInventory: false,
      allowsTaxAdjustment: true,
      defaultAccountId: salesRevenue.id,
      helperText:
        'خصم مالي بعد البيع مرتبط بفاتورة المبيعات مع إمكانية تعديل الضريبة عند الحاجة.',
    },
    {
      code: 'CN-SALES-RETURN',
      name: 'مرتجع مبيعات',
      effect: 'FINANCIAL_INVENTORY' as const,
      linkedInvoiceRequirement: 'REQUIRED' as const,
      affectsInventory: true,
      allowsTaxAdjustment: true,
      defaultAccountId: salesRevenue.id,
      helperText:
        'يرتبط بسطر فاتورة أصلي ويمكنه إعادة الصنف إلى المخزون وعكس الضريبة.',
    },
    {
      code: 'CN-PRICE-DIFF',
      name: 'تصحيح فرق سعر',
      effect: 'FINANCIAL_ONLY' as const,
      linkedInvoiceRequirement: 'REQUIRED' as const,
      affectsInventory: false,
      allowsTaxAdjustment: true,
      defaultAccountId: salesRevenue.id,
      helperText:
        'يستخدم لتخفيض سعر البيع بعد الإصدار دون حركة مخزنية.',
    },
    {
      code: 'CN-TAX-CORRECTION',
      name: 'تصحيح ضريبة مبيعات',
      effect: 'TAX_ONLY' as const,
      linkedInvoiceRequirement: 'REQUIRED' as const,
      affectsInventory: false,
      allowsTaxAdjustment: true,
      defaultAccountId: salesTaxPayable.id,
      helperText:
        'يستخدم لتصحيح الضريبة فقط دون تغيير الإيراد أو الكمية.',
    },
    {
      code: 'CN-CUSTOMER-SETTLEMENT',
      name: 'تسوية عميل',
      effect: 'FINANCIAL_ONLY' as const,
      linkedInvoiceRequirement: 'OPTIONAL' as const,
      affectsInventory: false,
      allowsTaxAdjustment: false,
      defaultAccountId: customers.id,
      helperText:
        'تسوية مالية مع العميل ويمكن استخدامها دون ربطها بفاتورة محددة.',
    },
  ];

  for (const type of creditNoteTypeSeeds) {
    await prisma.creditNoteType.upsert({
      where: { code: type.code },
      update: type,
      create: type,
    });
  }

  const supplierDebitNoteTypeSeeds = [
    {
      code: 'DN-PURCHASE-DISCOUNT',
      name: 'خصم مشتريات',
      effect: 'FINANCIAL_ONLY' as const,
      linkedInvoiceRequirement: 'REQUIRED' as const,
      affectsInventory: false,
      allowsTaxAdjustment: true,
      defaultAccountId: suppliers.id,
      helperText:
        'خصم مالي على فاتورة مشتريات مرتبطة مع إمكانية تعديل ضريبة المدخلات.',
    },
    {
      code: 'DN-PURCHASE-RETURN',
      name: 'مرتجع مشتريات',
      effect: 'FINANCIAL_INVENTORY' as const,
      linkedInvoiceRequirement: 'REQUIRED' as const,
      affectsInventory: true,
      allowsTaxAdjustment: true,
      defaultAccountId: suppliers.id,
      helperText:
        'مرتجع شراء من فاتورة أصلية مع تخفيض المخزون وعكس ضريبة المدخلات.',
    },
    {
      code: 'DN-PRICE-CORRECTION',
      name: 'تصحيح فرق سعر مشتريات',
      effect: 'FINANCIAL_ONLY' as const,
      linkedInvoiceRequirement: 'REQUIRED' as const,
      affectsInventory: false,
      allowsTaxAdjustment: true,
      defaultAccountId: suppliers.id,
      helperText:
        'يستخدم لتخفيض تكلفة الشراء بعد التسجيل دون حركة كمية.',
    },
    {
      code: 'DN-TAX-CORRECTION',
      name: 'تصحيح ضريبة مشتريات',
      effect: 'TAX_ONLY' as const,
      linkedInvoiceRequirement: 'REQUIRED' as const,
      affectsInventory: false,
      allowsTaxAdjustment: true,
      defaultAccountId: inputVatRecoverable.id,
      helperText:
        'يستخدم لتصحيح ضريبة المدخلات فقط دون تعديل الكمية أو القيمة الأساسية.',
    },
    {
      code: 'DN-SUPPLIER-SETTLEMENT',
      name: 'تسوية مورد',
      effect: 'FINANCIAL_ONLY' as const,
      linkedInvoiceRequirement: 'OPTIONAL' as const,
      affectsInventory: false,
      allowsTaxAdjustment: false,
      defaultAccountId: suppliers.id,
      helperText:
        'تسوية مالية مع المورد ويمكن استخدامها دون ربطها بفاتورة شراء محددة.',
    },
  ];

  for (const type of supplierDebitNoteTypeSeeds) {
    await prisma.supplierDebitNoteType.upsert({
      where: { code: type.code },
      update: type,
      create: type,
    });
  }

  await prisma.taxTreatment.createMany({
    data: [
      {
        code: 'TAXABLE',
        arabicName: 'خاضع للضريبة',
        englishName: 'Taxable',
        description: 'Default taxable sales treatment.',
        defaultTaxId: vat16.id,
        isActive: true,
      },
      {
        code: 'ZERO_RATED',
        arabicName: 'نسبة صفرية',
        englishName: 'Zero-rated',
        description: 'Zero-rated sales treatment.',
        defaultTaxId: vat0.id,
        isActive: true,
      },
      {
        code: 'EXEMPT',
        arabicName: 'معفى',
        englishName: 'Exempt',
        description: 'Exempt sales treatment.',
        defaultTaxId: exemptTax.id,
        isActive: true,
      },
    ],
  });



  // Inventory Units of Measure
  await prisma.inventoryUnitOfMeasure.createMany({
    data: [
      {
        code: 'PCS',
        name: 'حبة',
        description: 'وحدة قياس للمواد التي تباع أو تشترى بالعدد',
        unitType: 'COUNT',
        decimalPrecision: 0,
        isActive: true,
      },
      {
        code: 'BOX',
        name: 'صندوق',
        description: 'وحدة قياس للصناديق',
        unitType: 'COUNT',
        decimalPrecision: 0,
        isActive: true,
      },
      {
        code: 'CTN',
        name: 'كرتونة',
        description: 'وحدة قياس للكرتون',
        unitType: 'COUNT',
        decimalPrecision: 0,
        isActive: true,
      },
      {
        code: 'KG',
        name: 'كيلو',
        description: 'وحدة قياس للوزن بالكيلوغرام',
        unitType: 'WEIGHT',
        decimalPrecision: 3,
        isActive: true,
      },
      {
        code: 'G',
        name: 'غرام',
        description: 'وحدة قياس للوزن بالغرام',
        unitType: 'WEIGHT',
        decimalPrecision: 3,
        isActive: true,
      },
      {
        code: 'L',
        name: 'لتر',
        description: 'وحدة قياس للحجم باللتر',
        unitType: 'VOLUME',
        decimalPrecision: 3,
        isActive: true,
      },
      {
        code: 'ML',
        name: 'مل',
        description: 'وحدة قياس للحجم بالمليلتر',
        unitType: 'VOLUME',
        decimalPrecision: 3,
        isActive: true,
      },
      {
        code: 'M',
        name: 'متر',
        description: 'وحدة قياس للطول بالمتر',
        unitType: 'LENGTH',
        decimalPrecision: 3,
        isActive: true,
      },
      {
        code: 'CM',
        name: 'سم',
        description: 'وحدة قياس للطول بالسنتيمتر',
        unitType: 'LENGTH',
        decimalPrecision: 2,
        isActive: true,
      },
      {
        code: 'SERVICE',
        name: 'خدمة',
        description: 'وحدة قياس للخدمات غير المخزنية',
        unitType: 'SERVICE',
        decimalPrecision: 0,
        isActive: true,
      },
    ],
  });

  const ownersEquity = await createAccount({
    code: '3100000',
    name: "Owner's Equity",
    nameAr: 'حقوق المالك',
    type: 'EQUITY',
    isPosting: false,
    parentAccountId: equity.id,
  });
  const partnersEquity = await createAccount({
    code: '3200000',
    name: "Partners' Equity",
    nameAr: 'حقوق الشركاء',
    type: 'EQUITY',
    isPosting: false,
    parentAccountId: equity.id,
  });
  const retainedEarnings = await createAccount({
    code: '3300000',
    name: 'Retained Earnings',
    nameAr: 'الأرباح المحتجزة',
    type: 'EQUITY',
    isPosting: false,
    parentAccountId: equity.id,
  });
  const openingBalances = await createAccount({
    code: '3400000',
    name: 'Opening Balances',
    nameAr: 'الأرصدة الافتتاحية',
    type: 'EQUITY',
    isPosting: false,
    parentAccountId: equity.id,
  });
  const reserves = await createAccount({
    code: '3500000',
    name: 'Reserves',
    nameAr: 'الاحتياطيات',
    type: 'EQUITY',
    isPosting: false,
    parentAccountId: equity.id,
  });
  const ownerCapital = await createAccount({
    code: '3110001',
    name: 'Owner Capital',
    nameAr: 'راس المال',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: ownersEquity.id,
  });
  await createAccount({
    code: '3120001',
    name: 'Owner Withdrawals',
    nameAr: 'مسحوبات المالك',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: ownersEquity.id,
  });
  await createAccount({
    code: '3210001',
    name: 'Partner A Capital',
    nameAr: 'رأس مال الشريك أ',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: partnersEquity.id,
  });
  await createAccount({
    code: '3220001',
    name: 'Partner B Capital',
    nameAr: 'رأس مال الشريك ب',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: partnersEquity.id,
  });
  await createAccount({
    code: '3230001',
    name: 'Partners Current Accounts',
    nameAr: 'الحسابات الجارية للشركاء',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: partnersEquity.id,
  });
  await createAccount({
    code: '3310001',
    name: 'Retained Earnings - Prior Years',
    nameAr: 'أرباح محتجزة - سنوات سابقة',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: retainedEarnings.id,
  });
  await createAccount({
    code: '3320001',
    name: 'Current Year Profit or Loss',
    nameAr: 'ربح أو خسارة السنة الحالية',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: retainedEarnings.id,
  });
  await createAccount({
    code: '3410001',
    name: 'Opening Balance Equity',
    nameAr: 'حساب الأرصدة الافتتاحية',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: openingBalances.id,
  });
  await createAccount({
    code: '3510001',
    name: 'Legal Reserve',
    nameAr: 'الاحتياطي القانوني',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: reserves.id,
  });
  await createAccount({
    code: '3520001',
    name: 'General Reserve',
    nameAr: 'الاحتياطي العام',
    type: 'EQUITY',
    isPosting: true,
    subtype: 'Equity',
    parentAccountId: reserves.id,
  });
  // Payment Terms seed data
  await prisma.paymentTerm.createMany({
    data: [
      {
        name: 'Cash',
        nameAr: 'نقدًا',
        calculationMethod: 'IMMEDIATE',
        numberOfDays: 0,
        isActive: true,
      },
      {
        name: 'Net 7',
        nameAr: 'خلال 7 أيام',
        calculationMethod: 'DAYS_AFTER',
        numberOfDays: 7,
        isActive: true,
      },
      {
        name: 'Net 15',
        nameAr: 'خلال 15 يومًا',
        calculationMethod: 'DAYS_AFTER',
        numberOfDays: 15,
        isActive: true,
      },
      {
        name: 'Net 30',
        nameAr: 'خلال 30 يومًا',
        calculationMethod: 'DAYS_AFTER',
        numberOfDays: 30,
        isActive: true,
      },
      {
        name: 'Net 60',
        nameAr: 'خلال 60 يومًا',
        calculationMethod: 'DAYS_AFTER',
        numberOfDays: 60,
        isActive: true,
      },
      {
        name: 'End of Month',
        nameAr: 'نهاية الشهر',
        calculationMethod: 'END_OF_MONTH',
        numberOfDays: null,
        isActive: true,
      },
      {
        name: 'By Agreement',
        nameAr: 'حسب الاتفاق',
        calculationMethod: 'MANUAL',
        numberOfDays: null,
        isActive: true,
      },
    ],
  });

  // Currency seed data
  await prisma.currency.createMany({
    data: [
      {
        code: 'JOD',
        name: 'Jordanian Dinar',
        nameAr: 'دينار أردني',
        symbol: 'JD',
        decimalPlaces: 3,
        isBase: true,
        isActive: true,
      },
      {
        code: 'USD',
        name: 'US Dollar',
        nameAr: 'دولار أمريكي',
        symbol: '$',
        decimalPlaces: 2,
        isBase: false,
        isActive: true,
      },
      {
        code: 'EUR',
        name: 'Euro',
        nameAr: 'يورو',
        symbol: '€',
        decimalPlaces: 2,
        isBase: false,
        isActive: true,
      },
      {
        code: 'SAR',
        name: 'Saudi Riyal',
        nameAr: 'ريال سعودي',
        symbol: 'ر.س',
        decimalPlaces: 2,
        isBase: false,
        isActive: true,
      },
      {
        code: 'AED',
        name: 'UAE Dirham',
        nameAr: 'درهم إماراتي',
        symbol: 'د.إ',
        decimalPlaces: 2,
        isBase: false,
        isActive: true,
      },
    ],
  });

  const cashRegister = await prisma.bankCashAccount.create({
    data: {
      type: 'Cash',
      name: 'Main Cash Register',
      bankName: 'Head Office Cashier',
      accountNumber: 'CASH-001',
      accountId: mainCash.id,
    },
  });

  const arabBankRegister = await prisma.bankCashAccount.create({
    data: {
      type: 'Bank',
      name: 'Arab Bank Current Account',
      bankName: 'Arab Bank',
      accountNumber: 'ARAB-001',
      accountId: arabBank.id,
    },
  });

  const islamicBankRegister = await prisma.bankCashAccount.create({
    data: {
      type: 'Bank',
      name: 'Islamic Bank Current Account',
      bankName: 'Islamic Bank',
      accountNumber: 'ISLAMIC-001',
      accountId: islamicBank.id,
    },
  });

  const taxableTreatment = await prisma.taxTreatment.findFirstOrThrow({ where: { code: 'TAXABLE' } });

  const periodByYearMonth = new Map<string, string>();
  const allPeriods = await prisma.fiscalPeriod.findMany({ where: { fiscalYearId: fiscalYear.id } });
  for (const period of allPeriods) {
    const start = new Date(period.startDate);
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    periodByYearMonth.set(key, period.id);
  }

  const segmentDeptValues = await prisma.segmentValue.findMany({
    where: { definition: { index: 3 } },
    select: { code: true },
  });
  const segmentBranchValues = await prisma.segmentValue.findMany({
    where: { definition: { index: 4 } },
    select: { code: true },
  });
  const segmentProjectValues = await prisma.segmentValue.findMany({
    where: { definition: { index: 5 } },
    select: { code: true },
  });

  console.log('Foundation seed complete.');

  return {
    admin,
    cashier,
    fiscalYear,
    period1,
    period4,
    periodByYearMonth,
    accounts: {
      mainCash,
      arabBank,
      islamicBank,
      customers,
      customerReceivables,
      suppliers,
      salesRevenue,
      salesTaxPayable,
      rentExpense,
      salariesExpense,
      salariesPayable: { id: (await prisma.account.findFirstOrThrow({ where: { code: '2130001' } })).id },
      ownerCapital,
      merchandiseInventory: { id: (await prisma.account.findFirstOrThrow({ where: { code: '1131001' } })).id },
      payables,
    },
    registers: {
      cash: cashRegister,
      arabBank: arabBankRegister,
      islamicBank: islamicBankRegister,
    },
    taxTreatmentTaxableId: taxableTreatment.id,
    segmentOptions: {
      departments: segmentDeptValues.map((row) => row.code),
      branches: segmentBranchValues.map((row) => row.code),
      projects: segmentProjectValues.map((row) => row.code),
    },
  };
}
