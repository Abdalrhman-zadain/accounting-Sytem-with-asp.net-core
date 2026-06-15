import {
  THERMAL_RECEIPT_WIDTH_PX,
  thermalReceiptFooterSpacerHtml,
} from "@/features/pos-shared/thermal-receipt-layout";

/** Shoug Chocolate logo served from `frontend/public/pos-market/`. */
export const POS_MARKET_RECEIPT_LOGO_PATH = "/pos-market/shoug-logo.png";

export const SHOUG_COMPANY_LEGAL_NAME = "مؤسسة شوق لتوزيع الشوكولاته والحلويات";
export const SHOUG_ADDRESS = "الأردن - الكرك - المرج";
export const SHOUG_PHONE = "0796460062";

export function fmtMarketReceiptAmt(val: number): string {
  return val.toFixed(3);
}

export function escapeReceiptHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function resolveMarketReceiptLogoUrl(customUrl?: string | null): string {
  const path = customUrl?.trim() || POS_MARKET_RECEIPT_LOGO_PATH;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return path.startsWith("/") ? path : `/${path}`;
}

export function fmtMarketReceiptDateCompact(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtMarketReceiptDate(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function buildShougReceiptHeaderHtml(documentTitle: string, logoUrl?: string | null): string {
  const logo = escapeReceiptHtml(resolveMarketReceiptLogoUrl(logoUrl));
  return `
    <div class="brand-block">
      <img class="brand-logo" src="${logo}" alt="Shoug Chocolate"/>
      <div class="brand-legal">${SHOUG_COMPANY_LEGAL_NAME}</div>
      <div class="brand-meta">${SHOUG_ADDRESS}</div>
      <div class="brand-meta">هاتف: ${SHOUG_PHONE}</div>
      <div class="doc-title">${escapeReceiptHtml(documentTitle)}</div>
    </div>`;
}

export function buildShougMetaRow(label: string, value: string): string {
  return `<div class="meta-row"><span class="meta-label">${escapeReceiptHtml(label)}</span><span class="meta-value">${escapeReceiptHtml(value)}</span></div>`;
}

export function buildShougTotalRow(label: string, value: string): string {
  return `<div class="total-row"><span class="total-label">${escapeReceiptHtml(label)}</span><span class="total-value">${escapeReceiptHtml(value)}</span></div>`;
}

export function buildShougDividerHtml(): string {
  return `<div class="divider" aria-hidden="true"></div>`;
}

export const SHOUG_RECEIPT_CSS = `
    @page { size: 80mm auto; margin: 0 0 4mm 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Tahoma, Arial, sans-serif;
      font-size: 11px;
      font-weight: 700;
      color: #000;
      background: #fff;
      width: ${THERMAL_RECEIPT_WIDTH_PX}px;
      max-width: ${THERMAL_RECEIPT_WIDTH_PX}px;
      padding: 6px 6px 6mm;
      direction: rtl;
      line-height: 1.35;
    }
    .brand-block { text-align: center; margin-bottom: 4px; }
    .brand-logo {
      display: block;
      width: 96%;
      max-width: 290px;
      height: auto;
      margin: 0 auto 6px;
      object-fit: contain;
    }
    .brand-legal {
      font-size: 10px;
      font-weight: 700;
      line-height: 1.35;
      margin-bottom: 2px;
    }
    .brand-meta {
      font-size: 10px;
      font-weight: 600;
      line-height: 1.3;
      margin-bottom: 1px;
    }
    .doc-title {
      font-size: 13px;
      font-weight: 900;
      margin-top: 5px;
      letter-spacing: 0.02em;
    }
    .divider {
      border-top: 1px solid #000;
      margin: 5px 0;
      height: 0;
    }
    .meta-row,
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 6px;
      margin: 2px 0;
      line-height: 1.35;
    }
    .meta-label,
    .total-label {
      flex: 1 1 auto;
      text-align: right;
      font-size: 10px;
      font-weight: 700;
      word-break: break-word;
    }
    .meta-value,
    .total-value {
      flex: 0 0 auto;
      text-align: left;
      font-size: 10px;
      font-weight: 700;
      white-space: nowrap;
    }
    .total-row .total-label,
    .total-row .total-value {
      font-size: 11px;
      font-weight: 800;
    }
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin: 2px 0;
    }
    table.items-table th,
    table.items-table td {
      padding: 2px 1px;
      vertical-align: top;
      font-size: 9px;
      font-weight: 700;
      word-break: break-word;
    }
    table.items-table th {
      border-bottom: 1px solid #000;
      font-weight: 800;
      text-align: center;
    }
    .col-item { width: 36%; text-align: right; }
    .col-qty { width: 22%; text-align: center; }
    .col-price { width: 20%; text-align: center; }
    .col-total { width: 22%; text-align: left; }
    td.col-item { text-align: right; }
    td.col-qty { text-align: center; white-space: nowrap; }
    td.col-price,
    td.col-total { text-align: left; white-space: nowrap; }
    .disc { font-size: 8px; font-weight: 600; }
    .thanks {
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      margin-top: 4px;
    }
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
      .brand-logo {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
`;

export function buildPosMarketBrandedDocumentHtml(
  title: string,
  bodyHtml: string,
): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeReceiptHtml(title)}</title>
  <style>
${SHOUG_RECEIPT_CSS}
  </style>
</head>
<body>
${bodyHtml}
${thermalReceiptFooterSpacerHtml()}
</body>
</html>`;
}
