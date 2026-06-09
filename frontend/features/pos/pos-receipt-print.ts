/**
 * pos-receipt-print.ts
 * Thermal 80mm sales receipt print utility for POS payment completion.
 * Generates client-side HTML and triggers window.print() for receipt printers.
 */

import { formatWeightQuantity } from "@/features/pos/pos-weight-utils";

export type PosReceiptData = {
  receiptNumber: string;
  soldAt: string;
  companyName: string;
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

function formatReceiptQuantity(line: PosReceiptData["lines"][number]): string {
  if (line.unitCode) {
    return formatWeightQuantity(line.quantity, line.unitCode, 3);
  }
  return String(line.quantity);
}

function buildPosReceiptBodyHtml(receipt: PosReceiptData): string {
  const rows: string[] = [
    `<div class="center title">${receipt.companyName}</div>`,
  ];

  if (receipt.branchName) {
    rows.push(`<div class="center sub">${receipt.branchName}</div>`);
  }
  if (receipt.taxNumber) {
    rows.push(`<div class="center sub">الرقم الضريبي: ${receipt.taxNumber}</div>`);
  }

  rows.push(
    `<div class="sep">${SEP}</div>`,
    `<div class="center bold">${receipt.receiptNumber}</div>`,
    `<div class="center sub">Sales Receipt / إيصال بيع</div>`,
    rowLine("التاريخ", fmtDate(receipt.soldAt)),
    rowLine("الكاشير", receipt.cashierName),
    rowLine("الجهاز", receipt.terminalName || "—"),
    rowLine("المستودع", receipt.warehouseName),
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
    rowLine("الإجمالي", fmtAmt(receipt.total)),
    `<div class="sep">${"-".repeat(28)}</div>`,
    rowLine("المبلغ المقبوض", fmtAmt(receipt.tendered)),
    rowLine("المدفوع", fmtAmt(receipt.paid)),
  );

  if (receipt.change > 0) {
    rows.push(rowLine("الباقي", fmtAmt(receipt.change)));
  }

  rows.push(
    rowLine("الدفع", receipt.paymentSummary),
    `<div class="sep">${SEP}</div>`,
    `<div class="center muted">شكراً لزيارتكم</div>`,
    `<div class="center sub">Thank you for your visit</div>`,
  );

  return rows.join("\n");
}

function buildPosReceiptHtml(receipt: PosReceiptData): string {
  const bodyHtml = buildPosReceiptBodyHtml(receipt);

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>${receipt.receiptNumber}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12pt;
      font-weight: 700;
      color: #000;
      background: #fff;
      width: 76mm;
      padding: 4mm 2mm;
      direction: rtl;
      -webkit-font-smoothing: antialiased;
    }
    .center { text-align: center; }
    .title {
      font-size: 16pt;
      font-weight: 900;
      margin-bottom: 4pt;
      letter-spacing: 0.02em;
    }
    .sub {
      font-size: 10pt;
      font-weight: 700;
      color: #000;
      margin-bottom: 3pt;
    }
    .sep {
      text-align: center;
      color: #000;
      margin: 5pt 0;
      font-size: 11pt;
      font-weight: 900;
      white-space: pre;
      letter-spacing: -0.05em;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: 3pt 0;
      line-height: 1.55;
    }
    .sub-line .lbl {
      font-size: 10pt;
      font-weight: 600;
      color: #000;
    }
    .lbl {
      flex: 0 0 55%;
      font-size: 11pt;
      font-weight: 700;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .val {
      flex: 0 0 45%;
      text-align: left;
      font-size: 11pt;
      font-weight: 700;
    }
    .bold { font-weight: 900; }
    .muted {
      color: #000;
      font-size: 12pt;
      font-weight: 700;
      margin: 6pt 0;
    }
    @media print {
      html, body {
        width: 76mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      * {
        color: #000 !important;
      }
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
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

  setTimeout(() => {
    try {
      win.print();
    } catch {
      throw new Error("PRINT_FAILED");
    }
  }, 400);
}
