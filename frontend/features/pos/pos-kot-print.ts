import { formatAddonsForDisplay } from "@/features/pos/pos-addon-utils";
import type { PosSale } from "@/types/api";

function fmtDate(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const SEP = "─".repeat(32);

export function buildKitchenOrderTicketHtml(sale: PosSale, language: string): string {
  const isAr = language === "ar";
  const tableLabel = sale.table?.tableNumber
    ? `${isAr ? "طاولة" : "Table"} ${sale.table.tableNumber}`
    : "—";
  const waiterLabel = sale.waiter?.name || sale.waiter?.email || "—";
  const now = fmtDate(new Date());

  const lineRows = sale.lines
    .filter((line) => line.kitchenSentAt)
    .map((line) => {
      const qty = Number(line.quantity);
      const name = (line.itemName || line.description || "—").slice(0, 22);
      const addons = formatAddonsForDisplay(line.modifiers, language);
      const note =
        line.description && line.description !== (line.itemName ?? "")
          ? line.description
          : "";
      return `
        <div class="item">
          <div class="row bold"><span>${qty}× ${name}</span></div>
          ${addons ? `<div class="sub">${addons}</div>` : ""}
          ${note ? `<div class="sub note">${note}</div>` : ""}
        </div>`;
    })
    .join("");

  const bodyHtml = `
    <div class="center bold title">${isAr ? "تذكرة مطبخ" : "Kitchen Ticket"}</div>
    <div class="center">${isAr ? "KOT" : "KOT"} #${sale.reference}</div>
    <div class="sep">${SEP}</div>
    <div class="row"><span>${isAr ? "الطاولة" : "Table"}</span><span>${tableLabel}</span></div>
    <div class="row"><span>${isAr ? "الويتر" : "Waiter"}</span><span>${waiterLabel}</span></div>
    <div class="row"><span>${isAr ? "الوقت" : "Time"}</span><span>${now}</span></div>
    <div class="sep">${SEP}</div>
    ${lineRows || `<div class="center">${isAr ? "لا أصناف" : "No items"}</div>`}
    <div class="sep">${SEP}</div>
    ${sale.description ? `<div class="note">${sale.description}</div>` : ""}
  `;

  return `<!DOCTYPE html>
<html dir="${isAr ? "rtl" : "ltr"}" lang="${isAr ? "ar" : "en"}">
<head>
  <meta charset="UTF-8"/>
  <title>${isAr ? "تذكرة مطبخ" : "Kitchen Ticket"}</title>
  <style>
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
    .sep { text-align: center; margin: 6px 0; overflow: hidden; }
    .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
    .item { margin: 6px 0; }
    .sub { font-size: 9pt; opacity: 0.85; margin-top: 2px; }
    .note { font-size: 9pt; font-style: italic; margin-top: 4px; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;
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
