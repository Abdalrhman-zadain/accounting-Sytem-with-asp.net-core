import { buildKitchenOrderTicketHtml } from "@/features/pos/pos-kot-print";
import { buildPosReceiptHtml, type PosReceiptData } from "@/features/pos/pos-receipt-print";
import {
  buildSessionRollReportDocumentHtml,
  type RollPrintContext,
} from "@/features/pos/pos-session-roll-print";
import {
  printHtmlWithBrowser,
  printHtmlWithQz,
  type PosPrintBridgeStatus,
  getPosPrintBridgeStatus,
} from "@/features/pos/pos-print-bridge";
import { loadPosPrinterConfig } from "@/features/pos/pos-printer-config";
import type { PosSale } from "@/types/api";

export type PosPrintTarget = "kitchen" | "receipt";

export type PosPrintResult = {
  ok: boolean;
  mode: "qz" | "browser";
  fallback: boolean;
  error?: string;
};

function getPrinterName(target: PosPrintTarget): string | null {
  const config = loadPosPrinterConfig();
  return target === "kitchen" ? config.kitchenPrinterName : config.receiptPrinterName;
}

async function printConfiguredHtml(
  html: string,
  target: PosPrintTarget,
  browserWindowName: string,
): Promise<PosPrintResult> {
  const config = loadPosPrinterConfig();

  if (config.printBridge === "browser") {
    printHtmlWithBrowser(html, browserWindowName);
    return { ok: true, mode: "browser", fallback: false };
  }

  try {
    await printHtmlWithQz(getPrinterName(target), html);
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

export async function printKitchenTicket(
  sale: PosSale,
  language: string,
): Promise<PosPrintResult> {
  return printConfiguredHtml(
    buildKitchenOrderTicketHtml(sale, language),
    "kitchen",
    "pos-kitchen-ticket",
  );
}

export async function printCustomerReceipt(
  receipt: PosReceiptData,
): Promise<PosPrintResult> {
  return printConfiguredHtml(
    buildPosReceiptHtml(receipt),
    "receipt",
    "pos-customer-receipt",
  );
}

export async function printReceiptHtml(html: string): Promise<PosPrintResult> {
  return printConfiguredHtml(html, "receipt", "pos-receipt-roll");
}

export async function printSessionRoll(ctx: RollPrintContext): Promise<PosPrintResult> {
  return printReceiptHtml(buildSessionRollReportDocumentHtml(ctx));
}

export async function testPosPrinter(target: PosPrintTarget): Promise<PosPrintResult> {
  const isKitchen = target === "kitchen";
  const title = isKitchen ? "Kitchen Printer Test" : "Receipt Printer Test";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 76mm;
      padding: 5mm 2mm;
      font-family: 'Courier New', Courier, monospace;
      color: #000;
      font-size: 13pt;
      font-weight: 800;
      text-align: center;
    }
    .title { font-size: 17pt; margin-bottom: 6pt; }
    .sub { font-size: 11pt; margin-top: 4pt; }
  </style>
</head>
<body>
  <div class="title">${title}</div>
  <div>${new Date().toLocaleString()}</div>
  <div class="sub">${isKitchen ? "KOT / تذكرة مطبخ" : "Receipt / إيصال"}</div>
</body>
</html>`;

  return printConfiguredHtml(html, target, `pos-${target}-printer-test`);
}

export async function getPrinterBridgeStatus(): Promise<PosPrintBridgeStatus> {
  return getPosPrintBridgeStatus();
}
