/** Physical roll width for `@page` (80mm). */
export const THERMAL_ROLL_PAGE_WIDTH = "80mm";

/**
 * Typical printable width on 80mm XPrinter rolls (Windows driver often reports 72.1mm).
 * Layout content should stay inside this width to avoid left/right clipping.
 */
export const THERMAL_PRINTABLE_WIDTH_MM = 72;

/** CSS px width for ~68mm safe content at 96dpi (68 / 25.4 * 96 ≈ 257). */
export const THERMAL_RECEIPT_WIDTH_PX = 260;

/** Horizontal padding inside the content safe area (each side). */
export const THERMAL_RECEIPT_SIDE_PADDING = "4mm";

/** `@page` left/right margin to center content on an 80mm roll. */
export const THERMAL_PAGE_SIDE_MARGIN = "5mm";

/** Separator character count for narrow courier receipts. */
export const THERMAL_RECEIPT_SEP_CHARS = 26;

/** Max visible characters for item names on one receipt line. */
export const THERMAL_RECEIPT_ITEM_NAME_MAX = 22;

/** Max characters per payment account name on the receipt. */
export const THERMAL_RECEIPT_PAYMENT_NAME_MAX = 16;

export function thermalReceiptSepLine(char = "─"): string {
  return char.repeat(THERMAL_RECEIPT_SEP_CHARS);
}

export function fmtThermalReceiptAmt(val: number): string {
  return val.toFixed(2);
}

export function thermalReceiptRowLine(label: string, value: string): string {
  return `<tr><td class="label">${label}</td><td class="amt">${value}</td></tr>`;
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
  const description = `${truncName}  ×${qty}${discountNote}`;
  return `<tr><td class="item">${description}</td><td class="amt">${fmtThermalReceiptAmt(total)}</td></tr>`;
}

export function thermalReceiptMetaLineHtml(text: string): string {
  return `<div class="center meta meta-line">${text}</div>`;
}

export function thermalReceiptPaymentBlockHtml(label: string, detail: string): string {
  return `<tr><td class="payment-block" colspan="2"><span class="payment-label">${label}</span><span class="payment-detail">${detail}</span></td></tr>`;
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

export function thermalReceiptTableOpen(): string {
  return `<table class="receipt-table">`;
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
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      font-weight: 700;
      color: #000;
      background: #fff;
      width: ${THERMAL_RECEIPT_WIDTH_PX}px;
      max-width: ${THERMAL_RECEIPT_WIDTH_PX}px;
      margin: 0 auto;
      padding: 4px ${THERMAL_RECEIPT_SIDE_PADDING} 6mm ${THERMAL_RECEIPT_SIDE_PADDING};
      direction: rtl;
      line-height: 1.25;
    }
    .center { text-align: center; }
    .title { font-size: 14px; font-weight: 900; margin-bottom: 1px; line-height: 1.15; }
    .sub { font-size: 11px; font-weight: 700; margin-bottom: 1px; }
    .meta { font-size: 10px; font-weight: 600; margin-bottom: 1px; line-height: 1.25; }
    .meta-line {
      word-break: break-word;
      overflow-wrap: anywhere;
      padding: 0 1px;
    }
    .sep { text-align: center; margin: 2px 0; font-size: 10px; white-space: pre; }
    table.receipt-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin: 1px 0;
    }
    td.item,
    td.label {
      width: 74%;
      text-align: right;
      vertical-align: top;
      word-break: break-word;
      padding: 1px 2px;
      font-size: 10px;
      font-weight: 700;
    }
    td.amt {
      width: 26%;
      text-align: left;
      vertical-align: top;
      white-space: nowrap;
      padding: 1px 2px;
      font-size: 10px;
      font-weight: 700;
    }
    td.payment-block {
      text-align: right;
      padding: 2px 2px 1px;
      font-size: 10px;
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
    .disc { font-size: 9px; font-weight: 600; }
    .thanks { font-size: 10px; font-weight: 700; margin: 2px 0 0; }
    .print-footer-spacer {
      height: 4mm;
      width: 100%;
    }
    @media print {
      html, body {
        width: ${THERMAL_RECEIPT_WIDTH_PX}px;
        max-width: ${THERMAL_RECEIPT_WIDTH_PX}px;
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
