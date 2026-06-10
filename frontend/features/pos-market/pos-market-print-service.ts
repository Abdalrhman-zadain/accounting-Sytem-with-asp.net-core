import {
  buildPosMarketCollectionReceiptHtml,
  type PosMarketCollectionReceiptData,
} from "@/features/pos-market/pos-market-collection-receipt-print";
import { buildPosMarketReceiptHtml, type PosMarketReceiptData } from "@/features/pos-market/pos-market-receipt-print";
import {
  getPosMarketPrintBridgeStatus,
  printHtmlWithBrowser,
  printHtmlWithQz,
  type PosMarketPrintBridgeStatus,
} from "@/features/pos-market/pos-market-print-bridge";
import { loadPosMarketPrinterConfig } from "@/features/pos-market/pos-market-printer-config";

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

export async function testPosMarketReceiptPrinter(): Promise<PosMarketPrintResult> {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Market Receipt Printer Test</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    body {
      width: 76mm;
      padding: 5mm 2mm;
      font-family: 'Courier New', Courier, monospace;
      font-size: 13pt;
      font-weight: 800;
      text-align: center;
    }
  </style>
</head>
<body>
  <div>Market POS Receipt Test</div>
  <div>${new Date().toLocaleString()}</div>
  <div>Receipt / إيصال</div>
</body>
</html>`;

  return printConfiguredHtml(html, "pos-market-receipt-printer-test");
}

export async function getMarketPrinterBridgeStatus(): Promise<PosMarketPrintBridgeStatus> {
  return getPosMarketPrintBridgeStatus();
}

export function shouldAutoPrintReceiptOnPay(): boolean {
  return loadPosMarketPrinterConfig().autoPrintReceiptOnPay;
}
