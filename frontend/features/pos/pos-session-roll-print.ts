/**
 * pos-session-roll-print.ts
 * Thermal 80mm receipt-style print utility for POS session roll reports.
 * This generates client-side HTML and triggers window.print().
 * No A4 layout — pure receipt roll format.
 */

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

// ─── Shared helpers ───────────────────────────────────────────────────────────

function fmtDate(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function fmtAmt(val?: string | number | null): string {
  if (val === null || val === undefined || val === "") return "0.00";
  return Number(val).toFixed(2);
}

// Build a dashed separator line (48 dashes for ~80mm courier font at 9pt)
const SEP = "─".repeat(32);
const DASH_SEP = "-".repeat(32);

// ─── Label row helper ─────────────────────────────────────────────────────────

function rowLine(label: string, value: string): string {
  // Right-align value within 32 chars total
  const maxLabel = 18;
  const truncLabel = label.length > maxLabel ? label.slice(0, maxLabel) : label;
  const padLabel = truncLabel.padEnd(maxLabel, " ");
  return `<div class="row"><span class="lbl">${padLabel}</span><span class="val">${value}</span></div>`;
}

// ─── SESSION ROLL REPORT ──────────────────────────────────────────────────────

function buildSessionRollReportHtml(ctx: RollPrintContext): string {
  const { session, report, printedBy } = ctx;
  const now = fmtDate(new Date());

  // Payment breakdown from report
  let cashSales = fmtAmt(report?.cashSales ?? session.cashSales);
  let cashRefunds = fmtAmt(report?.cashRefunds);
  let cardSales = fmtAmt(report?.cardSales ?? session.cardSales);
  let cliqSales = fmtAmt(report?.cliqSales);
  let walletSales = fmtAmt(report?.walletSales);
  let delivSales = fmtAmt(report?.deliveryCompanySales ?? session.deliveryCompanySales);

  // Build per-delivery-company breakdown from sales if report has it
  const deliveryBreakdown: Array<{ name: string; amount: string }> = [];
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
    companyMap.forEach((v) =>
      deliveryBreakdown.push({ name: v.name, amount: v.total.toFixed(2) }),
    );
  }

  const accountingStatusLabel = (s?: string | null) => {
    switch (s) {
      case "POSTED": return "مرحلة ✓";
      case "PENDING_REVIEW": return "بانتظار المراجعة";
      case "REJECTED": return "مرفوضة";
      case "CLOSED": return "مغلقة";
      case "OPEN": return "مفتوحة";
      default: return s ?? "—";
    }
  };

  const rows = [
    // Header
    `<div class="center title">تقرير إغلاق الوردية</div>`,
    `<div class="center sub">Shift Closing Report</div>`,
    `<div class="sep">${SEP}</div>`,

    // Session info
    rowLine("رقم الوردية", session.sessionNumber),
    rowLine("الكاشير", session.cashierUser?.name || session.cashierUser?.email || "—"),
    rowLine("الفرع", session.branchName || "—"),
    rowLine("المستودع", session.warehouse?.name || "—"),
    rowLine("الفتح", fmtDate(session.openedAt)),
    rowLine("الإغلاق", fmtDate(session.closedAt)),
    rowLine("عدد الفواتير", String(session.invoiceCount ?? report?.invoiceCount ?? 0)),

    `<div class="sep">${SEP}</div>`,

    // Sales totals
    `<div class="section-title">ملخص المبيعات</div>`,
    rowLine("الإجمالي الكلي", fmtAmt(session.totalSales ?? report?.totalSales)),
    rowLine("صافي قبل الضريبة", fmtAmt(
      report
        ? (Number(report.totalSales) - Number(report.tax)).toFixed(2)
        : null
    )),
    rowLine("ضريبة القيمة المضافة", fmtAmt(session.taxAmount ?? report?.tax)),
    rowLine("الخصومات", fmtAmt(session.discountAmount ?? report?.discounts)),
    rowLine("المرتجعات", fmtAmt(report?.cashRefunds)),

    `<div class="sep">${SEP}</div>`,

    // Payment breakdown
    `<div class="section-title">تفصيل طرق الدفع</div>`,
    rowLine("كاش", cashSales),
    rowLine("فيزا / بطاقة", cardSales),
    rowLine("كليك", cliqSales),
    rowLine("محفظة", walletSales),
  ];

  // Delivery companies
  if (deliveryBreakdown.length > 0) {
    for (const d of deliveryBreakdown) {
      rows.push(rowLine(d.name, d.amount));
    }
  } else if (Number(delivSales) > 0) {
    rows.push(rowLine("توصيل / شركات", delivSales));
  }

  rows.push(`<div class="sep">${SEP}</div>`);

  // Cash reconciliation
  rows.push(`<div class="section-title">جرد الصندوق</div>`);
  rows.push(rowLine("رصيد الافتتاح", fmtAmt(session.openingCash ?? report?.openingCash)));
  rows.push(rowLine("مبيعات الكاش", cashSales));
  rows.push(rowLine("مرتجعات الكاش", cashRefunds));
  rows.push(rowLine("الكاش المتوقع", fmtAmt(session.expectedCash ?? report?.expectedCash)));
  rows.push(rowLine("الكاش الفعلي", fmtAmt(session.actualCash ?? report?.actualCash)));

  const diffVal = Number(session.difference ?? report?.difference ?? 0);
  const diffStr = `${diffVal >= 0 ? "+" : ""}${diffVal.toFixed(2)}`;
  rows.push(
    `<div class="row ${diffVal !== 0 ? "diff-alert" : ""}"><span class="lbl">فارق الكاش</span><span class="val bold">${diffStr}</span></div>`,
  );

  rows.push(`<div class="sep">${SEP}</div>`);

  // Review status
  rows.push(
    `<div class="section-title">حالة المراجعة</div>`,
    rowLine("الحالة المحاسبية", accountingStatusLabel(session.accountingStatus)),
  );

  rows.push(`<div class="sep">${SEP}</div>`);

  // Printed by
  rows.push(
    `<div class="section-title">معلومات الطباعة</div>`,
    rowLine("طُبع بواسطة", printedBy),
    rowLine("وقت الطباعة", now),
  );

  rows.push(`<div class="sep">${DASH_SEP}</div>`);

  // Signature lines
  rows.push(
    `<div class="sig-block">
      <div class="sig-line">توقيع الكاشير</div>
      <div class="sig-underline"></div>
      <div class="sig-line">توقيع المحاسب</div>
      <div class="sig-underline"></div>
    </div>`,
  );

  return rows.join("\n");
}

