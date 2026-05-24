import type { PrismaClient } from '../src/generated/prisma';
import type { FoundationContext } from './seed-foundation';
import { postJournalEntry } from './seed-posting';

export async function runBasicDemoSeed(prisma: PrismaClient, ctx: FoundationContext) {
  const { admin, period1, period4, accounts, registers } = ctx;

  console.log('Posting basic demo journals and bank/cash activity...');

  const capitalPosting = await postJournalEntry(prisma, admin.id, {
    reference: 'JE-2026-0001',
    description: 'Initial owner capital',
    entryDate: new Date('2026-01-01'),
    fiscalPeriodId: period1.id,
    lines: [
      { accountId: accounts.arabBank.id, description: 'Capital deposited to Arab Bank', debitAmount: 50000, creditAmount: 0 },
      { accountId: accounts.ownerCapital.id, description: 'Owner capital', debitAmount: 0, creditAmount: 50000 },
    ],
  });

  await postJournalEntry(prisma, admin.id, {
    reference: 'JE-2026-0002',
    description: 'Credit sale invoice',
    entryDate: new Date('2026-04-10'),
    fiscalPeriodId: period4.id,
    lines: [
      { accountId: accounts.customers.id, description: 'Invoice to customer', debitAmount: 2500, creditAmount: 0 },
      { accountId: accounts.salesRevenue.id, description: 'Sales on account', debitAmount: 0, creditAmount: 2500 },
    ],
  });

  const cashReceiptPosting = await postJournalEntry(prisma, admin.id, {
    reference: 'RCPT-2026-001',
    description: 'Cash sales receipt',
    entryDate: new Date('2026-04-12'),
    fiscalPeriodId: period4.id,
    lines: [
      { accountId: accounts.mainCash.id, description: 'Cash received', debitAmount: 800, creditAmount: 0 },
      { accountId: accounts.salesRevenue.id, description: 'Sales revenue cash', debitAmount: 0, creditAmount: 800 },
    ],
  });

  await prisma.bankCashTransaction.create({
    data: {
      kind: 'RECEIPT',
      status: 'POSTED',
      reference: 'RCPT-2026-001',
      transactionDate: new Date('2026-04-12'),
      amount: 800,
      bankCashAccountId: registers.cash.id,
      counterAccountId: accounts.salesRevenue.id,
      counterpartyName: 'Walk-in Customer',
      description: 'Cash sales receipt',
      journalEntryId: cashReceiptPosting.journalEntry.id,
      postedAt: new Date('2026-04-12'),
    },
  });

  const bankReceiptPosting = await postJournalEntry(prisma, admin.id, {
    reference: 'RCPT-2026-002',
    description: 'Collection from trade customers',
    entryDate: new Date('2026-04-14'),
    fiscalPeriodId: period4.id,
    lines: [
      { accountId: accounts.arabBank.id, description: 'Customer collection to bank', debitAmount: 1500, creditAmount: 0 },
      { accountId: accounts.customers.id, description: 'Settlement of receivable', debitAmount: 0, creditAmount: 1500 },
    ],
  });

  await prisma.bankCashTransaction.create({
    data: {
      kind: 'RECEIPT',
      status: 'POSTED',
      reference: 'RCPT-2026-002',
      transactionDate: new Date('2026-04-14'),
      amount: 1500,
      bankCashAccountId: registers.arabBank.id,
      counterAccountId: accounts.customers.id,
      counterpartyName: 'Customer A',
      description: 'Collection from trade customers',
      journalEntryId: bankReceiptPosting.journalEntry.id,
      postedAt: new Date('2026-04-14'),
    },
  });

  const transferPosting = await postJournalEntry(prisma, admin.id, {
    reference: 'TRF-2026-001',
    description: 'Deposit cash into bank',
    entryDate: new Date('2026-04-15'),
    fiscalPeriodId: period4.id,
    lines: [
      { accountId: accounts.arabBank.id, description: 'Cash deposited to Arab Bank', debitAmount: 500, creditAmount: 0 },
      { accountId: accounts.mainCash.id, description: 'Cash transferred from register', debitAmount: 0, creditAmount: 500 },
    ],
  });

  await prisma.bankCashTransaction.create({
    data: {
      kind: 'TRANSFER',
      status: 'POSTED',
      reference: 'TRF-2026-001',
      transactionDate: new Date('2026-04-15'),
      amount: 500,
      sourceBankCashAccountId: registers.cash.id,
      destinationBankCashAccountId: registers.arabBank.id,
      description: 'Deposit cash into bank',
      journalEntryId: transferPosting.journalEntry.id,
      postedAt: new Date('2026-04-15'),
    },
  });

  const rentPaymentPosting = await postJournalEntry(prisma, admin.id, {
    reference: 'PAY-2026-001',
    description: 'Office rent payment',
    entryDate: new Date('2026-04-20'),
    fiscalPeriodId: period4.id,
    lines: [
      { accountId: accounts.rentExpense.id, description: 'Office rent for April', debitAmount: 1200, creditAmount: 0 },
      { accountId: accounts.arabBank.id, description: 'Paid from Arab Bank', debitAmount: 0, creditAmount: 1200 },
    ],
  });

  await prisma.bankCashTransaction.create({
    data: {
      kind: 'PAYMENT',
      status: 'POSTED',
      reference: 'PAY-2026-001',
      transactionDate: new Date('2026-04-20'),
      amount: 1200,
      bankCashAccountId: registers.arabBank.id,
      counterAccountId: accounts.rentExpense.id,
      counterpartyName: 'Landlord',
      description: 'Office rent payment',
      journalEntryId: rentPaymentPosting.journalEntry.id,
      postedAt: new Date('2026-04-20'),
    },
  });

  await prisma.bankCashTransaction.create({
    data: {
      kind: 'PAYMENT',
      status: 'DRAFT',
      reference: 'PAY-2026-002',
      transactionDate: new Date('2026-04-27'),
      amount: 900,
      bankCashAccountId: registers.islamicBank.id,
      counterAccountId: accounts.salariesExpense.id,
      counterpartyName: 'Payroll Batch',
      description: 'Draft salaries payment',
    },
  });

  const capitalBankLedger = capitalPosting.ledgerLines.find((line) => line.accountId === accounts.arabBank.id);
  const bankReceiptLedger = bankReceiptPosting.ledgerLines.find((line) => line.accountId === accounts.arabBank.id);
  const transferBankLedger = transferPosting.ledgerLines.find((line) => line.accountId === accounts.arabBank.id);
  const rentPaymentBankLedger = rentPaymentPosting.ledgerLines.find((line) => line.accountId === accounts.arabBank.id);

  if (!capitalBankLedger || !bankReceiptLedger || !transferBankLedger || !rentPaymentBankLedger) {
    throw new Error('Bank-side ledger lines were not created as expected.');
  }

  const reconciliation = await prisma.bankReconciliation.create({
    data: {
      bankCashAccountId: registers.arabBank.id,
      statementDate: new Date('2026-04-30'),
      statementEndingBalance: 50775,
      notes: 'Demo reconciliation with one unmatched bank fee.',
      status: 'DRAFT',
    },
  });

  const capitalStatementLine = await prisma.bankStatementLine.create({
    data: {
      reconciliationId: reconciliation.id,
      transactionDate: new Date('2026-01-01'),
      reference: 'CAP-001',
      description: 'Capital deposit',
      debitAmount: 50000,
      creditAmount: 0,
      status: 'RECONCILED',
    },
  });

  const customerReceiptStatementLine = await prisma.bankStatementLine.create({
    data: {
      reconciliationId: reconciliation.id,
      transactionDate: new Date('2026-04-14'),
      reference: 'DEP-001',
      description: 'Customer collection',
      debitAmount: 1500,
      creditAmount: 0,
      status: 'RECONCILED',
    },
  });

  const transferStatementLine = await prisma.bankStatementLine.create({
    data: {
      reconciliationId: reconciliation.id,
      transactionDate: new Date('2026-04-15'),
      reference: 'DEP-002',
      description: 'Cash deposit into bank',
      debitAmount: 500,
      creditAmount: 0,
      status: 'RECONCILED',
    },
  });

  const rentStatementLine = await prisma.bankStatementLine.create({
    data: {
      reconciliationId: reconciliation.id,
      transactionDate: new Date('2026-04-20'),
      reference: 'CHQ-001',
      description: 'Rent payment',
      debitAmount: 0,
      creditAmount: 1200,
      status: 'RECONCILED',
    },
  });

  await prisma.bankStatementLine.create({
    data: {
      reconciliationId: reconciliation.id,
      transactionDate: new Date('2026-04-25'),
      reference: 'FEE-001',
      description: 'Bank charge not yet recorded',
      debitAmount: 0,
      creditAmount: 25,
      status: 'UNMATCHED',
    },
  });

  const createReconciledMatch = (statementLineId: string, ledgerTransactionId: string) =>
    prisma.bankReconciliationMatch.create({
      data: {
        reconciliationId: reconciliation.id,
        statementLineId,
        ledgerTransactionId,
        isReconciled: true,
        matchedAt: new Date('2026-04-30'),
        reconciledAt: new Date('2026-04-30'),
      },
    });

  await createReconciledMatch(capitalStatementLine.id, capitalBankLedger.id);
  await createReconciledMatch(customerReceiptStatementLine.id, bankReceiptLedger.id);
  await createReconciledMatch(transferStatementLine.id, transferBankLedger.id);
  await createReconciledMatch(rentStatementLine.id, rentPaymentBankLedger.id);
}
