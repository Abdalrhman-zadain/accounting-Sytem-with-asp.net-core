import { formatWeightQuantity } from "@/features/pos-market/pos-market-weight-utils";

export type PosMarketReceiptData = {
  receiptNumber: string;
  soldAt: string;
  companyName: string;
  logoUrl?: string | null;
  branchName?: string | null;
  destinationMarketName?: string | null;
  salesRepName?: string | null;
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
  /** Remaining on this invoice after today's payment. */
  invoiceOutstanding?: number;
  /** Total customer account balance after this sale. */
  accountOutstanding?: number;
  /** Lifetime delivered total for the destination market. */
  totalDelivered?: number;
  /** Lifetime collections total for the destination market. */
  totalPaid?: number;
  /** True when this is a credit delivery (no payment today). */
  isCreditDelivery?: boolean;
  lines: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    lineTotal: number;
    unitCode?: string;
  }>;
};

const SEP = "─".repeat(28);

function fmtDate(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function fmtAmt(val: number): string {
  return val.toFixed(2);
}

function rowLine(label: string, value: string): string {
  const maxLabel = 18;
  const truncLabel = label.length > maxLabel ? label.slice(0, maxLabel) : label;
  const padLabel = truncLabel.padEnd(maxLabel, " ");
  return `<div class="row"><span class="lbl">${padLabel}</span><span class="val">${value}</span></div>`;
}

function formatReceiptQuantity(line: PosMarketReceiptData["lines"][number]): string {
  if (line.unitCode) {
    return formatWeightQuantity(line.quantity, line.unitCode, 3);
  }
  return String(line.quantity);
}

function buildReceiptBodyHtml(receipt: PosMarketReceiptData): string {
  const rows: string[] = [];
  const invoiceOutstanding = receipt.invoiceOutstanding ?? 0;
  const showAccountSummary =
    receipt.destinationMarketName != null ||
    receipt.totalDelivered != null ||
    receipt.totalPaid != null ||
    receipt.accountOutstanding != null;

  rows.push(`<div class="center title">${receipt.companyName}</div>`);
  rows.push(`<div class="center sub">فاتورة مبيعات / Sales Invoice</div>`);

  if (receipt.branchName) {
    rows.push(`<div class="center sub">${receipt.branchName}</div>`);
  }

  rows.push(
    `<div class="sep">${SEP}</div>`,
    `<div class="center bold">${receipt.receiptNumber}</div>`,
  );

  if (receipt.isCreditDelivery) {
    rows.push(`<div class="center sub">تسليم على ذمة</div>`);
  }

  rows.push(rowLine("التاريخ", fmtDate(receipt.soldAt)));

  if (receipt.destinationMarketName) {
    rows.push(rowLine("السوق", receipt.destinationMarketName));
  }
  if (receipt.salesRepName) {
    rows.push(rowLine("المندوب", receipt.salesRepName));
  } else if (receipt.cashierName) {
    rows.push(rowLine("البائع", receipt.cashierName));
  }

  rows.push(`<div class="sep">${SEP}</div>`);

  for (const line of receipt.lines) {
    const name = line.name.slice(0, 18);
    const qty = formatReceiptQuantity(line);
    rows.push(
      `<div class="row"><span class="lbl bold">${name}</span><span class="val bold">${fmtAmt(line.lineTotal)}</span></div>`,
      `<div class="row sub-line"><span class="lbl">${qty} x ${fmtAmt(line.unitPrice)}</span><span class="val"></span></div>`,
    );
    if (line.discountAmount > 0) {
      rows.push(rowLine("  خصم", `-${fmtAmt(line.discountAmount)}`));
    }
  }

  rows.push(`<div class="sep">${SEP}</div>`);

  if (receipt.discount > 0) {
    rows.push(rowLine("الخصومات", fmtAmt(receipt.discount)));
  }

  rows.push(
    rowLine("إجمالي الفاتورة", fmtAmt(receipt.total)),
    rowLine("مدفوع اليوم", fmtAmt(receipt.paid)),
  );

  if (invoiceOutstanding > 0.009) {
    rows.push(rowLine("متبقي الفاتورة", fmtAmt(invoiceOutstanding)));
  }

  if (!receipt.isCreditDelivery && receipt.paid > 0.009) {
    if (receipt.change > 0) {
      rows.push(rowLine("الباقي", fmtAmt(receipt.change)));
    }
    if (receipt.paymentSummary.trim()) {
      rows.push(rowLine("طريقة الدفع", receipt.paymentSummary));
    }
  }

  if (showAccountSummary) {
    rows.push(
      `<div class="sep">${"-".repeat(28)}</div>`,
      `<div class="center sub">ملخص حساب العميل</div>`,
    );
    if (receipt.totalDelivered != null) {
      rows.push(rowLine("إجمالي المسلّم", fmtAmt(receipt.totalDelivered)));
    }
    if (receipt.totalPaid != null) {
      rows.push(rowLine("إجمالي المقبوض", fmtAmt(receipt.totalPaid)));
    }
    if (receipt.accountOutstanding != null) {
      rows.push(rowLine("إجمالي الذمم", fmtAmt(receipt.accountOutstanding)));
    }
  }

  rows.push(
    `<div class="sep">${SEP}</div>`,
    `<div class="center muted">شكراً لتعاملكم</div>`,
    `<div class="center sub">Thank you</div>`,
  );

  return rows.join("\n");
}

export function buildPosMarketReceiptHtml(receipt: PosMarketReceiptData): string {
  const bodyHtml = buildReceiptBodyHtml(receipt);

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>${receipt.receiptNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 14pt;
      font-weight: 700;
      color: #000;
      background: #fff;
      width: 76mm;
      padding: 4mm 2mm;
      direction: rtl;
    }
    .center { text-align: center; }
    .title { font-size: 20pt; font-weight: 900; margin-bottom: 4pt; }
    .sub { font-size: 12pt; font-weight: 700; margin-bottom: 3pt; }
    .sep { text-align: center; margin: 5pt 0; font-size: 13pt; white-space: pre; }
    .row { display: flex; justify-content: space-between; margin: 3pt 0; line-height: 1.55; }
    .sub-line .lbl { font-size: 12pt; font-weight: 600; }
    .lbl { flex: 0 0 55%; font-size: 13pt; font-weight: 700; word-break: break-word; }
    .val { flex: 0 0 45%; text-align: left; font-size: 13pt; font-weight: 700; }
    .bold { font-weight: 900; }
    .muted { font-size: 14pt; font-weight: 700; margin: 6pt 0; }
    @media print {
      html, body { width: 76mm; }
      * { color: #000 !important; }
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
