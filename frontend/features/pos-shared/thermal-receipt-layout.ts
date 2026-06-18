/** Physical roll width for `@page` (80mm). */
export const THERMAL_ROLL_PAGE_WIDTH = "80mm";

/**
 * Typical printable width on 80mm XPrinter rolls (Windows driver often reports 72.1mm).
 * Layout content should stay inside this width to avoid left/right clipping.
 */
export const THERMAL_PRINTABLE_WIDTH_MM = 72;

/** Legacy px width kept for callers that still reference it. */
export const THERMAL_RECEIPT_WIDTH_PX = 272;

/** Horizontal padding inside the content safe area (each side). */
export const THERMAL_RECEIPT_SIDE_PADDING = "3mm";

/** `@page` left/right margin to center content on an 80mm roll. */
export const THERMAL_PAGE_SIDE_MARGIN = "4mm";

/** Separator character count for restaurant receipts on 72mm printable width. */
export const THERMAL_RECEIPT_SEP_CHARS = 32;

/** Max visible characters for item names on one receipt line. */
export const THERMAL_RECEIPT_ITEM_NAME_MAX = 28;

/** Max characters per payment account name on the receipt. */
export const THERMAL_RECEIPT_PAYMENT_NAME_MAX = 16;

/** Fixed character width for monospace amount cells. */
export const THERMAL_RECEIPT_AMT_PAD = 7;

/**
 * Left inset for LTR amount cells on RTL receipts.
 * Keeps digits off the physical left margin where 80mm rolls often clip.
 */
export const THERMAL_RECEIPT_AMT_SAFE_INSET = "2.5mm";

export function thermalReceiptSepLine(char = "─"): string {
  return char.repeat(THERMAL_RECEIPT_SEP_CHARS);
}

export function fmtThermalReceiptAmt(val: number): string {
  return val.toFixed(2);
}

export type ThermalReceiptMoneyOptions = {
  currency?: boolean;
};

const thermalReceiptMoneyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Clean display amount for thermal receipts (e.g. "2.50", "1,234.56"). */
export function fmtThermalReceiptMoney(
  val: number,
  options?: ThermalReceiptMoneyOptions,
): string {
  const negative = val < -0.0005;
  const formatted = thermalReceiptMoneyFormatter.format(Math.abs(val));
  const amount = negative ? `-${formatted}` : formatted;
  return options?.currency ? `${amount} د.أ` : amount;
}

/** Padded amount for fixed-width thermal columns (e.g. "  2.50"). */
export function fmtThermalReceiptAmtPadded(val: number): string {
  const negative = val < -0.0005;
  const text = `${negative ? "-" : ""}${Math.abs(val).toFixed(2)}`;
  return text.padStart(THERMAL_RECEIPT_AMT_PAD, " ");
}

export function thermalReceiptRowLine(label: string, value: number): string {
  return `<tr><td class="label">${label}</td><td class="amt">${fmtThermalReceiptAmtPadded(value)}</td></tr>`;
}

export function thermalReceiptItemLine(
  qty: string,
  name: string,
  total: number,
  discountNote = "",
): string {
  const truncName =
    name.length > THERMAL_RECEIPT_ITEM_NAME_MAX
      ? `${name.slice(0, THERMAL_RECEIPT_ITEM_NAME_MAX)}…`
      : name;
  const qtyLine = `×${qty}${discountNote}`;
  const amt = fmtThermalReceiptAmtPadded(total);

  return `<tr>
  <td class="item-name">${truncName}</td>
  <td class="amt" rowspan="2">${amt}</td>
</tr>
<tr>
  <td class="item-qty">${qtyLine}</td>
</tr>`;
}

export function thermalReceiptColumnHeaderRow(
  nameLabel: string,
  priceLabel: string,
  qtyLabel: string,
  totalLabel: string,
): string {
  return `<tr class="col-header">
  <td class="col-name">${nameLabel}</td>
  <td class="col-price">${priceLabel}</td>
  <td class="col-qty">${qtyLabel}</td>
  <td class="col-total">${totalLabel}</td>
</tr>`;
}

export function thermalReceiptItemRow4Col(
  name: string,
  unitPrice: number,
  qty: string,
  total: number,
): string {
  const truncName =
    name.length > THERMAL_RECEIPT_ITEM_NAME_MAX
      ? `${name.slice(0, THERMAL_RECEIPT_ITEM_NAME_MAX)}…`
      : name;

  return `<tr class="item-row">
  <td class="col-name">${truncName}</td>
  <td class="col-price thermal-amt">${fmtThermalReceiptMoney(unitPrice)}</td>
  <td class="col-qty">${qty}</td>
  <td class="col-total thermal-amt">${fmtThermalReceiptMoney(total)}</td>
</tr>`;
}

