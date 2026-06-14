import { formatAddonsForDisplay } from "@/features/pos/pos-addon-utils";
import type { KitchenDeltaLine } from "@/features/pos/pos-kitchen-print-delta";
import type { PosSale } from "@/types/api";

function fmtDate(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const SEP = "─".repeat(32);

const KOT_STYLES = `
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      width: 76mm;
      padding: 4mm 2mm;
      color: #000;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .title { font-size: 12pt; margin-bottom: 4px; }
    .void-title { font-size: 12pt; margin-bottom: 4px; }
    .sep { text-align: center; margin: 6px 0; overflow: hidden; }
    .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
    .item { margin: 6px 0; }
    .sub { font-size: 9pt; opacity: 0.85; margin-top: 2px; }
    .note { font-size: 9pt; font-style: italic; margin-top: 4px; }
`;

function buildKotDocumentHtml(
  language: string,
  title: string,
  bodyHtml: string,
): string {
  const isAr = language === "ar";
  return `<!DOCTYPE html>
<html dir="${isAr ? "rtl" : "ltr"}" lang="${isAr ? "ar" : "en"}">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>${KOT_STYLES}</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

function buildSaleMetaRows(sale: PosSale, language: string): string {
  const isAr = language === "ar";
  const tableLabel = sale.table?.tableNumber
    ? `${isAr ? "طاولة" : "Table"} ${sale.table.tableNumber}`
    : "—";
  const waiterLabel = sale.waiter?.name || sale.waiter?.email || "—";
  const now = fmtDate(new Date());

  return `
    <div class="row"><span>${isAr ? "الطاولة" : "Table"}</span><span>${tableLabel}</span></div>
    <div class="row"><span>${isAr ? "الويتر" : "Waiter"}</span><span>${waiterLabel}</span></div>
    <div class="row"><span>${isAr ? "الوقت" : "Time"}</span><span>${now}</span></div>`;
}

function buildLineRowsFromSaleLines(
  sale: PosSale,
  lineIds: Set<string>,
  language: string,
): string {
  return sale.lines
    .filter((line) => line.kitchenSentAt && lineIds.has(line.id))
    .map((line) => buildLineRowHtml(line, Number(line.quantity), language))
    .join("");
}

function buildLineRowHtml(
  line: {
    itemName?: string | null;
    description?: string | null;
    modifiers?: PosSale["lines"][number]["modifiers"];
  },
  qty: number,
  language: string,
  prefix = "",
): string {
  const name = (line.itemName || line.description || "—").slice(0, 22);
  const addons = formatAddonsForDisplay(line.modifiers, language);
  const note =
    line.description && line.description !== (line.itemName ?? "") ? line.description : "";
  return `
    <div class="item">
      <div class="row bold"><span>${prefix}${qty}× ${name}</span></div>
      ${addons ? `<div class="sub">${addons}</div>` : ""}
      ${note ? `<div class="sub note">${note}</div>` : ""}
    </div>`;
}

function buildLineRowsFromDeltaLines(deltaLines: KitchenDeltaLine[], language: string, prefix = ""): string {
  return deltaLines
    .filter((line) => line.qty > 0)
    .map((line) =>
      buildLineRowHtml(
        {
          itemName: line.name,
          description: line.lineNote ?? null,
          modifiers: line.modifiers ?? null,
        },
        line.qty,
        language,
        prefix,
      ),
    )
    .join("");
}

export function buildKitchenOrderTicketHtml(sale: PosSale, language: string): string {
  const isAr = language === "ar";
  const lineRows = sale.lines
    .filter((line) => line.kitchenSentAt)
    .map((line) => buildLineRowHtml(line, Number(line.quantity), language))
    .join("");

  const bodyHtml = `
    <div class="center bold title">${isAr ? "تذكرة مطبخ" : "Kitchen Ticket"}</div>
    <div class="center">${isAr ? "KOT" : "KOT"} #${sale.reference}</div>
    <div class="sep">${SEP}</div>
    ${buildSaleMetaRows(sale, language)}
    <div class="sep">${SEP}</div>
    ${lineRows || `<div class="center">${isAr ? "لا أصناف" : "No items"}</div>`}
    <div class="sep">${SEP}</div>
    ${sale.description ? `<div class="note">${sale.description}</div>` : ""}
  `;

  return buildKotDocumentHtml(
    language,
    isAr ? "تذكرة مطبخ" : "Kitchen Ticket",
    bodyHtml,
  );
}

export function buildKitchenTicketHtmlForLines(
  sale: PosSale,
  lineIds: string[],
  language: string,
): string {
  const isAr = language === "ar";
  const idSet = new Set(lineIds);
  const lineRows = buildLineRowsFromSaleLines(sale, idSet, language);

  const bodyHtml = `
    <div class="center bold title">${isAr ? "تذكرة مطبخ" : "Kitchen Ticket"}</div>
    <div class="center">${isAr ? "KOT" : "KOT"} #${sale.reference}</div>
    <div class="sep">${SEP}</div>
    ${buildSaleMetaRows(sale, language)}
    <div class="sep">${SEP}</div>
    ${lineRows || `<div class="center">${isAr ? "لا أصناف" : "No items"}</div>`}
    <div class="sep">${SEP}</div>
  `;

  return buildKotDocumentHtml(
    language,
    isAr ? "تذكرة مطبخ" : "Kitchen Ticket",
    bodyHtml,
  );
}

export function buildKitchenDeltaTicketHtml(
  sale: PosSale,
  deltaLines: KitchenDeltaLine[],
  language: string,
): string {
  const isAr = language === "ar";
  const lineRows = buildLineRowsFromDeltaLines(deltaLines, language, "+");

  const bodyHtml = `
    <div class="center bold title">${isAr ? "تحديث مطبخ" : "Kitchen Update"}</div>
    <div class="center">${isAr ? "KOT" : "KOT"} #${sale.reference}</div>
    <div class="sep">${SEP}</div>
    ${buildSaleMetaRows(sale, language)}
    <div class="sep">${SEP}</div>
    ${lineRows || `<div class="center">${isAr ? "لا أصناف" : "No items"}</div>`}
    <div class="sep">${SEP}</div>
  `;

  return buildKotDocumentHtml(
    language,
    isAr ? "تحديث مطبخ" : "Kitchen Update",
    bodyHtml,
  );
}

export function buildKitchenVoidTicketHtml(
  sale: PosSale,
  voidLines: KitchenDeltaLine[],
  language: string,
): string {
  const isAr = language === "ar";
  const lineRows = buildLineRowsFromDeltaLines(voidLines, language, "-");

  const bodyHtml = `
    <div class="center bold void-title">${isAr ? "*** إلغاء ***" : "*** CANCEL ***"}</div>
    <div class="center">${isAr ? "KOT" : "KOT"} #${sale.reference}</div>
    <div class="sep">${SEP}</div>
    ${buildSaleMetaRows(sale, language)}
    <div class="sep">${SEP}</div>
    ${lineRows || `<div class="center">${isAr ? "لا أصناف" : "No items"}</div>`}
    <div class="sep">${SEP}</div>
  `;

  return buildKotDocumentHtml(
    language,
    isAr ? "إلغاء مطبخ" : "Kitchen Cancel",
    bodyHtml,
  );
}

export function printKitchenOrderTicket(sale: PosSale, language: string): void {
  const html = buildKitchenOrderTicketHtml(sale, language);
  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };
}
