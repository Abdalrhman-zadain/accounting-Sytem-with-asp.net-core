import {
  buildKitchenDeltaTicketHtml,
  buildKitchenOrderTicketHtml,
  buildKitchenTicketHtmlForLines,
  buildKitchenVoidTicketHtml,
} from "@/features/pos/pos-kot-print";
import {
  captureKitchenLineSnapshotFromSale,
  diffKitchenSnapshots,
  hasKitchenPrintDiff,
  type KitchenLineSnapshot,
  type KitchenPrintDiff,
  unsentKitchenLines,
} from "@/features/pos/pos-kitchen-print-delta";
import {
  buildPosReceiptHtml,
  normalizeReceiptForArabicPrint,
  type PosReceiptData,
} from "@/features/pos/pos-receipt-print";
import {
  buildSessionRollReportDocumentHtml,
  type RollPrintContext,
} from "@/features/pos/pos-session-roll-print";
import {
  THERMAL_PAGE_SIDE_MARGIN,
  THERMAL_PRINTABLE_WIDTH_MM,
  THERMAL_RECEIPT_SIDE_PADDING,
  THERMAL_ROLL_PAGE_WIDTH,
} from "@/features/pos-shared/thermal-receipt-layout";
import {
  printHtmlWithBrowser,
  printHtmlWithQz,
  type PosPrintBridgeStatus,
  getPosPrintBridgeStatus,
} from "@/features/pos/pos-print-bridge";
import {
  getPosLocalAgentBridgeStatus,
  printHtmlWithLocalAgentBridge,
} from "@/features/pos/pos-local-agent-bridge";
import { loadPosPrinterConfig, type PosPrintBridgeMode } from "@/features/pos/pos-printer-config";
import type { PosSale } from "@/types/api";

export type PosPrintTarget = "kitchen" | "receipt";

export type PosPrintResult = {
  ok: boolean;
  mode: PosPrintBridgeMode;
  fallback: boolean;
  error?: string;
};

function getPrinterName(target: PosPrintTarget): string | null {
  const config = loadPosPrinterConfig();
  return target === "kitchen" ? config.kitchenPrinterName : config.receiptPrinterName;
}

async function tryAgentPrint(
  printerName: string | null,
  html: string,
): Promise<void> {
  await printHtmlWithLocalAgentBridge(printerName, prepareHtmlForAgentPrint(html));
}

/** Ensure relative asset URLs resolve when the agent renders HTML via NavigateToString. */
function prepareHtmlForAgentPrint(html: string): string {
  if (typeof window === "undefined") {
    return html;
  }
  if (html.includes("<base ") || html.includes("<base>")) {
    return html;
  }
  const baseTag = `<base href="${window.location.origin}/">`;
  if (html.includes("<head>")) {
    return html.replace("<head>", `<head>${baseTag}`);
  }
  if (html.includes("<HEAD>")) {
    return html.replace("<HEAD>", `<HEAD>${baseTag}`);
  }
  return html;
}

async function tryQzPrint(printerName: string | null, html: string): Promise<void> {
  await printHtmlWithQz(printerName, html);
}

async function printConfiguredHtml(
  html: string,
  target: PosPrintTarget,
  browserWindowName: string,
): Promise<PosPrintResult> {
  const config = loadPosPrinterConfig();
  const printerName = getPrinterName(target);

  if (config.printBridge === "browser") {
    printHtmlWithBrowser(html, browserWindowName);
    return { ok: true, mode: "browser", fallback: false };
  }

  if (config.printBridge === "agent") {
    await tryAgentPrint(printerName, html);
    return { ok: true, mode: "agent", fallback: false };
  }

  await tryQzPrint(printerName, html);
  return { ok: true, mode: "qz", fallback: false };
}

