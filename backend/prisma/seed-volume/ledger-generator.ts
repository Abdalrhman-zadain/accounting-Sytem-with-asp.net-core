import type { JournalEntryDraft } from '../seed-posting';
import { postJournalEntriesBatch } from '../seed-posting';
import type { PrismaClient } from '../../src/generated/prisma';
import type { FoundationContext } from '../seed-foundation';
import type { VolumeSeedConfig } from './config';
import { createRng } from './rng';
import type { VolumeMastersContext } from './masters';

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function seasonalityMultiplier(month: number) {
  if (month === 12 || month === 11) return 1.25;
  if (month >= 6 && month <= 8) return 0.85;
  return 1;
}

export async function generateVolumeLedger(
  prisma: PrismaClient,
  ctx: FoundationContext,
  masters: VolumeMastersContext,
  periodByYearMonth: Map<string, string>,
  config: VolumeSeedConfig,
) {
  const rng = createRng(config.rngSeed + 99);
  const { admin, accounts } = ctx;
  const years = [...config.years].sort((a, b) => a - b);
  const startYear = years[0] ?? 2024;

  const openingPeriodId = periodByYearMonth.get(monthKey(startYear, 1));
  if (!openingPeriodId) {
    throw new Error(`Missing fiscal period for ${startYear}-01`);
  }

  const openingDrafts: JournalEntryDraft[] = [
    {
      reference: 'JE-VOL-OPEN-2024',
      description: 'Opening capitalization - Al-Mubaiqri Industrial Group',
      entryDate: new Date(`${startYear}-01-02`),
      fiscalPeriodId: openingPeriodId,
      lines: [
        { accountId: accounts.arabBank.id, description: 'Opening bank balance', debitAmount: 8_000_000, creditAmount: 0 },
        { accountId: accounts.ownerCapital.id, description: 'Opening equity', debitAmount: 0, creditAmount: 8_000_000 },
      ],
    },
  ];

  let journalSequence = 0;
  const monthlyDrafts: JournalEntryDraft[] = [];

  for (const year of years) {
    for (let month = 1; month <= 12; month += 1) {
      const fiscalPeriodId = periodByYearMonth.get(monthKey(year, month));
      if (!fiscalPeriodId) continue;

      const seasonal = seasonalityMultiplier(month);
      const baseRevenue = rng.amount(180_000, 420_000) * seasonal;

      for (let index = 0; index < config.monthlyJournals; index += 1) {
        journalSequence += 1;
        const day = rng.int(1, 28);
        const entryDate = new Date(year, month - 1, day);
        const pattern = index % 10;

        if (pattern <= 3) {
          const gross = rng.amount(800, 12_000);
          const tax = Math.round(gross * 0.16 * 100) / 100;
          const net = Math.round((gross - tax) * 100) / 100;
          const arAccount = rng.pick(masters.customerReceivableAccountIds);
          monthlyDrafts.push({
            reference: `JE-VOL-${year}${String(month).padStart(2, '0')}-${String(journalSequence).padStart(5, '0')}`,
            description: 'Credit sale on account',
            entryDate,
            fiscalPeriodId,
            lines: [
              { accountId: arAccount, description: 'Customer invoice', debitAmount: gross, creditAmount: 0 },
              { accountId: accounts.salesRevenue.id, description: 'Sales revenue', debitAmount: 0, creditAmount: net },
              { accountId: accounts.salesTaxPayable.id, description: 'Sales VAT', debitAmount: 0, creditAmount: tax },
            ],
          });
          continue;
        }

        if (pattern === 4 || pattern === 5) {
          const amount = rng.amount(500, 8_000);
          monthlyDrafts.push({
            reference: `JE-VOL-${year}${String(month).padStart(2, '0')}-${String(journalSequence).padStart(5, '0')}`,
            description: 'Cash sale',
            entryDate,
            fiscalPeriodId,
            lines: [
              { accountId: accounts.mainCash.id, description: 'Cash received', debitAmount: amount, creditAmount: 0 },
              { accountId: accounts.salesRevenue.id, description: 'Cash sales', debitAmount: 0, creditAmount: amount },
            ],
          });
          continue;
        }

        if (pattern === 6) {
          const amount = rng.amount(1_000, 15_000);
          const arAccount = rng.pick(masters.customerReceivableAccountIds);
          monthlyDrafts.push({
            reference: `JE-VOL-${year}${String(month).padStart(2, '0')}-${String(journalSequence).padStart(5, '0')}`,
            description: 'Customer collection',
            entryDate,
            fiscalPeriodId,
            lines: [
              { accountId: accounts.arabBank.id, description: 'Bank deposit', debitAmount: amount, creditAmount: 0 },
              { accountId: arAccount, description: 'AR settlement', debitAmount: 0, creditAmount: amount },
            ],
          });
          continue;
        }

        if (pattern === 7) {
          const amount = rng.amount(2_000, 25_000);
          const apAccount = rng.pick(masters.supplierPayableAccountIds);
          monthlyDrafts.push({
            reference: `JE-VOL-${year}${String(month).padStart(2, '0')}-${String(journalSequence).padStart(5, '0')}`,
            description: 'Supplier invoice',
            entryDate,
            fiscalPeriodId,
            lines: [
              { accountId: accounts.merchandiseInventory.id, description: 'Inventory purchase', debitAmount: amount, creditAmount: 0 },
              { accountId: apAccount, description: 'Supplier payable', debitAmount: 0, creditAmount: amount },
            ],
          });
          continue;
        }

        if (pattern === 8) {
          const amount = rng.amount(1_500, 20_000);
          const apAccount = rng.pick(masters.supplierPayableAccountIds);
          monthlyDrafts.push({
            reference: `JE-VOL-${year}${String(month).padStart(2, '0')}-${String(journalSequence).padStart(5, '0')}`,
            description: 'Supplier payment',
            entryDate,
            fiscalPeriodId,
            lines: [
              { accountId: apAccount, description: 'Pay supplier', debitAmount: amount, creditAmount: 0 },
              { accountId: accounts.islamicBank.id, description: 'Bank outflow', debitAmount: 0, creditAmount: amount },
            ],
          });
          continue;
        }

        if (pattern === 9) {
          const payroll = rng.amount(35_000, 95_000);
          monthlyDrafts.push({
            reference: `JE-VOL-${year}${String(month).padStart(2, '0')}-${String(journalSequence).padStart(5, '0')}`,
            description: 'Monthly payroll',
            entryDate,
            fiscalPeriodId,
            lines: [
              { accountId: accounts.salariesExpense.id, description: 'Salaries expense', debitAmount: payroll, creditAmount: 0 },
              { accountId: accounts.salariesPayable.id, description: 'Salaries payable', debitAmount: 0, creditAmount: payroll },
            ],
          });
          const payment = Math.round(payroll * 0.92 * 100) / 100;
          journalSequence += 1;
          monthlyDrafts.push({
            reference: `JE-VOL-${year}${String(month).padStart(2, '0')}-${String(journalSequence).padStart(5, '0')}`,
            description: 'Payroll bank payment',
            entryDate,
            fiscalPeriodId,
            lines: [
              { accountId: accounts.salariesPayable.id, description: 'Payroll settlement', debitAmount: payment, creditAmount: 0 },
              { accountId: accounts.arabBank.id, description: 'Bank payment', debitAmount: 0, creditAmount: payment },
            ],
          });
          continue;
        }

        const opex = rng.amount(2_500, 18_000);
        const expenseAccount = index % 2 === 0 ? accounts.rentExpense.id : accounts.salariesExpense.id;
        monthlyDrafts.push({
          reference: `JE-VOL-${year}${String(month).padStart(2, '0')}-${String(journalSequence).padStart(5, '0')}`,
          description: 'Operating expense',
          entryDate,
          fiscalPeriodId,
          lines: [
            { accountId: expenseAccount, description: 'Operating cost', debitAmount: opex, creditAmount: 0 },
            { accountId: accounts.arabBank.id, description: 'Bank payment', debitAmount: 0, creditAmount: opex },
          ],
        });
      }

      // Monthly rent anchor tied to base revenue scale
      journalSequence += 1;
      monthlyDrafts.push({
        reference: `JE-VOL-${year}${String(month).padStart(2, '0')}-${String(journalSequence).padStart(5, '0')}`,
        description: 'Monthly rent',
        entryDate: new Date(year, month - 1, 5),
        fiscalPeriodId,
        lines: [
          { accountId: accounts.rentExpense.id, description: 'Rent', debitAmount: Math.round(baseRevenue * 0.08), creditAmount: 0 },
          { accountId: accounts.islamicBank.id, description: 'Rent payment', debitAmount: 0, creditAmount: Math.round(baseRevenue * 0.08) },
        ],
      });
    }
  }

  console.log(`Posting ${openingDrafts.length + monthlyDrafts.length} volume journals...`);
  await postJournalEntriesBatch(prisma, admin.id, openingDrafts, { chunkSize: 20 });
  await postJournalEntriesBatch(prisma, admin.id, monthlyDrafts, { chunkSize: 40 });
  console.log('Volume ledger generation complete.');
}
