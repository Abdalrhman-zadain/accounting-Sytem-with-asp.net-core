import type { PrismaClient } from '../../src/generated/prisma';
import type { FoundationContext } from '../seed-foundation';
import type { VolumeSeedConfig } from './config';
import { createRng } from './rng';

const ENTITIES = ['ReportExport', 'ReportSnapshot', 'ReportDefinition', 'ReportingSummary', 'ReportingTrialBalance'];
const ACTIONS = ['CREATE', 'VIEW', 'UPDATE'] as const;

export async function seedReportingActivity(
  prisma: PrismaClient,
  ctx: FoundationContext,
  config: VolumeSeedConfig,
  periodByYearMonth: Map<string, string>,
) {
  const rng = createRng(config.rngSeed + 7);
  const years = [...config.years].sort();

  const rows = Array.from({ length: config.auditEvents }, (_, index) => {
    const year = rng.pick(years);
    const month = rng.int(1, 12);
    const day = rng.int(1, 28);
    const createdAt = new Date(year, month - 1, day, rng.int(8, 18), rng.int(0, 59));

    return {
      userId: ctx.admin.id,
      entity: rng.pick(ENTITIES),
      entityId: `vol-${index + 1}`,
      action: rng.pick([...ACTIONS]),
      details: { source: 'seed:volume', period: `${year}-${String(month).padStart(2, '0')}` },
      createdAt,
    };
  });

  const chunkSize = 100;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    await prisma.auditLog.createMany({ data: rows.slice(offset, offset + chunkSize) });
  }

  console.log(`Inserted ${rows.length} reporting audit events.`);
}
