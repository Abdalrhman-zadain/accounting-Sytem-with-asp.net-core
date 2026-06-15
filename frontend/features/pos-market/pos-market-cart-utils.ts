import type { SalesLinePayload } from "@/types/api";
import type { InventoryItem, PosReceipt, PosSale, PosSettings } from "@/types/api";

import {
  getQuantityPrecision,
  isWeightSaleItem,
} from "@/features/pos-market/pos-market-weight-utils";
import type { PosMarketReceiptData } from "@/features/pos-market/pos-market-receipt-print";

export type DiscountType = "FIXED" | "PERCENT";

export type PosMarketCartLine = {
  salesInvoiceLineId?: string;
  clientLineId?: string;
  itemId: string;
  name: string;
  code: string;
  barcode?: string | null;
  unit: string;
  itemType: InventoryItem["type"];
  quantity: number;
  unitPrice: number;
  discountType: DiscountType;
  discountValue: number;
  taxRate: number;
  trackInventory: boolean;
  unitCost: number;
  warehouseId?: string | null;
  onHandQuantity: number;
  baseUnitPrice?: number;
  lineNote?: string;
  sellByWeight?: boolean;
  quantityPrecision?: number;
  salesAccountId?: string | null;
  taxId?: string | null;
};

export type PosMarketPaymentEntry = {
  id: string;
  paymentMethod: "CASH" | "CARD" | "CLIQ" | "BANK_TRANSFER" | "WALLET";
  bankCashAccountId: string;
  amount: string;
  reference: string;
};

export type PosMarketHeldSale = {
  id: string;
  status: "DRAFT" | "HELD";
  title: string;
  createdAt: string;
  customerId?: string | null;
  customerName?: string | null;
  cartLines: PosMarketCartLine[];
  paymentEntries: PosMarketPaymentEntry[];
  invoiceDiscountType: DiscountType;
  invoiceDiscountValue: number;
};

