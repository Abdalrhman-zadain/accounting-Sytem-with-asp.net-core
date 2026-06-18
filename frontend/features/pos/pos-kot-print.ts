import { formatAddonsForDisplay, getAddonsFromModifiers } from "@/features/pos/pos-addon-utils";
import type { KitchenDeltaLine } from "@/features/pos/pos-kitchen-print-delta";
import {
  THERMAL_PAGE_SIDE_MARGIN,
  THERMAL_PRINTABLE_WIDTH_MM,
  THERMAL_RECEIPT_SIDE_PADDING,
  THERMAL_ROLL_PAGE_WIDTH,
  thermalReceiptSepLine,
} from "@/features/pos-shared/thermal-receipt-layout";
import type { PosSale } from "@/types/api";

function fmtDate(val?: string | Date | null): string {
  if (!val) return "—";
  const d = new Date(val);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const SEP = thermalReceiptSepLine();

const KOT_STYLES = `
    @page { size: ${THERMAL_ROLL_PAGE_WIDTH} auto; margin: 0 ${THERMAL_PAGE_SIDE_MARGIN}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      width: ${THERMAL_PRINTABLE_WIDTH_MM}mm;
      max-width: ${THERMAL_PRINTABLE_WIDTH_MM}mm;
      margin: 0 auto;
      padding: 4mm ${THERMAL_RECEIPT_SIDE_PADDING};
      color: #000;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .title { font-size: 12pt; margin-bottom: 4px; }
    .void-title { font-size: 12pt; margin-bottom: 4px; }
    .order-type-banner { font-size: 14pt; font-weight: bold; text-align: center; margin: 4px 0; }
    .sep { text-align: center; margin: 6px 0; overflow: hidden; }
    .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
    .meta-block { margin: 4px 0; word-wrap: break-word; }
    .meta-block .label { font-weight: bold; }
    .item { margin: 6px 0; }
    .item-row { display: flex; gap: 6px; align-items: baseline; }
    .item-qty { font-size: 14pt; font-weight: bold; flex-shrink: 0; }
    .item-name { font-size: 12pt; flex: 1; }
    .item-addons-block { margin-top: 4px; padding-inline-start: 10px; }
    .item-addons-label { font-size: 11pt; font-weight: bold; margin-bottom: 2px; }
    .item-addon-line { font-size: 12pt; font-weight: 900; line-height: 1.45; margin: 2px 0; }
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

function resolveDeliveryCompanyName(sale: PosSale, isAr: boolean): string | null {
  const company = sale.deliveryCompany;
  if (!company) return null;
  const name = isAr
    ? company.arabicName?.trim() || company.name?.trim()
    : company.name?.trim() || company.arabicName?.trim();
  return name || null;
}

function resolveDriverName(sale: PosSale): string | null {
  return sale.driver?.name?.trim() || null;
}

function kotMetaRow(label: string, value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "—") return "";
  return `<div class="row"><span>${label}</span><span>${trimmed}</span></div>`;
}

function kotMetaBlock(label: string, value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "—") return "";
  return `<div class="meta-block"><div class="label">${label}</div><div>${trimmed}</div></div>`;
}

function buildOrderTypeBanner(sale: PosSale, language: string): string {
  const isAr = language === "ar";
  const orderType = sale.orderType ?? "DINE_IN";

  let text: string;
  if (orderType === "TAKEAWAY") {
    text = isAr ? "سفري" : "Takeaway";
  } else if (orderType === "DELIVERY") {
    text = isAr ? "توصيل" : "Delivery";
  } else if (sale.table?.tableNumber) {
    text = isAr
      ? `صالة — طاولة ${sale.table.tableNumber}`
      : `Dine-in — Table ${sale.table.tableNumber}`;
  } else {
    text = isAr ? "صالة" : "Dine-in";
  }

  return `<div class="order-type-banner">${text}</div>`;
}

function buildKotMetaSection(sale: PosSale, language: string): string {
  const isAr = language === "ar";
  const orderType = sale.orderType ?? "DINE_IN";
  const now = fmtDate(new Date());
  const rows: string[] = [];

  if (orderType === "DINE_IN") {
    const waiterLabel = sale.waiter?.name || sale.waiter?.email || null;
    rows.push(kotMetaRow(isAr ? "الويتر" : "Waiter", waiterLabel));
    rows.push(kotMetaRow(isAr ? "الوقت" : "Time", now));
  } else if (orderType === "TAKEAWAY") {
    rows.push(kotMetaRow(isAr ? "الوقت" : "Time", now));
    if (sale.description?.trim()) {
      rows.push(
        kotMetaRow(isAr ? "ملاحظة الطلب" : "Order note", sale.description.trim()),
      );
    }
  } else if (orderType === "DELIVERY") {
    rows.push(
      kotMetaBlock(isAr ? "عنوان التوصيل" : "Delivery address", sale.deliveryAddress),
    );
    rows.push(
      kotMetaRow(
        isAr ? "شركة التوصيل" : "Delivery company",
        resolveDeliveryCompanyName(sale, isAr),
      ),
    );
    rows.push(kotMetaRow(isAr ? "السائق" : "Driver", resolveDriverName(sale)));
    rows.push(
      kotMetaRow(isAr ? "ملاحظات التوصيل" : "Delivery notes", sale.deliveryNotes),
    );
    rows.push(kotMetaRow(isAr ? "الوقت" : "Time", now));
  } else {
    rows.push(kotMetaRow(isAr ? "الوقت" : "Time", now));
  }

  return rows.filter(Boolean).join("\n");
}

function buildKotHeaderSection(sale: PosSale, language: string): string {
  return `
    ${buildOrderTypeBanner(sale, language)}
    <div class="sep">${SEP}</div>
    ${buildKotMetaSection(sale, language)}`;
}

function shouldShowBottomOrderNote(sale: PosSale): boolean {
  const orderType = sale.orderType ?? "DINE_IN";
  if (!sale.description?.trim()) return false;
  // Takeaway shows order note in meta section to avoid duplication.
  return orderType !== "TAKEAWAY";
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

function buildKitchenAddonsHtml(
  modifiers: PosSale["lines"][number]["modifiers"],
  language: string,
): string {
  const addons = getAddonsFromModifiers(modifiers);
  if (addons.length > 0) {
    const isAr = language === "ar";
    const lines = addons
      .map((addon) => {
        const label = addon.name?.trim() || "—";
        return `<div class="item-addon-line">+ ${label}</div>`;
      })
      .join("");
    return `<div class="item-addons-block"><div class="item-addons-label">${isAr ? "إضافات" : "Add-ons"}</div>${lines}</div>`;
  }

  const legacy = formatAddonsForDisplay(modifiers, language);
  if (!legacy) {
    return "";
  }

  return `<div class="item-addons-block"><div class="item-addon-line">+ ${legacy}</div></div>`;
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
  const name = (line.itemName || line.description || "—").slice(0, 28);
  const addonsHtml = buildKitchenAddonsHtml(line.modifiers, language);
  const note =
    line.description && line.description !== (line.itemName ?? "") ? line.description : "";
  return `
    <div class="item">
      <div class="item-row bold">
        <span class="item-qty">${prefix}${qty}×</span>
        <span class="item-name">${name}</span>
      </div>
      ${addonsHtml}
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
    ${buildKotHeaderSection(sale, language)}
    <div class="sep">${SEP}</div>
    ${lineRows || `<div class="center">${isAr ? "لا أصناف" : "No items"}</div>`}
    <div class="sep">${SEP}</div>
    ${shouldShowBottomOrderNote(sale) ? `<div class="note">${sale.description}</div>` : ""}
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
    ${buildKotHeaderSection(sale, language)}
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
    ${buildKotHeaderSection(sale, language)}
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
    ${buildKotHeaderSection(sale, language)}
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
