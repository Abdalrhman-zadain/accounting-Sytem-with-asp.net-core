export type PosMarketCollectionReceiptData = {
  reference: string;
  receiptDate: string;
  companyName: string;
  customerName: string;
  customerCode?: string | null;
  salesRepName?: string | null;
  balanceBefore: number;
  amountPaid: number;
  balanceAfter: number;
  bankCashAccountName?: string | null;
  collectedBy?: string | null;
};

const SEP = "─".repeat(28);

function fmtDate(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtAmt(val: number): string {
  return val.toFixed(2);
}

function rowLine(label: string, value: string): string {
  const maxLabel = 16;
  const truncLabel = label.length > maxLabel ? label.slice(0, maxLabel) : label;
  return `<div class="row"><span class="lbl">${truncLabel}</span><span class="val">${value}</span></div>`;
}

function buildCollectionReceiptBody(receipt: PosMarketCollectionReceiptData): string {
  const rows: string[] = [];

  rows.push(`<div class="center title">${receipt.companyName}</div>`);
  rows.push(`<div class="center sub">سند قبض — تحصيل ذمم</div>`);
  rows.push(`<div class="center sub">Collection Receipt</div>`);
  rows.push(
    `<div class="sep">${SEP}</div>`,
    `<div class="center bold">${receipt.reference}</div>`,
    rowLine("التاريخ", fmtDate(receipt.receiptDate)),
    rowLine("السوق", receipt.customerName),
  );

  if (receipt.customerCode) {
    rows.push(rowLine("الرمز", receipt.customerCode));
  }
  if (receipt.salesRepName) {
    rows.push(rowLine("المندوب", receipt.salesRepName));
  }

  rows.push(
    `<div class="sep">${SEP}</div>`,
    rowLine("الرصيد قبل", fmtAmt(receipt.balanceBefore)),
    rowLine("المبلغ المستلم", fmtAmt(receipt.amountPaid)),
    `<div class="sep">${"-".repeat(28)}</div>`,
    rowLine("المتبقي", fmtAmt(receipt.balanceAfter)),
  );

  if (receipt.bankCashAccountName) {
    rows.push(rowLine("حساب القبض", receipt.bankCashAccountName));
  }
  if (receipt.collectedBy) {
    rows.push(rowLine("المحصّل", receipt.collectedBy));
  }

  rows.push(
    `<div class="sep">${SEP}</div>`,
    `<div class="center muted">شكراً لتعاونكم</div>`,
    `<div class="center sub">Thank you</div>`,
  );

  return rows.join("\n");
}

export function buildPosMarketCollectionReceiptHtml(
  receipt: PosMarketCollectionReceiptData,
): string {
  const bodyHtml = buildCollectionReceiptBody(receipt);

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>${receipt.reference}</title>
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
