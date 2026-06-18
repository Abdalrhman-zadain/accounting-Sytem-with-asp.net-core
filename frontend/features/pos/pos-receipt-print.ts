/**
 * pos-receipt-print.ts
 * Kashouka-style Arabic restaurant receipt for 80mm thermal POS printers.
 */

import { formatAddonsForDisplay } from "@/features/pos/pos-addon-utils";
import { formatWeightQuantity } from "@/features/pos/pos-weight-utils";
import {
  THERMAL_PRINT_READY_DELAY_MS,
  waitForDocumentImages,
} from "@/features/pos/pos-print-bridge";
import {
  buildThermalReceiptDocumentHtml,
  thermalReceiptColumnHeaderRow,
  thermalReceiptFooterSpacerHtml,
  thermalReceiptItemRow4Col,
  thermalReceiptItemAddonRow,
  thermalReceiptItemDiscountRow,
  thermalReceiptMetaLineHtml,
  thermalReceiptPaymentBoxHtml,
  thermalReceiptSepLine,
  thermalReceiptTableClose,
  thermalReceiptTableOpen,
  thermalReceiptTotalRow,
  formatReceiptPaymentSummary,
  type ThermalReceiptPaymentBoxLine,
} from "@/features/pos-shared/thermal-receipt-layout";

/** Default customer-receipt logo served from `frontend/public/pos/`. */
export const POS_RECEIPT_LOGO_PATH = "/pos/mr-karshanji-logo.png";

export type PosReceiptOrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY" | string;

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
  tableNumber?: string | null;
  orderType?: PosReceiptOrderType | null;
  waiterName?: string | null;
  deliveryAddress?: string | null;
  deliveryNotes?: string | null;
  deliveryCompanyName?: string | null;
  driverName?: string | null;
  serviceChargeAmount?: number;
  deliveryFeeAmount?: number;
  taxRatePercent?: number | null;
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
    modifiers?: unknown;
  }>;
};

/** Daily POS order sequence shown on the receipt (e.g. RECEIPT-20260618-0042 → 42). */
export function extractDailyOrderNumber(receiptNumber: string): string | null {
  const trimmed = receiptNumber?.trim();
  if (!trimmed) return null;

  const datedMatch = trimmed.match(/(?:RECEIPT|POS)-\d{8}-(\d+)$/i);
  if (datedMatch) {
    return String(Number.parseInt(datedMatch[1], 10));
  }

  const lastDash = trimmed.lastIndexOf("-");
  if (lastDash >= 0) {
    const tail = trimmed.slice(lastDash + 1);
    if (/^\d+$/.test(tail)) {
      return String(Number.parseInt(tail, 10));
    }
  }

  return trimmed;
}

const ARABIC_PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "نقد",
  CARD: "بطاقة",
  CLIQ: "كليك",
  BANK_TRANSFER: "تحويل بنكي",
  WALLET: "محفظة",
  MIXED: "مختلط",
  DELIVERY: "توصيل",
};

const ARABIC_ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: "صالة",
  TAKEAWAY: "سفري",
  DELIVERY: "توصيل",
};

const SEP = thermalReceiptSepLine();
const SEP_STRONG = thermalReceiptSepLine("═");

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

const RESTAURANT_RECEIPT_EXTRA_CSS = `
    .brand-stack {
      text-align: center;
      margin-bottom: 4px;
    }
    .logo {
      display: block;
      width: 64px;
      height: 64px;
      margin: 0 auto 4px;
      object-fit: contain;
    }
    @media print {
      .logo {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
`;

