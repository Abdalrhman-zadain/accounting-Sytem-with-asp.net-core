import { PrismaClient, AccountType } from '../src/generated/prisma';
import { FoundationContext } from './seed-foundation';
import { postJournalEntry } from './seed-posting';

type OpeningLineRaw = {
  code: string;
  nameAr: string;
  debit: number;
  credit: number;
  parentCode: string;
  accountType: AccountType;
  accountSubtype: string;
  isCustomer?: boolean;
  isSupplier?: boolean;
};

export async function seedOpeningJournalEntry(prisma: PrismaClient, ctx: FoundationContext) {
  console.log('Seeding opening journal entry...');
  const { admin, period1 } = ctx;

  const rawLines: OpeningLineRaw[] = [
    // Cash boxes
    { code: '1111001', nameAr: 'صندوق النقد', debit: 0, credit: 92311.75, parentCode: '1111000', accountType: 'ASSET', accountSubtype: 'Cash' },
    { code: '1111002', nameAr: 'صندوق شيكات', debit: 0, credit: 750.00, parentCode: '1111000', accountType: 'ASSET', accountSubtype: 'Cash' },
    { code: '1111003', nameAr: 'صندوق عامر البدارين', debit: 9648.65, credit: 0, parentCode: '1111000', accountType: 'ASSET', accountSubtype: 'Cash' },
    { code: '1111004', nameAr: 'صندوق محمد منصور', debit: 30926.15, credit: 0, parentCode: '1111000', accountType: 'ASSET', accountSubtype: 'Cash' },

    // Association / Receivables
    { code: '1122001', nameAr: 'جمعية', debit: 600.00, credit: 0, parentCode: '1120000', accountType: 'ASSET', accountSubtype: 'Receivable' },

    // Suppliers
    { code: '2110002', nameAr: 'شركة حبق', debit: 0, credit: 128233.70, parentCode: '2110000', accountType: 'LIABILITY', accountSubtype: 'Payable', isSupplier: true },
    { code: '2110003', nameAr: 'شركة عشتار لصناعة الشوكولاتة', debit: 0, credit: 37671.44, parentCode: '2110000', accountType: 'LIABILITY', accountSubtype: 'Payable', isSupplier: true },
    { code: '2110004', nameAr: 'توزيعات ابو كنان', debit: 0, credit: 32878.51, parentCode: '2110000', accountType: 'LIABILITY', accountSubtype: 'Payable', isSupplier: true },
    { code: '2110005', nameAr: 'محمود نصار', debit: 0, credit: 3738.00, parentCode: '2110000', accountType: 'LIABILITY', accountSubtype: 'Payable', isSupplier: true },

    // Equity / Partner current accounts
    { code: '3230001', nameAr: 'جاري شريك بداية المدة', debit: 127177.00, credit: 0, parentCode: '3200000', accountType: 'EQUITY', accountSubtype: 'Equity' },
    { code: '3220001', nameAr: 'جاري شريك محمد', debit: 1200.00, credit: 0, parentCode: '3200000', accountType: 'EQUITY', accountSubtype: 'Equity' },
    { code: '3210001', nameAr: 'جاري شريك عزام', debit: 601.00, credit: 0, parentCode: '3200000', accountType: 'EQUITY', accountSubtype: 'Equity' },

    // Expenses
    { code: '5100003', nameAr: 'مصروف رواتب واجور', debit: 600.00, credit: 0, parentCode: '5100000', accountType: 'EXPENSE', accountSubtype: 'Expense' },
    { code: '5110001', nameAr: 'مصروف الايجار', debit: 160.00, credit: 0, parentCode: '5100000', accountType: 'EXPENSE', accountSubtype: 'Expense' },
    { code: '5100004', nameAr: 'مصروف عمولات بيع', debit: 424.50, credit: 0, parentCode: '5100000', accountType: 'EXPENSE', accountSubtype: 'Expense' },
    { code: '5120001', nameAr: 'مصروف محروقات', debit: 775.00, credit: 0, parentCode: '5100000', accountType: 'EXPENSE', accountSubtype: 'Expense' },
    { code: '5110000', nameAr: 'مصاريف صيانة', debit: 210.00, credit: 0, parentCode: '5100000', accountType: 'EXPENSE', accountSubtype: 'Expense' },
    { code: '5100005', nameAr: 'مصورف ضمان اجتماعي', debit: 88.00, credit: 0, parentCode: '5100000', accountType: 'EXPENSE', accountSubtype: 'Expense' },
    { code: '5100006', nameAr: 'مصروف عمال تحميل وتنزيل', debit: 50.00, credit: 0, parentCode: '5100000', accountType: 'EXPENSE', accountSubtype: 'Expense' },
    { code: '5100007', nameAr: 'مصروف طابعه', debit: 50.00, credit: 0, parentCode: '5100000', accountType: 'EXPENSE', accountSubtype: 'Expense' },
    { code: '5100008', nameAr: 'مصروف جي بي اس', debit: 8.00, credit: 0, parentCode: '5100000', accountType: 'EXPENSE', accountSubtype: 'Expense' },

    // Revenues & Cost of sales
    { code: '4110001', nameAr: 'ايرادات المبيعات', debit: 0, credit: 157082.41, parentCode: '4100000', accountType: 'REVENUE', accountSubtype: 'Revenue' },
    { code: '5130001', nameAr: 'تكلفة البضاعة المباعة', debit: 163639.89, credit: 0, parentCode: '5100000', accountType: 'EXPENSE', accountSubtype: 'Expense' },

    // Customers (1121005 to 1121069)
    { code: '1121005', nameAr: 'توزيعات محمود نصار', debit: 5105.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121006', nameAr: 'بزورية بيت الضيافة', debit: 450.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121007', nameAr: 'سوبر ماركت اليوسف', debit: 6016.90, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121008', nameAr: 'ركوة كرم', debit: 3219.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121009', nameAr: 'أبو تايه كاجو', debit: 1963.65, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121010', nameAr: 'دي لايت سويت', debit: 1434.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121011', nameAr: 'علاء البدر معان', debit: 2020.50, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121012', nameAr: 'محمص طبازة', debit: 400.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121013', nameAr: 'الياسين للتمور', debit: 884.75, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121014', nameAr: 'رحاب الوالي', debit: 100.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121015', nameAr: 'هلا مول الشوبك', debit: 365.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121016', nameAr: 'مجموعة الوالي للحلويات', debit: 19142.75, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121017', nameAr: 'محمص الفيصل', debit: 197.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121018', nameAr: 'أسواق العقبة', debit: 88.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121019', nameAr: 'عطارة الشيخ', debit: 2049.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121020', nameAr: 'حلويات راحة البال', debit: 6800.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121021', nameAr: 'محمص قرنفل - زرقاء', debit: 2397.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121022', nameAr: 'محمص في', debit: 1008.20, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121023', nameAr: 'أسواق بلقيس', debit: 1611.40, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121024', nameAr: 'محمص الصحاف', debit: 10859.75, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121025', nameAr: 'محمص جوز ولوز القصر', debit: 5353.05, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121026', nameAr: 'محمص جوز ولوز الربة', debit: 2535.70, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121027', nameAr: 'سليمان جيت بوقتك', debit: 3621.55, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121028', nameAr: 'محل زكي الصعوب الوسية/ مؤتة', debit: 1611.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121029', nameAr: 'زكي الصعوب / المرج', debit: 842.70, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121030', nameAr: 'توزيعات اسامة', debit: 58573.25, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121031', nameAr: 'محمص الاغا', debit: 13546.65, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121032', nameAr: 'النكهة الشامية', debit: 2905.95, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121033', nameAr: 'سفيان', debit: 1858.50, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121034', nameAr: 'بن الطيبات', debit: 3646.50, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121035', nameAr: 'محمص الاقصى', debit: 550.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121036', nameAr: 'سوبر ماركت عمر أبو الجاج', debit: 412.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121037', nameAr: 'سوبر ماركت السيف', debit: 1729.85, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121038', nameAr: 'محمص هيل وزعفران', debit: 1194.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121039', nameAr: 'كمشة كاجو / العقبة', debit: 710.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121040', nameAr: 'سوبر ماركت الهندي', debit: 275.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121041', nameAr: 'محمص بدر الاغوات', debit: 1298.50, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121042', nameAr: 'جهاد المزار', debit: 1147.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121044', nameAr: 'اسواق بيت حانون /مؤته/ المنشيه', debit: 635.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121045', nameAr: 'أسواق الياسر', debit: 150.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121046', nameAr: 'محلات كراميش معان', debit: 420.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121047', nameAr: 'شوكو درايف', debit: 642.50, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121048', nameAr: 'سوبر ماركت محمد رياض', debit: 680.70, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121049', nameAr: 'سامر البدارين', debit: 145.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121050', nameAr: 'محمص الذواق', debit: 326.25, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121051', nameAr: 'محمص بزر وهيل', debit: 998.55, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121052', nameAr: 'اصحاب الكار', debit: 1583.60, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121053', nameAr: 'محمص كاجو', debit: 1475.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121054', nameAr: 'بزورية الملوكي', debit: 669.50, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121056', nameAr: 'محمص وبن العفوري', debit: 12472.45, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121057', nameAr: 'سوبر ماركت موسى الخطيب', debit: 2090.46, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121058', nameAr: 'محمص مسالا', debit: 3481.40, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121059', nameAr: 'واحة السكر للحلويات', debit: 554.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121060', nameAr: 'السامر', debit: 8413.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121061', nameAr: 'الكار', debit: 2591.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121062', nameAr: 'شعاع', debit: 4198.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121063', nameAr: 'المشعل', debit: 3523.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121064', nameAr: 'ربيحات', debit: 80.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121065', nameAr: 'عريب', debit: 1093.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121066', nameAr: 'الهدار', debit: 40.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121067', nameAr: 'حسام', debit: 107.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121068', nameAr: 'وسام', debit: 25.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
    { code: '1121069', nameAr: 'محمص ورق غار', debit: 460.00, credit: 0, parentCode: '1121000', accountType: 'ASSET', accountSubtype: 'Receivable', isCustomer: true },
  ];

  const taxableTreatment = await prisma.taxTreatment.findFirstOrThrow({ where: { code: 'TAXABLE' } });

  // 1. Process all accounts first
  console.log('Ensuring chart of accounts matches opening balances...');
  const accountIdMap = new Map<string, string>();
  const customerCodeMap = new Map<string, string>();
  const supplierCodeMap = new Map<string, string>();

  let customerSeq = 1;
  let supplierSeq = 1;

  for (const line of rawLines) {
    let acc = await prisma.account.findUnique({ where: { code: line.code } });

    if (acc) {
      // Update nameAr and English name to match
      acc = await prisma.account.update({
        where: { code: line.code },
        data: {
          nameAr: line.nameAr,
          isActive: true,
          isPosting: true,
        },
      });
    } else {
      // Find parent account ID
      const parentAcc = await prisma.account.findUniqueOrThrow({
        where: { code: line.parentCode },
      });

      acc = await prisma.account.create({
        data: {
          code: line.code,
          name: line.nameAr, // Fallback english name to Arabic
          nameAr: line.nameAr,
          type: line.accountType,
          subtype: line.accountSubtype,
          isPosting: true,
          isActive: true,
          parentAccountId: parentAcc.id,
          createdById: admin.id,
        },
      });
    }

    accountIdMap.set(line.code, acc.id);

    // If it's a Customer, verify/create Customer record
    if (line.isCustomer) {
      const customerCode = `CUS-${String(customerSeq++).padStart(6, '0')}`;
      customerCodeMap.set(line.code, customerCode);

      await prisma.customer.upsert({
        where: { code: customerCode },
        update: {
          name: line.nameAr,
          receivableAccountId: acc.id,
          isActive: true,
        },
        create: {
          code: customerCode,
          name: line.nameAr,
          taxTreatmentId: taxableTreatment.id,
          creditLimit: 100000,
          receivableAccountId: acc.id,
          isActive: true,
        },
      });
    }

    // If it's a Supplier, verify/create Supplier record
    if (line.isSupplier) {
      const supplierCode = `SUP-${String(supplierSeq++).padStart(6, '0')}`;
      supplierCodeMap.set(line.code, supplierCode);

      await prisma.supplier.upsert({
        where: { code: supplierCode },
        update: {
          name: line.nameAr,
          payableAccountId: acc.id,
          isActive: true,
        },
        create: {
          code: supplierCode,
          name: line.nameAr,
          payableAccountId: acc.id,
          isActive: true,
          defaultCurrency: 'JOD',
        },
      });
    }
  }

  // 2. Sum up Debits and Credits to find the balancing amount
  const totalDebits = rawLines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredits = rawLines.reduce((sum, line) => sum + line.credit, 0);

  const diff = totalDebits - totalCredits;
  console.log(`Initial Journal Debits: ${totalDebits.toFixed(2)}, Credits: ${totalCredits.toFixed(2)}, Diff: ${diff.toFixed(2)}`);

  // We want to add the balancing amount to Partner Opening Current Account (3230001)
  const targetOpeningAccountCode = '3230001';
  const targetOpeningAccountId = accountIdMap.get(targetOpeningAccountCode);
  if (!targetOpeningAccountId) {
    throw new Error(`Partner Opening Current Account (${targetOpeningAccountCode}) was not created or mapped correctly.`);
  }

  // Create final lines for posting
  const finalLines = rawLines.map((line) => ({
    accountId: accountIdMap.get(line.code)!,
    description: line.code === '1111001' ? 'بداية مده' : 'قيد افتتاحية بداية المدة 2026',
    debitAmount: line.debit,
    creditAmount: line.credit,
  }));

  // Append the balancing transaction line
  if (Math.abs(diff) > 0.001) {
    if (diff > 0) {
      // Debits exceed Credits, so Credit Partner Current Account
      finalLines.push({
        accountId: targetOpeningAccountId,
        description: 'موازنة قيد افتتاحية بداية المدة 2026',
        debitAmount: 0,
        creditAmount: parseFloat(diff.toFixed(2)),
      });
      console.log(`Balanced journal with CREDIT of ${diff.toFixed(2)} to account ${targetOpeningAccountCode}`);
    } else {
      // Credits exceed Debits, so Debit Partner Current Account
      finalLines.push({
        accountId: targetOpeningAccountId,
        description: 'موازنة قيد افتتاحية بداية المدة 2026',
        debitAmount: parseFloat(Math.abs(diff).toFixed(2)),
        creditAmount: 0,
      });
      console.log(`Balanced journal with DEBIT of ${Math.abs(diff).toFixed(2)} to account ${targetOpeningAccountCode}`);
    }
  }

  // Post the opening journal entry
  const result = await postJournalEntry(prisma, admin.id, {
    reference: 'JE-OPENING-2026',
    description: 'قيد افتتاحية بداية المدة 2026',
    entryDate: new Date('2026-01-01'),
    fiscalPeriodId: period1.id,
    lines: finalLines,
  });

  console.log(`Successfully posted opening journal entry with ID: ${result.journalEntry.id}`);

  // 3. Update the sub-ledger balances for Customers and Suppliers to reflect their opening balances
  console.log('Syncing sub-ledger balances for Customers and Suppliers...');
  for (const line of rawLines) {
    if (line.isCustomer) {
      const customerCode = customerCodeMap.get(line.code)!;
      const balance = line.debit - line.credit;
      await prisma.customer.update({
        where: { code: customerCode },
        data: { currentBalance: balance },
      });
    }
    if (line.isSupplier) {
      const supplierCode = supplierCodeMap.get(line.code)!;
      // AP accounts normally have credit balances, but currentBalance in systems is typically represented as positive for payable
      const balance = line.credit - line.debit;
      await prisma.supplier.update({
        where: { code: supplierCode },
        data: { currentBalance: balance },
      });
    }
  }
  console.log('Syncing complete. Opening balance successfully seeded.');
}
