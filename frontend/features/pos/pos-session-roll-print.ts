/**
 * pos-session-roll-print.ts
 * Thermal 80mm roll reports for POS session close, invoice list, and all receipts.
 * Uses the same 72mm safe-area layout as customer receipts.
 */

import { formatAddonsForDisplay } from "@/features/pos/pos-addon-utils";
import {
  buildThermalReceiptDocumentHtml,
  thermalReceiptColumnHeaderRow,
  thermalReceiptFooterSpacerHtml,
  thermalReceiptItemAddonRow,
  thermalReceiptItemRow4Col,
  thermalReceiptMetaLineHtml,
  thermalReceiptPaymentBoxHtml,
  thermalReceiptSepLine,
  thermalReceiptTableClose,
  thermalReceiptTableOpen,
  thermalRollSectionTitleHtml,
  thermalRollSummaryLineHtml,
  thermalRollTextLineHtml,
  type ThermalReceiptPaymentBoxLine,
} from "@/features/pos-shared/thermal-receipt-layout";
import type { PosSession, PosSessionReport } from "@/types/api";

export type SessionRollPrintType =
  | "SESSION_ROLL_REPORT"
  | "INVOICE_LIST_ROLL"
  | "ALL_RECEIPTS_ROLL";

export interface RollPrintContext {
  session: PosSession;
  report: PosSessionReport | null;
  printedBy: string;
  printType: SessionRollPrintType;
}

const SEP = thermalReceiptSepLine();
const DASH_SEP = thermalReceiptSepLine("-");

const ARABIC_PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "نقد",
  CARD: "بطاقة",
  CLIQ: "كليك",
  BANK_TRANSFER: "تحويل بنكي",
  WALLET: "محفظة",
  MIXED: "مختلط",
  DELIVERY: "توصيل",
};

