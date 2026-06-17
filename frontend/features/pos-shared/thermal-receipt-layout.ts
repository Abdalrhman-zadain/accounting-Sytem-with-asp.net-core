/** Printable width for 80mm thermal paper at ~203 DPI (RAWBT/QZ/browser friendly). */
export const THERMAL_RECEIPT_WIDTH_PX = 302;

/** Max visible characters for item names on one receipt line. */
export const THERMAL_RECEIPT_ITEM_NAME_MAX = 28;

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
  const description = `${qty}  ${truncName}${discountNote}`;
  return `<tr><td class="item">${description}</td><td class="amt">${fmtThermalReceiptAmt(total)}</td></tr>`;
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
    @page { size: 80mm auto; margin: 0 0 4mm 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      font-weight: 700;
      color: #000;
      background: #fff;
      width: ${THERMAL_RECEIPT_WIDTH_PX}px;
      max-width: ${THERMAL_RECEIPT_WIDTH_PX}px;
      padding: 4px 4px 6mm;
      direction: rtl;
      line-height: 1.25;
    }
    .center { text-align: center; }
    .title { font-size: 15px; font-weight: 900; margin-bottom: 1px; line-height: 1.15; }
    .sub { font-size: 12px; font-weight: 700; margin-bottom: 1px; }
    .meta { font-size: 11px; font-weight: 600; margin-bottom: 1px; line-height: 1.2; }
    .sep { text-align: center; margin: 2px 0; font-size: 11px; white-space: pre; }
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
      padding: 1px 0;
      font-size: 11px;
      font-weight: 700;
    }
    td.amt {
      width: 26%;
      text-align: left;
      vertical-align: top;
      white-space: nowrap;
      padding: 1px 0 1px 4px;
      font-size: 11px;
      font-weight: 700;
    }
    .disc { font-size: 10px; font-weight: 600; }
    .thanks { font-size: 11px; font-weight: 700; margin: 2px 0 0; }
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
