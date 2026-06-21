import type { PosReceiptData } from "@/features/pos/pos-receipt-print";

export type ProvisionalReceiptLineInput = {
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  unitCode?: string;
  modifiers?: unknown;
};

export type BuildProvisionalReceiptParams = {
  referenceLabel: string;
  soldAt?: string;
  branchName?: string | null;
  taxNumber?: string | null;
  cashierName: string;
  terminalName?: string | null;
  warehouseName: string;
  tableNumber?: string | null;
  orderType?: string | null;
  waiterName?: string | null;
  deliveryAddress?: string | null;
  deliveryNotes?: string | null;
  deliveryCompanyName?: string | null;
  driverName?: string | null;
  serviceChargeAmount: number;
  deliveryFeeAmount: number;
  taxRatePercent?: number | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  lines: ProvisionalReceiptLineInput[];
};

export function buildProvisionalReceiptData(
  params: BuildProvisionalReceiptParams,
): PosReceiptData {
  return {
    receiptKind: "provisional",
    receiptNumber: params.referenceLabel,
    soldAt: params.soldAt ?? new Date().toISOString(),
    companyName: "",
    branchName: params.branchName ?? null,
    taxNumber: params.taxNumber ?? null,
    cashierName: params.cashierName,
    terminalName: params.terminalName ?? null,
    warehouseName: params.warehouseName,
    tableNumber: params.tableNumber ?? null,
    orderType: params.orderType ?? null,
    waiterName: params.waiterName ?? null,
    deliveryAddress: params.deliveryAddress ?? null,
    deliveryNotes: params.deliveryNotes ?? null,
    deliveryCompanyName: params.deliveryCompanyName ?? null,
    driverName: params.driverName ?? null,
    serviceChargeAmount: params.serviceChargeAmount,
    deliveryFeeAmount: params.deliveryFeeAmount,
    taxRatePercent: params.taxRatePercent ?? null,
    paymentSummary: "غير مدفوع",
    payments: [],
    total: params.total,
    paid: 0,
    tendered: 0,
    change: 0,
    subtotal: params.subtotal,
    discount: params.discount,
    tax: params.tax,
    lines: params.lines.map((line) => ({
      name: line.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountAmount: line.discountAmount,
      taxAmount: line.taxAmount,
      lineTotal: line.lineTotal,
      unitCode: line.unitCode,
      modifiers: line.modifiers,
    })),
  };
}
