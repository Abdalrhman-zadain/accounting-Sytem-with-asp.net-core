import { formatWeightQuantity } from "@/features/pos-market/pos-market-weight-utils";
import {
  buildPosMarketBrandedDocumentHtml,
  buildShougDividerHtml,
  buildShougMetaRow,
  buildShougReceiptHeaderHtml,
  buildShougTotalRow,
  fmtMarketReceiptAmt,
  fmtMarketReceiptDateCompact,
} from "@/features/pos-market/pos-market-receipt-brand";

export type PosMarketReceiptData = {
  receiptNumber: string;
  /** ERP sale reference (الرقم المرجعي). */
  saleReference?: string | null;
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
  /** Balance before this credit delivery (رصيد سابق). */
  previousBalance?: number | null;
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

function formatReceiptQuantity(line: PosMarketReceiptData["lines"][number]): string {
  if (line.unitCode) {
    return formatWeightQuantity(line.quantity, line.unitCode, 3);
  }
  return String(line.quantity);
}

function buildItemsTableHtml(receipt: PosMarketReceiptData): string {
  const header = `
    <table class="items-table">
      <thead>
        <tr>
          <th class="col-item">الصنف</th>
          <th class="col-qty">الكمية</th>
          <th class="col-price">السعر</th>
          <th class="col-total">المجموع</th>
        </tr>
      </thead>
      <tbody>`;

  const rows = receipt.lines
    .map((line) => {
      const discountNote =
        line.discountAmount > 0.009
          ? `<span class="disc"> (-${fmtMarketReceiptAmt(line.discountAmount)})</span>`
          : "";
      return `
        <tr>
          <td class="col-item">${line.name}${discountNote}</td>
          <td class="col-qty">${formatReceiptQuantity(line)}</td>
          <td class="col-price">${fmtMarketReceiptAmt(line.unitPrice)}</td>
          <td class="col-total">${fmtMarketReceiptAmt(line.lineTotal)}</td>
        </tr>`;
    })
    .join("");

  return `${header}${rows}</tbody></table>`;
}

function buildReceiptBodyHtml(receipt: PosMarketReceiptData): string {
  const rows: string[] = [];

  rows.push(buildShougReceiptHeaderHtml("فاتورة بيع", receipt.logoUrl));
  rows.push(buildShougDividerHtml());

  if (receipt.saleReference) {
    rows.push(buildShougMetaRow("الرقم المرجعي:", receipt.saleReference));
  }
  rows.push(buildShougMetaRow("رقم الفاتورة:", receipt.receiptNumber));
  rows.push(buildShougMetaRow("التاريخ والوقت:", fmtMarketReceiptDateCompact(receipt.soldAt)));

  if (receipt.salesRepName) {
    rows.push(buildShougMetaRow("المندوب:", receipt.salesRepName));
  } else if (receipt.cashierName) {
    rows.push(buildShougMetaRow("البائع:", receipt.cashierName));
  }

  if (receipt.destinationMarketName) {
    rows.push(buildShougMetaRow("العميل:", receipt.destinationMarketName));
  }

  rows.push(buildShougDividerHtml());
  rows.push(buildItemsTableHtml(receipt));
  rows.push(buildShougDividerHtml());

  if (receipt.discount > 0.009) {
    rows.push(buildShougTotalRow("خصم المندوب:", `-${fmtMarketReceiptAmt(receipt.discount)}`));
  }

  rows.push(buildShougTotalRow("إجمالي الفاتورة:", fmtMarketReceiptAmt(receipt.total)));

  if (receipt.paid > 0.009) {
    rows.push(buildShougTotalRow("مدفوع:", fmtMarketReceiptAmt(receipt.paid)));
  }

  const invoiceOutstanding = receipt.invoiceOutstanding ?? 0;
  if (!receipt.isCreditDelivery && invoiceOutstanding > 0.009) {
    rows.push(buildShougTotalRow("متبقي:", fmtMarketReceiptAmt(invoiceOutstanding)));
  }

  if (!receipt.isCreditDelivery && receipt.paid > 0.009) {
    if (receipt.change > 0.009) {
      rows.push(buildShougTotalRow("الباقي:", fmtMarketReceiptAmt(receipt.change)));
    }
    if (receipt.paymentSummary.trim()) {
      rows.push(buildShougMetaRow("الدفع:", receipt.paymentSummary));
    }
  }

  if (receipt.isCreditDelivery) {
    if (receipt.previousBalance != null && receipt.previousBalance >= 0) {
      rows.push(buildShougTotalRow("رصيد سابق:", fmtMarketReceiptAmt(receipt.previousBalance)));
    }
    if (receipt.accountOutstanding != null && receipt.accountOutstanding > 0.009) {
      rows.push(buildShougTotalRow("الرصيد الحالي:", fmtMarketReceiptAmt(receipt.accountOutstanding)));
    }
  }

  rows.push(`<div class="thanks">شكراً لتعاملكم</div>`);

  return rows.join("\n");
}

export function buildPosMarketReceiptHtml(receipt: PosMarketReceiptData): string {
  return buildPosMarketBrandedDocumentHtml(receipt.receiptNumber, buildReceiptBodyHtml(receipt));
}

export function buildSamplePosMarketReceiptData(): PosMarketReceiptData {
  return {
    receiptNumber: "7",
    saleReference: "POS-0042",
    soldAt: new Date().toISOString(),
    companyName: "SHOUG CHOCOLATE",
    destinationMarketName: "أسواق",
    salesRepName: "عامر البارلين",
    cashierName: "كاشير",
    terminalName: null,
    warehouseName: "—",
    paymentSummary: "",
    total: 30,
    paid: 0,
    tendered: 0,
    change: 0,
    subtotal: 30,
    discount: 0,
    invoiceOutstanding: 30,
    accountOutstanding: 130,
    previousBalance: 100,
    isCreditDelivery: true,
    lines: [
      {
        name: "شوكولاتة شوق",
        quantity: 5,
        unitPrice: 6,
        discountAmount: 0,
        lineTotal: 30,
        unitCode: "كغ",
      },
    ],
  };
}
