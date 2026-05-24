import type { PrismaClient } from '../src/generated/prisma';

export type JournalLineDraft = {
  accountId: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
};

export type JournalEntryDraft = {
  reference: string;
  description: string;
  entryDate: Date;
  fiscalPeriodId: string;
  lines: JournalLineDraft[];
};

export type PostedJournalResult = {
  journalEntry: { id: string };
  ledgerLines: Array<{ id: string; accountId: string }>;
};

export async function postJournalEntry(
  prisma: PrismaClient,
  adminId: string,
  draft: JournalEntryDraft,
): Promise<PostedJournalResult> {
  const [result] = await postJournalEntriesBatch(prisma, adminId, [draft], { returnDetails: true });
  return result as PostedJournalResult;
}

export async function postJournalEntriesBatch(
  prisma: PrismaClient,
  adminId: string,
  drafts: JournalEntryDraft[],
  options?: { returnDetails?: boolean; chunkSize?: number },
): Promise<PostedJournalResult[]> {
  const chunkSize = options?.chunkSize ?? 40;
  const results: PostedJournalResult[] = [];
  const balanceDeltas = new Map<string, number>();

  for (let offset = 0; offset < drafts.length; offset += chunkSize) {
    const chunk = drafts.slice(offset, offset + chunkSize);

    const chunkResults = await prisma.$transaction(async (tx) => {
      const localResults: PostedJournalResult[] = [];

      for (const draft of chunk) {
        const totalDebit = draft.lines.reduce((sum, line) => sum + line.debitAmount, 0);
        const totalCredit = draft.lines.reduce((sum, line) => sum + line.creditAmount, 0);
        if (Math.abs(totalDebit - totalCredit) > 0.0001) {
          throw new Error(`Unbalanced journal ${draft.reference}: debit ${totalDebit} credit ${totalCredit}`);
        }

        const postingBatch = await tx.postingBatch.create({
          data: { postedAt: draft.entryDate },
        });

        const journalEntry = await tx.journalEntry.create({
          data: {
            reference: draft.reference,
            description: draft.description,
            entryDate: draft.entryDate,
            status: 'POSTED',
            postedAt: draft.entryDate,
            fiscalPeriodId: draft.fiscalPeriodId,
            createdById: adminId,
            postingBatchId: postingBatch.id,
          },
        });

        const ledgerLines: Array<{ id: string; accountId: string }> = [];

        for (let index = 0; index < draft.lines.length; index += 1) {
          const line = draft.lines[index];
          const journalLine = await tx.journalEntryLine.create({
            data: {
              journalEntryId: journalEntry.id,
              accountId: line.accountId,
              lineNumber: index + 1,
              description: line.description,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
            },
          });

          const ledgerLine = await tx.ledgerTransaction.create({
            data: {
              postingBatchId: postingBatch.id,
              journalEntryId: journalEntry.id,
              journalEntryLineId: journalLine.id,
              accountId: line.accountId,
              reference: draft.reference,
              entryDate: draft.entryDate,
              postedAt: draft.entryDate,
              description: line.description,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              fiscalPeriodId: draft.fiscalPeriodId,
              createdById: adminId,
            },
            select: { id: true, accountId: true },
          });

          ledgerLines.push(ledgerLine);
          const delta = line.debitAmount - line.creditAmount;
          balanceDeltas.set(line.accountId, (balanceDeltas.get(line.accountId) ?? 0) + delta);
        }

        localResults.push({ journalEntry, ledgerLines });
      }

      return localResults;
    });

    results.push(...chunkResults);
  }

  for (const [accountId, delta] of balanceDeltas.entries()) {
    if (delta === 0) continue;
    await prisma.account.update({
      where: { id: accountId },
      data: { currentBalance: { increment: delta } },
    });
  }

  return options?.returnDetails ? results : [];
}