function fmtDateParts(val?: string | Date | null): { date: string; time: string } {
  if (!val) {
    return { date: "—", time: "—" };
  }
  const d = new Date(val);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
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

function resolveOrderTypeLabel(orderType?: PosReceiptOrderType | null): string | null {
  if (!orderType) {
    return null;
  }
  return ARABIC_ORDER_TYPE_LABELS[orderType] ?? orderType;
}

function buildPaymentBoxLines(receipt: PosReceiptData): ThermalReceiptPaymentBoxLine[] {
  const amountsByMethod = new Map<string, number>();

  for (const payment of receipt.payments ?? []) {
    const current = amountsByMethod.get(payment.paymentMethod) ?? 0;
    amountsByMethod.set(payment.paymentMethod, current + payment.amount);
  }

  const lines: ThermalReceiptPaymentBoxLine[] = [];

  const cash = amountsByMethod.get("CASH") ?? 0;
  if (cash > 0.009) {
    lines.push({ label: "نقد", value: cash });
  }

  const card = amountsByMethod.get("CARD") ?? 0;
  if (card > 0.009) {
    lines.push({ label: "بطاقة", value: card });
  }

  for (const [method, amount] of amountsByMethod.entries()) {
    if (method === "CASH" || method === "CARD" || amount <= 0.009) {
      continue;
    }
    lines.push({
      label: ARABIC_PAYMENT_METHOD_LABELS[method] ?? method,
      value: amount,
    });
  }

  lines.push({ label: "مدفوع", value: receipt.paid, emphasis: true, currency: true });
  if (receipt.change > 0.009) {
    lines.push({ label: "الباقي", value: receipt.change });
  }

  return lines;
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
        <div class="sub">إيصال بيع</div>
      </div>
      ${identityMeta ? thermalReceiptMetaLineHtml(identityMeta) : ""}`;
  }

  return [
    `<div class="center sub">إيصال بيع</div>`,
    identityMeta ? thermalReceiptMetaLineHtml(identityMeta) : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function sumLineDiscounts(lines: PosReceiptData["lines"]): number {
  return lines.reduce((sum, line) => sum + (line.discountAmount > 0 ? line.discountAmount : 0), 0);
}

function buildPosReceiptBodyHtml(receipt: PosReceiptData): string {
  const rows: string[] = [];
  const { date, time } = fmtDateParts(receipt.soldAt);
  const orderTypeLabel = resolveOrderTypeLabel(receipt.orderType);
  const serviceCharge = receipt.serviceChargeAmount ?? 0;
  const deliveryFee = receipt.deliveryFeeAmount ?? 0;
  const lineDiscountTotal = sumLineDiscounts(receipt.lines);
  const cartLevelDiscount = Math.max(0, receipt.discount - lineDiscountTotal);

  const orderNumber = extractDailyOrderNumber(receipt.receiptNumber);

  rows.push(buildBrandHeaderHtml(receipt));
  rows.push(`<div class="sep">${SEP}</div>`);
  rows.push(thermalReceiptMetaLineHtml(`التاريخ: ${date}`));
  rows.push(thermalReceiptMetaLineHtml(`الوقت: ${time}`));
  if (orderNumber) {
    rows.push(thermalReceiptMetaLineHtml(`رقم الطلب: ${orderNumber}`));
  }
  rows.push(`<div class="sep">${SEP}</div>`);

  if (receipt.orderType === "DINE_IN" && receipt.tableNumber) {
    rows.push(thermalReceiptMetaLineHtml(`طاولة: ${receipt.tableNumber}`));
  }

  if (orderTypeLabel) {
    rows.push(thermalReceiptMetaLineHtml(`نوع الطلب: ${orderTypeLabel}`));
  }

  if (receipt.orderType === "DELIVERY") {
    if (receipt.deliveryAddress?.trim()) {
      rows.push(thermalReceiptMetaLineHtml(`عنوان التوصيل: ${receipt.deliveryAddress.trim()}`));
    }
    if (receipt.deliveryCompanyName?.trim()) {
      rows.push(thermalReceiptMetaLineHtml(`شركة التوصيل: ${receipt.deliveryCompanyName.trim()}`));
    }
    if (receipt.driverName?.trim()) {
      rows.push(thermalReceiptMetaLineHtml(`السائق: ${receipt.driverName.trim()}`));
    }
    if (receipt.deliveryNotes?.trim()) {
      rows.push(thermalReceiptMetaLineHtml(`ملاحظات التوصيل: ${receipt.deliveryNotes.trim()}`));
    }
  }

  rows.push(`<div class="sep sep-strong">${SEP_STRONG}</div>`);

  rows.push(thermalReceiptTableOpen("items-table"));
  rows.push(
    thermalReceiptColumnHeaderRow("الصنف", "السعر", "الكمية", "الإجمالي"),
  );
  for (const line of receipt.lines) {
    const qty = formatReceiptQuantity(line);
    rows.push(
      thermalReceiptItemRow4Col(line.name, line.unitPrice, qty, line.lineTotal),
    );
    const addons = formatAddonsForDisplay(line.modifiers, "ar");
    if (addons) {
      rows.push(thermalReceiptItemAddonRow(addons));
    }
    if (line.discountAmount > 0.009) {
      rows.push(thermalReceiptItemDiscountRow(line.discountAmount));
    }
  }
  rows.push(thermalReceiptTableClose());

  rows.push(`<div class="sep sep-strong">${SEP_STRONG}</div>`);
  rows.push(thermalReceiptTableOpen("totals-table"));
  rows.push(thermalReceiptTotalRow("المجموع الفرعي", receipt.subtotal));

  if (cartLevelDiscount > 0.009) {
    rows.push(thermalReceiptTotalRow("خصم", -cartLevelDiscount));
  }

  if (serviceCharge > 0.009) {
    rows.push(thermalReceiptTotalRow("رسوم الخدمة", serviceCharge));
  }

  if (deliveryFee > 0.009) {
    rows.push(thermalReceiptTotalRow("رسوم التوصيل", deliveryFee));
  }

  if (receipt.tax > 0.009) {
    const taxLabel =
      receipt.taxRatePercent != null
        ? `الضريبة ${receipt.taxRatePercent}%`
        : "الضريبة";
    rows.push(thermalReceiptTotalRow(taxLabel, receipt.tax));
  }

  rows.push(
    thermalReceiptTotalRow("الصافي", receipt.total, { emphasis: true, currency: true }),
  );
  rows.push(thermalReceiptTableClose());

  rows.push(thermalReceiptPaymentBoxHtml(buildPaymentBoxLines(receipt)));

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
