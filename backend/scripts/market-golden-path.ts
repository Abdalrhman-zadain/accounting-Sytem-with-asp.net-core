#!/usr/bin/env ts-node
/**
 * Market POS golden path — end-to-end HTTP smoke test:
 * cash sale + credit sale + session posting + receivables collection.
 *
 * Prerequisites:
 *   - PostgreSQL with seed:market-showcase (or full seed)
 *   - Backend running (npm run start:dev)
 *   - Preflight checks passing
 *
 * Usage:
 *   npm run check:market-golden-path
 *   npm run check:market-golden-path -- --dry-run   # preflight only
 */

import { PrismaClient } from "../src/generated/prisma";
import { runMarketPreflight } from "../src/modules/phase-3-sales-receivables/pos-market/market-readiness.service";
import { MarketApiClient, assertTruthy, logStep } from "./lib/market-api-client";

type DestinationMarket = { id: string; code: string; name: string };
type SalesRep = { id: string; code: string; name: string };
type CatalogItem = {
  id: string;
  code: string;
  name: string;
  defaultSalesPrice?: string | null;
  salesAccountId?: string | null;
  onHandQuantity?: number;
};
type PosSession = {
  id: string;
  sessionNumber: string;
  openingCash: string;
  expectedCash: string;
};
type PosSale = {
  id: string;
  reference: string;
  totalAmount: string;
  outstandingAmount?: string;
  customerId?: string;
};
type CompleteSaleResponse = {
  sale: PosSale;
  receipt?: unknown;
};

const OPENING_CASH = 100;

