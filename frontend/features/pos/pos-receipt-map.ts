import type { PosReceiptData } from "@/features/pos/pos-receipt-print";

function parseAmount(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type PosReceiptApiResponse = {
  receiptKind?: "sale" | "provisional";
  receiptNumber: string;
  soldAt: string;
  companyName: string;
  branchName?: string | null;
  taxNumber?: string | null;
  phone?: string | null;
  address?: string | null;
  tagline?: string | null;
  cashierName: string;
  terminalName?: string | null;
  warehouseName: string;
  tableNumber?: string | null;
  orderType?: string | null;
  waiterName?: string | null;
  deliveryAddress?: string | null;
  deliveryNotes?: string | null;
  orderNotes?: string | null;
  deliveryCompanyName?: string | null;
  driverName?: string | null;
  serviceChargeAmount?: string;
  deliveryFeeAmount?: string;
  taxRatePercent?: number | null;
  paymentSummary: string;
  payments?: Array<{
    paymentMethod: string;
    amount: string;
  }>;
  total: string;
  paid: string;
  tendered: string;
  change: string;
  subtotal: string;
  discount: string;
  tax: string;
  lines: Array<{
    name: string;
    quantity: string;
    unitPrice: string;
    discountAmount: string;
    taxAmount: string;
    lineTotal: string;
    unitCode?: string | null;
    modifiers?: unknown;
  }>;
};

export function mapPosReceiptApiResponse(receipt: PosReceiptApiResponse): PosReceiptData {
  return {
    receiptKind: receipt.receiptKind ?? "sale",
    receiptNumber: receipt.receiptNumber,
    soldAt: receipt.soldAt,
    companyName: receipt.companyName,
    branchName: receipt.branchName,
    taxNumber: receipt.taxNumber,
    phone: receipt.phone,
    address: receipt.address,
    tagline: receipt.tagline,
    cashierName: receipt.cashierName,
    terminalName: receipt.terminalName,
    warehouseName: receipt.warehouseName,
    tableNumber: receipt.tableNumber,
    orderType: receipt.orderType,
    waiterName: receipt.waiterName,
    deliveryAddress: receipt.deliveryAddress,
    deliveryNotes: receipt.deliveryNotes,
    orderNotes: receipt.orderNotes,
    deliveryCompanyName: receipt.deliveryCompanyName,
    driverName: receipt.driverName,
    serviceChargeAmount: receipt.serviceChargeAmount
      ? parseAmount(receipt.serviceChargeAmount)
      : 0,
    deliveryFeeAmount: receipt.deliveryFeeAmount
      ? parseAmount(receipt.deliveryFeeAmount)
      : 0,
    taxRatePercent: receipt.taxRatePercent ?? null,
    paymentSummary: receipt.paymentSummary,
    payments: receipt.payments?.map((payment) => ({
      paymentMethod: payment.paymentMethod,
      amount: parseAmount(payment.amount),
    })),
    total: parseAmount(receipt.total),
    paid: parseAmount(receipt.paid),
    tendered: parseAmount(receipt.tendered),
    change: parseAmount(receipt.change),
    subtotal: parseAmount(receipt.subtotal),
    discount: parseAmount(receipt.discount),
    tax: parseAmount(receipt.tax),
    lines: receipt.lines.map((line) => ({
      name: line.name,
      quantity: parseAmount(line.quantity),
      unitPrice: parseAmount(line.unitPrice),
      discountAmount: parseAmount(line.discountAmount),
      taxAmount: parseAmount(line.taxAmount),
      lineTotal: parseAmount(line.lineTotal),
      unitCode: line.unitCode ?? undefined,
      modifiers: line.modifiers,
    })),
  };
}
