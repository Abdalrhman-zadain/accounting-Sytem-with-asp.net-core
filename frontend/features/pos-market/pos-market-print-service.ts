import {
  buildPosMarketCollectionReceiptHtml,
  type PosMarketCollectionReceiptData,
} from "@/features/pos-market/pos-market-collection-receipt-print";
import { buildPosMarketReceiptHtml, buildSamplePosMarketReceiptData, type PosMarketReceiptData } from "@/features/pos-market/pos-market-receipt-print";
import {
  buildPosMarketAccountStatementA4Html,
} from "@/features/pos-market/pos-market-statement-a4-print";
import {
  buildPosMarketRepStatementA4Html,
} from "@/features/pos-market/pos-market-rep-statement-a4-print";
import {
  buildPosMarketAccountStatementHtml,
  type PosMarketAccountStatementData,
} from "@/features/pos-market/pos-market-statement-print";
import {
  getPosMarketPrintBridgeStatus,
  printHtmlWithBrowser,
  printHtmlWithQz,
  type PosMarketPrintBridgeStatus,
} from "@/features/pos-market/pos-market-print-bridge";
import { loadPosMarketPrinterConfig } from "@/features/pos-market/pos-market-printer-config";
import { mapPosReceiptToPrintData } from "@/features/pos-market/pos-market-cart-utils";
import { reprintPosMarketReceipt } from "@/lib/api/pos-market";
import type { PosMarketAccountStatementReport, PosMarketRepStatementReport } from "@/lib/api/pos-market";

export type PosMarketPrintResult = {
  ok: boolean;
  mode: "qz" | "browser";
  fallback: boolean;
  error?: string;
};

async function printConfiguredHtml(
  html: string,
  browserWindowName: string,
): Promise<PosMarketPrintResult> {
  const config = loadPosMarketPrinterConfig();

  if (config.printBridge === "browser") {
    printHtmlWithBrowser(html, browserWindowName);
    return { ok: true, mode: "browser", fallback: false };
  }

  try {
    await printHtmlWithQz(config.receiptPrinterName, html);
    return { ok: true, mode: "qz", fallback: false };
  } catch (error) {
    printHtmlWithBrowser(html, browserWindowName);
    return {
      ok: true,
      mode: "browser",
      fallback: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function printMarketCustomerReceipt(
  receipt: PosMarketReceiptData,
): Promise<PosMarketPrintResult> {
  return printConfiguredHtml(
    buildPosMarketReceiptHtml(receipt),
    "pos-market-customer-receipt",
  );
}

export async function printMarketCollectionReceipt(
  receipt: PosMarketCollectionReceiptData,
): Promise<PosMarketPrintResult> {
  return printConfiguredHtml(
    buildPosMarketCollectionReceiptHtml(receipt),
    "pos-market-collection-receipt",
  );
}

export async function printMarketAccountStatement(
  statement: PosMarketAccountStatementData,
): Promise<PosMarketPrintResult> {
  return printConfiguredHtml(
    buildPosMarketAccountStatementHtml(statement),
    "pos-market-account-statement",
  );
}

export async function printMarketAccountStatementA4(
  report: PosMarketAccountStatementReport,
  options: { generatedBy?: string | null } = {},
): Promise<PosMarketPrintResult> {
  printHtmlWithBrowser(
    buildPosMarketAccountStatementA4Html(report, options),
    "pos-market-account-statement-a4",
  );
  return { ok: true, mode: "browser", fallback: false };
}

export async function exportMarketAccountStatementPdf(
  report: PosMarketAccountStatementReport,
  options: { generatedBy?: string | null } = {},
): Promise<PosMarketPrintResult> {
  return printMarketAccountStatementA4(report, options);
}

export async function printMarketRepStatementA4(
  report: PosMarketRepStatementReport,
  options: { generatedBy?: string | null } = {},
): Promise<PosMarketPrintResult> {
  printHtmlWithBrowser(
    buildPosMarketRepStatementA4Html(report, options),
    "pos-market-rep-statement-a4",
  );
  return { ok: true, mode: "browser", fallback: false };
}

export async function exportMarketRepStatementPdf(
  report: PosMarketRepStatementReport,
  options: { generatedBy?: string | null } = {},
): Promise<PosMarketPrintResult> {
  return printMarketRepStatementA4(report, options);
}

export async function testPosMarketReceiptPrinter(): Promise<PosMarketPrintResult> {
  return printConfiguredHtml(
    buildPosMarketReceiptHtml(buildSamplePosMarketReceiptData()),
    "pos-market-receipt-printer-test",
  );
}

export function buildPosMarketReceiptPreviewHtml(
  receipt: PosMarketReceiptData = buildSamplePosMarketReceiptData(),
): string {
  return buildPosMarketReceiptHtml(receipt);
}

export async function getMarketPrinterBridgeStatus(): Promise<PosMarketPrintBridgeStatus> {
  return getPosMarketPrintBridgeStatus();
}

export function shouldAutoPrintReceiptOnPay(): boolean {
  return loadPosMarketPrinterConfig().autoPrintReceiptOnPay;
}

export async function reprintMarketCustomerReceipt(
  saleId: string,
  token?: string | null,
  options?: { destinationMarketName?: string | null; saleReference?: string | null },
): Promise<PosMarketPrintResult> {
  const response = await reprintPosMarketReceipt(saleId, token);
  return printMarketCustomerReceipt(
    mapPosReceiptToPrintData(response.receipt, {
      destinationMarketName: options?.destinationMarketName ?? response.sale.customer?.name ?? null,
      saleReference: options?.saleReference ?? response.sale.reference,
    }),
  );
}