function env(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

function parseArgs(argv: string[]) {
  return { dryRun: argv.includes("--dry-run") };
}

function pickCatalogItems(catalog: CatalogItem[]) {
  const inStock = catalog.filter((item) => (item.onHandQuantity ?? 0) >= 1);
  if (inStock.length < 2) {
    throw new Error("Need at least 2 catalog items with rep car stock for golden path.");
  }
  return { cashItem: inStock[0]!, creditItem: inStock[1]! };
}

function unitPrice(item: CatalogItem) {
  const price = Number(item.defaultSalesPrice ?? 0);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Catalog item ${item.code} has no defaultSalesPrice.`);
  }
  return price;
}

function resolveRevenueAccountId(item: CatalogItem, fallbackRevenueAccountId?: string | null) {
  const fromItem = item.salesAccountId?.trim();
  if (fromItem) {
    return fromItem;
  }
  const fallback = fallbackRevenueAccountId?.trim();
  if (fallback) {
    return fallback;
  }
  throw new Error(`Catalog item ${item.code} has no salesAccountId and no POS revenue mapping fallback.`);
}

function linePayload(item: CatalogItem, unitPriceValue: number, revenueAccountId: string) {
  return {
    itemId: item.id,
    quantity: 1,
    unitPrice: unitPriceValue,
    revenueAccountId,
  };
}

async function ensureNoOpenSession(client: MarketApiClient) {
  const active = await client.get<PosSession | null>("/pos-market/sessions/active");
  if (!active) {
    return;
  }
  logStep(0, `Closing leftover open session ${active.sessionNumber}`);
  await client.post(`/pos-market/sessions/${active.id}/close`, {
    actualCash: Number(active.expectedCash ?? active.openingCash),
    notes: "market-golden-path cleanup",
  });
}

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.MARKET_GOLDEN_PATH_ALLOW_PRODUCTION) {
    throw new Error(
      "Refusing to run golden path in production. Set MARKET_GOLDEN_PATH_ALLOW_PRODUCTION=1 to override.",
    );
  }

  const args = parseArgs(process.argv.slice(2));
  const baseUrl = env("API_BASE_URL", "http://localhost:3007/api");
  const cashierUser = env("MARKET_CASHIER_USER", "market_cashier");
  const cashierPassword = env("MARKET_CASHIER_PASSWORD", "market123");
  const adminUser = env("ADMIN_USER", "admin");
  const adminPassword = env("ADMIN_PASSWORD", "admin123");

  logStep(1, "Running preflight checks");
  const prisma = new PrismaClient();
  let preflight;
  try {
    preflight = await runMarketPreflight(prisma);
  } finally {
    await prisma.$disconnect();
  }

  if (!preflight.ready) {
    console.error("Preflight failed. Run npm run check:market-preflight for details.");
    process.exit(1);
  }

  if (args.dryRun) {
    console.log("Dry run: preflight passed. Skipping HTTP golden path.");
    process.exit(0);
  }

  const client = new MarketApiClient(baseUrl);

  logStep(2, `Login as market cashier (${cashierUser})`);
  await client.login(cashierUser, cashierPassword);
  await ensureNoOpenSession(client);

  const destinationMarkets = await client.get<DestinationMarket[]>("/pos-market/destination-markets");
  const customer = assertTruthy(
    destinationMarkets[0],
    "No destination markets returned from API.",
  );

  const salesReps = await client.get<SalesRep[]>("/pos-market/sales-reps");
  const salesRep = assertTruthy(
    salesReps.find((row) => row.id === preflight.context.salesRepId) ?? salesReps[0],
    "No sales reps returned from API.",
  );

  const catalog = await client.get<CatalogItem[]>(
    `/pos-market/catalog?salesRepId=${encodeURIComponent(salesRep.id)}`,
  );
  const settings = await client.get<{ accounts: { salesRevenueAccountId?: string | null } }>(
    "/pos-market/settings",
  );
  const fallbackRevenueAccountId = settings.accounts.salesRevenueAccountId;
  const { cashItem, creditItem } = pickCatalogItems(catalog);

  const warehouseId = assertTruthy(preflight.context.warehouseId, "Preflight missing warehouseId.");
  const cashRegisterId = assertTruthy(
    preflight.context.cashRegisterId,
    "Preflight missing cashRegisterId.",
  );

  logStep(3, "Open market POS session");
  const session = await client.post<PosSession>("/pos-market/sessions/open", {
    warehouseId,
    cashAccountId: cashRegisterId,
    salesRepId: salesRep.id,
    openingCash: OPENING_CASH,
    notes: "market-golden-path",
  });

  const cashUnitPrice = unitPrice(cashItem);
  const creditUnitPrice = unitPrice(creditItem);

  logStep(4, `Complete cash sale (${cashItem.code})`);
  const cashSaleResponse = await client.post<CompleteSaleResponse>("/pos-market/sales/complete", {
    sessionId: session.id,
    customerId: customer.id,
    description: "market-golden-path cash",
    lines: [
      linePayload(
        cashItem,
        cashUnitPrice,
        resolveRevenueAccountId(cashItem, fallbackRevenueAccountId),
      ),
    ],
    payments: [{ amount: cashUnitPrice, paymentMethod: "CASH" }],
  });
  const cashSale = cashSaleResponse.sale;

  logStep(5, `Complete credit sale (${creditItem.code}, pay later)`);
  const creditSaleResponse = await client.post<CompleteSaleResponse>("/pos-market/sales/complete", {
    sessionId: session.id,
    customerId: customer.id,
    description: "market-golden-path credit",
    lines: [
      linePayload(
        creditItem,
        creditUnitPrice,
        resolveRevenueAccountId(creditItem, fallbackRevenueAccountId),
      ),
    ],
    payments: [],
  });
  const creditSale = creditSaleResponse.sale;

  const expectedCloseCash = OPENING_CASH + cashUnitPrice;
  logStep(6, `Close session (actualCash=${expectedCloseCash})`);
  await client.post(`/pos-market/sessions/${session.id}/close`, {
    actualCash: expectedCloseCash,
    notes: "market-golden-path",
  });

  logStep(7, `Login as admin (${adminUser})`);
  await client.login(adminUser, adminPassword);

  logStep(8, "Approve session accounting");
  await client.post(`/pos-market/sessions/${session.id}/accounting-approve`, {
    notes: "market-golden-path",
  });

  logStep(9, "Verify posted session journal in database");
  const verifyPrisma = new PrismaClient();
  try {
    const postedSales = await verifyPrisma.salesInvoice.findMany({
      where: {
        id: { in: [cashSale.id, creditSale.id] },
      },
      select: {
        id: true,
        posAccountingStatus: true,
        outstandingAmount: true,
      },
    });
    for (const sale of postedSales) {
      if (sale.posAccountingStatus !== "POSTED") {
        throw new Error(`Sale ${sale.id} was not posted (status=${sale.posAccountingStatus}).`);
      }
    }

    const sessionJournal = await verifyPrisma.journalEntry.findFirst({
      where: {
        sourceType: "PosSession",
        sourceId: session.id,
        status: "POSTED",
      },
      select: { id: true, reference: true },
    });
    if (!sessionJournal) {
      throw new Error("Posted grouped session journal entry was not found.");
    }

    const creditOutstanding = Number(
      postedSales.find((row) => row.id === creditSale.id)?.outstandingAmount ?? 0,
    );
    if (creditOutstanding <= 0) {
      throw new Error("Credit sale did not leave an outstanding balance.");
    }

    logStep(10, `Collect receivable (${creditOutstanding.toFixed(2)} JOD)`);
    await client.post("/pos-market/receivables/collect", {
      customerId: customer.id,
      receiptDate: new Date().toISOString(),
      amount: creditOutstanding,
      bankCashAccountId: cashRegisterId,
      description: "market-golden-path collection",
      allocations: [{ salesInvoiceId: creditSale.id, amount: creditOutstanding }],
    });

    const creditAfter = await verifyPrisma.salesInvoice.findUnique({
      where: { id: creditSale.id },
      select: { outstandingAmount: true },
    });
    if (Number(creditAfter?.outstandingAmount ?? -1) !== 0) {
      throw new Error("Credit invoice outstanding balance was not cleared after collection.");
    }

    const receipt = await verifyPrisma.bankCashTransaction.findFirst({
      where: {
        customerId: customer.id,
        kind: "RECEIPT",
        status: "POSTED",
        amount: creditOutstanding,
      },
      select: { id: true, journalEntryId: true, reference: true },
      orderBy: { createdAt: "desc" },
    });
    if (!receipt?.journalEntryId) {
      throw new Error("Posted customer receipt journal was not found after collection.");
    }

    console.log("\nGolden path PASSED");
    console.log(`  Session: ${session.sessionNumber}`);
    console.log(`  Cash sale: ${cashSale.reference}`);
    console.log(`  Credit sale: ${creditSale.reference}`);
    console.log(`  Session journal: ${sessionJournal.reference}`);
    console.log(`  Collection receipt: ${receipt.id}`);
  } finally {
    await verifyPrisma.$disconnect();
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("\nGolden path FAILED:", error instanceof Error ? error.message : error);
  process.exit(2);
});
