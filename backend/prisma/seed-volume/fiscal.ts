import type { PrismaClient } from '../../src/generated/prisma';
import type { FoundationContext } from '../seed-foundation';

export async function extendFiscalCalendar(prisma: PrismaClient, ctx: FoundationContext, years: number[]) {
  const periodByYearMonth = new Map(ctx.periodByYearMonth);

  for (const year of years) {
    const existing = await prisma.fiscalYear.findUnique({ where: { year } });
    const fiscalYear =
      existing ??
      (await prisma.fiscalYear.create({
        data: {
          year,
          startDate: new Date(`${year}-01-01`),
          endDate: new Date(`${year}-12-31`),
          status: year >= 2026 ? 'OPEN' : 'CLOSED',
        },
      }));

    for (let month = 1; month <= 12; month += 1) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const period =
        (await prisma.fiscalPeriod.findFirst({
          where: { fiscalYearId: fiscalYear.id, periodNumber: month },
        })) ??
        (await prisma.fiscalPeriod.create({
          data: {
            fiscalYearId: fiscalYear.id,
            periodNumber: month,
            name: `Period ${String(month).padStart(2, '0')} - ${year}`,
            startDate,
            endDate,
            status: year >= 2026 ? 'OPEN' : 'CLOSED',
          },
        }));

      periodByYearMonth.set(`${year}-${String(month).padStart(2, '0')}`, period.id);
    }
  }

  return periodByYearMonth;
}
