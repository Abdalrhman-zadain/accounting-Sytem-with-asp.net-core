/**
 * pos-receipt-print.ts
 * Old boxed Arabic restaurant receipt clone for 80mm thermal POS printers.
 */

import { formatAddonsForDisplay } from "@/features/pos/pos-addon-utils";
import { formatPosLineQuantityDisplay } from "@/features/pos/pos-weight-utils";
import {
  THERMAL_PRINT_READY_DELAY_MS,
  waitForDocumentImages,
} from "@/features/pos/pos-print-bridge";
import {
  buildThermalReceiptDocumentHtml,
  thermalReceiptColumnHeaderRow,
  thermalReceiptFooterSpacerHtml,
  thermalReceiptItemAddonRow,
  thermalReceiptItemDiscountRow,
  thermalReceiptLtrInlineHtml,
  thermalReceiptTableClose,
  thermalReceiptTableOpen,
  fmtThermalReceiptMoney,
} from "@/features/pos-shared/thermal-receipt-layout";

/** Default customer-receipt logo served from `frontend/public/pos/`. */
export const POS_RECEIPT_LOGO_PATH = "/pos/mr-karshanji-logo.png";

/** Printed when the API does not supply receipt branding (matches backend defaults). */
export const POS_RECEIPT_DEFAULT_PHONE = "079 120 84 88";
export const POS_RECEIPT_DEFAULT_ADDRESS = "المقابلين - شارع القدس";
export const POS_RECEIPT_DEFAULT_TAGLINE =
  "كرشات - مقادم - روس - فوارغ - طحالات - سناكات";

export type PosReceiptOrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY" | string;

export type PosReceiptKind = "sale" | "provisional";

export type PosReceiptData = {
  receiptKind?: PosReceiptKind;
  receiptNumber: string;
  soldAt: string;
  companyName: string;
  logoUrl?: string | null;
  branchName?: string | null;
  taxNumber?: string | null;
  phone?: string | null;
  address?: string | null;
  tagline?: string | null;
  cashierName: string;
  terminalName?: string | null;
  warehouseName: string;
  tableNumber?: string | null;
  orderType?: PosReceiptOrderType | null;
  waiterName?: string | null;
  deliveryAddress?: string | null;
  deliveryNotes?: string | null;
  orderNotes?: string | null;
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

export function buildArabicPaymentSummary(
  methods: string[],
  amounts?: number[],
): string {
  void amounts;
  const uniqueMethods = [...new Set(methods.filter(Boolean))];
  if (uniqueMethods.length === 0) {
    return "";
  }
  if (uniqueMethods.length === 1) {
    return ARABIC_PAYMENT_METHOD_LABELS[uniqueMethods[0]] ?? uniqueMethods[0];
  }
  return "مختلط";
}

function stripPaymentSummaryAmounts(summary: string): string {
  const parts = summary
    .split(/\s*\+\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/\s+[-+]?\d+(?:[.,]\d+)?\s*$/, "").trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "";
  }
  if (parts.length > 1) {
    return "مختلط";
  }

  const normalized = parts[0].toUpperCase().replace(/[\s-]+/g, "_");
  return ARABIC_PAYMENT_METHOD_LABELS[normalized] ?? parts[0];
}

export function resolveReceiptPaymentDisplay(receipt: PosReceiptData): string {
  if (receipt.payments?.length) {
    return buildArabicPaymentSummary(
      receipt.payments.map((payment) => payment.paymentMethod),
      receipt.payments.map((payment) => payment.amount),
    );
  }

  if (receipt.paymentSummary.trim()) {
    return stripPaymentSummaryAmounts(receipt.paymentSummary);
  }

  return "";
}

export function normalizeReceiptCashierName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "Cashier" || trimmed === "POS Cashier") {
    return "كاشير";
  }
  return name;
}

