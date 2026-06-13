#!/usr/bin/env ts-node
/**
 * Market POS preflight — verifies DB/config readiness without a running backend.
 *
 * Usage:
 *   npm run check:market-preflight
 *   npm run check:market-preflight -- --json
 *   npm run check:market-preflight -- --quiet
 */

import { runMarketPreflight } from "../src/modules/phase-3-sales-receivables/pos-market/market-readiness.service";

function parseArgs(argv: string[]) {
  return {
    json: argv.includes("--json"),
    quiet: argv.includes("--quiet"),
  };
}

function printHumanReport(report: Awaited<ReturnType<typeof runMarketPreflight>>) {
  const status = report.ready ? "READY" : "BLOCKED";
  console.log(`\nMarket POS preflight: ${status}`);
  console.log(`Errors: ${report.errorCount}  Warnings: ${report.warnCount}\n`);

  for (const check of report.checks) {
    const icon =
      check.severity === "ok" ? "[OK]" : check.severity === "warn" ? "[WARN]" : "[FAIL]";
    console.log(`${icon} ${check.id}: ${check.message}`);
    if (check.fixHint && check.severity !== "ok") {
      console.log(`     fix: ${check.fixHint}`);
    }
  }

  if (Object.keys(report.context).length > 0) {
    console.log("\nResolved context:");
    console.log(JSON.stringify(report.context, null, 2));
  }
  console.log("");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = await runMarketPreflight();

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (!args.quiet) {
    printHumanReport(report);
  }

  process.exit(report.ready ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
