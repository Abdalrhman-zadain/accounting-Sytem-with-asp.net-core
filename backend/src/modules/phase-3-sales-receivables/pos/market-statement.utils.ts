export type MarketStatementDeliveryInput = {
  id: string;
  reference: string;
  receiptNumber: string | null;
  deliveredAt: string;
  totalAmount: number;
};

export type MarketStatementPaymentInput = {
  id: string;
  reference: string;
  receiptDate: string;
  amount: number;
  description: string | null;
  bankCashAccountName: string | null;
};

export type MarketStatementLedgerLine = {
  documentType: string;
  documentNumber: string;
  documentDate: string;
  details: string;
  debit: string;
  credit: string;
  balance: string;
  sortKey: string;
};

export type MarketStatementLedgerResult = {
  openingBalance: string;
  lines: MarketStatementLedgerLine[];
  totals: {
    debit: string;
    credit: string;
    closingBalance: string;
    transactionCount: number;
  };
};

export function formatMarketStatementAmount(value: number): string {
  return Number(value).toFixed(3);
}

function formatStatementDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function buildDeliveryDetails(delivery: MarketStatementDeliveryInput): string {
  return delivery.receiptNumber ?? delivery.reference;
}

function buildPaymentDetails(payment: MarketStatementPaymentInput): string {
  return payment.reference;
}

export function buildMarketStatementLedger(input: {
  fromDate: string;
  openingBalance: number;
  deliveries: MarketStatementDeliveryInput[];
  payments: MarketStatementPaymentInput[];
}): MarketStatementLedgerResult {
  const openingBalance = Number(input.openingBalance.toFixed(3));
  const openingLine: MarketStatementLedgerLine = {
    documentType: "",
    documentNumber: "",
    documentDate: "",
    details: `الرصيد المدور بتاريخ ${formatStatementDate(input.fromDate)}`,
    debit: formatMarketStatementAmount(0),
    credit: formatMarketStatementAmount(0),
    balance: formatMarketStatementAmount(openingBalance),
    sortKey: "0000-opening",
  };

  const movementRows = [
    ...input.deliveries.map((delivery) => ({
      kind: "delivery" as const,
      at: new Date(delivery.deliveredAt).getTime(),
      id: delivery.id,
      payload: delivery,
    })),
    ...input.payments.map((payment) => ({
      kind: "payment" as const,
      at: new Date(payment.receiptDate).getTime(),
      id: payment.id,
      payload: payment,
    })),
  ].sort((left, right) => {
    if (left.at !== right.at) {
      return left.at - right.at;
    }
    if (left.kind !== right.kind) {
      return left.kind === "delivery" ? -1 : 1;
    }
    return left.id.localeCompare(right.id);
  });

  let runningBalance = openingBalance;
  let periodDebit = 0;
  let periodCredit = 0;

  const transactionLines: MarketStatementLedgerLine[] = movementRows.map((row, index) => {
    if (row.kind === "delivery") {
      const debit = Number(row.payload.totalAmount);
      runningBalance = Number((runningBalance + debit).toFixed(3));
      periodDebit = Number((periodDebit + debit).toFixed(3));
      return {
        documentType: "تسليم",
        documentNumber: row.payload.receiptNumber ?? row.payload.reference,
        documentDate: formatStatementDate(row.payload.deliveredAt),
        details: buildDeliveryDetails(row.payload),
        debit: formatMarketStatementAmount(debit),
        credit: formatMarketStatementAmount(0),
        balance: formatMarketStatementAmount(runningBalance),
        sortKey: `${String(index + 1).padStart(4, "0")}-delivery-${row.id}`,
      };
    }

    const credit = Number(row.payload.amount);
    runningBalance = Number((runningBalance - credit).toFixed(3));
    periodCredit = Number((periodCredit + credit).toFixed(3));
    return {
      documentType: "قبض",
      documentNumber: row.payload.reference,
      documentDate: formatStatementDate(row.payload.receiptDate),
      details: buildPaymentDetails(row.payload),
      debit: formatMarketStatementAmount(0),
      credit: formatMarketStatementAmount(credit),
      balance: formatMarketStatementAmount(runningBalance),
      sortKey: `${String(index + 1).padStart(4, "0")}-payment-${row.id}`,
    };
  });

  return {
    openingBalance: formatMarketStatementAmount(openingBalance),
    lines: [openingLine, ...transactionLines],
    totals: {
      debit: formatMarketStatementAmount(periodDebit),
      credit: formatMarketStatementAmount(periodCredit),
      closingBalance: formatMarketStatementAmount(runningBalance),
      transactionCount: transactionLines.length,
    },
  };
}

export function parseMarketStatementDateRange(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00.000Z`);
  const to = new Date(`${toDate}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid statement date range.");
  }
  if (from.getTime() > to.getTime()) {
    throw new Error("fromDate must be on or before toDate.");
  }
  return { from, to };
}
