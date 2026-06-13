import {
  formatMarketStatementAmount,
  parseMarketStatementDateRange,
} from "./market-statement.utils";

export { formatMarketStatementAmount, parseMarketStatementDateRange };

export type MarketRepSalesReportDocumentTypes = "sales" | "returns" | "both";
export type MarketRepSalesReportPaymentTypes = "cash" | "credit" | "both";

export type MarketRepSalesReportSaleInput = {
  id: string;
  reference: string;
  receiptNumber: string | null;
  soldAt: string;
  totalAmount: number;
  posPaymentAmounts: number[];
  customerCode: string;
  customerName: string;
};

export type MarketRepSalesReportReturnInput = {
  id: string;
  reference: string;
  returnedAt: string;
  totalAmount: number;
  posPaymentAmounts: number[];
  linkedInvoiceTotalAmount: number;
  customerCode: string;
  customerName: string;
};

export type MarketRepSalesReportLine = {
  documentType: string;
  documentNumber: string;
  documentDate: string;
  paymentMode: string;
  customerCode: string;
  customerName: string;
  salesRepName: string;
  documentValue: string;
  sortKey: string;
};

export type MarketRepSalesReportResult = {
  lines: MarketRepSalesReportLine[];
  totals: {
    documentCount: number;
    totalAmount: string;
  };
};

function formatReportDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

export function classifyPosCheckoutPaymentMode(
  totalAmount: number,
  posPaymentAmounts: number[],
): "cash" | "credit" {
  const paidAtPos = posPaymentAmounts.reduce((sum, amount) => sum + Number(amount), 0);
  return paidAtPos + 0.001 >= Number(totalAmount) ? "cash" : "credit";
}

function paymentModeLabel(mode: "cash" | "credit"): string {
  return mode === "cash" ? "نقدي" : "ذمم";
}

function matchesPaymentFilter(
  mode: "cash" | "credit",
  paymentTypes: MarketRepSalesReportPaymentTypes,
): boolean {
  if (paymentTypes === "both") {
    return true;
  }
  return paymentTypes === "cash" ? mode === "cash" : mode === "credit";
}

export function buildMarketRepSalesReport(input: {
  salesRepName: string;
  sales: MarketRepSalesReportSaleInput[];
  returns: MarketRepSalesReportReturnInput[];
  documentTypes?: MarketRepSalesReportDocumentTypes;
  paymentTypes?: MarketRepSalesReportPaymentTypes;
}): MarketRepSalesReportResult {
  const documentTypes = input.documentTypes ?? "both";
  const paymentTypes = input.paymentTypes ?? "both";

  const rows: Array<{
    at: number;
    id: string;
    kind: "sale" | "return";
    line: Omit<MarketRepSalesReportLine, "sortKey">;
  }> = [];

  if (documentTypes === "sales" || documentTypes === "both") {
    for (const sale of input.sales) {
      const paymentMode = classifyPosCheckoutPaymentMode(sale.totalAmount, sale.posPaymentAmounts);
      if (!matchesPaymentFilter(paymentMode, paymentTypes)) {
        continue;
      }
      rows.push({
        kind: "sale",
        at: new Date(sale.soldAt).getTime(),
        id: sale.id,
        line: {
          documentType: "فاتورة بيع",
          documentNumber: sale.receiptNumber ?? sale.reference,
          documentDate: formatReportDate(sale.soldAt),
          paymentMode: paymentModeLabel(paymentMode),
          customerCode: sale.customerCode,
          customerName: sale.customerName,
          salesRepName: input.salesRepName,
          documentValue: formatMarketStatementAmount(sale.totalAmount),
        },
      });
    }
  }

  if (documentTypes === "returns" || documentTypes === "both") {
    for (const posReturn of input.returns) {
      const paymentMode = classifyPosCheckoutPaymentMode(
        posReturn.linkedInvoiceTotalAmount,
        posReturn.posPaymentAmounts,
      );
      if (!matchesPaymentFilter(paymentMode, paymentTypes)) {
        continue;
      }
      const returnValue = -Math.abs(Number(posReturn.totalAmount));
      rows.push({
        kind: "return",
        at: new Date(posReturn.returnedAt).getTime(),
        id: posReturn.id,
        line: {
          documentType: "مرتجع مبيعات",
          documentNumber: posReturn.reference,
          documentDate: formatReportDate(posReturn.returnedAt),
          paymentMode: paymentModeLabel(paymentMode),
          customerCode: posReturn.customerCode,
          customerName: posReturn.customerName,
          salesRepName: input.salesRepName,
          documentValue: formatMarketStatementAmount(returnValue),
        },
      });
    }
  }

  rows.sort((left, right) => {
    if (left.at !== right.at) {
      return left.at - right.at;
    }
    if (left.kind !== right.kind) {
      return left.kind === "sale" ? -1 : 1;
    }
    return left.id.localeCompare(right.id);
  });

  let totalAmount = 0;
  const lines: MarketRepSalesReportLine[] = rows.map((row, index) => {
    totalAmount = Number((totalAmount + Number(row.line.documentValue)).toFixed(3));
    return {
      ...row.line,
      sortKey: `${String(index + 1).padStart(4, "0")}-${row.kind}-${row.id}`,
    };
  });

  return {
    lines,
    totals: {
      documentCount: lines.length,
      totalAmount: formatMarketStatementAmount(totalAmount),
    },
  };
}

export function parseMarketRepSalesReportDocumentTypes(
  value?: string,
): MarketRepSalesReportDocumentTypes {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "sales" || normalized === "returns" || normalized === "both") {
    return normalized;
  }
  return "both";
}

export function parseMarketRepSalesReportPaymentTypes(
  value?: string,
): MarketRepSalesReportPaymentTypes {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "cash" || normalized === "credit" || normalized === "both") {
    return normalized;
  }
  return "both";
}
