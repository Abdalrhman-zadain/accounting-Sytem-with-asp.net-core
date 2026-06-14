/**
 * pos-receipt-print.ts
 * Compact thermal 80mm sales receipt for POS payment completion.
 * Generates client-side HTML and triggers window.print() for receipt printers.
 */

import { formatWeightQuantity } from "@/features/pos/pos-weight-utils";
import {
  THERMAL_PRINT_READY_DELAY_MS,
  waitForDocumentImages,
} from "@/features/pos/pos-print-bridge";
import {
  buildThermalReceiptDocumentHtml,
  fmtThermalReceiptAmt,
  thermalReceiptFooterSpacerHtml,
  thermalReceiptItemLine,
  thermalReceiptRowLine,
  thermalReceiptTableClose,
  thermalReceiptTableOpen,
} from "@/features/pos-shared/thermal-receipt-layout";

/** Default customer-receipt logo served from `frontend/public/pos/`. */
export const POS_RECEIPT_LOGO_PATH = "/pos/mr-karshanji-logo.png";

export type PosReceiptData = {
  receiptNumber: string;
  soldAt: string;
  companyName: string;
  logoUrl?: string | null;
  branchName?: string | null;
  taxNumber?: string | null;
  cashierName: string;
  terminalName?: string | null;
  warehouseName: string;
  paymentSummary: string;
  total: number;
  paid: number;
  tendered: number;
  change: number;
  subtotal: number;
  discount: number;
  tax: number;
  lines: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    taxAmount: number;
    lineTotal: number;
    unitCode?: string;
  }>;
};

const ARABIC_PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "نقد",
  CARD: "بطاقة",
  CLIQ: "كليك",
  BANK_TRANSFER: "تحويل بنكي",
  WALLET: "محفظة",
  MIXED: "مختلط",
  DELIVERY: "توصيل",
};

export function buildArabicPaymentSummary(
  methods: string[],
  amounts?: number[],
): string {
  const uniqueMethods = [...new Set(methods.filter(Boolean))];
  if (uniqueMethods.length === 0) {
    return "";
  }
  if (uniqueMethods.length === 1) {
    const label = ARABIC_PAYMENT_METHOD_LABELS[uniqueMethods[0]] ?? uniqueMethods[0];
    if (amounts?.length === 1) {
      return `${label} ${amounts[0].toFixed(2)}`;
    }
    return label;
  }
  return "مختلط";
}

export function normalizeReceiptForArabicPrint(receipt: PosReceiptData): PosReceiptData {
  return {
    ...receipt,
    cashierName:
      receipt.cashierName.trim() === "Cashier" || !receipt.cashierName.trim()
        ? "كاشير"
        : receipt.cashierName,
    paymentSummary: receipt.paymentSummary.trim() || receipt.paymentSummary,
  };
}

const SEP = "─".repeat(32);

const RESTAURANT_RECEIPT_EXTRA_CSS = `
    .brand-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 2px;
    }
    .brand-text {
      flex: 1 1 auto;
      min-width: 0;
      text-align: right;
    }
    .logo {
      flex: 0 0 auto;
      width: 48px;
      height: 48px;
      object-fit: contain;
    }
    @media print {
      .logo {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
`;