export function normalizeReceiptForArabicPrint(receipt: PosReceiptData): PosReceiptData {
  return {
    ...receipt,
    cashierName: normalizeReceiptCashierName(receipt.cashierName),
    paymentSummary: resolveReceiptPaymentDisplay(receipt),
  };
}

const RESTAURANT_RECEIPT_EXTRA_CSS = `
    body {
      padding: 4mm 1.5mm 6mm;
      font-family: Tahoma, 'Arial', sans-serif;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.3;
    }
    .brand-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.5mm;
      margin-bottom: 1.5mm;
      padding: 0;
      text-align: center;
    }
    .logo-inline {
      flex: 0 0 auto;
      width: 19mm;
      height: 19mm;
      object-fit: contain;
    }
    .brand-text {
      flex: none;
      min-width: 0;
      text-align: center;
    }
    .brand-name {
      font-size: 15px;
      font-weight: 900;
      line-height: 1.1;
      margin-bottom: 0;
    }
    .receipt-number-strip {
      width: 100%;
      direction: ltr;
      unicode-bidi: isolate;
      text-align: left;
      font-size: 12px;
      font-weight: 800;
      line-height: 1;
      padding-left: 1mm;
      margin-bottom: -0.5mm;
    }
    .receipt-box {
      border: 2px solid #000;
      border-radius: 8px;
      padding: 2.3mm 2mm;
      margin-bottom: 2.2mm;
    }
    .receipt-box.items-box {
      padding: 2.2mm 1.7mm;
    }
    .receipt-box.summary-box {
      padding: 3mm 2.5mm 2.5mm;
    }
    .order-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.8mm;
      font-size: 13px;
      font-weight: 900;
      line-height: 1.45;
    }
    .order-info-right {
      text-align: right;
    }
    .order-info-left {
      text-align: left;
    }
    .order-info-label {
      font-weight: 900;
      text-decoration: underline;
    }
    .order-info-highlight {
      font-size: 22px;
      font-weight: 900;
      line-height: 1.1;
      margin: 1px 0;
    }
    .summary-box {
      min-height: 47mm;
    }
    .summary-box .summary-line {
      margin: 1px 0;
      justify-content: flex-start;
      gap: 0.8mm;
    }
    .summary-box .summary-line.emphasis {
      margin-top: 2px;
      margin-bottom: 2px;
    }
    .summary-box .summary-label,
    .summary-box .summary-text {
      font-size: 17px;
      font-weight: 900;
    }
    .summary-box .summary-amt {
      flex: 0 0 16mm;
      min-width: 16mm;
      max-width: 16mm;
      padding-left: 0.5mm;
      text-align: left;
      font-size: 17px;
      font-weight: 900;
    }
    .summary-box .summary-text {
      flex: 0 0 auto;
      min-width: 0;
      max-width: 28mm;
      text-align: left;
    }
    .summary-box .summary-line.emphasis .summary-label {
      font-size: 20px;
      font-weight: 900;
    }
    .summary-box .summary-line.emphasis .summary-amt {
      font-size: 20px;
      font-weight: 900;
    }
    .summary-info-block {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm;
      align-items: start;
      margin-top: 5mm;
      padding: 0 1mm;
    }
    .summary-info-line {
      font-size: 15px;
      font-weight: 900;
      line-height: 1.35;
      margin: 0;
      text-align: center;
    }
    .summary-info-label {
      font-weight: 800;
      display: block;
      margin-bottom: 1mm;
    }
    .summary-info-value {
      display: block;
      font-weight: 900;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .footer-thanks {
      font-size: 21px;
      font-weight: 900;
      margin: 6mm 0 4mm;
      text-align: center;
    }
    .footer-address {
      font-size: 12px;
      font-weight: 900;
      text-align: center;
      line-height: 1.25;
      white-space: nowrap;
    }
    .receipt-box.note-box {
      padding: 2.5mm 2mm;
    }
    .note-label {
      font-size: 11px;
      font-weight: 900;
      text-align: right;
      margin-bottom: 2px;
    }
    .note-text {
      font-size: 11px;
      font-weight: 700;
      text-align: right;
      line-height: 1.4;
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    table.items-table {
      margin: 0;
    }
    table.items-table td.col-name,
    table.items-table td.col-price,
    table.items-table td.col-qty,
    table.items-table td.col-total {
      font-size: 14px;
      font-weight: 900;
      padding-top: 2px;
      padding-bottom: 2px;
      line-height: 1.15;
    }
    table.items-table tr.col-header td {
      text-decoration: none;
      font-size: 9px;
      font-weight: 900;
      line-height: 1.1;
      padding-bottom: 3px;
      white-space: nowrap;
    }
    table.items-table td.col-name {
      width: 47%;
      text-align: right;
      white-space: nowrap;
    }
    table.items-table td.col-price {
      width: 16%;
      text-align: right;
      direction: ltr;
      unicode-bidi: isolate;
    }
    table.items-table td.col-qty {
      width: 17%;
      text-align: center;
      direction: rtl;
      unicode-bidi: isolate;
      white-space: nowrap;
      padding-left: 1.5mm;
      padding-right: 0.8mm;
    }
    table.items-table td.col-total {
      width: 20%;
      text-align: left;
      direction: ltr;
      unicode-bidi: isolate;
      white-space: nowrap;
      padding-left: 0.5mm;
      padding-right: 2.2mm;
    }
    table.items-table tr.item-addon-row td.item-addon,
    table.items-table tr.item-disc-row td.item-disc-label {
      font-size: 11px;
      font-weight: 900;
    }
    @media print {
      .logo-inline {
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
    date: `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
  };
}

