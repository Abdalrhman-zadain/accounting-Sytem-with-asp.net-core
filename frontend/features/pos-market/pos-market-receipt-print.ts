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

const SEP = "─".repeat(32);

function fmtDateCompact(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtAmt(val: number): string {
  return val.toFixed(2);
}

function rowLine(label: string, value: string): string {
  const maxLabel = 20;
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

function itemLine(
  qty: string,
  name: string,
  total: number,
  discountAmount = 0,
): string {
  const maxName = 16;
  const truncName = name.length > maxName ? `${name.slice(0, maxName)}…` : name;
  const discountSuffix =
    discountAmount > 0.009 ? ` <span class="disc">(-${fmtAmt(discountAmount)})</span>` : "";

  return `<div class="row item-line"><span class="item-qty">${qty}</span><span class="item-name">${truncName}${discountSuffix}</span><span class="item-amt">${fmtAmt(total)}</span></div>`;
}

function buildReceiptBodyHtml(receipt: PosMarketReceiptData): string {
  const rows: string[] = [];
  const invoiceOutstanding = receipt.invoiceOutstanding ?? 0;

  rows.push(`<div class="center title">${receipt.companyName}</div>`);
  rows.push(`<div class="center sub">فاتورة مبيعات</div>`);

  if (receipt.branchName) {
    rows.push(`<div class="center meta">${receipt.branchName}</div>`);
  }

  rows.push(`<div class="sep">${SEP}</div>`);

  const metaParts = [
    receipt.receiptNumber,
    fmtDateCompact(receipt.soldAt),
    receipt.isCreditDelivery ? "ذمة" : null,
  ].filter(Boolean);
  rows.push(`<div class="center meta">${metaParts.join(" · ")}</div>`);

  const partyParts = [
    receipt.destinationMarketName ? `سوق: ${receipt.destinationMarketName}` : null,
    receipt.salesRepName
      ? `مندوب: ${receipt.salesRepName}`
      : receipt.cashierName
        ? `بائع: ${receipt.cashierName}`
        : null,
  ].filter(Boolean);

  if (partyParts.length > 0) {
    rows.push(`<div class="center meta">${partyParts.join(" · ")}</div>`);
  }

  rows.push(`<div class="sep">${SEP}</div>`);

  for (const line of receipt.lines) {
    const qty = formatReceiptQuantity(line);
    rows.push(itemLine(qty, line.name, line.lineTotal, line.discountAmount));
  }

  rows.push(`<div class="sep">${SEP}</div>`);

  if (receipt.discount > 0.009) {
    rows.push(rowLine("خصم المندوب", `-${fmtAmt(receipt.discount)}`));
  }

  rows.push(rowLine("الإجمالي", fmtAmt(receipt.total)));

  if (receipt.paid > 0.009) {
    rows.push(rowLine("مدفوع", fmtAmt(receipt.paid)));
  }

  if (invoiceOutstanding > 0.009) {
    rows.push(rowLine("متبقي", fmtAmt(invoiceOutstanding)));
  }

  if (!receipt.isCreditDelivery && receipt.paid > 0.009) {
    if (receipt.change > 0.009) {
      rows.push(rowLine("الباقي", fmtAmt(receipt.change)));
    }
    if (receipt.paymentSummary.trim()) {
      rows.push(rowLine("الدفع", receipt.paymentSummary));
    }
  }

  if (receipt.accountOutstanding != null && receipt.accountOutstanding > 0.009) {
    rows.push(rowLine("الذمم", fmtAmt(receipt.accountOutstanding)));
  }

  rows.push(`<div class="sep">${SEP}</div>`);
  rows.push(`<div class="center thanks">شكراً لتعاملكم</div>`);

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
      font-size: 10pt;
      font-weight: 700;
      color: #000;
      background: #fff;
      width: 76mm;
      padding: 2mm 1.5mm;
      direction: rtl;
    }
    .center { text-align: center; }
    .title { font-size: 13pt; font-weight: 900; margin-bottom: 1pt; }
    .sub { font-size: 10pt; font-weight: 700; margin-bottom: 1pt; }
    .meta { font-size: 9pt; font-weight: 600; margin-bottom: 1pt; line-height: 1.2; }
    .sep { text-align: center; margin: 2pt 0; font-size: 9pt; white-space: pre; }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin: 1pt 0;
      line-height: 1.2;
      gap: 4pt;
    }
    .lbl { flex: 1 1 auto; font-size: 9pt; font-weight: 700; word-break: break-word; }
    .val { flex: 0 0 auto; text-align: left; font-size: 9pt; font-weight: 700; white-space: nowrap; }
    .item-line { display: grid; grid-template-columns: auto 1fr auto; gap: 4pt; }
    .item-qty { font-size: 9pt; font-weight: 700; white-space: nowrap; }
    .item-name { font-size: 9pt; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .item-amt { font-size: 9pt; font-weight: 700; text-align: left; white-space: nowrap; }
    .disc { font-size: 8pt; font-weight: 600; }
    .thanks { font-size: 9pt; font-weight: 700; margin: 2pt 0 0; }
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