export function thermalReceiptItemDiscountRow(discountAmount: number): string {
  return `<tr class="item-disc-row">
  <td class="col-name item-disc-label" colspan="3">خصم</td>
  <td class="col-total thermal-amt">${fmtThermalReceiptMoney(-Math.abs(discountAmount))}</td>
</tr>`;
}

export function thermalReceiptMetaLineHtml(text: string): string {
  return `<div class="center meta meta-line">${text}</div>`;
}

export function thermalReceiptMetaRowSplit(
  rightLabel: string,
  rightValue: string,
  leftLabel: string,
  leftValue: string,
): string {
  return `<div class="meta-split">
  <span class="meta-split-right">${rightLabel}: ${rightValue}</span>
  <span class="meta-split-left">${leftLabel}: ${leftValue}</span>
</div>`;
}

export function thermalReceiptDateTimeRow(dateText: string, timeText: string): string {
  return `<div class="meta-split">
  <span class="meta-split-right">التاريخ: ${dateText}</span>
  <span class="meta-split-left">الوقت: ${timeText}</span>
</div>`;
}

export function thermalReceiptTotalRow(
  label: string,
  value: number,
  options?: { emphasis?: boolean; currency?: boolean },
): string {
  const rowClass = options?.emphasis ? "total-row emphasis" : "total-row";
  return `<tr class="${rowClass}">
  <td class="total-label" colspan="3">${label}</td>
  <td class="total-amt thermal-amt">${fmtThermalReceiptMoney(value, { currency: options?.currency })}</td>
</tr>`;
}

export function thermalReceiptPaymentBlockHtml(label: string, detail: string): string {
  return `<tr><td class="payment-block" colspan="2"><span class="payment-label">${label}</span><span class="payment-detail">${detail}</span></td></tr>`;
}

export type ThermalReceiptPaymentBoxLine = {
  label: string;
  value: number;
  emphasis?: boolean;
  currency?: boolean;
};

export function thermalReceiptPaymentBoxHtml(
  lines: ThermalReceiptPaymentBoxLine[],
): string {
  const rows = lines
    .map((line) => {
      const rowClass = line.emphasis ? "pay-row pay-row-emphasis" : "pay-row";
      return `<div class="${rowClass}"><span class="pay-label">${line.label}</span><span class="pay-amt thermal-amt">${fmtThermalReceiptMoney(line.value, { currency: line.currency })}</span></div>`;
    })
    .join("\n");

  return `<div class="payment-box">${rows}</div>`;
}

