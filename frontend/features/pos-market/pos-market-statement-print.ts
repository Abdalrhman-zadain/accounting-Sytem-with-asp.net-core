import {
  buildPosMarketBrandedDocumentHtml,
  buildShougDividerHtml,
  buildShougMetaRow,
  buildShougReceiptHeaderHtml,
  buildShougTotalRow,
  fmtMarketReceiptAmt,
  fmtMarketReceiptDate,
} from "@/features/pos-market/pos-market-receipt-brand";

export type PosMarketAccountStatementData = {
  statementDate: string;
  companyName: string;
  customerName: string;
  customerCode?: string | null;
  salesRepName?: string | null;
  totalDelivered: number;
  totalPaid: number;
  outstandingBalance: number;
  printedBy?: string | null;
};

function buildAccountStatementBody(statement: PosMarketAccountStatementData): string {
  const rows: string[] = [];

  rows.push(buildShougReceiptHeaderHtml("كشف حساب — سوق"));
  rows.push(buildShougDividerHtml());
  rows.push(buildShougMetaRow("التاريخ:", fmtMarketReceiptDate(statement.statementDate)));
  rows.push(buildShougMetaRow("العميل:", statement.customerName));

  if (statement.customerCode) {
    rows.push(buildShougMetaRow("الرمز:", statement.customerCode));
  }
  if (statement.salesRepName) {
    rows.push(buildShougMetaRow("المندوب:", statement.salesRepName));
  }

  rows.push(buildShougDividerHtml());
  rows.push(buildShougTotalRow("إجمالي المسلّم:", fmtMarketReceiptAmt(statement.totalDelivered)));
  rows.push(buildShougTotalRow("إجمالي المقبوض:", fmtMarketReceiptAmt(statement.totalPaid)));
  rows.push(buildShougDividerHtml());
  rows.push(buildShougTotalRow("الرصيد الحالي:", fmtMarketReceiptAmt(statement.outstandingBalance)));

  if (statement.printedBy) {
    rows.push(buildShougMetaRow("المطبع:", statement.printedBy));
  }

  rows.push(`<div class="thanks">شكراً لتعاونكم</div>`);

  return rows.join("\n");
}

export function buildPosMarketAccountStatementHtml(
  statement: PosMarketAccountStatementData,
): string {
  return buildPosMarketBrandedDocumentHtml(
    `كشف حساب — ${statement.customerName}`,
    buildAccountStatementBody(statement),
  );
}
