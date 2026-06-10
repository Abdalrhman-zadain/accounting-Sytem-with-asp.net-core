import { formatWeightQuantity } from "@/features/pos-market/pos-market-weight-utils";

export type PosMarketReceiptData = {
  receiptNumber: string;
  soldAt: string;
  companyName: string;
  logoUrl?: string | null;
  branchName?: string | null;
  destinationMarketName?: string | null;
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
  outstanding?: number;
  /** Total customer account balance after this delivery (credit sales). */
  accountOutstanding?: number;
  /** True when this is a credit delivery (no payment today). */
  isCreditDelivery?: boolean;
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
  const maxLabel = 16;
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

  rows.push(`<div class="center title">${receipt.companyName}</div>`);
  rows.push(`<div class="center sub">Market POS / نقاط بيع السوق</div>`);

  if (receipt.branchName) {
    rows.push(`<div class="center sub">${receipt.branchName}</div>`);
  }
  if (receipt.taxNumber) {
    rows.push(`<div class="center sub">الرقم الضريبي: ${receipt.taxNumber}</div>`);
  }

  rows.push(
    `<div class="sep">${SEP}</div>`,
    `<div class="center bold">${receipt.receiptNumber}</div>`,
    receipt.isCreditDelivery
      ? `<div class="center sub">Delivery Note / إيصال تسليم</div>`
      : `<div class="center sub">Sales Receipt / إيصال بيع</div>`,
    rowLine("التاريخ", fmtDate(receipt.soldAt)),
    rowLine("الكاشير", receipt.cashierName),
    rowLine("الجهاز", receipt.terminalName || "—"),
    rowLine("المستودع", receipt.warehouseName),
    ...(receipt.destinationMarketName
      ? [rowLine("السوق", receipt.destinationMarketName)]
      : []),
    `<div class="sep">${SEP}</div>`,
  );

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
    if (line.taxAmount > 0) {
      rows.push(rowLine("  ضريبة", fmtAmt(line.taxAmount)));
    }
  }

  rows.push(
    `<div class="sep">${SEP}</div>`,
    rowLine("الإجمالي قبل الضريبة", fmtAmt(receipt.subtotal)),
  );

  if (receipt.discount > 0) {
    rows.push(rowLine("الخصومات", fmtAmt(receipt.discount)));
  }

  rows.push(
    rowLine("الضريبة", fmtAmt(receipt.tax)),
    receipt.isCreditDelivery
      ? rowLine("قيمة التسليمة", fmtAmt(receipt.total))
      : rowLine("الإجمالي", fmtAmt(receipt.total)),
    `<div class="sep">${"-".repeat(28)}</div>`,
  );

  if (receipt.isCreditDelivery) {
    rows.push(rowLine("مدفوع اليوم", fmtAmt(receipt.paid)));
    if ((receipt.accountOutstanding ?? 0) > 0) {
      rows.push(rowLine("المتبقي على الحساب", fmtAmt(receipt.accountOutstanding ?? 0)));
    } else if ((receipt.outstanding ?? 0) > 0) {
      rows.push(rowLine("المتبقي على الحساب", fmtAmt(receipt.outstanding ?? 0)));
    }
  } else {
    rows.push(
      rowLine("المبلغ المقبوض", fmtAmt(receipt.tendered)),
      rowLine("المدفوع", fmtAmt(receipt.paid)),
    );
    if (receipt.change > 0) {
      rows.push(rowLine("الباقي", fmtAmt(receipt.change)));
    }
    if ((receipt.outstanding ?? 0) > 0) {
      rows.push(rowLine("المتبقي على الذمم", fmtAmt(receipt.outstanding ?? 0)));
    }
    rows.push(rowLine("الدفع", receipt.paymentSummary));
  }

  rows.push(
    `<div class="sep">${SEP}</div>`,
    `<div class="center muted">شكراً لزيارتكم</div>`,
    `<div class="center sub">Thank you for your visit</div>`,
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