export function formatReceiptPaymentSummary(summary: string): string {
  const parts = summary
    .split(/\s*\+\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts
    .map((part) => {
      const match = part.match(/^(.+?)\s+([\d.]+)$/);
      if (!match) {
        return part.length > THERMAL_RECEIPT_PAYMENT_NAME_MAX + 6
          ? `${part.slice(0, THERMAL_RECEIPT_PAYMENT_NAME_MAX + 5)}…`
          : part;
      }

      const [, name, amount] = match;
      const shortName =
        name.length > THERMAL_RECEIPT_PAYMENT_NAME_MAX
          ? `${name.slice(0, THERMAL_RECEIPT_PAYMENT_NAME_MAX - 1)}…`
          : name;
      return `${shortName} ${amount}`;
    })
    .join(" + ");
}

export function thermalReceiptTableOpen(className = "receipt-table"): string {
  return `<table class="${className}">`;
}

export function thermalReceiptTableClose(): string {
  return `</table>`;
}

export function thermalReceiptFooterSpacerHtml(): string {
  return `<div class="print-footer-spacer" aria-hidden="true"></div>`;
}

const THERMAL_RECEIPT_BASE_CSS = `
    @page { size: ${THERMAL_ROLL_PAGE_WIDTH} auto; margin: 0 ${THERMAL_PAGE_SIDE_MARGIN} 4mm ${THERMAL_PAGE_SIDE_MARGIN}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Tahoma, 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      font-weight: 700;
      color: #000;
      background: #fff;
      width: ${THERMAL_PRINTABLE_WIDTH_MM}mm;
      max-width: ${THERMAL_PRINTABLE_WIDTH_MM}mm;
      margin: 0 auto;
      padding: 3mm ${THERMAL_RECEIPT_SIDE_PADDING} 6mm ${THERMAL_RECEIPT_SIDE_PADDING};
      direction: rtl;
      line-height: 1.35;
    }
    .center { text-align: center; }
    .title { font-size: 17px; font-weight: 900; margin-bottom: 2px; line-height: 1.2; }
    .sub { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
    .meta { font-size: 12px; font-weight: 600; margin-bottom: 2px; line-height: 1.3; }
    .meta-line {
      word-break: break-word;
      overflow-wrap: anywhere;
      padding: 0 1mm;
    }
    .meta-split {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 2mm;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 2px;
      line-height: 1.3;
    }
    .meta-split-right { text-align: right; flex: 1; }
    .meta-split-left { text-align: left; flex: 1; }
    .sep { text-align: center; margin: 3px 0; font-size: 11px; white-space: pre; }
    .sep-strong { font-weight: 400; }
    table.receipt-table,
    table.items-table,
    table.totals-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin: 2px 0;
    }
    table.items-table td.col-name,
    table.items-table td.col-price,
    table.items-table td.col-qty,
    table.items-table td.col-total {
      vertical-align: top;
      word-break: break-word;
      padding: 2px 1px;
      font-size: 11px;
      font-weight: 700;
    }
    table.items-table tr.col-header td {
      font-size: 11px;
      font-weight: 800;
      text-decoration: underline;
      padding-bottom: 3px;
    }
    table.items-table td.col-name { width: 42%; text-align: right; }
    table.items-table td.col-price { width: 18%; text-align: right; direction: ltr; unicode-bidi: isolate; }
    table.items-table td.col-qty { width: 15%; text-align: center; direction: ltr; unicode-bidi: isolate; }
    table.items-table td.col-total { width: 25%; text-align: right; direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; }
    table.items-table tr.item-row td { padding-top: 3px; padding-bottom: 3px; }
    table.items-table tr.item-disc-row td.item-disc-label {
      font-size: 10px;
      font-weight: 600;
      color: #222;
      padding-top: 0;
      padding-bottom: 4px;
      text-align: right;
    }
    .thermal-amt {
      overflow: visible;
      padding-left: ${THERMAL_RECEIPT_AMT_SAFE_INSET};
      font-variant-numeric: tabular-nums;
    }
    table.totals-table td.total-label {
      text-align: right;
      padding: 2px 1px;
      font-size: 12px;
      font-weight: 700;
    }
    table.totals-table td.total-amt {
      text-align: right;
      padding: 2px 1px 2px ${THERMAL_RECEIPT_AMT_SAFE_INSET};
      font-size: 12px;
      font-weight: 700;
      direction: ltr;
      unicode-bidi: isolate;
      font-variant-numeric: tabular-nums;
      overflow: visible;
      width: 30%;
    }
    table.totals-table tr.total-row.emphasis td.total-label {
      font-size: 15px;
      font-weight: 900;
      padding-top: 4px;
      padding-bottom: 4px;
    }
    table.totals-table tr.total-row.emphasis td.total-amt {
      font-size: 17px;
      font-weight: 900;
      padding-top: 4px;
      padding-bottom: 4px;
    }
    td.item-name,
    td.item-qty,
    td.label {
      width: 70%;
      text-align: right;
      vertical-align: top;
      word-break: break-word;
      padding: 1px 2mm 1px 1px;
      font-size: 11px;
      font-weight: 700;
    }
    td.item-qty {
      font-size: 10px;
      font-weight: 600;
      padding-top: 0;
      padding-bottom: 2px;
      color: #111;
    }
    td.amt {
      width: 30%;
      min-width: 12mm;
      text-align: left;
      vertical-align: middle;
      white-space: pre;
      padding: 1px 1px 1px 4mm;
      font-size: 11px;
      font-weight: 700;
      direction: ltr;
      unicode-bidi: isolate;
      font-variant-numeric: tabular-nums;
    }
    td.payment-block {
      text-align: right;
      padding: 2px 2mm 1px;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.3;
    }
    .payment-label {
      display: block;
      font-weight: 800;
      margin-bottom: 1px;
    }
    .payment-detail {
      display: block;
      text-align: right;
      word-break: break-word;
      overflow-wrap: anywhere;
      font-weight: 600;
    }
    .payment-box {
      border: 1px solid #000;
      margin: 4px 0;
      padding: 3px 2mm;
    }
    .pay-row {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 2mm;
      margin: 2px 0;
      font-size: 12px;
      font-weight: 700;
    }
    .pay-label { text-align: right; }
    .pay-amt {
      direction: ltr;
      unicode-bidi: isolate;
      font-variant-numeric: tabular-nums;
      min-width: 14mm;
      text-align: right;
      padding-left: ${THERMAL_RECEIPT_AMT_SAFE_INSET};
    }
    .pay-row-emphasis .pay-amt {
      font-size: 14px;
      font-weight: 900;
    }
    .disc { font-size: 10px; font-weight: 600; }
    .thanks { font-size: 13px; font-weight: 700; margin: 4px 0 0; }
    .print-footer-spacer {
      height: 5mm;
      width: 100%;
    }
    @media print {
      html, body {
        width: ${THERMAL_PRINTABLE_WIDTH_MM}mm;
        max-width: ${THERMAL_PRINTABLE_WIDTH_MM}mm;
      }
      * { color: #000 !important; }
    }
`;

export function buildThermalReceiptDocumentHtml(
  title: string,
  bodyHtml: string,
  extraCss = "",
): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>
${THERMAL_RECEIPT_BASE_CSS}
${extraCss}
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
