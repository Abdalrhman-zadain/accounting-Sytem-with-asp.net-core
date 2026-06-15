import {
  buildPosMarketBrandedDocumentHtml,
  buildShougDividerHtml,
  buildShougMetaRow,
  buildShougReceiptHeaderHtml,
  buildShougTotalRow,
  fmtMarketReceiptAmt,
  fmtMarketReceiptDate,
} from "@/features/pos-market/pos-market-receipt-brand";

export type PosMarketCollectionReceiptData = {
  reference: string;
  receiptDate: string;
  companyName: string;
  customerName: string;
  customerCode?: string | null;
  salesRepName?: string | null;
  balanceBefore: number;
  amountPaid: number;
  balanceAfter: number;
  bankCashAccountName?: string | null;
  collectedBy?: string | null;
};

function buildCollectionReceiptBody(receipt: PosMarketCollectionReceiptData): string {
  const rows: string[] = [];

  rows.push(buildShougReceiptHeaderHtml("سند قبض — تحصيل ذمم"));
  rows.push(buildShougDividerHtml());
  rows.push(buildShougMetaRow("المرجع:", receipt.reference));
  rows.push(buildShougMetaRow("التاريخ:", fmtMarketReceiptDate(receipt.receiptDate)));
  rows.push(buildShougMetaRow("العميل:", receipt.customerName));

  if (receipt.customerCode) {
    rows.push(buildShougMetaRow("الرمز:", receipt.customerCode));
  }
  if (receipt.salesRepName) {
    rows.push(buildShougMetaRow("المندوب:", receipt.salesRepName));
  }

  rows.push(buildShougDividerHtml());
  rows.push(buildShougTotalRow("الرصيد قبل:", fmtMarketReceiptAmt(receipt.balanceBefore)));
  rows.push(buildShougTotalRow("المبلغ المستلم:", fmtMarketReceiptAmt(receipt.amountPaid)));
  rows.push(buildShougDividerHtml());
  rows.push(buildShougTotalRow("الرصيد الحالي:", fmtMarketReceiptAmt(receipt.balanceAfter)));

  if (receipt.bankCashAccountName) {
    rows.push(buildShougMetaRow("حساب القبض:", receipt.bankCashAccountName));
  }
  if (receipt.collectedBy) {
    rows.push(buildShougMetaRow("المحصّل:", receipt.collectedBy));
  }

  rows.push(`<div class="thanks">شكراً لتعاونكم</div>`);

  return rows.join("\n");
}

export function buildPosMarketCollectionReceiptHtml(
  receipt: PosMarketCollectionReceiptData,
): string {
  return buildPosMarketBrandedDocumentHtml(receipt.reference, buildCollectionReceiptBody(receipt));
}