// ─── INVOICE LIST ROLL ────────────────────────────────────────────────────────

function buildInvoiceListRollHtml(ctx: RollPrintContext): string {
  const { session, report, printedBy } = ctx;
  const now = fmtDate(new Date());

  const rows = [
    `<div class="center title">قائمة الفواتير</div>`,
    `<div class="center sub">Invoice List - ${session.sessionNumber}</div>`,
    `<div class="sep">${SEP}</div>`,
    rowLine("الكاشير", session.cashierUser?.name || "—"),
    rowLine("التاريخ", fmtDate(session.openedAt)),
    `<div class="sep">${SEP}</div>`,
  ];

  const sales = report?.sales ?? [];
  if (sales.length === 0) {
    rows.push(`<div class="center muted">لا توجد فواتير</div>`);
  } else {
    rows.push(`<div class="table-header row"><span class="lbl">المرجع</span><span class="val">الإجمالي</span></div>`);
    for (const sale of sales) {
      rows.push(rowLine(sale.reference, fmtAmt(sale.totalAmount)));
    }
  }

  const returns = report?.returns ?? [];
  if (returns.length > 0) {
    rows.push(`<div class="sep">${DASH_SEP}</div>`);
    rows.push(`<div class="section-title">المرتجعات</div>`);
    for (const r of returns) {
      rows.push(rowLine(r.reference, `-${fmtAmt(r.totalAmount)}`));
    }
  }

  rows.push(`<div class="sep">${SEP}</div>`);
  rows.push(rowLine("طُبع بواسطة", printedBy));
  rows.push(rowLine("وقت الطباعة", now));

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
    rowLine("الكاشير", session.cashierUser?.name || "—"),
    rowLine("التاريخ", fmtDate(session.openedAt)),
    `<div class="sep">${SEP}</div>`,
  ];

  const sales = report?.sales ?? [];
  for (const sale of sales) {
    rows.push(`<div class="receipt-block">`);
    rows.push(`<div class="center bold">${sale.reference}</div>`);
    rows.push(rowLine("التاريخ", fmtDate(sale.invoiceDate)));
    rows.push(rowLine("العميل", sale.customer?.name ?? "عميل عام"));

    // Lines
    for (const line of sale.lines ?? []) {
      const name = (line.itemName || line.description || "—").slice(0, 20);
      const unitCode = line.item?.unitOfMeasure?.trim();
      const qtyValue = Number(line.quantity);
      const qty = unitCode
        ? `${qtyValue.toFixed(3).replace(/\.?0+$/, "")} ${unitCode}`
        : qtyValue.toFixed(2);
      const price = fmtAmt(line.lineAmount);
      rows.push(`<div class="row"><span class="lbl">${name} x${qty}</span><span class="val">${price}</span></div>`);
    }

    rows.push(`<div class="sep">${DASH_SEP}</div>`);
    rows.push(rowLine("إجمالي", fmtAmt(sale.totalAmount)));
    rows.push(rowLine("ضريبة", fmtAmt(sale.taxAmount)));

    // Payment methods
    const payments = sale.payments ?? [];
    for (const pay of payments) {
      const meth = pay.deliveryCompany?.arabicName || pay.deliveryCompany?.name || pay.paymentMethod;
      rows.push(rowLine(meth, fmtAmt(pay.amount)));
    }

    rows.push(`</div>`);
    rows.push(`<div class="sep">${DASH_SEP}</div>`);
  }

  rows.push(rowLine("طُبع بواسطة", printedBy));
  rows.push(rowLine("وقت الطباعة", now));

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

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>${titleAr}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 9pt;
      color: #000;
      background: #fff;
      width: 76mm;
      padding: 4mm 2mm;
      direction: rtl;
    }
    .center { text-align: center; }
    .title {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 2pt;
    }
    .sub {
      font-size: 8pt;
      color: #333;
      margin-bottom: 4pt;
    }
    .sep {
      text-align: center;
      color: #666;
      margin: 3pt 0;
      font-size: 8pt;
      white-space: pre;
    }
    .section-title {
      font-weight: bold;
      font-size: 9pt;
      margin: 4pt 0 2pt;
      text-decoration: underline;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: 1.5pt 0;
      line-height: 1.3;
    }
    .lbl {
      flex: 0 0 55%;
      font-size: 8.5pt;
      white-space: pre;
    }
    .val {
      flex: 0 0 45%;
      text-align: left;
      font-size: 8.5pt;
    }
    .bold { font-weight: bold; }
    .diff-alert .val { font-weight: bold; }
    .muted { color: #666; font-size: 8pt; margin: 4pt 0; }
    .table-header .lbl, .table-header .val {
      font-weight: bold;
      text-decoration: underline;
    }
    .receipt-block {
      margin: 4pt 0;
      padding: 2pt 0;
    }
    .sig-block {
      margin-top: 8pt;
    }
    .sig-line {
      font-size: 8pt;
      margin-top: 6pt;
      margin-bottom: 2pt;
    }
    .sig-underline {
      border-bottom: 1px solid #000;
      width: 100%;
      height: 16pt;
    }
    @media print {
      html, body { width: 76mm; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
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
  // Small delay so fonts render before print dialog
  setTimeout(() => {
    win.print();
    win.close();
  }, 400);
}
