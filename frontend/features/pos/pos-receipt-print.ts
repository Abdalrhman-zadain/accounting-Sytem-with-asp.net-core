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
  formatReceiptPaymentSummary,
  thermalReceiptFooterSpacerHtml,
  thermalReceiptItemLine,
  thermalReceiptMetaLineHtml,
  thermalReceiptPaymentBlockHtml,
  thermalReceiptRowLine,
  thermalReceiptSepLine,
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
  payments?: Array<{
    paymentMethod: string;
    amount: number;
  }>;
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

export function resolveReceiptPaymentDisplay(receipt: PosReceiptData): string {
  if (receipt.payments?.length) {
    return buildArabicPaymentSummary(
      receipt.payments.map((payment) => payment.paymentMethod),
      receipt.payments.map((payment) => payment.amount),
    );
  }

  if (receipt.paymentSummary.trim()) {
    return formatReceiptPaymentSummary(receipt.paymentSummary);
  }

  return "";
}

export function normalizeReceiptForArabicPrint(receipt: PosReceiptData): PosReceiptData {
  return {
    ...receipt,
    cashierName:
      receipt.cashierName.trim() === "Cashier" || !receipt.cashierName.trim()
        ? "كاشير"
        : receipt.cashierName,
    paymentSummary: resolveReceiptPaymentDisplay(receipt),
  };
}

const SEP = thermalReceiptSepLine();

const RESTAURANT_RECEIPT_EXTRA_CSS = `
    .brand-stack {
      text-align: center;
      margin-bottom: 2px;
    }
    .logo {
      display: block;
      width: 32px;
      height: 32px;
      margin: 0 auto 2px;
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
      <div class="brand-stack">
        <img class="logo" src="${logoUrl}" alt="Logo"/>
        <div class="title">${receipt.companyName}</div>
        <div class="sub">إيصال بيع</div>
      </div>
      ${identityMeta ? thermalReceiptMetaLineHtml(identityMeta) : ""}`;
  }

  return [
    `<div class="center title">${receipt.companyName}</div>`,
    `<div class="center sub">إيصال بيع</div>`,
    identityMeta ? thermalReceiptMetaLineHtml(identityMeta) : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildWarehouseMetaLines(warehouseName: string): string[] {
  const trimmed = warehouseName.trim();
  if (!trimmed || trimmed === "—") {
    return [];
  }

  const parts = trimmed
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return [thermalReceiptMetaLineHtml(`مستودع: ${trimmed}`)];
  }

  return [
    thermalReceiptMetaLineHtml(`مستودع: ${parts[0]}`),
    ...parts.slice(1).map((part) => thermalReceiptMetaLineHtml(part)),
  ];
}

function buildPosReceiptBodyHtml(receipt: PosReceiptData): string {
  const rows: string[] = [];

  rows.push(buildBrandHeaderHtml(receipt));
  rows.push(`<div class="sep">${SEP}</div>`);

  if (receipt.receiptNumber) {
    rows.push(thermalReceiptMetaLineHtml(receipt.receiptNumber));
  }
  rows.push(thermalReceiptMetaLineHtml(fmtDateCompact(receipt.soldAt)));

  if (receipt.cashierName) {
    rows.push(thermalReceiptMetaLineHtml(`كاشير: ${receipt.cashierName}`));
  }
  if (receipt.terminalName) {
    rows.push(thermalReceiptMetaLineHtml(`جهاز: ${receipt.terminalName}`));
  }
  rows.push(...buildWarehouseMetaLines(receipt.warehouseName));

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

  const paymentDisplay = resolveReceiptPaymentDisplay(receipt);
  if (paymentDisplay) {
    rows.push(thermalReceiptPaymentBlockHtml("الدفع", paymentDisplay));
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