function skippedPrintResult(): PosPrintResult {
  return { ok: true, mode: loadPosPrinterConfig().printBridge, fallback: false };
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

export async function printKitchenTicketForLineIds(
  sale: PosSale,
  lineIds: string[],
  language: string,
): Promise<PosPrintResult> {
  if (lineIds.length === 0) {
    return skippedPrintResult();
  }
  return printConfiguredHtml(
    buildKitchenTicketHtmlForLines(sale, lineIds, language),
    "kitchen",
    "pos-kitchen-ticket",
  );
}

export async function printKitchenDelta(
  sale: PosSale,
  deltaLines: KitchenPrintDiff["additions"],
  language: string,
): Promise<PosPrintResult> {
  if (deltaLines.length === 0) {
    return skippedPrintResult();
  }
  return printConfiguredHtml(
    buildKitchenDeltaTicketHtml(sale, deltaLines, language),
    "kitchen",
    "pos-kitchen-delta",
  );
}

export async function printKitchenVoid(
  sale: PosSale,
  voidLines: KitchenPrintDiff["voids"],
  language: string,
): Promise<PosPrintResult> {
  if (voidLines.length === 0) {
    return skippedPrintResult();
  }
  return printConfiguredHtml(
    buildKitchenVoidTicketHtml(sale, voidLines, language),
    "kitchen",
    "pos-kitchen-void",
  );
}

export async function printKitchenDiff(
  sale: PosSale,
  diff: KitchenPrintDiff,
  language: string,
): Promise<PosPrintResult[]> {
  const results: PosPrintResult[] = [];
  const voidLines = [...diff.voids, ...diff.qtyDecreases];
  if (voidLines.length > 0) {
    results.push(await printKitchenVoid(sale, voidLines, language));
  }
  if (diff.additions.length > 0) {
    results.push(await printKitchenDelta(sale, diff.additions, language));
  }
  return results;
}

export async function applyPosKitchenUpdatePrints(options: {
  snapshotBefore: KitchenLineSnapshot[];
  sale: PosSale;
  autoPrintKot: boolean;
  language: string;
}): Promise<PosPrintResult[]> {
  if (!options.autoPrintKot) {
    return [];
  }

  const after = captureKitchenLineSnapshotFromSale(options.sale);
  const diff = diffKitchenSnapshots(options.snapshotBefore, after);
  if (!hasKitchenPrintDiff(diff)) {
    return [];
  }

  return printKitchenDiff(options.sale, diff, options.language);
}

export async function applyPosPayCompletePrints(options: {
  snapshotBefore: KitchenLineSnapshot[];
  sale: PosSale;
  receipt: PosReceiptData;
  autoPrintKot: boolean;
  autoPrintReceipt: boolean;
  language: string;
}): Promise<{ receipt?: PosPrintResult; kitchen: PosPrintResult[] }> {
  const results: { receipt?: PosPrintResult; kitchen: PosPrintResult[] } = {
    kitchen: [],
  };

  const unsentBefore = unsentKitchenLines(options.snapshotBefore);
  if (options.autoPrintKot && unsentBefore.length > 0) {
    const newlySentLineIds = options.sale.lines
      .filter((line) => line.kitchenSentAt)
      .filter((line) =>
        unsentBefore.some(
          (beforeLine) =>
            beforeLine.lineId === line.id ||
            (beforeLine.itemId === (line.itemId ?? "") &&
              !beforeLine.kitchenSentAt),
        ),
      )
      .map((line) => line.id);

    if (newlySentLineIds.length > 0) {
      results.kitchen.push(
        await printKitchenTicketForLineIds(
          options.sale,
          newlySentLineIds,
          options.language,
        ),
      );
    } else {
      const after = captureKitchenLineSnapshotFromSale(options.sale);
      const diff = diffKitchenSnapshots(options.snapshotBefore, after);
      if (diff.additions.length > 0) {
        results.kitchen.push(
          await printKitchenDelta(options.sale, diff.additions, options.language),
        );
      }
    }
  }

  if (options.autoPrintReceipt) {
    results.receipt = await printCustomerReceipt(options.receipt);
  }

  return results;
}

export async function printCustomerReceipt(
  receipt: PosReceiptData,
): Promise<PosPrintResult> {
  return printConfiguredHtml(
    buildPosReceiptHtml(normalizeReceiptForArabicPrint(receipt)),
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
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>
    @page { size: ${THERMAL_ROLL_PAGE_WIDTH} auto; margin: 0 ${THERMAL_PAGE_SIDE_MARGIN}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: ${THERMAL_PRINTABLE_WIDTH_MM}mm;
      max-width: ${THERMAL_PRINTABLE_WIDTH_MM}mm;
      margin: 0 auto;
      padding: 5mm ${THERMAL_RECEIPT_SIDE_PADDING};
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
  const config = loadPosPrinterConfig();
  if (config.printBridge === "browser") {
    return { mode: "browser", available: true, printers: [] };
  }
  if (config.printBridge === "agent") {
    return getPosLocalAgentBridgeStatus();
  }
  return getPosPrintBridgeStatus();
}

export type { KitchenLineSnapshot, KitchenPrintDiff };