export function createLocalId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseAmount(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrency(value: number, currency = "JOD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function normalizePaymentAccountMethod(
  account: Pick<import("@/types/api").BankCashAccount, "type" | "name" | "bankName" | "account">,
): PosMarketPaymentEntry["paymentMethod"] {
  const normalized = [
    account.type,
    account.name,
    account.bankName,
    account.account?.name,
    account.account?.nameAr,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  if (
    normalized.includes("CARD") ||
    normalized.includes("VISA") ||
    normalized.includes("MASTER")
  ) {
    return "CARD";
  }
  if (normalized.includes("CLIQ")) return "CLIQ";
  if (normalized.includes("WALLET")) return "WALLET";
  if (normalized.includes("BANK")) return "BANK_TRANSFER";
  return "CASH";
}

export function getPaymentMethodLabel(
  method: "CASH" | "CARD" | "CLIQ" | "BANK_TRANSFER" | "WALLET" | "MIXED",
) {
  switch (method) {
    case "CASH":
      return "Cash / نقد";
    case "CARD":
      return "Card / بطاقة";
    case "CLIQ":
      return "CliQ / كليك";
    case "BANK_TRANSFER":
      return "Bank / بنك";
    case "WALLET":
      return "Wallet / محفظة";
    case "MIXED":
      return "Mixed / مختلط";
    default:
      return method;
  }
}

export function getCartLineKey(
  line: Pick<PosMarketCartLine, "salesInvoiceLineId" | "clientLineId" | "itemId" | "lineNote">,
) {
  if (line.salesInvoiceLineId) return line.salesInvoiceLineId;
  if (line.clientLineId) return line.clientLineId;
  return `${line.itemId}:${line.lineNote ?? ""}`;
}

export function getLineBase(line: PosMarketCartLine) {
  if (line.sellByWeight) {
    return line.quantity * (line.baseUnitPrice ?? line.unitPrice);
  }
  return line.quantity * line.unitPrice;
}

export function getLineDiscountAmount(line: PosMarketCartLine) {
  const base = getLineBase(line);
  if (line.discountType === "PERCENT") {
    return Math.min(base, base * (line.discountValue / 100));
  }
  return Math.min(base, line.discountValue);
}

export function getLineNetBeforeInvoiceDiscount(line: PosMarketCartLine) {
  return Math.max(getLineBase(line) - getLineDiscountAmount(line), 0);
}

export function getLineTaxAmount(
  line: PosMarketCartLine,
  invoiceDiscountShare = 0,
  taxPolicy: PosSettings["runtime"]["invoiceDiscountTaxPolicy"] = "BEFORE_TAX",
  taxFreeEnabled = false,
) {
  if (taxFreeEnabled) return 0;
  const netBeforeInvoiceDiscount = getLineNetBeforeInvoiceDiscount(line);
  const taxableBase =
    taxPolicy === "BEFORE_TAX"
      ? Math.max(netBeforeInvoiceDiscount - invoiceDiscountShare, 0)
      : netBeforeInvoiceDiscount;
  return taxableBase * (line.taxRate / 100);
}

export function getLineTotal(
  line: PosMarketCartLine,
  invoiceDiscountShare = 0,
  taxPolicy: PosSettings["runtime"]["invoiceDiscountTaxPolicy"] = "BEFORE_TAX",
  taxFreeEnabled = false,
) {
  const netBeforeInvoiceDiscount = getLineNetBeforeInvoiceDiscount(line);
  if (taxPolicy === "AFTER_TAX") {
    const taxAmount = getLineTaxAmount(line, 0, taxPolicy, taxFreeEnabled);
    return Math.max(netBeforeInvoiceDiscount + taxAmount - invoiceDiscountShare, 0);
  }
  const taxableAfterInvoiceDiscount = Math.max(
    netBeforeInvoiceDiscount - invoiceDiscountShare,
    0,
  );
  return (
    taxableAfterInvoiceDiscount +
    getLineTaxAmount(line, invoiceDiscountShare, taxPolicy, taxFreeEnabled)
  );
}

function getInvoiceDiscountAmount(
  discountType: DiscountType,
  discountValue: number,
  taxableBase: number,
) {
  if (discountType === "PERCENT") {
    return Math.min(taxableBase, taxableBase * (discountValue / 100));
  }
  return Math.min(taxableBase, discountValue);
}

export type PosMarketCartMetrics = {
  subtotalBeforeDiscount: number;
  lineDiscountTotal: number;
  invoiceDiscount: number;
  discountTotal: number;
  taxableBase: number;
  tax: number;
  total: number;
  tendered: number;
  paid: number;
  change: number;
  amountDue: number;
};

export function computeCartMetrics(input: {
  cartLines: PosMarketCartLine[];
  invoiceDiscountType: DiscountType;
  invoiceDiscountValue: number;
  paymentAmounts: number[];
  taxPolicy?: PosSettings["runtime"]["invoiceDiscountTaxPolicy"];
  taxFreeEnabled?: boolean;
}): PosMarketCartMetrics {
  const {
    cartLines,
    invoiceDiscountType,
    invoiceDiscountValue,
    paymentAmounts,
    taxPolicy = "BEFORE_TAX",
    taxFreeEnabled = false,
  } = input;

  const subtotalBeforeDiscount = Number(
    cartLines.reduce((sum, line) => sum + getLineBase(line), 0).toFixed(2),
  );
  const lineDiscountTotal = Number(
    cartLines.reduce((sum, line) => sum + getLineDiscountAmount(line), 0).toFixed(2),
  );
  const taxableBase = Number(
    cartLines.reduce((sum, line) => sum + getLineNetBeforeInvoiceDiscount(line), 0).toFixed(2),
  );
  const invoiceDiscount = Number(
    getInvoiceDiscountAmount(
      invoiceDiscountType,
      invoiceDiscountValue,
      taxPolicy === "AFTER_TAX"
        ? taxableBase +
            cartLines.reduce(
              (sum, line) => sum + getLineTaxAmount(line, 0, "AFTER_TAX", taxFreeEnabled),
              0,
            )
        : taxableBase,
    ).toFixed(2),
  );
  const taxRaw = cartLines.reduce((sum, line) => {
    const lineBase = getLineNetBeforeInvoiceDiscount(line);
    if (taxPolicy === "AFTER_TAX") {
      return sum + getLineTaxAmount(line, 0, taxPolicy, taxFreeEnabled);
    }
    if (taxableBase <= 0) return sum;
    const invoiceShare = invoiceDiscount * (lineBase / taxableBase);
    return sum + getLineTaxAmount(line, invoiceShare, taxPolicy, taxFreeEnabled);
  }, 0);
  const tax = Number(taxRaw.toFixed(2));
  const totalRaw =
    taxPolicy === "AFTER_TAX"
      ? Math.max(taxableBase + tax - invoiceDiscount, 0)
      : Math.max(taxableBase - invoiceDiscount, 0) + tax;
  const total = Number(totalRaw.toFixed(2));
  const tendered = Number(paymentAmounts.reduce((sum, value) => sum + value, 0).toFixed(2));
  const paid = Number(Math.min(tendered, total).toFixed(2));
  const change = Math.max(Number((tendered - total).toFixed(2)), 0);
  const amountDue = Math.max(Number((total - tendered).toFixed(2)), 0);

  return {
    subtotalBeforeDiscount,
    lineDiscountTotal,
    invoiceDiscount,
    discountTotal: Number((lineDiscountTotal + invoiceDiscount).toFixed(2)),
    taxableBase,
    tax,
    total,
    tendered,
    paid,
    change,
    amountDue,
  };
}

export function buildSaleLinesPayload(input: {
  cartLines: PosMarketCartLine[];
  cartMetrics: PosMarketCartMetrics;
  taxPolicy?: PosSettings["runtime"]["invoiceDiscountTaxPolicy"];
  taxFreeEnabled?: boolean;
}): SalesLinePayload[] {
  const { cartLines, cartMetrics, taxPolicy = "BEFORE_TAX", taxFreeEnabled = false } = input;

  return cartLines.map((line) => {
    const netBeforeInvoiceDiscount = getLineNetBeforeInvoiceDiscount(line);
    const invoiceShare =
      cartMetrics.taxableBase > 0 && taxPolicy === "BEFORE_TAX"
        ? cartMetrics.invoiceDiscount * (netBeforeInvoiceDiscount / cartMetrics.taxableBase)
        : 0;
    const afterTaxShare =
      taxPolicy === "AFTER_TAX" && cartMetrics.total > 0
        ? cartMetrics.invoiceDiscount *
          ((netBeforeInvoiceDiscount + getLineTaxAmount(line, 0, "AFTER_TAX", taxFreeEnabled)) /
            (cartMetrics.taxableBase + cartMetrics.tax))
        : 0;
    const taxAmount = getLineTaxAmount(line, invoiceShare, taxPolicy, taxFreeEnabled);
    const lineAmount =
      taxPolicy === "AFTER_TAX"
        ? getLineTotal(line, afterTaxShare, taxPolicy, taxFreeEnabled)
        : getLineTotal(line, invoiceShare, taxPolicy, taxFreeEnabled);

    return {
      salesInvoiceLineId: line.salesInvoiceLineId,
      itemId: line.itemId,
      warehouseId: line.trackInventory && line.warehouseId ? line.warehouseId : undefined,
      itemName: line.name,
      quantity: line.quantity,
      unitPrice: line.sellByWeight ? (line.baseUnitPrice ?? line.unitPrice) : line.unitPrice,
      discountAmount: Number(
        (getLineDiscountAmount(line) + (taxPolicy === "AFTER_TAX" ? afterTaxShare : invoiceShare)).toFixed(2),
      ),
      taxAmount: Number(taxAmount.toFixed(2)),
      lineAmount: Number(lineAmount.toFixed(2)),
      description: line.lineNote?.trim() || undefined,
      revenueAccountId: line.salesAccountId ?? undefined,
      taxId: line.taxId ?? undefined,
    };
  });
}

export function mapInventoryItemToCartLine(
  item: InventoryItem,
  warehouseId: string | null,
  entryWeight?: number | null,
): PosMarketCartLine {
  const sellByWeight = isWeightSaleItem(item);
  const baseUnitPrice = parseAmount(item.defaultSalesPrice);
  const quantity = sellByWeight ? (entryWeight ?? 0) : 1;

  return {
    itemId: item.id,
    name: item.name,
    code: item.code,
    barcode: item.barcode,
    unit: item.unitOfMeasure,
    itemType: item.type,
    quantity,
    unitPrice: baseUnitPrice,
    baseUnitPrice,
    discountType: "FIXED",
    discountValue: 0,
    taxRate: parseAmount(item.defaultTax?.rate),
    trackInventory: item.trackInventory,
    unitCost: parseAmount(item.defaultPurchasePrice),
    warehouseId: item.trackInventory ? warehouseId : null,
    onHandQuantity: parseAmount(item.onHandQuantity),
    sellByWeight,
    quantityPrecision: getQuantityPrecision(item),
    clientLineId: sellByWeight ? createLocalId() : undefined,
    salesAccountId: item.salesAccount?.id ?? null,
    taxId: item.defaultTax?.id ?? item.defaultTaxId ?? null,
  };
}

export function mapPosSaleToHeldSale(sale: PosSale): PosMarketHeldSale {
  const cartLines: PosMarketCartLine[] = sale.lines.map((line) => ({
    salesInvoiceLineId: line.id,
    itemId: line.itemId ?? line.id,
    name: line.itemName ?? line.description ?? `Line ${line.lineNumber}`,
    code: line.item?.code ?? line.itemId ?? line.id,
    unit: line.item?.unitOfMeasure ?? "",
    itemType: line.item?.type ?? "SERVICE",
    sellByWeight: Boolean(line.item?.allowFractionalQuantity),
    quantityPrecision: line.item?.unitOfMeasureRef?.decimalPrecision ?? 3,
    quantity: parseAmount(line.quantity),
    unitPrice: parseAmount(line.unitPrice),
    discountType: "FIXED",
    discountValue: parseAmount(line.discountAmount),
    taxRate:
      parseAmount(line.lineSubtotalAmount) > 0
        ? (parseAmount(line.taxAmount) / parseAmount(line.lineSubtotalAmount)) * 100
        : 0,
    trackInventory: Boolean(line.item?.trackInventory),
    unitCost: 0,
    warehouseId: line.warehouse?.id ?? undefined,
    onHandQuantity: 0,
    baseUnitPrice: Boolean(line.item?.allowFractionalQuantity)
      ? parseAmount(line.unitPrice)
      : parseAmount(line.unitPrice),
    lineNote:
      line.description && line.description !== (line.itemName ?? "") ? line.description : "",
    salesAccountId: line.revenueAccountId ?? null,
    taxId: line.taxId ?? null,
  }));

  return {
    id: sale.id,
    status: sale.posOperationalStatus === "DRAFT" ? "DRAFT" : "HELD",
    title: sale.reference,
    createdAt: sale.updatedAt,
    customerId: sale.customer?.id ?? null,
    customerName: sale.customer?.name ?? null,
    cartLines,
    paymentEntries: sale.payments.map((payment) => ({
      id: payment.id,
      paymentMethod:
        payment.paymentMethod === "DELIVERY"
          ? "CASH"
          : (payment.paymentMethod as PosMarketPaymentEntry["paymentMethod"]),
      bankCashAccountId: payment.bankCashAccount?.id ?? "",
      amount: String(payment.amount),
      reference: payment.reference ?? "",
    })),
    invoiceDiscountType: "FIXED",
    invoiceDiscountValue: 0,
  };
}

export type PosMarketAmendSale = {
  id: string;
  reference: string;
  receiptNumber?: string | null;
  customerId: string | null;
  customerName: string | null;
  cartLines: PosMarketCartLine[];
  invoiceDiscountType: DiscountType;
  invoiceDiscountValue: number;
};

export function mapPosSaleToAmendSale(sale: PosSale): PosMarketAmendSale {
  const held = mapPosSaleToHeldSale(sale);
  return {
    id: held.id,
    reference: held.title,
    receiptNumber: sale.receiptNumber ?? null,
    customerId: held.customerId ?? null,
    customerName: held.customerName ?? null,
    cartLines: held.cartLines,
    invoiceDiscountType: "FIXED",
    invoiceDiscountValue: parseAmount(sale.discountAmount),
  };
}

/** Quantities from the invoice being amended — released back on commit, virtual during edit. */
export function buildAmendReleasedQtyByItemIdRecord(
  lines: Array<Pick<PosMarketCartLine, "itemId" | "quantity">>,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const line of lines) {
    if (!line.itemId) continue;
    map[line.itemId] = (map[line.itemId] ?? 0) + line.quantity;
  }
  return map;
}

export function getAmendEffectiveOnHand(
  catalogOnHand: number,
  itemId: string,
  releasedQtyByItemId: Record<string, number>,
): number {
  const released = releasedQtyByItemId[itemId] ?? 0;
  if (released <= 0) {
    return catalogOnHand;
  }
  return Number((catalogOnHand + released).toFixed(4));
}

export function applyAmendEffectiveStockToCartLines(
  cartLines: PosMarketCartLine[],
  catalogItems: InventoryItem[],
  releasedQtyByItemId: Record<string, number>,
): PosMarketCartLine[] {
  if (Object.keys(releasedQtyByItemId).length === 0) {
    return cartLines;
  }
  const catalogOnHandByItemId = new Map(
    catalogItems.map((item) => [item.id, parseAmount(item.onHandQuantity)]),
  );
  return cartLines.map((line) => ({
    ...line,
    onHandQuantity: getAmendEffectiveOnHand(
      catalogOnHandByItemId.get(line.itemId) ?? 0,
      line.itemId,
      releasedQtyByItemId,
    ),
  }));
}

export function applyAmendEffectiveStockToCatalogItems(
  catalogItems: InventoryItem[],
  releasedQtyByItemId: Record<string, number>,
): InventoryItem[] {
  if (Object.keys(releasedQtyByItemId).length === 0) {
    return catalogItems;
  }
  return catalogItems.map((item) => {
    const effective = getAmendEffectiveOnHand(
      parseAmount(item.onHandQuantity),
      item.id,
      releasedQtyByItemId,
    );
    if (effective === parseAmount(item.onHandQuantity)) {
      return item;
    }
    return { ...item, onHandQuantity: effective.toFixed(4) };
  });
}

export const POS_MARKET_AMEND_SNAPSHOT_KEY = "pos-market-amend-sale-snapshot";

export function stashAmendSaleForEdit(sale: PosMarketAmendSale) {
  try {
    sessionStorage.setItem(POS_MARKET_AMEND_SNAPSHOT_KEY, JSON.stringify(sale));
  } catch {
    // ignore
  }
}

export function consumeStashedAmendSale(saleId: string): PosMarketAmendSale | null {
  try {
    const raw = sessionStorage.getItem(POS_MARKET_AMEND_SNAPSHOT_KEY);
    if (!raw) return null;
    const sale = JSON.parse(raw) as PosMarketAmendSale;
    if (sale.id !== saleId) return null;
    sessionStorage.removeItem(POS_MARKET_AMEND_SNAPSHOT_KEY);
    return sale;
  } catch {
    return null;
  }
}

export function mapPosReceiptToPrintData(
  receipt: PosReceipt,
  options?: { destinationMarketName?: string | null; saleReference?: string | null },
): PosMarketReceiptData {
  const paid = parseAmount(receipt.paid);
  const invoiceOutstanding = receipt.deliveryOutstanding
    ? parseAmount(receipt.deliveryOutstanding)
    : Math.max(parseAmount(receipt.total) - paid, 0);
  const accountOutstanding =
    receipt.accountOutstanding != null && receipt.accountOutstanding !== ""
      ? parseAmount(receipt.accountOutstanding)
      : undefined;
  const totalDelivered =
    receipt.totalDelivered != null && receipt.totalDelivered !== ""
      ? parseAmount(receipt.totalDelivered)
      : undefined;
  const totalPaidLifetime =
    receipt.totalPaid != null && receipt.totalPaid !== ""
      ? parseAmount(receipt.totalPaid)
      : undefined;
  const isCreditDelivery = paid <= 0.009 && invoiceOutstanding > 0.009;
  const previousBalance =
    isCreditDelivery && accountOutstanding != null
      ? Math.max(accountOutstanding - invoiceOutstanding, 0)
      : undefined;

  return {
    receiptNumber: receipt.receiptNumber,
    saleReference: options?.saleReference ?? null,
    soldAt: receipt.soldAt,
    companyName: receipt.companyName,
    branchName: receipt.branchName,
    destinationMarketName: options?.destinationMarketName ?? null,
    salesRepName: receipt.salesRepName ?? null,
    cashierName: receipt.cashierName,
    terminalName: receipt.terminalName,
    warehouseName: receipt.warehouseName,
    paymentSummary: receipt.paymentSummary,
    total: parseAmount(receipt.total),
    paid,
    tendered: parseAmount(receipt.tendered),
    change: parseAmount(receipt.change),
    invoiceOutstanding,
    accountOutstanding,
    previousBalance,
    totalDelivered,
    totalPaid: totalPaidLifetime,
    isCreditDelivery,
    subtotal: parseAmount(receipt.subtotal),
    discount: parseAmount(receipt.discount),
    lines: receipt.lines.map((line) => ({
      name: line.name,
      quantity: parseAmount(line.quantity),
      unitPrice: parseAmount(line.unitPrice),
      discountAmount: parseAmount(line.discountAmount),
      lineTotal: parseAmount(line.lineTotal),
      unitCode: (line as { unitCode?: string | null }).unitCode ?? undefined,
    })),
  };
}

export const POS_MARKET_RESUME_SNAPSHOT_KEY = "pos-market-resume-sale-snapshot";

export function stashHeldSaleForResume(sale: PosMarketHeldSale) {
  try {
    sessionStorage.setItem(POS_MARKET_RESUME_SNAPSHOT_KEY, JSON.stringify(sale));
  } catch {
    // ignore
  }
}

export function consumeStashedHeldSale(saleId: string): PosMarketHeldSale | null {
  try {
    const raw = sessionStorage.getItem(POS_MARKET_RESUME_SNAPSHOT_KEY);
    if (!raw) return null;
    const sale = JSON.parse(raw) as PosMarketHeldSale;
    if (sale.id !== saleId) return null;
    sessionStorage.removeItem(POS_MARKET_RESUME_SNAPSHOT_KEY);
    return sale;
  } catch {
    return null;
  }
}
