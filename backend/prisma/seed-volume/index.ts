import type { PrismaClient } from '../../src/generated/prisma';
import type { FoundationContext } from '../seed-foundation';
import { loadVolumeSeedConfig } from './config';
import { extendFiscalCalendar } from './fiscal';
import { generateVolumeLedger } from './ledger-generator';
import { seedVolumeMasters } from './masters';
import { seedOperationalSamples } from './operational-samples';
import { seedReportingActivity } from './reporting-activity';

export async function runVolumeSeed(prisma: PrismaClient, foundation: FoundationContext) {
  const config = loadVolumeSeedConfig();
  console.log('Starting enterprise volume seed...', config);

  const periodByYearMonth = await extendFiscalCalendar(prisma, foundation, config.years);
  const masters = await seedVolumeMasters(prisma, foundation, config);
  await generateVolumeLedger(prisma, foundation, masters, periodByYearMonth, config);
  await seedReportingActivity(prisma, foundation, config, periodByYearMonth);
  await seedOperationalSamples(prisma, foundation, masters);

  console.log('Enterprise volume seed finished.');
}