function fmtDateCompact(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatReceiptQuantity(line: PosReceiptData["lines"][number]): string {
  if (line.unitCode) {
    return formatWeightQuantity(line.quantity, line.unitCode, 3);
  }
  return String(line.quantity);
}

function resolveReceiptLogoUrl(receipt: PosReceiptData): string | null {
  const path = receipt.logoUrl?.trim() || POS_RECEIPT_LOGO_PATH;
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return path.startsWith("/") ? path : `/${path}`;
}

function buildBrandHeaderHtml(receipt: PosReceiptData): string {
  const logoUrl = resolveReceiptLogoUrl(receipt);
  const identityMeta = [
    receipt.branchName,
    receipt.taxNumber ? `ض.ب: ${receipt.taxNumber}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (logoUrl) {
    return `
      <div class="brand-row">
        <img class="logo" src="${logoUrl}" alt="Logo"/>
        <div class="brand-text">
          <div class="title">${receipt.companyName}</div>
          <div class="sub">إيصال بيع</div>
        </div>
      </div>
      ${identityMeta ? `<div class="center meta">${identityMeta}</div>` : ""}`;
  }

  return [
    `<div class="center title">${receipt.companyName}</div>`,
    `<div class="center sub">إيصال بيع</div>`,
    identityMeta ? `<div class="center meta">${identityMeta}</div>` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildPosReceiptBodyHtml(receipt: PosReceiptData): string {
  const rows: string[] = [];

  rows.push(buildBrandHeaderHtml(receipt));
  rows.push(`<div class="sep">${SEP}</div>`);

  const metaParts = [receipt.receiptNumber, fmtDateCompact(receipt.soldAt)].filter(Boolean);
  rows.push(`<div class="center meta">${metaParts.join(" · ")}</div>`);

  const partyParts = [
    receipt.cashierName ? `كاشير: ${receipt.cashierName}` : null,
    receipt.terminalName ? `جهاز: ${receipt.terminalName}` : null,
    receipt.warehouseName ? `مستودع: ${receipt.warehouseName}` : null,
  ].filter(Boolean);

  if (partyParts.length > 0) {
    rows.push(`<div class="center meta">${partyParts.join(" · ")}</div>`);
  }

  rows.push(`<div class="sep">${SEP}</div>`);

  rows.push(thermalReceiptTableOpen());
  for (const line of receipt.lines) {
    const qty = formatReceiptQuantity(line);
    const discountNote =
      line.discountAmount > 0.009
        ? ` <span class="disc">(-${fmtThermalReceiptAmt(line.discountAmount)})</span>`
        : "";
    rows.push(thermalReceiptItemLine(qty, line.name, line.lineTotal, discountNote));
  }
  rows.push(thermalReceiptTableClose());

  rows.push(`<div class="sep">${SEP}</div>`);
  rows.push(thermalReceiptTableOpen());

  if (receipt.discount > 0.009) {
    rows.push(thermalReceiptRowLine("خصم", `-${fmtThermalReceiptAmt(receipt.discount)}`));
  }

  if (receipt.tax > 0.009) {
    rows.push(thermalReceiptRowLine("قبل الضريبة", fmtThermalReceiptAmt(receipt.subtotal)));
    rows.push(thermalReceiptRowLine("الضريبة", fmtThermalReceiptAmt(receipt.tax)));
  }

  rows.push(thermalReceiptRowLine("الإجمالي", fmtThermalReceiptAmt(receipt.total)));

  if (receipt.paid > 0.009) {
    rows.push(thermalReceiptRowLine("مدفوع", fmtThermalReceiptAmt(receipt.paid)));
  }

  if (receipt.tendered > receipt.paid + 0.009) {
    rows.push(thermalReceiptRowLine("مقبوض", fmtThermalReceiptAmt(receipt.tendered)));
  }

  if (receipt.change > 0.009) {
    rows.push(thermalReceiptRowLine("الباقي", fmtThermalReceiptAmt(receipt.change)));
  }

  if (receipt.paymentSummary.trim()) {
    rows.push(thermalReceiptRowLine("الدفع", receipt.paymentSummary));
  }

  rows.push(thermalReceiptTableClose());

  rows.push(`<div class="sep">${SEP}</div>`);
  rows.push(`<div class="center thanks">شكراً لزيارتكم</div>`);
  rows.push(thermalReceiptFooterSpacerHtml());

  return rows.join("\n");
}

export function buildPosReceiptHtml(receipt: PosReceiptData): string {
  return buildThermalReceiptDocumentHtml(
    receipt.receiptNumber,
    buildPosReceiptBodyHtml(receipt),
    RESTAURANT_RECEIPT_EXTRA_CSS,
  );
}

export function printPosReceipt(receipt: PosReceiptData): void {
  if (typeof window === "undefined") return;

  const html = buildPosReceiptHtml(receipt);
  const win = window.open("", "_blank", "width=400,height=700");
  if (!win) {
    throw new Error("PRINT_BLOCKED");
  }

  win.document.write(html);
  win.document.close();
  win.focus();

  void waitForDocumentImages(win.document).then(() => {
    window.setTimeout(() => {
      try {
        win.print();
      } catch {
        throw new Error("PRINT_FAILED");
      }
    }, THERMAL_PRINT_READY_DELAY_MS);
  });
}