function formatReceiptQuantity(line: PosReceiptData["lines"][number]): string {
  const display = formatPosLineQuantityDisplay(line.quantity, "ar", line.unitCode, {
    precision: 3,
  });
  if (/^\d+$/.test(display)) {
    return line.quantity.toFixed(2);
  }
  return display;
}

function resolveItemNameFontSizePx(name: string): number {
  const normalized = name.trim().replace(/\s+/g, " ");
  const wordCount = normalized ? normalized.split(" ").length : 0;
  const length = Array.from(normalized).length;

  if (wordCount <= 1 && length <= 10) return 14;
  if (wordCount <= 2 && length <= 16) return 13;
  if (wordCount <= 4 && length <= 24) return 11;
  if (wordCount <= 5 && length <= 32) return 10;
  return 9;
}

function buildRestaurantReceiptItemRow(
  name: string,
  unitPrice: number,
  qty: string,
  total: number,
): string {
  const escapedName = escapeReceiptText(name.trim());
  const nameFontSize = resolveItemNameFontSizePx(name);

  return `<tr class="item-row">
  <td class="col-name" style="font-size: ${nameFontSize}px">${escapedName}</td>
  <td class="col-price thermal-amt">${fmtThermalReceiptMoney(unitPrice)}</td>
  <td class="col-qty">${qty}</td>
  <td class="col-total thermal-amt">${fmtThermalReceiptMoney(total)}</td>
</tr>`;
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

function resolveHallLabel(receipt: PosReceiptData): string {
  return receipt.branchName?.trim() || receipt.warehouseName?.trim() || "رئيسي";
}

function resolveReceiptContactFields(receipt: PosReceiptData): {
  phone: string;
  address: string;
  tagline: string;
} {
  return {
    phone: receipt.phone?.trim() || POS_RECEIPT_DEFAULT_PHONE,
    address: receipt.address?.trim() || POS_RECEIPT_DEFAULT_ADDRESS,
    tagline: receipt.tagline?.trim() || POS_RECEIPT_DEFAULT_TAGLINE,
  };
}

function buildBrandHeaderHtml(receipt: PosReceiptData): string {
  const logoUrl = resolveReceiptLogoUrl(receipt);
  const brandName = receipt.companyName?.trim() || "كرنشي";

  if (logoUrl) {
    return `
      <div class="brand-header">
        <img class="logo-inline" src="${logoUrl}" alt=""/>
        <div class="brand-text">
          <div class="brand-name">${brandName}</div>
        </div>
      </div>`;
  }

  return `
    <div class="brand-header">
      <div class="brand-text">
        <div class="brand-name">${brandName}</div>
      </div>
    </div>`;
}

function buildPaymentMethodDescription(receipt: PosReceiptData): string {
  if (receipt.receiptKind === "provisional") {
    return "غير مدفوع";
  }

  const orderTypeLabel = resolveOrderTypeLabel(receipt.orderType);
  const paymentLabel = resolveReceiptPaymentDisplay(receipt);

  if (receipt.orderType === "DINE_IN" && receipt.tableNumber?.trim()) {
    return `${orderTypeLabel ?? "صالة"}/كاشير حجز ${receipt.tableNumber.trim()}`;
  }

  if (orderTypeLabel && paymentLabel) {
    return `${orderTypeLabel}/${paymentLabel}`;
  }

  return paymentLabel || orderTypeLabel || "—";
}

function buildSummaryLineHtml(
  label: string,
  value: number,
  options?: { emphasis?: boolean },
): string {
  const rowClass = options?.emphasis ? "summary-line emphasis" : "summary-line";
  return `<div class="${rowClass}">
  <span class="summary-label">${label}</span>
  <span class="summary-amt thermal-amt">${fmtThermalReceiptMoney(value)}</span>
</div>`;
}

function buildSummaryTextLineHtml(label: string, value: string): string {
  return `<div class="summary-line">
  <span class="summary-label">${label}</span>
  <span class="summary-text">${value}</span>
</div>`;
}

function sumLineQuantities(lines: PosReceiptData["lines"]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

function escapeReceiptText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildReceiptBottomNotesHtml(receipt: PosReceiptData): string {
  const orderNote = receipt.orderNotes?.trim() ?? "";
  const deliveryNote = receipt.deliveryNotes?.trim() ?? "";
  const lines: string[] = [];

  if (orderNote) {
    lines.push(escapeReceiptText(orderNote));
  }
  if (deliveryNote && deliveryNote !== orderNote) {
    lines.push(
      orderNote
        ? `ملاحظات التوصيل: ${escapeReceiptText(deliveryNote)}`
        : escapeReceiptText(deliveryNote),
    );
  }

  if (lines.length === 0) {
    return "";
  }

  return `<div class="receipt-box note-box">
  <div class="note-label">ملاحظات</div>
  <div class="note-text">${lines.join("\n")}</div>
</div>`;
}

function buildPosReceiptBodyHtml(receipt: PosReceiptData): string {
  const rows: string[] = [];
  const { date, time } = fmtDateParts(receipt.soldAt);
  const serviceCharge = receipt.serviceChargeAmount ?? 0;
  const deliveryFee = receipt.deliveryFeeAmount ?? 0;
  const servicesTotal = serviceCharge + deliveryFee;
  const lineDiscountTotal = receipt.lines.reduce(
    (sum, line) => sum + (line.discountAmount > 0 ? line.discountAmount : 0),
    0,
  );
  const cartLevelDiscount = Math.max(0, receipt.discount - lineDiscountTotal);
  const totalDiscount = cartLevelDiscount + lineDiscountTotal;
  const orderNumber =
    receipt.receiptKind === "provisional"
      ? null
      : extractDailyOrderNumber(receipt.receiptNumber);
  const receiptNumberDisplay =
    receipt.receiptKind === "provisional"
      ? receipt.receiptNumber.trim()
      : orderNumber;
  const tableReservationLabel = (() => {
    if (receipt.orderType === "DINE_IN" && receipt.tableNumber?.trim()) {
      return `حجز ${receipt.tableNumber.trim()}`;
    }
    const orderTypeLabel = resolveOrderTypeLabel(receipt.orderType);
    if (orderTypeLabel) {
      return orderTypeLabel;
    }
    if (orderNumber) {
      return `#${orderNumber}`;
    }
    return "—";
  })();

  rows.push(buildBrandHeaderHtml(receipt));
  if (receiptNumberDisplay) {
    rows.push(`<div class="receipt-number-strip">${receiptNumberDisplay}</div>`);
  }

  rows.push(`<div class="receipt-box">`);
  rows.push(`<div class="order-info-grid">`);
  rows.push(`<div class="order-info-right">`);
  if (receipt.orderType === "DINE_IN" && receipt.tableNumber?.trim()) {
    rows.push(`<div class="order-info-label">الطاولة</div>`);
  }
  rows.push(`<div>${date}</div>`);
  rows.push(`<div>القاعة: ${resolveHallLabel(receipt)}</div>`);
  if (receipt.orderType === "DELIVERY" && receipt.deliveryAddress?.trim()) {
    rows.push(`<div>${receipt.deliveryAddress.trim()}</div>`);
  }
  rows.push(`</div>`);
  rows.push(`<div class="order-info-left">`);
  rows.push(`<div class="order-info-highlight">${tableReservationLabel}</div>`);
  rows.push(`<div>${time}</div>`);
  if (orderNumber) {
    rows.push(`<div>الدور: ${orderNumber}</div>`);
  }
  rows.push(`</div>`);
  rows.push(`</div>`);
  rows.push(`</div>`);

  rows.push(`<div class="receipt-box items-box">`);
  rows.push(thermalReceiptTableOpen("items-table"));
  rows.push(
    thermalReceiptColumnHeaderRow("الصنف", "السعر", "الكمية", "الإجمالي"),
  );
  for (const line of receipt.lines) {
    const qty = formatReceiptQuantity(line);
    rows.push(
      buildRestaurantReceiptItemRow(line.name, line.unitPrice, qty, line.lineTotal),
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
  rows.push(`</div>`);

  rows.push(`<div class="receipt-box summary-box">`);
  rows.push(buildSummaryLineHtml("الاجمالي", receipt.subtotal));
  rows.push(buildSummaryLineHtml("الخصم", totalDiscount));
  rows.push(buildSummaryLineHtml("الخدمات", servicesTotal));
  if (receipt.tax > 0.009) {
    const taxLabel =
      receipt.taxRatePercent != null
        ? `الضريبة ${receipt.taxRatePercent}%`
        : "الضريبة";
    rows.push(buildSummaryLineHtml(taxLabel, receipt.tax));
  }
  rows.push(buildSummaryLineHtml("المطلوب", receipt.total, { emphasis: true }));
  rows.push(buildSummaryTextLineHtml("عدد الأصناف", String(receipt.lines.length)));
  rows.push(
    buildSummaryTextLineHtml("عدد المواد", fmtThermalReceiptMoney(sumLineQuantities(receipt.lines))),
  );

  rows.push(`<div class="summary-info-block">`);
  rows.push(`<div class="summary-info-line">
    <span class="summary-info-label">مدخل الفاتورة</span>
    <span class="summary-info-value">${receipt.cashierName}</span>
  </div>`);
  rows.push(`<div class="summary-info-line">
    <span class="summary-info-label">طريقة الدفع</span>
    <span class="summary-info-value">${buildPaymentMethodDescription(receipt)}</span>
  </div>`);
  rows.push(`</div>`);
  rows.push(`</div>`);

  const notesHtml = buildReceiptBottomNotesHtml(receipt);
  if (notesHtml) {
    rows.push(notesHtml);
  }

  const { phone } = resolveReceiptContactFields(receipt);
  const { address } = resolveReceiptContactFields(receipt);
  const phoneDigits = phone.replace(/\s+/g, "");
  rows.push(`<div class="footer-thanks">شكراً لزيارتكم</div>`);
  rows.push(
    `<div class="footer-address">${address} ${thermalReceiptLtrInlineHtml(phoneDigits)}</div>`,
  );
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