function fmtDate(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function parseAmt(val?: string | number | null): number {
  if (val === null || val === undefined || val === "") return 0;
  return Number(val);
}

function moneyRow(
  label: string,
  value: string | number | null | undefined,
  options?: { emphasis?: boolean; currency?: boolean },
): string {
  return thermalRollSummaryLineHtml(label, parseAmt(value), options);
}

function textRow(label: string, value: string | number | null | undefined): string {
  const display =
    value === null || value === undefined || value === "" ? "—" : String(value);
  return thermalRollTextLineHtml(label, display);
}

function diffRow(label: string, value: string): string {
  return `<div class="summary-line diff-alert">
  <span class="summary-label">${label}</span>
  <span class="summary-text">${value}</span>
</div>`;
}

function resolvePaymentLabel(
  method: string,
  deliveryCompany?: { arabicName?: string | null; name?: string | null } | null,
): string {
  if (deliveryCompany) {
    return deliveryCompany.arabicName?.trim() || deliveryCompany.name?.trim() || method;
  }
  return ARABIC_PAYMENT_METHOD_LABELS[method] ?? method;
}

function buildPaymentBoxLines(
  lines: Array<{ label: string; value: number }>,
): string {
  const boxLines: ThermalReceiptPaymentBoxLine[] = lines
    .filter((line) => Math.abs(line.value) > 0.009)
    .map((line) => ({ label: line.label, value: line.value }));

  if (boxLines.length === 0) {
    return "";
  }

  return thermalReceiptPaymentBoxHtml(boxLines);
}

// ─── SESSION ROLL REPORT ──────────────────────────────────────────────────────

function buildSessionRollReportHtml(ctx: RollPrintContext): string {
  const { session, report, printedBy } = ctx;
  const now = fmtDate(new Date());

  const cashSales = report?.cashSales ?? session.cashSales;
  const cashRefunds = report?.cashRefunds;
  const cardSales = report?.cardSales ?? session.cardSales;
  const cliqSales = report?.cliqSales;
  const walletSales = report?.walletSales;
  const delivSales = report?.deliveryCompanySales ?? session.deliveryCompanySales;

  const deliveryBreakdown: Array<{ name: string; amount: number }> = [];
  if (report?.sales) {
    const companyMap = new Map<string, { name: string; total: number }>();
    for (const sale of report.sales) {
      for (const pay of sale.payments || []) {
        if (pay.deliveryCompany) {
          const name = pay.deliveryCompany.arabicName || pay.deliveryCompany.name;
          const existing = companyMap.get(pay.deliveryCompany.id) ?? { name, total: 0 };
          existing.total += Number(pay.amount || 0);
          companyMap.set(pay.deliveryCompany.id, existing);
        }
      }
    }
    companyMap.forEach((value) =>
      deliveryBreakdown.push({ name: value.name, amount: value.total }),
    );
  }

  const accountingStatusLabel = (status?: string | null) => {
    switch (status) {
      case "POSTED":
        return "مرحلة ✓";
      case "PENDING_REVIEW":
        return "بانتظار المراجعة";
      case "REJECTED":
        return "مرفوضة";
      case "CLOSED":
        return "مغلقة";
      case "OPEN":
        return "مفتوحة";
      default:
        return status ?? "—";
    }
  };

  const netBeforeTax =
    report != null
      ? Number(report.totalSales) - Number(report.tax)
      : parseAmt(session.totalSales) - parseAmt(session.taxAmount);

  const paymentLines: Array<{ label: string; value: number }> = [
    { label: "كاش", value: parseAmt(cashSales) },
    { label: "فيزا / بطاقة", value: parseAmt(cardSales) },
    { label: "كليك", value: parseAmt(cliqSales) },
    { label: "محفظة", value: parseAmt(walletSales) },
    ...deliveryBreakdown.map((entry) => ({ label: entry.name, value: entry.amount })),
  ];

  if (deliveryBreakdown.length === 0 && parseAmt(delivSales) > 0) {
    paymentLines.push({ label: "توصيل / شركات", value: parseAmt(delivSales) });
  }

  const diffVal = parseAmt(session.difference ?? report?.difference ?? 0);
  const diffStr = `${diffVal >= 0 ? "+" : ""}${diffVal.toFixed(2)}`;

  const rows = [
    `<div class="center title">تقرير إغلاق الوردية</div>`,
    `<div class="center sub">Shift Closing Report</div>`,
    `<div class="sep">${SEP}</div>`,

    textRow("رقم الوردية", session.sessionNumber),
    textRow("الكاشير", session.cashierUser?.name || session.cashierUser?.email),
    textRow("الفرع", session.branchName),
    textRow("المستودع", session.warehouse?.name),
    textRow("الفتح", fmtDate(session.openedAt)),
    textRow("الإغلاق", fmtDate(session.closedAt)),
    textRow("عدد الفواتير", session.invoiceCount ?? report?.invoiceCount ?? 0),

    `<div class="sep">${SEP}</div>`,

    thermalRollSectionTitleHtml("ملخص المبيعات"),
    moneyRow("الإجمالي الكلي", session.totalSales ?? report?.totalSales, {
      emphasis: true,
      currency: true,
    }),
    moneyRow("صافي قبل الضريبة", netBeforeTax),
    moneyRow("ضريبة القيمة المضافة", session.taxAmount ?? report?.tax),
    moneyRow("الخصومات", session.discountAmount ?? report?.discounts),
    moneyRow("المرتجعات", cashRefunds),

    `<div class="sep">${SEP}</div>`,

    thermalRollSectionTitleHtml("تفصيل طرق الدفع"),
    buildPaymentBoxLines(paymentLines),

    `<div class="sep">${SEP}</div>`,

    thermalRollSectionTitleHtml("جرد الصندوق"),
    moneyRow("رصيد الافتتاح", session.openingCash ?? report?.openingCash),
    moneyRow("مبيعات الكاش", cashSales),
    moneyRow("مرتجعات الكاش", cashRefunds),
    moneyRow("الكاش المتوقع", session.expectedCash ?? report?.expectedCash, {
      emphasis: true,
    }),
    moneyRow("الكاش الفعلي", session.actualCash ?? report?.actualCash, {
      emphasis: true,
    }),
    diffRow("فارق الكاش", diffStr),

    `<div class="sep">${SEP}</div>`,

    thermalRollSectionTitleHtml("حالة المراجعة"),
    textRow("الحالة المحاسبية", accountingStatusLabel(session.accountingStatus)),

    `<div class="sep">${SEP}</div>`,

    thermalRollSectionTitleHtml("معلومات الطباعة"),
    textRow("طُبع بواسطة", printedBy),
    textRow("وقت الطباعة", now),

    `<div class="sep">${DASH_SEP}</div>`,

    `<div class="sig-block">
      <div class="sig-line">توقيع الكاشير</div>
      <div class="sig-underline"></div>
      <div class="sig-line">توقيع المحاسب</div>
      <div class="sig-underline"></div>
    </div>`,
    thermalReceiptFooterSpacerHtml(),
  ];

  return rows.filter(Boolean).join("\n");
}

// ─── INVOICE LIST ROLL ──────────────────────────────────────────────────────

function buildInvoiceListRollHtml(ctx: RollPrintContext): string {
  const { session, report, printedBy } = ctx;
  const now = fmtDate(new Date());

  const rows = [
    `<div class="center title">قائمة الفواتير</div>`,
    `<div class="center sub">Invoice List - ${session.sessionNumber}</div>`,
    `<div class="sep">${SEP}</div>`,
    textRow("الكاشير", session.cashierUser?.name || session.cashierUser?.email),
    textRow("التاريخ", fmtDate(session.openedAt)),
    `<div class="sep">${SEP}</div>`,
  ];

  const sales = report?.sales ?? [];
  if (sales.length === 0) {
    rows.push(`<div class="muted">لا توجد فواتير</div>`);
  } else {
    for (const sale of sales) {
      rows.push(moneyRow(sale.reference, sale.totalAmount));
    }
    rows.push(`<div class="sep">${DASH_SEP}</div>`);
    rows.push(
      moneyRow(
        "إجمالي الفواتير",
        sales.reduce((sum, sale) => sum + parseAmt(sale.totalAmount), 0),
        { emphasis: true, currency: true },
      ),
    );
  }

  const returns = report?.returns ?? [];
  if (returns.length > 0) {
    rows.push(`<div class="sep">${SEP}</div>`);
    rows.push(thermalRollSectionTitleHtml("المرتجعات"));
    for (const entry of returns) {
      rows.push(moneyRow(entry.reference, -Math.abs(parseAmt(entry.totalAmount))));
    }
  }

  rows.push(`<div class="sep">${SEP}</div>`);
  rows.push(textRow("طُبع بواسطة", printedBy));
  rows.push(textRow("وقت الطباعة", now));
  rows.push(thermalReceiptFooterSpacerHtml());

  return rows.join("\n");
}

// ─── ALL RECEIPTS ROLL ────────────────────────────────────────────────────────

function buildAllReceiptsRollHtml(ctx: RollPrintContext): string {
  const { session, report, printedBy } = ctx;
  const now = fmtDate(new Date());

  const rows = [
    `<div class="center title">كل الإيصالات</div>`,
    `<div class="center sub">All Receipts - ${session.sessionNumber}</div>`,
    `<div class="sep">${SEP}</div>`,
    textRow("الكاشير", session.cashierUser?.name || session.cashierUser?.email),
    textRow("التاريخ", fmtDate(session.openedAt)),
    `<div class="sep">${SEP}</div>`,
  ];

  const sales = report?.sales ?? [];
  for (const sale of sales) {
    rows.push(`<div class="receipt-block">`);
    rows.push(`<div class="center receipt-block-title">${sale.reference}</div>`);
    rows.push(thermalReceiptMetaLineHtml(`التاريخ: ${fmtDate(sale.invoiceDate)}`));
    rows.push(thermalReceiptMetaLineHtml(`العميل: ${sale.customer?.name ?? "عميل عام"}`));

    rows.push(thermalReceiptTableOpen("items-table"));
    rows.push(thermalReceiptColumnHeaderRow("الصنف", "السعر", "الكمية", "الإجمالي"));

    for (const line of sale.lines ?? []) {
      const name = line.itemName || line.description || "—";
      const unitCode = line.item?.unitOfMeasure?.trim();
      const qtyValue = Number(line.quantity);
      const qty = unitCode
        ? `${qtyValue.toFixed(3).replace(/\.?0+$/, "")} ${unitCode}`
        : qtyValue.toFixed(2);
      const unitPrice = qtyValue > 0 ? parseAmt(line.lineAmount) / qtyValue : parseAmt(line.lineAmount);
      rows.push(
        thermalReceiptItemRow4Col(name, unitPrice, qty, parseAmt(line.lineAmount)),
      );
      const addons = formatAddonsForDisplay(line.modifiers, "ar");
      if (addons) {
        rows.push(thermalReceiptItemAddonRow(addons));
      }
    }

    rows.push(thermalReceiptTableClose());
    rows.push(`<div class="sep">${DASH_SEP}</div>`);
    rows.push(moneyRow("إجمالي", sale.totalAmount, { emphasis: true, currency: true }));
    rows.push(moneyRow("ضريبة", sale.taxAmount));

    const paymentLines: ThermalReceiptPaymentBoxLine[] = (sale.payments ?? []).map((pay) => ({
      label: resolvePaymentLabel(pay.paymentMethod, pay.deliveryCompany),
      value: parseAmt(pay.amount),
    }));
    if (paymentLines.length > 0) {
      rows.push(thermalReceiptPaymentBoxHtml(paymentLines));
    }

    rows.push(`</div>`);
    rows.push(`<div class="sep">${DASH_SEP}</div>`);
  }

  rows.push(textRow("طُبع بواسطة", printedBy));
  rows.push(textRow("وقت الطباعة", now));
  rows.push(thermalReceiptFooterSpacerHtml());

  return rows.join("\n");
}

// ─── Main print function ──────────────────────────────────────────────────────

export function buildSessionRollReportDocumentHtml(ctx: RollPrintContext): string {
  let bodyHtml: string;
  let titleAr: string;

  switch (ctx.printType) {
    case "INVOICE_LIST_ROLL":
      bodyHtml = buildInvoiceListRollHtml(ctx);
      titleAr = "قائمة فواتير الوردية";
      break;
    case "ALL_RECEIPTS_ROLL":
      bodyHtml = buildAllReceiptsRollHtml(ctx);
      titleAr = "كل الإيصالات";
      break;
    case "SESSION_ROLL_REPORT":
    default:
      bodyHtml = buildSessionRollReportHtml(ctx);
      titleAr = "تقرير إغلاق الوردية";
      break;
  }

  return buildThermalReceiptDocumentHtml(titleAr, bodyHtml);
}

export function printSessionRollReport(ctx: RollPrintContext): void {
  const html = buildSessionRollReportDocumentHtml(ctx);
  const win = window.open("", "_blank", "width=400,height=700");
  if (!win) {
    alert("يرجى السماح بفتح نوافذ منبثقة لطباعة التقرير");
    return;
  }
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    win.print();
    win.close();
  }, 400);
}
