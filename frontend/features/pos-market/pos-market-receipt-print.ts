import { formatWeightQuantity } from "@/features/pos-market/pos-market-weight-utils";
import {
  buildThermalReceiptDocumentHtml,
  fmtThermalReceiptAmt,
  thermalReceiptFooterSpacerHtml,
  thermalReceiptItemLine,
  thermalReceiptRowLine,
  thermalReceiptTableClose,
  thermalReceiptTableOpen,
} from "@/features/pos-shared/thermal-receipt-layout";

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

function formatReceiptQuantity(line: PosMarketReceiptData["lines"][number]): string {
  if (line.unitCode) {
    return formatWeightQuantity(line.quantity, line.unitCode, 3);
  }
  return String(line.quantity);
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

  rows.push(thermalReceiptTableOpen());
  for (const line of receipt.lines) {
    const qty = formatReceiptQuantity(line);
    const discountNote =
      line.discountAmount > 0.009
        ? ` <span class="disc">(-${fmtThermalReceiptAmt(line.discountAmount)})</span>`
        : "";
    rows.push(thermalReceiptItemLine(qty, line.name, line.lineTotal, discountNote));
  }
  rows.push(thermalReceiptTableClose());

  rows.push(`<div class="sep">${SEP}</div>`);
  rows.push(thermalReceiptTableOpen());

  if (receipt.discount > 0.009) {
    rows.push(thermalReceiptRowLine("خصم المندوب", `-${fmtThermalReceiptAmt(receipt.discount)}`));
  }

  rows.push(thermalReceiptRowLine("الإجمالي", fmtThermalReceiptAmt(receipt.total)));

  if (receipt.paid > 0.009) {
    rows.push(thermalReceiptRowLine("مدفوع", fmtThermalReceiptAmt(receipt.paid)));
  }

  if (invoiceOutstanding > 0.009) {
    rows.push(thermalReceiptRowLine("متبقي", fmtThermalReceiptAmt(invoiceOutstanding)));
  }

  if (!receipt.isCreditDelivery && receipt.paid > 0.009) {
    if (receipt.change > 0.009) {
      rows.push(thermalReceiptRowLine("الباقي", fmtThermalReceiptAmt(receipt.change)));
    }
    if (receipt.paymentSummary.trim()) {
      rows.push(thermalReceiptRowLine("الدفع", receipt.paymentSummary));
    }
  }

  if (receipt.accountOutstanding != null && receipt.accountOutstanding > 0.009) {
    rows.push(thermalReceiptRowLine("الذمم", fmtThermalReceiptAmt(receipt.accountOutstanding)));
  }

  rows.push(thermalReceiptTableClose());

  rows.push(`<div class="sep">${SEP}</div>`);
  rows.push(`<div class="center thanks">شكراً لتعاملكم</div>`);
  rows.push(thermalReceiptFooterSpacerHtml());

  return rows.join("\n");
}

export function buildPosMarketReceiptHtml(receipt: PosMarketReceiptData): string {
  return buildThermalReceiptDocumentHtml(receipt.receiptNumber, buildReceiptBodyHtml(receipt));
}
