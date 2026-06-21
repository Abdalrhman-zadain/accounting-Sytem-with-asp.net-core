"use client";

import React, { ComponentType } from "react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LuArrowRightLeft,
  LuBanknote,
  LuChartColumn,
  LuCreditCard,
  LuMinus,
  LuPackage,
  LuPlus,
  LuPrinter,
  LuReceipt,
  LuRefreshCcw,
  LuSave,
  LuSearch,
  LuFolder,
  LuMonitor,
  LuShoppingCart,
  LuScanLine,
  LuSettings2,
  LuShoppingBasket,
  LuStore,
  LuTimerReset,
  LuTriangleAlert,
  LuTrash2,
  LuWallet,
  LuUser,
  LuUserPlus,
  LuChevronDown,
  LuChevronRight,
  LuLock,
  LuCamera,
  LuArchive,
  LuTag,
  LuCalculator,
  LuChefHat,
  LuCheck,
  LuClock,
  LuTruck,
} from "react-icons/lu";

import { Card, Modal, PageShell, SearchableSelect } from "@/components/ui";
import { Field, Input } from "@/components/ui/forms";
import {
  ApiError,
  approvePosAccounting,
  approvePosSessionAccounting,
  rejectPosSessionAccounting,
  approvePosReturnAccounting,
  closePosSession,
  completePosSale,
  createPosReturn,
  getDraftPosSales,
  getCompletedPosSales,
  getBankCashAccounts,
  getActivePosSession,
  getHeldPosSales,
  getPosInventoryImpactReport,
  getPosSalesByBranchReport,
  getPosSalesByCashierReport,
  getPosSalesByItemReport,
  getPosSalesByPaymentMethodReport,
  getPosSessionReport,
  getPosFavoriteItemIds,
  getPosSettings,
  updatePosSettings,
  getPosTaxSummaryReport,
  getInventoryItems,
  getInventoryWarehouses,
  getPendingPosReview,
  getPosReportsOverview,
  getPosReturns,
  getPosSessions,
  getAccountOptions,
  holdPosSale,
  openPosSession,
  rejectPosAccounting,
  rejectPosReturnAccounting,
  reprintPosReceipt,
  printPosBill,
  reversePosAccounting,
  reversePosReturnAccounting,
  getCustomers,
  createCustomer,
  getActiveTaxTreatments,
  savePosDraft,
  sendPosSaleToKitchen,
  updatePosSaleKitchen,
  setPosFavoriteItemIds,
  voidPosSale,
  getPosTables,
  updatePosTableStatus,
  transferPosTable,
  mergePosTables,
  splitPosTable,
  correctPosOrderType,
  correctPosPaymentMethod,
  getDeliveryCompanies,
  getDeliveryDrivers,
  assignDriver,
  updateDeliveryStatus,
  getPosWaiters,
  getJournalEntryById,
  getPosAddonCatalog,
  getPosItemAddonConfig,
  getInventoryItemGroups,
  printPosSessionRollReport,
  getPosKitchenOrders,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { hasPermission, isCashierPosUser, isWaiterOnlyUser } from "@/lib/auth-access";
import { cn, getLocalizedText } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import {
  getPosItemShelfCategory,
  normalizeResumeCategory,
} from "@/features/pos/pos-catalog-chips";
import { PosProductCard } from "@/features/pos/pos-product-card";
import { DetailTile, DetailedTableCard } from "@/features/pos/pos-detail-cards";
import {
  posProductGridClass,
  posWaiterTabletProductGridClass,
} from "@/features/pos/pos-layout-classes";
import { PosRegisterMainGrid } from "@/features/pos/pos-register-layout";
import { PosRestaurantCartControls } from "@/features/pos/pos-restaurant-cart-controls";
import { PosAddonAdminPanel } from "@/features/pos/pos-addon-admin-panel";
import type { PosItemAddonConfig, PosLineAddonSelection } from "@/features/pos/pos-addon-types";
import {
  addonSignature,
  buildModifiersPayload,
  formatAddonsForDisplay,
  getAddonsFromModifiers,
  sumAddonPrices,
} from "@/features/pos/pos-addon-utils";
import { PosLineAddonModal } from "@/features/pos/pos-line-addon-modal";
import {
  clampKitchenOrderNote,
  POS_ORDER_NOTE_MAX,
} from "@/features/pos/pos-kitchen-note-limits";
import {
  getMinSalesQuantity,
  formatPosWeightDisplay,
  getQuantityPrecision,
  getWeightQuantityStep,
  isWeightSaleItem,
} from "@/features/pos/pos-weight-utils";
import type { PosReceiptData } from "@/features/pos/pos-receipt-print";
import {
  captureKitchenLineSnapshotFromCart,
  captureKitchenLineSnapshotFromSale,
  diffKitchenSnapshots,
  hasKitchenPrintDiff,
  type KitchenLineSnapshot,
} from "@/features/pos/pos-kitchen-print-delta";
import { useKitchenPrintHubActions } from "@/features/pos/pos-kitchen-print-hub-provider";
import {
  applyPosKitchenUpdatePrints,
  applyPosPayCompletePrints,
  printCustomerReceipt,
  printSessionRoll,
} from "@/features/pos/pos-print-service";
import { loadPosPrinterConfig, updatePosPrinterConfig } from "@/features/pos/pos-printer-config";
import { buildProvisionalReceiptData } from "@/features/pos/pos-provisional-receipt";
import { mapPosReceiptApiResponse } from "@/features/pos/pos-receipt-map";
import { PosPrinterSettingsPanel } from "@/features/pos/pos-printer-settings-panel";
import { PosReviewWorkspace } from "@/features/pos/pos-review-workspace";
import { PosDeliveryWorkspace } from "@/features/pos/pos-delivery-page";
import {
  HeldSaleKindBadges,
  PosHeldSaleCard,
} from "@/features/pos/pos-held-sale-card";
import { PosSessionBar } from "@/features/pos/pos-session-bar";
import { PosCameraScanner } from "@/features/pos/pos-camera-scanner";
import type {
  AccountOption,
  BankCashAccount,
  Customer,
  InventoryItem,
  InventoryWarehouse,
  JournalEntry,
  DeliveryCompany,
  DeliveryCollectionMethod,
  DeliveryDriver,
  DeliveryStatus,
  PosOrderType,
  PosPaymentMethod,
  PosInventoryImpactRow,
  PosReportsOverview,
  PosSalesByItemRow,
  PosSettings,
  PosReturn,
  PosSale,
  PosSaleHeldContext,
  PosSession,
  PosSessionReport,
  PosTable,
  PosWaiter,
  PosTaxSummaryRow,
  TaxTreatment,
} from "@/types/api";

type PosWorkspace =
  | "sales"
  | "sessions"
  | "held"
  | "review"
  | "returns"
  | "reports"
  | "settings"
  | "printers"
  | "delivery";

type WorkspaceTab = {
  id: PosWorkspace;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
};

type DiscountType = "FIXED" | "PERCENT";

const POS_CATEGORY_DISPLAY_ORDER = [
  "الاصناق",
  "روس و المقادم",
  "الاطباق",
  "وجبات 1",
  "وجبات 2",
  "الفتات",
  "المقبلات",
  "المشروبات",
  "الاضافات",
] as const;

const POS_CATEGORY_DISPLAY_ORDER_MAP = new Map<string, number>(
  POS_CATEGORY_DISPLAY_ORDER.map((name, index) => [name, index]),
);

function getCartLineKey(
  line: Pick<
    CartLine,
    "salesInvoiceLineId" | "clientLineId" | "itemId" | "modifiers" | "lineNote"
  >,
) {
  if (line.salesInvoiceLineId) {
    return line.salesInvoiceLineId;
  }
  if (line.clientLineId) {
    return line.clientLineId;
  }
  return `${line.itemId}:${addonSignature(getAddonsFromModifiers(line.modifiers))}:${line.lineNote ?? ""}`;
}

function getCartLineMergeKey(
  line: Pick<
    CartLine,
    "itemId" | "modifiers" | "lineNote" | "quantity" | "sellByWeight"
  >,
) {
  const base = `${line.itemId}:${addonSignature(getAddonsFromModifiers(line.modifiers))}:${line.lineNote ?? ""}`;
  return line.sellByWeight ? `${base}:${line.quantity}` : base;
}

function mergeCartLinesPreservingPortions(
  previous: CartLine[],
  fromApi: CartLine[],
): CartLine[] {
  const prevByInvoiceLineId = new Map(
    previous
      .filter((line) => line.salesInvoiceLineId)
      .map((line) => [line.salesInvoiceLineId!, line]),
  );

  return fromApi.map((apiLine) => {
    if (!apiLine.salesInvoiceLineId) {
      return apiLine;
    }
    const prev = prevByInvoiceLineId.get(apiLine.salesInvoiceLineId);
    if (!prev?.sellByWeight) {
      return apiLine;
    }

    const prevPortionQty = prev.quantity;
    const prevPortionCount = getWeightPortionCount(prev);
    if (prevPortionQty <= 0) {
      return apiLine;
    }

    const precision = prev.quantityPrecision ?? apiLine.quantityPrecision ?? 3;
    const apiQty = Number(apiLine.quantity.toFixed(precision));
    const prevTotal = Number((prevPortionQty * prevPortionCount).toFixed(precision));

    if (Math.abs(apiQty - prevTotal) < 0.0001) {
      return { ...apiLine, quantity: prevPortionQty, portionCount: prevPortionCount };
    }

    const inferredCount = apiQty / prevPortionQty;
    const roundedCount = Math.round(inferredCount);
    if (
      roundedCount > 0 &&
      Math.abs(inferredCount - roundedCount) < 0.0001
    ) {
      return { ...apiLine, quantity: prevPortionQty, portionCount: roundedCount };
    }

    return apiLine;
  });
}

function isKitchenProductionLocked(
  line: Pick<CartLine, "kitchenItemStatus">,
) {
  return line.kitchenItemStatus === "READY" || line.kitchenItemStatus === "SERVED";
}

function isKitchenSentLineLocked(
  line: Pick<CartLine, "kitchenSentAt" | "kitchenItemStatus">,
  waiterOnly: boolean,
) {
  if (waiterOnly) {
    return Boolean(line.kitchenSentAt);
  }
  return isKitchenProductionLocked(line);
}

function buildCartKitchenFingerprint(
  lines: Array<{
    salesInvoiceLineId?: string | null;
    itemId: string;
    quantity: number;
    kitchenSentAt?: string | null;
  }>,
): string {
  return JSON.stringify(
    lines.map((line) => ({
      id: line.salesInvoiceLineId ?? line.itemId,
      q: line.quantity,
      sent: line.kitchenSentAt,
    })),
  );
}

function getOrderWaiterLockMessage(language: string) {
  return getLocalizedText(
    "This order was confirmed by the waiter. You cannot add, edit, or change the order until payment. / تم تأكيد الطلب من الويتر. لا يمكن الإضافة أو التعديل أو أي تغيير حتى الدفع.",
    language,
  );
}

function getKitchenProductionLockMessage(language: string) {
  return getLocalizedText(
    "This item is already ready or served in the kitchen and cannot be changed. / هذا الصنف جاهز أو تم تقديمه في المطبخ ولا يمكن تعديله.",
    language,
  );
}

function getWeightLineLockedMessage(language: string) {
  return getLocalizedText(
    "Weight-based items cannot be changed after adding them. Remove the item and add it again with the correct weight. / الأصناف المباعة بالوزن لا يمكن تعديل وزنها بعد إضافتها. احذف الصنف ثم أضفه من جديد بالوزن الصحيح.",
    language,
  );
}

function getWeightSentPortionRemoveMessage(language: string) {
  return getLocalizedText(
    "This portion was already sent to the kitchen. Use + to add another portion. / هذه الحصة أُرسلت للمطبخ. استخدم + لإضافة حصة أخرى.",
    language,
  );
}

function getWeightPortionCount(line: Pick<CartLine, "portionCount">) {
  const count = line.portionCount ?? 1;
  return count > 0 ? count : 1;
}

function getCartLineInventoryQuantity(line: CartLine) {
  if (line.sellByWeight) {
    return Number(
      (line.quantity * getWeightPortionCount(line)).toFixed(line.quantityPrecision ?? 3),
    );
  }
  return line.quantity;
}

function getCartItemWeightTotal(lines: CartLine[], itemId: string) {
  return lines
    .filter((entry) => entry.itemId === itemId)
    .reduce((sum, entry) => sum + getCartLineInventoryQuantity(entry), 0);
}

function mapCartLinesForKitchenSnapshot(lines: CartLine[]) {
  return lines.map((line) => ({
    salesInvoiceLineId: line.salesInvoiceLineId,
    clientLineId: line.clientLineId,
    itemId: line.itemId,
    name: line.name,
    quantity: getCartLineInventoryQuantity(line),
    unit: line.unit,
    kitchenSentAt: line.kitchenSentAt,
    modifiers: line.modifiers,
    lineNote: line.lineNote,
  }));
}

function getCustomWeightPresets(item: Pick<InventoryItem, "code">) {
  if (item.code === "MENU-001") {
    return [
      {
        value: 0.125,
        labelAr: "عدد واحد",
        labelEn: "Single piece",
      },
    ];
  }
  if (item.code === "MENU-006") {
    return [
      {
        value: 0.125,
        labelAr: "عدد واحد",
        labelEn: "Single piece",
      },
    ];
  }
  return [];
}

type CartLine = {
  salesInvoiceLineId?: string;
  /** Stable key for new sell-by-weight lines (each weigh-in stays separate). */
  clientLineId?: string;
  kitchenSentAt?: string | null;
  kitchenItemStatus?: import("@/types/api").KitchenStatus | null;
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
  averageCost: number;
  salesAccountId?: string | null;
  inventoryAccountId?: string | null;
  cogsAccountId?: string | null;
  warehouseId?: string | null;
  onHandQuantity: number;
  baseUnitPrice?: number;
  modifiers?: import("@/features/pos/pos-addon-types").PosLineModifiersPayload | null;
  lineNote?: string;
  sellByWeight?: boolean;
  /** Same-weight portions on one cart row (sell-by-weight only). */
  portionCount?: number;
  quantityPrecision?: number;
};

type PaymentEntry = {
  id: string;
  paymentMethod: "CASH" | "CARD" | "CLIQ" | "BANK_TRANSFER" | "WALLET";
  bankCashAccountId: string;
  amount: string;
  reference: string;
};

type ReturnPaymentEntry = {
  id: string;
  refundMethod:
  | "CASH"
  | "CARD"
  | "CLIQ"
  | "BANK_TRANSFER"
  | "WALLET"
  | "STORE_CREDIT";
  bankCashAccountId: string;
  amount: string;
  reference: string;
};

type HeldSale = {
  id: string;
  status: "DRAFT" | "HELD";
  title: string;
  createdAt: string;
  search: string;
  orderNotes: string;
  activeCategory: string;
  selectedWarehouseId: string;
  invoiceDiscountType: DiscountType;
  invoiceDiscountValue: number;
  cartLines: CartLine[];
  paymentEntries: PaymentEntry[];
  customerId?: string | null;
  orderType: PosOrderType;
  tableId?: string | null;
  tableNumber?: string | null;
  waiterId?: string | null;
  waiterName?: string | null;
  waiterConfirmedAt?: string | null;
  customerName?: string | null;
  deliveryCompanyId?: string | null;
  deliveryCompanyName?: string | null;
  deliveryCollectionMethod?: DeliveryCollectionMethod | null;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  deliveryFeeAmount: number;
  serviceChargeAmount: number;
  deliveryAddress: string;
  deliveryNotes: string;
  totalAmount: number;
  heldContext?: PosSaleHeldContext | null;
};

type SessionState = {
  isOpen: boolean;
  terminalName: string;
  branchName: string;
  openingCash: string;
  openedAt?: string | null;
  warehouseId?: string;
  cashAccountId?: string;
  expectedCash: number;
  completedSales: number;
};

type CompletedReceipt = PosReceiptData;

type FlashNotice = {
  message: string;
  tone: "success" | "warning" | "error";
};

const workspaceTabs: WorkspaceTab[] = [
  { id: "sales", labelKey: "pos.workspace.sales", icon: LuStore },
  { id: "sessions", labelKey: "pos.workspace.sessions", icon: LuTimerReset },
  { id: "held", labelKey: "pos.workspace.held", icon: LuReceipt },
  { id: "review", labelKey: "pos.workspace.review", icon: LuReceipt },
  { id: "delivery", labelKey: "pos.workspace.delivery", icon: LuTruck },
  { id: "returns", labelKey: "pos.workspace.returns", icon: LuArrowRightLeft },
  { id: "reports", labelKey: "pos.workspace.reports", icon: LuChartColumn },
  { id: "printers", labelKey: "pos.workspace.printers", icon: LuPrinter },
  { id: "settings", labelKey: "pos.workspace.settings", icon: LuSettings2 },
];

const pathnameWorkspaceMap: Record<string, PosWorkspace> = {
  "/pos/register": "sales",
  "/pos/waiter/order": "sales",
  "/pos/session": "sessions",
  "/pos/sessions": "sessions",
  "/pos/held-sales": "held",
  "/pos/accounting-review": "review",
  "/pos/completed-sales": "review",
  "/pos/delivery": "delivery",
  "/pos/returns": "returns",
  "/pos/reports": "reports",
  "/pos/printers": "printers",
  "/pos/settings": "settings",
};

const POS_WORKSPACE_IDS = new Set<PosWorkspace>(
  workspaceTabs.map((tab) => tab.id),
);

function isPosWorkspace(value: string): value is PosWorkspace {
  return POS_WORKSPACE_IDS.has(value as PosWorkspace);
}

function resolvePosWorkspace(pathname: string, tab: string | null): PosWorkspace | null {
  const fromPath = pathnameWorkspaceMap[pathname];
  if (fromPath) {
    return fromPath;
  }
  if (tab && isPosWorkspace(tab)) {
    return tab;
  }
  return null;
}

function workspaceHref(workspace: PosWorkspace, waiterMode = false) {
  if (waiterMode && workspace === "sales") {
    return "/pos/waiter/order";
  }
  const route = Object.entries(pathnameWorkspaceMap).find(([, id]) => id === workspace)?.[0];
  if (route) {
    return route;
  }
  return workspace === "sales" ? "/pos/register" : `/pos?tab=${workspace}`;
}

const HELD_SALES_KEY = "pos-held-sales";
const SESSION_KEY = "pos-session-state";
const LAST_RECEIPT_KEY = "pos-last-receipt";
const POS_RESUME_SNAPSHOT_KEY = "pos-resume-sale-snapshot";

function stashHeldSaleForResume(sale: HeldSale) {
  try {
    sessionStorage.setItem(POS_RESUME_SNAPSHOT_KEY, JSON.stringify(sale));
  } catch {
    // Ignore storage quota or private-mode failures.
  }
}

function consumeStashedHeldSale(saleId: string): HeldSale | null {
  try {
    const raw = sessionStorage.getItem(POS_RESUME_SNAPSHOT_KEY);
    if (!raw) {
      return null;
    }
    const sale = JSON.parse(raw) as HeldSale;
    if (sale.id !== saleId) {
      return null;
    }
    sessionStorage.removeItem(POS_RESUME_SNAPSHOT_KEY);
    return sale;
  } catch {
    return null;
  }
}

function createLocalId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePaymentAccountMethod(
  account: Pick<BankCashAccount, "type" | "name" | "bankName" | "account">,
): "CASH" | "CARD" | "CLIQ" | "BANK_TRANSFER" | "WALLET" {
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
  if (normalized.includes("CLIQ")) {
    return "CLIQ";
  }
  if (normalized.includes("WALLET")) {
    return "WALLET";
  }
  if (normalized.includes("BANK")) {
    return "BANK_TRANSFER";
  }
  return "CASH";
}

function getPaymentMethodLabel(
  method: "CASH" | "CARD" | "CLIQ" | "BANK_TRANSFER" | "WALLET" | "MIXED",
  language: string = "ar",
) {
  const isAr = language === "ar";
  switch (method) {
    case "CASH":
      return isAr ? "نقد" : "Cash";
    case "CARD":
      return isAr ? "بطاقة" : "Card";
    case "CLIQ":
      return isAr ? "كليك" : "CliQ";
    case "BANK_TRANSFER":
      return isAr ? "بنك" : "Bank";
    case "WALLET":
      return isAr ? "محفظة" : "Wallet";
    case "MIXED":
      return isAr ? "مختلط" : "Mixed";
    default:
      return method;
  }
}

function parseAmount(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number, currency = "JOD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function getLineBase(line: CartLine) {
  const addonTotal = sumAddonPrices(getAddonsFromModifiers(line.modifiers));
  if (line.sellByWeight) {
    const portionCount = getWeightPortionCount(line);
    return (
      portionCount * (line.quantity * (line.baseUnitPrice ?? line.unitPrice) + addonTotal)
    );
  }
  return line.quantity * line.unitPrice;
}

function getLineDiscountAmount(line: CartLine) {
  const base = getLineBase(line);
  if (line.discountType === "PERCENT") {
    return Math.min(base, base * (line.discountValue / 100));
  }
  return Math.min(base, line.discountValue);
}

function getLineNetBeforeInvoiceDiscount(line: CartLine) {
  return Math.max(getLineBase(line) - getLineDiscountAmount(line), 0);
}

function getLineTaxAmount(
  line: CartLine,
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

function getLineTotal(
  line: CartLine,
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
  return taxableAfterInvoiceDiscount + getLineTaxAmount(line, invoiceDiscountShare, taxPolicy, taxFreeEnabled);
}

function getLineTotalCost(line: CartLine) {
  return getCartLineInventoryQuantity(line) * line.unitCost;
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

function mapPosSaleToHeldSale(sale: PosSale): HeldSale {
  const cartLines: CartLine[] = sale.lines.map((line) => ({
    salesInvoiceLineId: line.id,
    kitchenSentAt: line.kitchenSentAt ?? null,
    kitchenItemStatus: line.kitchenItemStatus ?? null,
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
    averageCost: 0,
    salesAccountId: line.revenueAccountId,
    warehouseId: line.warehouse?.id ?? undefined,
    onHandQuantity: 0,
    baseUnitPrice:
      Boolean(line.item?.allowFractionalQuantity)
        ? parseAmount(line.unitPrice)
        : parseAmount(line.unitPrice) - sumAddonPrices(getAddonsFromModifiers(line.modifiers)),
    modifiers: (line.modifiers as CartLine["modifiers"]) ?? null,
    lineNote:
      line.description && line.description !== (line.itemName ?? "")
        ? line.description
        : "",
  }));

  return {
    id: sale.id,
    status: sale.posOperationalStatus === "DRAFT" ? "DRAFT" : "HELD",
    title: sale.reference,
    createdAt: sale.updatedAt,
    search: "",
    orderNotes: sale.description ?? "",
    activeCategory: "all",
    selectedWarehouseId: cartLines.find((line) => line.warehouseId)?.warehouseId ?? "",
    invoiceDiscountType: "FIXED",
    invoiceDiscountValue: 0,
    cartLines,
    paymentEntries: sale.payments.map((payment) => ({
      id: payment.id,
      paymentMethod:
        payment.paymentMethod === "DELIVERY"
          ? "BANK_TRANSFER"
          : (payment.paymentMethod as PaymentEntry["paymentMethod"]),
      bankCashAccountId: payment.bankCashAccount.id,
      amount: payment.tenderedAmount ?? payment.amount,
      reference: payment.reference ?? "",
    })),
    customerId: sale.customer?.id ?? null,
    orderType: sale.orderType ?? "TAKEAWAY",
    tableId: sale.tableId ?? null,
    tableNumber: sale.table?.tableNumber ?? sale.heldContext?.tableNumber ?? null,
    waiterId: sale.waiterId ?? null,
    waiterName: sale.waiter?.name ?? sale.waiter?.email ?? null,
    waiterConfirmedAt: sale.waiterConfirmedAt ?? null,
    customerName: sale.customer?.name ?? null,
    deliveryCompanyId: sale.deliveryCompanyId ?? null,
    deliveryCompanyName:
      sale.deliveryCompany?.arabicName ?? sale.deliveryCompany?.name ?? null,
    deliveryCollectionMethod:
      sale.deliveryCollectionMethod ??
      (sale.deliveryCompanyId ? "RESTAURANT" : null),
    driverId: sale.driverId ?? null,
    driverName: sale.driver?.name ?? null,
    driverPhone: sale.driver?.phone ?? null,
    deliveryFeeAmount: parseAmount(sale.deliveryFeeAmount),
    serviceChargeAmount: parseAmount(sale.serviceChargeAmount),
    deliveryAddress: sale.deliveryAddress ?? "",
    deliveryNotes: sale.deliveryNotes ?? "",
    totalAmount: parseAmount(sale.totalAmount),
    heldContext: sale.heldContext ?? null,
  };
}

function buildPosRegisterResumePath(sale: HeldSale) {
  const params = new URLSearchParams({ resume: sale.id });
  if (sale.heldContext?.reservationId) {
    params.set("reservationId", sale.heldContext.reservationId);
  }
  if (sale.tableId) {
    params.set("tableId", sale.tableId);
  }
  return `/pos/register?${params.toString()}`;
}

function mapOpenPosSalesFromApi(
  drafts: PosSale[] | undefined,
  held: PosSale[] | undefined,
): HeldSale[] {
  return [
    ...(drafts ?? []).map(mapPosSaleToHeldSale),
    ...(held ?? []).map(mapPosSaleToHeldSale),
  ];
}

function findOpenSaleForTable(
  openSales: HeldSale[],
  tableId: string,
  activeInvoiceId?: string | null,
) {
  const byTable = openSales.find((row) => row.tableId === tableId);
  if (byTable) {
    return byTable;
  }
  if (activeInvoiceId) {
    return openSales.find((row) => row.id === activeInvoiceId);
  }
  return undefined;
}

function buildPosRegisterTablePath(
  table: Pick<PosTable, "id" | "activeInvoice">,
  registerPath = "/pos/register",
) {
  const params = new URLSearchParams({ tableId: table.id });
  const invoice = table.activeInvoice;
  if (
    invoice?.id &&
    (invoice.posOperationalStatus === "DRAFT" ||
      invoice.posOperationalStatus === "HELD")
  ) {
    params.set("resume", invoice.id);
  }
  return `${registerPath}?${params.toString()}`;
}

function mapReceiptResponse(
  receipt: Parameters<typeof mapPosReceiptApiResponse>[0],
): CompletedReceipt {
  return mapPosReceiptApiResponse(receipt);
}

function PlaceholderWorkspace({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="rounded-[28px] border-[#d7ddd8] bg-white/95 p-8 shadow-[0_24px_80px_-48px_rgba(40,64,48,0.45)]">
      <div className="flex max-w-3xl flex-col gap-5">
        <div className="inline-flex w-fit items-center rounded-full border border-[#c7d3cc] bg-[#eef3ef] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#4b6250]">
          POS Workspace
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[#233329] arabic-heading">
          {title}
        </h1>
        <p className="max-w-2xl text-base leading-8 text-[#596760] arabic-auto">
          {description}
        </p>
      </div>
    </Card>
  );
}

export function PosPage({ waiterMode = false }: { waiterMode?: boolean } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const { t, language } = useTranslation();
  const isArabic = language === "ar";
  const queryClient = useQueryClient();
  const [workspace, setWorkspace] = useState<PosWorkspace>(() =>
    resolvePosWorkspace(pathname, searchParams.get("tab")) ?? "sales",
  );
  const [, startRoutingTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [addonModalItem, setAddonModalItem] = useState<InventoryItem | null>(null);
  const [addonModalConfig, setAddonModalConfig] = useState<PosItemAddonConfig | null>(null);
  const [addonEditLine, setAddonEditLine] = useState<CartLine | null>(null);
  const [pendingEntryWeight, setPendingEntryWeight] = useState<number | null>(null);
  const deferredSearch = useDeferredValue(search);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [invoiceDiscountType, setInvoiceDiscountType] =
    useState<DiscountType>("FIXED");
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState(0);
  const [isInvoiceDiscountOpen, setIsInvoiceDiscountOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const hadKitchenTicketRef = useRef(false);
  const lastKitchenSyncFingerprintRef = useRef<string | null>(null);
  const waiterConfirmedAtRef = useRef<string | null>(null);
  const lastSyncedKitchenSnapshotRef = useRef<KitchenLineSnapshot[]>([]);
  const kitchenHubActionsRef = useRef({
    markKitchenOrderItemsPrinted: (_itemIds: string[]) => {},
    markKitchenOrderItemsPrintedForSale: (_salesInvoiceId: string) => {},
    markKitchenInvoiceFullyPrinted: (_salesInvoiceId: string) => {},
    markKitchenLinesFromCart: (
      _salesInvoiceId: string,
      _lines: Array<{ salesInvoiceLineId?: string | null; kitchenSentAt?: string | null }>,
    ) => {},
  });
  // Stable ref so mutations defined before resetSale() can still invoke it
  const resetSaleRef = useRef<() => void>(() => {});
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [draftSales, setDraftSales] = useState<HeldSale[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>({
    isOpen: false,
    terminalName: "الجهاز رقم 01",
    branchName: "",
    openingCash: "",
    expectedCash: 0,
    completedSales: 0,
  });
  const [lastReceipt, setLastReceipt] = useState<CompletedReceipt | null>(null);
  const [lastSessionReport, setLastSessionReport] = useState<PosSessionReport | null>(
    null,
  );
  const [selectedSessionReportId, setSelectedSessionReportId] = useState<string>("");
  const [selectedReturnSaleId, setSelectedReturnSaleId] = useState<string>("");
  const [returnReason, setReturnReason] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>({});
  const [returnPayments, setReturnPayments] = useState<ReturnPaymentEntry[]>([]);
  const [flashNotice, setFlashNotice] = useState<FlashNotice | null>(null);
  const [isRecentReceiptsOpen, setIsRecentReceiptsOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState<
    "CASH" | "CARD" | "CLIQ" | "BANK_TRANSFER" | "WALLET" | "MIXED"
  >("CASH");
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(
    () => loadPosPrinterConfig().autoPrintReceiptOnPay,
  );
  const messageTimeoutRef = useRef<number | null>(null);
  const resumedSaleRef = useRef<string | null>(null);
  const resumedTableIdRef = useRef<string | null>(null);
  const defaultOrderType = isWaiterOnlyUser(user) ? "DINE_IN" : "TAKEAWAY";
  const prevOrderTypeRef = useRef<PosOrderType>(defaultOrderType);
  const [activeReservationId, setActiveReservationId] = useState<string | null>(null);
  const [preOrderCompletedTableId, setPreOrderCompletedTableId] = useState<string | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchCustomer, setSearchCustomer] = useState("");
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerTaxTreatmentId, setNewCustomerTaxTreatmentId] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [favoriteItemIds, setFavoriteItemIds] = useState<string[]>([]);
  const [payFlowStep, setPayFlowStep] = useState<"tender" | "success">("tender");
  const [isHeldOrdersOpen, setIsHeldOrdersOpen] = useState(false);
  const [isCancelSaleOpen, setIsCancelSaleOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  // Restaurant Cart details
  const [orderType, setOrderType] = useState<PosOrderType>(defaultOrderType);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTableNumber, setSelectedTableNumber] = useState<string | null>(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<"DIRECT" | "THIRD_PARTY">("THIRD_PARTY");
  const [deliveryCompanyId, setDeliveryCompanyId] = useState<string | null>(null);
  const [deliveryCollectionMethod, setDeliveryCollectionMethod] =
    useState<DeliveryCollectionMethod>("RESTAURANT");
  const [deliveryDriverId, setDeliveryDriverId] = useState<string | null>(null);
  const [selectedDeliveryDriverName, setSelectedDeliveryDriverName] = useState<string | null>(null);
  const [selectedDeliveryDriverPhone, setSelectedDeliveryDriverPhone] = useState<string | null>(null);
  const [serviceChargeAmount, setServiceChargeAmount] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // Table selector overlays & actions
  const [isTableSelectorOpen, setIsTableSelectorOpen] = useState(false);
  const [isMergeTablesOpen, setIsMergeTablesOpen] = useState(false);
  const [isTransferTableOpen, setIsTransferTableOpen] = useState(false);
  const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);
  const [transferTargetTableId, setTransferTargetTableId] = useState("");
  const [mergeSourceTableIds, setMergeSourceTableIds] = useState<string[]>([]);
  const [splitBillQuantities, setSplitBillQuantities] = useState<Record<string, string>>({});

  // Cashier Shift Closing Custom Modal
  const [isCashierCloseModalOpen, setIsCashierCloseModalOpen] = useState(false);
  const [actualCashCount, setActualCashCount] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [reviewSessionId, setReviewSessionId] = useState<string>("");
  const [reviewTab, setReviewTab] = useState<"overview" | "cash" | "inventory" | "journal">("overview");
  const [isCorrectOrderTypeOpen, setIsCorrectOrderTypeOpen] = useState(false);
  const [isCorrectPaymentMethodOpen, setIsCorrectPaymentMethodOpen] = useState(false);
  const [selectedCorrectionSale, setSelectedCorrectionSale] = useState<PosSale | null>(null);
  const [selectedPaymentCorrectionSale, setSelectedPaymentCorrectionSale] = useState<PosSale | null>(null);
  const [correctionOrderType, setCorrectionOrderType] = useState<PosOrderType>(defaultOrderType);
  const [correctionTableId, setCorrectionTableId] = useState<string>("");
  const [correctionDeliveryCompanyId, setCorrectionDeliveryCompanyId] = useState<string>("");
  const [correctionDriverId, setCorrectionDriverId] = useState<string>("");
  const [correctionServiceCharge, setCorrectionServiceCharge] = useState("");
  const [correctionDeliveryFee, setCorrectionDeliveryFee] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionPaymentMethod, setCorrectionPaymentMethod] = useState<PosPaymentMethod>("CASH");
  const [correctionPaymentDeliveryCompanyId, setCorrectionPaymentDeliveryCompanyId] = useState("");
  const [correctionPaymentReference, setCorrectionPaymentReference] = useState("");
  const [correctionPaymentReason, setCorrectionPaymentReason] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const customersQuery = useQuery({
    queryKey: queryKeys.salesCustomers(token, { isActive: "true" }),
    queryFn: () => getCustomers({ isActive: "true" }, token),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(token),
  });

  const activeTaxTreatmentsQuery = useQuery({
    queryKey: ["tax-treatments", "active", token],
    queryFn: () => getActiveTaxTreatments(token),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(token),
  });

  const deliveryCompaniesQuery = useQuery({
    queryKey: ["delivery-companies", token],
    queryFn: () => getDeliveryCompanies(token),
    enabled: Boolean(token),
  });

  const deliveryDriversQuery = useQuery({
    queryKey: ["delivery-drivers", token],
    queryFn: () => getDeliveryDrivers(token),
    enabled: Boolean(token),
  });

  const waitersQuery = useQuery({
    queryKey: ["pos-waiters", token],
    queryFn: () => getPosWaiters(token),
    enabled: Boolean(token),
  });

  const createCustomerMutation = useMutation({
    mutationFn: (payload: { name: string; taxTreatmentId: string }) =>
      createCustomer(
        {
          name: payload.name,
          taxTreatmentId: payload.taxTreatmentId,
          creditLimit: 0,
          receivableAccountLinkMode: "AUTO",
        },
        token,
      ),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.salesCustomers(token, { isActive: "true" }),
      });
      setSelectedCustomerId(created.id);
      setIsAddCustomerOpen(false);
      setNewCustomerName("");
      setNewCustomerTaxTreatmentId("");
      pushMessage(getLocalizedText("Customer created successfully / تم إنشاء العميل بنجاح", language));
    },
    onError: (err: any) => {
      pushMessage(`Error creating customer: ${err?.message || "Unknown error"}`);
    },
  });

  const warehousesQuery = useQuery({
    queryKey: queryKeys.inventoryWarehouses(token, { isActive: "true" }),
    queryFn: () => getInventoryWarehouses({ isActive: "true" }, token),
    enabled: Boolean(token),
  });

  const paymentAccountsQuery = useQuery({
    queryKey: queryKeys.bankCashAccounts(token, { isActive: "true" }),
    queryFn: () => getBankCashAccounts({ isActive: "true" }, token),
    enabled: Boolean(token),
  });

  const accountOptionsQuery = useQuery({
    queryKey: queryKeys.accounts(token, { isActive: "true", isPosting: "true", view: "selector" }),
    queryFn: () => getAccountOptions({ isActive: "true", isPosting: "true" }, token),
    enabled: Boolean(token && workspace === "settings"),
  });

  const activeSessionQuery = useQuery({
    queryKey: queryKeys.posActiveSession(token),
    queryFn: () => getActivePosSession(token),
    enabled: Boolean(token),
  });

  const PAGE_SIZE = 48;

  const itemGroupsQuery = useQuery({
    queryKey: queryKeys.inventoryItemGroups(token, { isActive: "true" }),
    queryFn: () => getInventoryItemGroups({ isActive: "true" }, token),
    enabled: Boolean(token && activeSessionQuery.data?.id && workspace === "sales"),
  });

  const itemGroups = useMemo(() => {
    const groups = itemGroupsQuery.data ?? [];
    return [...groups].sort((left, right) => {
      const leftOrder = POS_CATEGORY_DISPLAY_ORDER_MAP.get(left.name) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = POS_CATEGORY_DISPLAY_ORDER_MAP.get(right.name) ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.name.localeCompare(right.name, "ar");
    });
  }, [itemGroupsQuery.data]);
  const hasInitializedCategoryRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedCategoryRef.current && itemGroups.length > 0) {
      const firstGroupId = itemGroups[0]?.id;
      if (firstGroupId) {
        setActiveCategory(firstGroupId);
        hasInitializedCategoryRef.current = true;
      }
    }
  }, [itemGroups]);

  const catalogChips = useMemo(() => {
    return [
      ...itemGroups.map((g) => ({ id: g.id, name: g.name })),
      { id: "favorites", name: getLocalizedText("Favorites / المفضلة", language) },
      { id: "all", name: getLocalizedText("All / الكل", language) },
    ];
  }, [itemGroups, language]);


  const itemsQuery = useQuery({
    queryKey: queryKeys.inventoryItems(token, {
      isActive: "true",
      page: productPage,
      limit: PAGE_SIZE,
      search: deferredSearch.trim() || undefined,
      warehouseId: selectedWarehouseId || undefined,
      itemGroupId: activeCategory !== "all" && activeCategory !== "favorites" ? activeCategory : undefined,
    }),
    queryFn: () =>
      getInventoryItems(
        {
          isActive: "true",
          page: productPage,
          limit: PAGE_SIZE,
          search: deferredSearch.trim() || undefined,
          warehouseId: selectedWarehouseId || undefined,
          itemGroupId: activeCategory !== "all" && activeCategory !== "favorites" ? activeCategory : undefined,
        },
        token,
      ),
    enabled: Boolean(token && activeSessionQuery.data?.id && workspace === "sales"),
    placeholderData: (previousData) => previousData,
  });

  const visibleItemIds = useMemo(
    () => (itemsQuery.data?.data ?? []).map((item) => item.id).filter(Boolean),
    [itemsQuery.data],
  );

  const visibleItemIdsKey = useMemo(
    () => [...visibleItemIds].sort().join(","),
    [visibleItemIds],
  );

  const addonCatalogQuery = useQuery({
    queryKey: queryKeys.posAddonCatalog(token, visibleItemIdsKey),
    queryFn: () => getPosAddonCatalog(visibleItemIds, token),
    enabled: Boolean(
      token &&
      workspace === "sales" &&
      activeSessionQuery.data?.id &&
      visibleItemIds.length,
    ),
    staleTime: 30_000,
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.posSettings(token),
    queryFn: () => getPosSettings(token),
    enabled: Boolean(token && (workspace === "sales" || workspace === "settings" || workspace === "review")),
  });

  const updatePosSettingsMutation = useMutation({
    mutationFn: (payload: {
      postingMode?: "BY_INVOICE" | "BY_SESSION";
      cogsPostingEnabled?: boolean;
      cashAccountId?: string;
      cardAccountId?: string;
      cliqAccountId?: string;
      walletAccountId?: string;
      bankTransferAccountId?: string;
      salesRevenueAccountId?: string;
      outputVatAccountId?: string;
      salesDiscountAccountId?: string;
      salesReturnsAccountId?: string;
      deliveryCompanies?: Array<{
        id: string;
        receivableAccountId: string;
        commissionAccountId?: string;
        serviceFeeAccountId?: string;
      }>;
    }) => updatePosSettings(payload, token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.posSettings(token),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.posReview(token),
      });
      pushMessage(getLocalizedText("POS settings saved successfully / تم حفظ إعدادات نقاط البيع بنجاح", language));
    },
    onError: (error) => {
      pushError(getErrorMessage(error, "Failed to save POS settings."));
    },
  });

  const favoritesQuery = useQuery({
    queryKey: queryKeys.posFavoriteItems(token),
    queryFn: () => getPosFavoriteItemIds(token),
    enabled: Boolean(token && workspace === "sales"),
  });

  const syncFavoritesMutation = useMutation({
    mutationFn: (itemIds: string[]) => setPosFavoriteItemIds(itemIds, token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.posFavoriteItems(token),
      });
    },
  });

  const posSessionsQuery = useQuery({
    queryKey: queryKeys.posSessions(token),
    queryFn: () => getPosSessions(token),
    enabled: Boolean(token),
  });

  const heldSalesQuery = useQuery({
    queryKey: queryKeys.posHeldSales(token, activeSessionQuery.data?.id ?? null),
    queryFn: () => getHeldPosSales(activeSessionQuery.data!.id, token),
    enabled: Boolean(token && activeSessionQuery.data?.id),
  });

  const draftSalesQuery = useQuery({
    queryKey: queryKeys.posDraftSales(token, activeSessionQuery.data?.id ?? null),
    queryFn: () => getDraftPosSales(activeSessionQuery.data!.id, token),
    enabled: Boolean(token && activeSessionQuery.data?.id),
  });

  const reviewQuery = useQuery({
    queryKey: queryKeys.posReview(token),
    queryFn: () => getPendingPosReview(token),
    enabled: Boolean(token && workspace === "review"),
  });

  const completedSalesQuery = useQuery({
    queryKey: queryKeys.posCompletedSales(token),
    queryFn: () => getCompletedPosSales(token),
    enabled: Boolean(
      token &&
        (workspace === "returns" || workspace === "sales") &&
        hasPermission(user, "POS_VIEW_COMPLETED_SALES"),
    ),
  });

  const returnsQuery = useQuery({
    queryKey: queryKeys.posReturns(token),
    queryFn: () => getPosReturns(token),
    enabled: Boolean(token && workspace === "returns"),
  });

  const reportsOverviewQuery = useQuery({
    queryKey: queryKeys.posReportsOverview(token),
    queryFn: () => getPosReportsOverview(token),
    enabled: Boolean(token && workspace === "reports"),
  });

  const selectedSessionId =
    selectedSessionReportId || activeSessionQuery.data?.id || posSessionsQuery.data?.[0]?.id || null;

  const sessionReportQuery = useQuery({
    queryKey: queryKeys.posSessionReport(token, selectedSessionId),
    queryFn: () => getPosSessionReport(selectedSessionId!, token),
    enabled: Boolean(token && selectedSessionId && workspace === "sessions"),
  });

  const reviewSessionReportQuery = useQuery({
    queryKey: queryKeys.posSessionReport(token, reviewSessionId || null),
    queryFn: () => getPosSessionReport(reviewSessionId, token),
    enabled: Boolean(token && reviewSessionId && workspace === "review"),
  });

  const reviewUsesSessionPosting =
    settingsQuery.data?.runtime.postingMode === "BY_SESSION" ||
    Boolean(
      reviewSessionReportQuery.data?.sessionJournalEntry?.id &&
        (reviewSessionReportQuery.data?.sales?.length ?? 0) > 0,
    );

  const reviewJournalEntriesQuery = useQuery({
    queryKey: [
      "pos-review-journal-entries",
      token,
      reviewSessionId,
      [
        reviewSessionReportQuery.data?.sessionJournalEntry?.id ?? "",
        ...(
          reviewUsesSessionPosting
            ? []
            : (reviewSessionReportQuery.data?.sales ?? []).map((sale) => sale.journalEntry?.id ?? "")
        ),
        ...(reviewSessionReportQuery.data?.returns ?? []).map((posReturn) => posReturn.journalEntry?.id ?? ""),
      ]
        .filter(Boolean)
        .join(","),
    ],
    queryFn: async () => {
      const ids = Array.from(
        new Set(
          [
            reviewSessionReportQuery.data?.sessionJournalEntry?.id ?? null,
            ...(
              reviewUsesSessionPosting
                ? []
                : (reviewSessionReportQuery.data?.sales ?? []).map((sale) => sale.journalEntry?.id ?? null)
            ),
            ...(reviewSessionReportQuery.data?.returns ?? []).map((posReturn) => posReturn.journalEntry?.id ?? null),
          ].filter((id): id is string => Boolean(id)),
        ),
      );
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            return await getJournalEntryById(id, token);
          } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
              return null;
            }
            throw error;
          }
        }),
      );
      return results.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    },
    enabled: Boolean(
      token &&
        workspace === "review" &&
        reviewSessionReportQuery.data &&
        (
          Boolean(reviewSessionReportQuery.data.sessionJournalEntry?.id) ||
          (reviewSessionReportQuery.data.sales ?? []).some((sale) => Boolean(sale.journalEntry?.id)) ||
          (reviewSessionReportQuery.data.returns ?? []).some((posReturn) => Boolean(posReturn.journalEntry?.id))
        ),
    ),
  });

  const salesByPaymentMethodQuery = useQuery({
    queryKey: queryKeys.posSalesByPaymentMethod(token),
    queryFn: () => getPosSalesByPaymentMethodReport(token),
    enabled: Boolean(token && workspace === "reports"),
  });

  const salesByCashierQuery = useQuery({
    queryKey: queryKeys.posSalesByCashier(token),
    queryFn: () => getPosSalesByCashierReport(token),
    enabled: Boolean(token && workspace === "reports"),
  });

  const salesByBranchQuery = useQuery({
    queryKey: queryKeys.posSalesByBranch(token),
    queryFn: () => getPosSalesByBranchReport(token),
    enabled: Boolean(token && workspace === "reports"),
  });

  const salesByItemQuery = useQuery({
    queryKey: queryKeys.posSalesByItem(token),
    queryFn: () => getPosSalesByItemReport(token),
    enabled: Boolean(token && workspace === "reports"),
  });

  const inventoryImpactQuery = useQuery({
    queryKey: queryKeys.posInventoryImpact(token),
    queryFn: () => getPosInventoryImpactReport(token),
    enabled: Boolean(token && workspace === "reports"),
  });

  const taxSummaryQuery = useQuery({
    queryKey: queryKeys.posTaxSummary(token),
    queryFn: () => getPosTaxSummaryReport(token),
    enabled: Boolean(token && workspace === "reports"),
  });

  const posTablesQuery = useQuery({
    queryKey: queryKeys.posTables(token),
    queryFn: () => getPosTables(token),
    enabled: Boolean(token && workspace === "sales"),
  });

  const refreshPosData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.posActiveSession(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posSettings(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posSessions(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posCompletedSales(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posReview(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posReturns(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posReportsOverview(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posSessionReport(token, selectedSessionId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posSessionReport(token, reviewSessionId || null) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posSalesByPaymentMethod(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posSalesByCashier(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posSalesByBranch(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posSalesByItem(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posInventoryImpact(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posTaxSummary(token) }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.posHeldSales(token, activeSessionQuery.data?.id ?? null),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.posDraftSales(token, activeSessionQuery.data?.id ?? null),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posTables(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posWaiterOrders(token) }),
    ]);
  };

  const openSessionMutation = useMutation({
    mutationFn: (payload: {
      warehouseId: string;
      cashAccountId: string;
      terminalName?: string;
      branchName?: string;
      openingCash: number;
    }) => openPosSession(payload, token),
    onSuccess: async (session) => {
      setSelectedWarehouseId(session.warehouse.id);
      await refreshPosData();
      pushMessage(t("pos.sales.alert.sessionOpened"));
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const closeSessionMutation = useMutation({
    mutationFn: (payload: { sessionId: string; actualCash: number; notes?: string }) =>
      closePosSession(
        payload.sessionId,
        { actualCash: payload.actualCash, notes: payload.notes },
        token,
      ),
    onSuccess: async ({ session, report }) => {
      setLastSessionReport(report);
      setIsCashierCloseModalOpen(false);
      setActualCashCount("");
      setClosingNotes("");
      await refreshPosData();
      pushMessage(t("pos.sales.alert.sessionMarkedClosed"));
      try {
        await printPosSessionRollReport(session.id, "SESSION_ROLL_REPORT", token);
      } catch {
        // Non-critical — proceed with client-side print even if audit call fails
      }
      printSessionRoll({
        session,
        report,
        printedBy: user?.name || user?.username || "—",
        printType: "SESSION_ROLL_REPORT",
      }).catch((err) => {
        console.error("Failed to print session roll:", err);
        pushMessage(t("pos.sales.alert.printBlocked"));
      });
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: (payload: Parameters<typeof savePosDraft>[0]) =>
      savePosDraft(payload, token),
    onSuccess: async () => {
      setEditingInvoiceId(null);
      resetSale();
      await refreshPosData();
      pushMessage("POS draft saved.");
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const runKitchenUpdatePrints = async (
    sale: PosSale,
    snapshotBefore: KitchenLineSnapshot[],
  ) => {
    const config = loadPosPrinterConfig();
    if (!config.autoPrintKotOnSend) {
      return;
    }
    kitchenHubActionsRef.current.markKitchenLinesFromCart(
      sale.id,
      sale.lines.map((line) => ({
        salesInvoiceLineId: line.id,
        kitchenSentAt: line.kitchenSentAt ?? null,
      })),
    );
    kitchenHubActionsRef.current.markKitchenOrderItemsPrintedForSale(sale.id);
    try {
      await applyPosKitchenUpdatePrints({
        snapshotBefore,
        sale,
        autoPrintKot: true,
        language,
      });
      try {
        const orders = await queryClient.fetchQuery({
          queryKey: queryKeys.posKitchenOrders(token),
          queryFn: () => getPosKitchenOrders(token),
        });
        const order = orders.find((row) => row.salesInvoiceId === sale.id);
        if (order) {
          kitchenHubActionsRef.current.markKitchenOrderItemsPrinted(
            order.items.map((item) => item.id),
          );
        } else {
          kitchenHubActionsRef.current.markKitchenOrderItemsPrintedForSale(sale.id);
        }
      } catch {
        kitchenHubActionsRef.current.markKitchenOrderItemsPrintedForSale(sale.id);
      }
    } catch (err) {
      console.error("Failed to print kitchen ticket:", err);
      pushError(getErrorMessage(err, t("pos.sales.alert.printBlocked")));
    }
  };

  const sendKitchenMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession?.id) {
        throw new Error("POS session must be open.");
      }
      if (cartLines.length === 0) {
        throw new Error("Cart is empty.");
      }
      const saved = await savePosDraft(
        {
          sessionId: activeSession.id,
          invoiceId: editingInvoiceId ?? undefined,
          customerId: selectedCustomerId || undefined,
          description: orderNotes.trim() || undefined,
          ...buildRestaurantPayload(),
          lines: buildSaleLinesPayload(),
          reservationId: activeReservationId ?? undefined,
        },
        token,
      );
      setEditingInvoiceId(saved.id);
      return sendPosSaleToKitchen(saved.id, token);
    },
    onSuccess: async (sale) => {
      const mapped = mapPosSaleToHeldSale(sale);
      hadKitchenTicketRef.current = mapped.cartLines.some((line) => line.kitchenSentAt);
      await refreshPosData();
      pushMessage(
        getLocalizedText(
          waiterMode
            ? "Order sent to kitchen successfully. / تم إرسال الطلب إلى المطبخ بنجاح."
            : "Sent to kitchen / تم الإرسال للمطبخ",
          language,
        ),
      );
      if (!waiterMode) {
        const snapshotBefore = lastSyncedKitchenSnapshotRef.current;
        await runKitchenUpdatePrints(sale, snapshotBefore);
        lastSyncedKitchenSnapshotRef.current = captureKitchenLineSnapshotFromSale(sale);
      }
      // Auto-start a new order so the cashier is ready for the next customer
      resetSaleRef.current();
      if (waiterMode) {
        router.push("/pos/waiter/tables");
      }
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const updateKitchenMutation = useMutation({
    mutationFn: async (_options?: { silent?: boolean }) => {
      if (!activeSession?.id) {
        throw new Error("POS session must be open.");
      }
      let invoiceId = editingInvoiceId;
      if (!invoiceId && orderType === "DINE_IN" && selectedTableId) {
        const table = restaurantTables.find((entry) => entry.id === selectedTableId);
        invoiceId = table?.activeInvoice?.id ?? null;
      }
      if (!invoiceId) {
        throw new Error(
          getLocalizedText(
            "Open the table order first, then update the kitchen / افتح طلب الطاولة أولاً",
            language,
          ),
        );
      }
      return updatePosSaleKitchen(
        {
          sessionId: activeSession.id,
          invoiceId,
          customerId: selectedCustomerId || undefined,
          description: orderNotes.trim() || undefined,
          ...buildRestaurantPayload(),
          lines: buildSaleLinesPayload(),
          reservationId: activeReservationId ?? undefined,
        },
        token,
      );
    },
    onSuccess: async (sale, variables) => {
      const mapped = mapPosSaleToHeldSale(sale);
      setEditingInvoiceId(sale.id);
      hadKitchenTicketRef.current =
        mapped.cartLines.some((line) => line.kitchenSentAt) || hadKitchenTicketRef.current;
      setCartLines((previous) => {
        const merged = mergeCartLinesPreservingPortions(previous, mapped.cartLines);
        lastKitchenSyncFingerprintRef.current = buildCartKitchenFingerprint(
          merged.map((line) => ({
            salesInvoiceLineId: line.salesInvoiceLineId,
            itemId: line.itemId,
            quantity: getCartLineInventoryQuantity(line),
            kitchenSentAt: line.kitchenSentAt,
          })),
        );
        return merged;
      });
      setSelectedTableId(mapped.tableId ?? null);
      setSelectedTableNumber(mapped.tableNumber ?? null);
      setSelectedWaiterId(mapped.waiterId ?? null);
      await refreshPosData();
      await queryClient.refetchQueries({ queryKey: queryKeys.posWaiterOrders(token) });
      if (!variables?.silent) {
        pushMessage(
          getLocalizedText(
            "Kitchen updated / تم تحديث المطبخ",
            language,
          ),
        );
      }
      const after = captureKitchenLineSnapshotFromSale(sale);
      if (!waiterMode) {
        const snapshotBefore = lastSyncedKitchenSnapshotRef.current;
        const diff = diffKitchenSnapshots(snapshotBefore, after);
        if (!variables?.silent || hasKitchenPrintDiff(diff)) {
          await runKitchenUpdatePrints(sale, snapshotBefore);
        }
      }
      lastSyncedKitchenSnapshotRef.current = after;
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const holdSaleMutation = useMutation({
    mutationFn: (payload: Parameters<typeof holdPosSale>[0]) =>
      holdPosSale(payload, token),
    onSuccess: async (sale, variables) => {
      setEditingInvoiceId(null);
      resetSale();
      setActiveReservationId(null);
      await refreshPosData();
      const heldAt = new Date(sale.updatedAt).toLocaleString();
      pushMessage(
        getLocalizedText(
          `Sale held until you resume it (${heldAt}) / تم تعليق البيع حتى الاستئناف (${heldAt})`,
          language,
        ),
      );
      if (variables.reservationId) {
        router.push(waiterMode ? "/pos/waiter/tables" : "/pos/tables");
      }
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const completeSaleMutation = useMutation({
    mutationFn: (payload: Parameters<typeof completePosSale>[0]) =>
      completePosSale(payload, token),
    onSuccess: async (response) => {
      // Capture reservation context before reset
      const wasPreOrder = Boolean(activeReservationId);
      const tableIdForHandoff = wasPreOrder ? selectedTableId : null;
      const hadKitchenTicketBeforeReset = hadKitchenTicketRef.current;
      const snapshotBefore = captureKitchenLineSnapshotFromCart(
        mapCartLinesForKitchenSnapshot(cartLines),
      );
      const receipt = mapReceiptResponse(response.receipt);
      setLastReceipt(receipt);
      setPayFlowStep("success");
      if (wasPreOrder && tableIdForHandoff) {
        setPreOrderCompletedTableId(tableIdForHandoff);
      }
      if (hadKitchenTicketBeforeReset && response.sale?.id) {
        kitchenHubActionsRef.current.markKitchenInvoiceFullyPrinted(response.sale.id);
        kitchenHubActionsRef.current.markKitchenLinesFromCart(
          response.sale.id,
          response.sale.lines.map((line) => ({
            salesInvoiceLineId: line.id,
            kitchenSentAt: line.kitchenSentAt ?? null,
          })),
        );
        kitchenHubActionsRef.current.markKitchenOrderItemsPrintedForSale(response.sale.id);
      }
      // Clear the cart immediately so returning to register starts fresh
      resetSaleRef.current();
      await refreshPosData();
      pushMessage(t("pos.sales.alert.saleCompleted"));

      const printerConfig = loadPosPrinterConfig();
      const shouldPrintKitchenOnPay =
        printerConfig.autoPrintKotOnSend &&
        !hadKitchenTicketBeforeReset &&
        response.sale &&
        (response.sale.orderType === "TAKEAWAY" || response.sale.orderType === "DINE_IN");

      if ((printerConfig.autoPrintReceiptOnPay || shouldPrintKitchenOnPay) && response.sale) {
        try {
          const printResults = await applyPosPayCompletePrints({
            snapshotBefore,
            sale: response.sale,
            receipt,
            autoPrintKot: shouldPrintKitchenOnPay,
            autoPrintReceipt: printerConfig.autoPrintReceiptOnPay,
            language,
          });
          if (shouldPrintKitchenOnPay && printResults.kitchen.length > 0) {
            kitchenHubActionsRef.current.markKitchenInvoiceFullyPrinted(response.sale.id);
            kitchenHubActionsRef.current.markKitchenLinesFromCart(
              response.sale.id,
              response.sale.lines.map((line) => ({
                salesInvoiceLineId: line.id,
                kitchenSentAt: line.kitchenSentAt ?? null,
              })),
            );
            kitchenHubActionsRef.current.markKitchenOrderItemsPrintedForSale(response.sale.id);
          }
          if (printResults.kitchen.some((result) => result.fallback)) {
            pushMessage(
              getLocalizedText(
                "Kitchen printer bridge unavailable; opened browser print / تعذر الاتصال بطابعة المطبخ، تم فتح طباعة المتصفح",
                language,
              ),
            );
          }
        } catch (err) {
          console.error("Failed to print at sale completion:", err);
          pushMessage(t("pos.sales.alert.printBlocked"));
        }
      }
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const approveReviewMutation = useMutation({
    mutationFn: (saleId: string) => approvePosAccounting(saleId, {}, token),
    onSuccess: async () => {
      await refreshPosData();
      pushMessage(t("pos.review.alert.approved"));
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const approveSessionReviewMutation = useMutation({
    mutationFn: ({
      sessionId,
      decision,
      reason,
    }: {
      sessionId: string;
      decision?: string;
      reason?: string;
    }) => approvePosSessionAccounting(sessionId, { decision, reason }, token),
    onSuccess: async (response) => {
      await refreshPosData();
      if (response.approvedCount === 0 && response.differenceStatus === "ACCEPTED_DIFFERENCE") {
        pushMessage(
          t("pos.review.alert.differenceAccepted", {
            sessionNumber: response.sessionNumber,
          }),
        );
        return;
      }
      pushMessage(
        t("pos.review.alert.sessionApproved", {
          count: response.approvedCount,
          sessionNumber: response.sessionNumber,
        }),
      );
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const rejectSessionReviewMutation = useMutation({
    mutationFn: (sessionId: string) =>
      rejectPosSessionAccounting(sessionId, {}, token),
    onSuccess: async (response) => {
      await refreshPosData();
      pushMessage(
        t("pos.review.alert.sessionRejected", {
          count: response.rejectedCount,
          sessionNumber: response.sessionNumber,
        }),
      );
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const rejectReviewMutation = useMutation({
    mutationFn: (saleId: string) => rejectPosAccounting(saleId, {}, token),
    onSuccess: async () => {
      await refreshPosData();
      pushMessage(t("pos.review.alert.rejected"));
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const reverseReviewMutation = useMutation({
    mutationFn: (saleId: string) =>
      reversePosAccounting(
        saleId,
        { description: "POS accounting reversal requested from review workspace." },
        token,
      ),
    onSuccess: async () => {
      await refreshPosData();
      pushMessage(t("pos.review.alert.reversed"));
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const voidSaleMutation = useMutation({
    mutationFn: (saleId: string) => voidPosSale(saleId, {}, token),
    onSuccess: async () => {
      await refreshPosData();
      pushMessage(
        getLocalizedText("Held or draft sale was cancelled / تم إلغاء البيع المعلق أو المسودة", language),
      );
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const createReturnMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createPosReturn>[0]) =>
      createPosReturn(payload, token),
    onSuccess: async () => {
      setSelectedReturnSaleId("");
      setReturnReason("");
      setReturnQuantities({});
      setReturnPayments([]);
      await refreshPosData();
      pushMessage("POS return created and sent for accounting review.");
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const approveReturnMutation = useMutation({
    mutationFn: (returnId: string) => approvePosReturnAccounting(returnId, {}, token),
    onSuccess: async () => {
      await refreshPosData();
      pushMessage("POS return approved and posted.");
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const rejectReturnMutation = useMutation({
    mutationFn: (returnId: string) => rejectPosReturnAccounting(returnId, {}, token),
    onSuccess: async () => {
      await refreshPosData();
      pushMessage("POS return marked as rejected.");
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const reverseReturnMutation = useMutation({
    mutationFn: (returnId: string) =>
      reversePosReturnAccounting(
        returnId,
        { description: "POS return accounting reversal requested from returns workspace." },
        token,
      ),
    onSuccess: async () => {
      await refreshPosData();
      pushMessage("POS return accounting reversal has been created.");
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const reprintReceiptMutation = useMutation({
    mutationFn: (saleId: string) => reprintPosReceipt(saleId, token),
    onSuccess: (response) => {
      const receipt = mapReceiptResponse(response.receipt);
      setLastReceipt(receipt);
      printReceipt(receipt);
    },
    onError: (error) => {
      pushMessage(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const printBillMutation = useMutation({
    mutationFn: (saleId: string) => printPosBill(saleId, token),
    onSuccess: (response) => {
      const receipt = mapReceiptResponse(response.receipt);
      printReceipt(receipt);
    },
    onError: (error) => {
      pushMessage(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const transferTableMutation = useMutation({
    mutationFn: (payload: { fromTableId: string; toTableId: string }) =>
      transferPosTable(payload.fromTableId, payload.toTableId, token),
    onSuccess: async () => {
      await refreshPosData();
      setIsTransferTableOpen(false);
      pushMessage("Table transferred successfully.");
    },
    onError: (error) => {
      pushError(getErrorMessage(error, "Failed to transfer table."));
    },
  });

  const mergeTablesMutation = useMutation({
    mutationFn: (payload: { sourceTableIds: string[]; targetTableId: string }) =>
      mergePosTables(payload.sourceTableIds, payload.targetTableId, token),
    onSuccess: async () => {
      await refreshPosData();
      setIsMergeTablesOpen(false);
      pushMessage("Tables merged successfully.");
    },
    onError: (error) => {
      pushError(getErrorMessage(error, "Failed to merge tables."));
    },
  });

  const splitBillMutation = useMutation({
    mutationFn: (payload: { tableId: string; lines: { itemId: string; quantity: number }[] }) =>
      splitPosTable(payload.tableId, payload.lines, token),
    onSuccess: async () => {
      await refreshPosData();
      setIsSplitBillOpen(false);
      pushMessage("Bill split created successfully.");
    },
    onError: (error) => {
      pushError(getErrorMessage(error, "Failed to split bill."));
    },
  });

  const correctOrderTypeMutation = useMutation({
    mutationFn: (payload: { saleId: string; data: Parameters<typeof correctPosOrderType>[1] }) =>
      correctPosOrderType(payload.saleId, payload.data, token),
    onSuccess: async () => {
      await refreshPosData();
      setIsCorrectOrderTypeOpen(false);
      setSelectedCorrectionSale(null);
      pushMessage("Order type correction saved.");
    },
    onError: (error) => {
      pushError(getErrorMessage(error, "Failed to correct order type."));
    },
  });

  const correctPaymentMethodMutation = useMutation({
    mutationFn: (payload: { saleId: string; data: Parameters<typeof correctPosPaymentMethod>[1] }) =>
      correctPosPaymentMethod(payload.saleId, payload.data, token),
    onSuccess: async () => {
      await refreshPosData();
      setIsCorrectPaymentMethodOpen(false);
      setSelectedPaymentCorrectionSale(null);
      pushMessage("Payment method correction saved.");
    },
    onError: (error) => {
      pushError(getErrorMessage(error, "Failed to correct payment method."));
    },
  });

  const assignDriverMutation = useMutation({
    mutationFn: (payload: { saleId: string; driverId: string | null }) =>
      assignDriver(payload.saleId, payload.driverId, token),
    onSuccess: async () => {
      await refreshPosData();
      pushMessage("Driver assignment updated.");
    },
    onError: (error) => {
      pushError(getErrorMessage(error, "Failed to assign driver."));
    },
  });

  const updateDeliveryStatusMutation = useMutation({
    mutationFn: (payload: { saleId: string; status: DeliveryStatus }) =>
      updateDeliveryStatus(payload.saleId, payload.status, token),
    onSuccess: async () => {
      await refreshPosData();
      pushMessage("Delivery status updated.");
    },
    onError: (error) => {
      pushError(getErrorMessage(error, "Failed to update delivery status."));
    },
  });

  const items = itemsQuery.data?.data ?? [];
  const addonCatalogByItemId = useMemo(
    () =>
      new Map(
        (addonCatalogQuery.data?.items ?? []).map((itemConfig) => [
          itemConfig.itemId,
          itemConfig,
        ]),
      ),
    [addonCatalogQuery.data],
  );
  const warehouses = warehousesQuery.data ?? [];
  const paymentAccounts = paymentAccountsQuery.data ?? [];
  const activeSession = activeSessionQuery.data;
  const posSettings = settingsQuery.data;
  const customers: Customer[] = customersQuery.data ?? [];
  const taxTreatments: TaxTreatment[] = activeTaxTreatmentsQuery.data ?? [];
  const restaurantTables: PosTable[] = posTablesQuery.data ?? [];
  const deliveryCompanies: DeliveryCompany[] = deliveryCompaniesQuery.data ?? [];
  const deliveryDrivers: DeliveryDriver[] = deliveryDriversQuery.data ?? [];
  const waiters: PosWaiter[] = waitersQuery.data ?? [];
  const selectedCustomer = customers.find((c: Customer) => c.id === selectedCustomerId) || null;
  const taxPolicy = posSettings?.runtime.invoiceDiscountTaxPolicy ?? "BEFORE_TAX";
  const completedSales = completedSalesQuery.data ?? [];
  const sessionRecentSales = useMemo(() => {
    if (!activeSession?.id) {
      return [];
    }
    return completedSales
      .filter((sale) => sale.session?.id === activeSession.id)
      .slice(0, 12);
  }, [activeSession?.id, completedSales]);
  const favoriteIdSet = useMemo(() => new Set(favoriteItemIds), [favoriteItemIds]);
  useEffect(() => {
    if (!deliveryDriverId) {
      return;
    }
    const driver = deliveryDrivers.find((row) => row.id === deliveryDriverId);
    if (driver?.name) {
      setSelectedDeliveryDriverName(driver.name);
    }
    if (driver?.phone) {
      setSelectedDeliveryDriverPhone(driver.phone);
    }
  }, [deliveryDriverId, deliveryDrivers]);
  const reviewSessionGroups = useMemo(
    () =>
      Array.from(
        (reviewQuery.data ?? []).reduce((groups, sale) => {
          const key = sale.session?.id ?? `unassigned-${sale.id}`;
          const current = groups.get(key) ?? {
            sessionId: sale.session?.id ?? null,
            sessionNumber: sale.session?.sessionNumber ?? "Unassigned Session",
            warehouseName: sale.session?.warehouse.name ?? "—",
            sales: [] as PosSale[],
          };
          current.sales.push(sale);
          groups.set(key, current);
          return groups;
        }, new Map<string, { sessionId: string | null; sessionNumber: string; warehouseName: string; sales: PosSale[] }>()),
      ).map(([, value]) => value),
    [reviewQuery.data],
  );
  const selectedReviewGroup =
    reviewSessionGroups.find((group) => group.sessionId === reviewSessionId) ??
    reviewSessionGroups[0] ??
    null;
  const availableWorkspaceTabs = useMemo(() => {
    if (waiterMode) {
      return workspaceTabs.filter((tab) => tab.id === "sales");
    }
    const visible = workspaceTabs.filter((tab) => {
      if (tab.id === "sales") return hasPermission(user, "POS_VIEW_POS_SCREEN");
      if (tab.id === "sessions") {
        return (
          hasPermission(user, "POS_VIEW_OWN_SESSION_REPORT") ||
          hasPermission(user, "POS_VIEW_SESSION_REPORT")
        );
      }
      if (tab.id === "held") return hasPermission(user, "POS_RESUME_OWN_HELD_SALE");
      if (tab.id === "review") return hasPermission(user, "POS_VIEW_PENDING_ACCOUNTING");
      if (tab.id === "delivery") {
        return (
          hasPermission(user, "POS_VIEW_POS_SCREEN") ||
          hasPermission(user, "RST_CREATE_DELIVERY_ORDER") ||
          hasPermission(user, "RST_ASSIGN_DRIVER")
        );
      }
      if (tab.id === "returns") {
        return isCashierPosUser(user) && hasPermission(user, "POS_VIEW_COMPLETED_SALES");
      }
      if (tab.id === "reports") return hasPermission(user, "POS_VIEW_POS_REPORTS");
      if (tab.id === "printers") {
        return (
          hasPermission(user, "POS_VIEW_POS_SCREEN") ||
          hasPermission(user, "POS_PRINT_RECEIPT")
        );
      }
      if (tab.id === "settings") return hasPermission(user, "POS_VIEW_POS_REPORTS");
      return false;
    });

    if (visible.length) {
      return visible;
    }
    return workspaceTabs.filter((tab) => tab.id === "sales");
  }, [user]);
  const requestedWorkspace = resolvePosWorkspace(pathname, searchParams.get("tab"));
  const resumeSaleId = searchParams.get("resume");
  const urlTableId = searchParams.get("tableId");
  const urlReservationId = searchParams.get("reservationId");
  const fallbackWorkspace = availableWorkspaceTabs[0]?.id ?? "sales";

  useEffect(() => {
    if (workspace !== "sales" || !urlTableId || !activeSession?.id) {
      if (!urlTableId) {
        resumedTableIdRef.current = null;
      }
      return;
    }
    if (resumeSaleId) {
      return;
    }
    if (!heldSalesQuery.isSuccess || !draftSalesQuery.isSuccess) {
      return;
    }

    const openSales = mapOpenPosSalesFromApi(
      draftSalesQuery.data,
      heldSalesQuery.data,
    );
    const table = restaurantTables.find((entry) => entry.id === urlTableId);
    const targetSale = findOpenSaleForTable(
      openSales,
      urlTableId,
      table?.activeInvoice?.id,
    );
    const resumeKey = targetSale?.id ?? `new:${urlTableId}`;
    if (resumedTableIdRef.current === resumeKey) {
      return;
    }
    resumedTableIdRef.current = resumeKey;

    if (targetSale) {
      setOrderType("DINE_IN");
      resumeHeldSale(targetSale.id, openSales);
    } else {
      resetSale();
      // MUST set table details AFTER resetSale because resetSale clears them
      setOrderType("DINE_IN");
      setSelectedTableId(urlTableId);
      setSelectedTableNumber(table?.tableNumber ?? null);
      if (table?.assignedWaiter) {
        setSelectedWaiterId(table.assignedWaiter.id);
      } else {
        setSelectedWaiterId(null);
      }
    }

    startRoutingTransition(() => {
      router.replace(waiterMode ? "/pos/waiter/order" : "/pos/register", { scroll: false });
    });
  }, [
    workspace,
    urlTableId,
    resumeSaleId,
    activeSession?.id,
    restaurantTables,
    heldSalesQuery.data,
    heldSalesQuery.isSuccess,
    draftSalesQuery.data,
    draftSalesQuery.isSuccess,
  ]);

  useEffect(() => {
    if (!requestedWorkspace) {
      startRoutingTransition(() => {
        router.replace(workspaceHref(fallbackWorkspace, waiterMode));
      });
      return;
    }
    if (!availableWorkspaceTabs.some((tab) => tab.id === requestedWorkspace)) {
      startRoutingTransition(() => {
        router.replace(workspaceHref(fallbackWorkspace, waiterMode));
      });
      return;
    }
    if (workspace === requestedWorkspace) {
      return;
    }
    if (workspace === "sales") {
      void autoSaveCurrentTableOrderIfAny();
    }
    setWorkspace(requestedWorkspace);
  }, [availableWorkspaceTabs, fallbackWorkspace, requestedWorkspace, router, workspace]);

  useEffect(() => {
    if (workspace !== "sales" || !resumeSaleId) {
      if (!resumeSaleId) {
        resumedSaleRef.current = null;
      }
      return;
    }
    if (!heldSalesQuery.isSuccess || !draftSalesQuery.isSuccess) {
      return;
    }

    if (resumedSaleRef.current === resumeSaleId) {
      return;
    }

    const openSales = mapOpenPosSalesFromApi(
      draftSalesQuery.data,
      heldSalesQuery.data,
    );
    const stashedSale = consumeStashedHeldSale(resumeSaleId);
    const target =
      openSales.find((row) => row.id === resumeSaleId) ?? stashedSale;
    if (!target) {
      return;
    }

    resumedSaleRef.current = resumeSaleId;
    resumeHeldSale(
      resumeSaleId,
      stashedSale ? [stashedSale, ...openSales] : openSales,
    );
    if (urlReservationId) {
      setActiveReservationId(urlReservationId);
    }
    if (urlTableId) {
      resumedTableIdRef.current = target.id;
    }
    startRoutingTransition(() => {
      router.replace(waiterMode ? "/pos/waiter/order" : "/pos/register", { scroll: false });
    });
  }, [
    draftSalesQuery.data,
    draftSalesQuery.isSuccess,
    heldSalesQuery.data,
    heldSalesQuery.isSuccess,
    resumeSaleId,
    urlReservationId,
    urlTableId,
    router,
    workspace,
  ]);

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setSessionState(
      activeSession
        ? {
          isOpen: true,
          terminalName: activeSession.terminalName,
          branchName: activeSession.branchName ?? "",
          openingCash: activeSession.openingCash,
          openedAt: activeSession.openedAt,
          warehouseId: activeSession.warehouse.id,
          cashAccountId: activeSession.cashAccount.id,
          expectedCash: parseAmount(activeSession.expectedCash),
          completedSales: 0,
        }
        : {
          isOpen: false,
          terminalName: sessionState.terminalName || "الجهاز رقم 01",
          branchName: sessionState.branchName || "",
          openingCash: "",
          expectedCash: 0,
          completedSales: 0,
        },
    );
  }, [activeSession]);

  useEffect(() => {
    setHeldSales((heldSalesQuery.data ?? []).map(mapPosSaleToHeldSale));
  }, [heldSalesQuery.data]);

  useEffect(() => {
    setDraftSales((draftSalesQuery.data ?? []).map(mapPosSaleToHeldSale));
  }, [draftSalesQuery.data]);

  useEffect(() => {
    if (!reviewSessionId && reviewSessionGroups.length > 0) {
      setReviewSessionId(reviewSessionGroups[0].sessionId ?? "");
    }
  }, [reviewSessionGroups, reviewSessionId]);

  useEffect(() => {
    const previousOrderType = prevOrderTypeRef.current;
    if (previousOrderType === orderType) {
      return;
    }
    prevOrderTypeRef.current = orderType;

    if (previousOrderType === "DINE_IN" && orderType !== "DINE_IN") {
      setSelectedTableId(null);
      setSelectedTableNumber(null);
      if (orderType === "TAKEAWAY") {
        setSelectedWaiterId(null);
      }
    }
    if (previousOrderType === "DELIVERY" && orderType !== "DELIVERY") {
      setDeliveryCompanyId(null);
      setDeliveryCollectionMethod("RESTAURANT");
      setDeliveryDriverId(null);
      setSelectedDeliveryDriverName(null);
      setSelectedDeliveryDriverPhone(null);
      setDeliveryMode("THIRD_PARTY");
      setDeliveryAddress("");
      setDeliveryNotes("");
      setDeliveryFee(0);
    }
  }, [orderType]);

  useEffect(() => {
    const ids = favoritesQuery.data?.itemIds;
    if (ids) {
      setFavoriteItemIds(ids);
    }
  }, [favoritesQuery.data?.itemIds]);

  useEffect(() => {
    setProductPage(1);
  }, [deferredSearch, selectedWarehouseId]);

  useEffect(() => {
    if (workspace !== "sales" || !sessionState.isOpen || !activeSession?.id) {
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeSession?.id, sessionState.isOpen, workspace]);

  useEffect(() => {
    if (!selectedSessionReportId && posSessionsQuery.data?.length) {
      setSelectedSessionReportId(activeSession?.id ?? posSessionsQuery.data[0].id);
    }
  }, [activeSession?.id, posSessionsQuery.data, selectedSessionReportId]);

  useEffect(() => {
    if (!selectedWarehouseId && warehouses.length > 0) {
      const fallbackWarehouseId =
        sessionState.warehouseId && warehouses.some((row) => row.id === sessionState.warehouseId)
          ? sessionState.warehouseId
          : warehouses[0].id;
      setSelectedWarehouseId(fallbackWarehouseId);
    }
  }, [selectedWarehouseId, sessionState.warehouseId, warehouses]);



  useEffect(() => {
    if (!selectedReturnSaleId && completedSales.length > 0) {
      setSelectedReturnSaleId(completedSales[0].id);
    }
  }, [completedSales, selectedReturnSaleId]);

  useEffect(() => {
    setReturnQuantities({});
    setReturnReason("");
  }, [selectedReturnSaleId]);

  useEffect(() => {
    if (returnPayments.length === 0 && paymentAccounts.length > 0) {
      const defaultCash =
        paymentAccounts.find((account) =>
          account.type.toUpperCase().includes("CASH"),
        ) ?? paymentAccounts[0];
      setReturnPayments([
        {
          id: createLocalId(),
          refundMethod: "CASH",
          bankCashAccountId: defaultCash.id,
          amount: "",
          reference: "",
        },
      ]);
    }
  }, [paymentAccounts, returnPayments.length]);

  useEffect(() => {
    if (!items.length) {
      return;
    }
    setCartLines((current) =>
      current.map((line) => {
        const item = items.find((row) => row.id === line.itemId);
        if (!item) {
          return line;
        }
        const fallbackWarehouseId =
          item.trackInventory
            ? line.warehouseId || item.preferredWarehouseId || selectedWarehouseId || null
            : null;

        return {
          ...line,
          name: item.name,
          code: item.code,
          barcode: item.barcode,
          unit: item.unitOfMeasure,
          itemType: item.type,
          taxRate: parseAmount(item.defaultTax?.rate),
          trackInventory: item.trackInventory,
          unitCost: parseAmount(item.defaultPurchasePrice),
          averageCost: parseAmount(item.defaultPurchasePrice),
          salesAccountId: item.salesAccount?.id ?? line.salesAccountId,
          inventoryAccountId: item.inventoryAccount?.id ?? line.inventoryAccountId,
          cogsAccountId: item.cogsAccount?.id ?? line.cogsAccountId,
          warehouseId: fallbackWarehouseId,
          onHandQuantity: parseAmount(item.onHandQuantity),
        };
      }),
    );
  }, [items, selectedWarehouseId]);

  const filteredItems = useMemo(() => {
    if (activeCategory === "favorites") {
      return items.filter((item) => favoriteIdSet.has(item.id));
    }
    return items;
  }, [activeCategory, favoriteIdSet, items]);

  const selectedWarehouse =
    warehouses.find((warehouse) => warehouse.id === selectedWarehouseId) ?? null;

  const cartTotal = useMemo(() => {
    const serviceCharge = orderType === "DINE_IN" ? serviceChargeAmount : 0;
    const deliveryCharge = orderType === "DELIVERY" ? deliveryFee : 0;
    const taxableBase = Number(
      cartLines.reduce((sum, line) => sum + getLineNetBeforeInvoiceDiscount(line), 0).toFixed(2)
    );
    const isTaxFree = Boolean(posSettings?.runtime.taxFreeEnabled);
    const invoiceDiscount = Number(
      getInvoiceDiscountAmount(
        invoiceDiscountType,
        invoiceDiscountValue,
        taxPolicy === "AFTER_TAX"
          ? taxableBase +
          cartLines.reduce(
            (sum, line) => sum + getLineTaxAmount(line, 0, "AFTER_TAX", isTaxFree),
            0,
          )
          : taxableBase,
      ).toFixed(2)
    );
    const taxRaw = cartLines.reduce((sum, line) => {
      const lineBase = getLineNetBeforeInvoiceDiscount(line);
      if (taxPolicy === "AFTER_TAX") {
        return sum + getLineTaxAmount(line, 0, taxPolicy, isTaxFree);
      }
      if (taxableBase <= 0) return sum;
      const invoiceShare = invoiceDiscount * (lineBase / taxableBase);
      return sum + getLineTaxAmount(line, invoiceShare, taxPolicy, isTaxFree);
    }, 0);
    const tax = Number(taxRaw.toFixed(2));
    const totalRaw =
      taxPolicy === "AFTER_TAX"
        ? Math.max(taxableBase + tax - invoiceDiscount, 0)
        : Math.max(taxableBase - invoiceDiscount, 0) + tax;
    return Number((totalRaw + serviceCharge + deliveryCharge).toFixed(2));
  }, [
    orderType,
    serviceChargeAmount,
    deliveryFee,
    cartLines,
    posSettings?.runtime.taxFreeEnabled,
    invoiceDiscountType,
    invoiceDiscountValue,
    taxPolicy,
  ]);

  const paymentEntriesResolved = useMemo(
    () =>
      paymentEntries.map((entry) => {
        const isSingle = paymentEntries.length === 1;
        const amountValue = (isSingle && !entry.amount.trim())
          ? cartTotal
          : parseAmount(entry.amount);
        return {
          ...entry,
          account:
            paymentAccounts.find(
              (account) => account.id === entry.bankCashAccountId,
            ) ?? null,
          amountValue,
        };
      }),
    [paymentAccounts, paymentEntries, cartTotal],
  );

  const resolveMappedBankCashAccountId = (
    method: "CASH" | "CARD" | "CLIQ" | "BANK_TRANSFER" | "WALLET",
  ) => {
    if (method === "CASH" && activeSession?.cashAccount?.id) {
      return activeSession.cashAccount.id;
    }

    const mappedAccountId =
      method === "CASH"
        ? posSettings?.accounts.cashAccountId
        : method === "CARD"
          ? posSettings?.accounts.cardAccountId
          : method === "CLIQ"
            ? posSettings?.accounts.cliqAccountId
            : method === "WALLET"
              ? posSettings?.accounts.walletAccountId
              : posSettings?.accounts.bankTransferAccountId;

    if (!mappedAccountId) {
      return "";
    }

    return (
      paymentAccounts.find((account) => account.account.id === mappedAccountId)?.id ?? ""
    );
  };

  useEffect(() => {
    if (orderType === "DELIVERY" && deliveryMode === "THIRD_PARTY") {
      if (deliveryCollectionMethod !== "COMPANY") {
        setDeliveryCollectionMethod("COMPANY");
      }
    }
  }, [orderType, deliveryMode, deliveryCollectionMethod]);

  useEffect(() => {
    const companyCollectedByDelivery =
      orderType === "DELIVERY" &&
      deliveryMode === "THIRD_PARTY" &&
      deliveryCollectionMethod === "COMPANY";
    if (companyCollectedByDelivery) {
      if (paymentEntries.length > 0) {
        setPaymentEntries([]);
      }
      return;
    }
    if (paymentEntries.length === 0 && paymentAccounts.length > 0) {
      setPaymentEntries([
        {
          id: createLocalId(),
          paymentMethod: "CASH",
          bankCashAccountId: resolveMappedBankCashAccountId("CASH"),
          amount: "",
          reference: "",
        },
      ]);
    }
  }, [
    deliveryCollectionMethod,
    deliveryMode,
    orderType,
    paymentEntries.length,
    paymentAccounts,
    activeSession?.cashAccount?.id,
    posSettings?.accounts.cashAccountId,
  ]);

  const inferSelectedPayMethod = () => {
    if (paymentEntriesResolved.length > 1) {
      return "MIXED" as const;
    }
    const firstEntry = paymentEntriesResolved[0];
    if (!firstEntry) {
      return "CASH" as const;
    }
    return firstEntry.paymentMethod;
  };

  const currencyCode =
    paymentEntriesResolved.find((entry) => entry.account)?.account?.currencyCode ||
    items[0]?.currencyCode ||
    "JOD";

  const cartMetrics = useMemo(() => {
    const serviceCharge = orderType === "DINE_IN" ? serviceChargeAmount : 0;
    const deliveryCharge = orderType === "DELIVERY" ? deliveryFee : 0;
    const subtotalBeforeDiscount = Number(
      cartLines.reduce((sum, line) => sum + getLineBase(line), 0).toFixed(2)
    );
    const lineDiscountTotal = Number(
      cartLines.reduce((sum, line) => sum + getLineDiscountAmount(line), 0).toFixed(2)
    );
    const taxableBase = Number(
      cartLines.reduce((sum, line) => sum + getLineNetBeforeInvoiceDiscount(line), 0).toFixed(2)
    );
    const isTaxFree = Boolean(posSettings?.runtime.taxFreeEnabled);
    const invoiceDiscount = Number(
      getInvoiceDiscountAmount(
        invoiceDiscountType,
        invoiceDiscountValue,
        taxPolicy === "AFTER_TAX"
          ? taxableBase +
          cartLines.reduce(
            (sum, line) => sum + getLineTaxAmount(line, 0, "AFTER_TAX", isTaxFree),
            0,
          )
          : taxableBase,
      ).toFixed(2)
    );
    const taxRaw = cartLines.reduce((sum, line) => {
      const lineBase = getLineNetBeforeInvoiceDiscount(line);
      if (taxPolicy === "AFTER_TAX") {
        return sum + getLineTaxAmount(line, 0, taxPolicy, isTaxFree);
      }
      if (taxableBase <= 0) return sum;
      const invoiceShare = invoiceDiscount * (lineBase / taxableBase);
      return sum + getLineTaxAmount(line, invoiceShare, taxPolicy, isTaxFree);
    }, 0);
    const tax = Number(taxRaw.toFixed(2));
    const total = cartTotal;
    const tendered = Number(
      paymentEntriesResolved.reduce(
        (sum, entry) => sum + entry.amountValue,
        0,
      ).toFixed(2)
    );
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
      serviceCharge,
      deliveryCharge,
      total,
      tendered,
      paid,
      change,
      amountDue,
    };
  }, [
    cartLines,
    invoiceDiscountType,
    invoiceDiscountValue,
    paymentEntriesResolved,
    deliveryFee,
    orderType,
    serviceChargeAmount,
    taxPolicy,
    posSettings,
    cartTotal,
  ]);

  const activeEditingSale = useMemo(() => {
    if (!editingInvoiceId) return null;
    return (
      [...draftSales, ...heldSales].find((row) => row.id === editingInvoiceId) ?? null
    );
  }, [editingInvoiceId, draftSales, heldSales]);

  const waiterOnlyUser = isWaiterOnlyUser(user);
  const isWaiterOrderLocked = useMemo(
    () =>
      waiterOnlyUser &&
      orderType === "DINE_IN" &&
      Boolean(activeEditingSale?.waiterConfirmedAt),
    [waiterOnlyUser, orderType, activeEditingSale?.waiterConfirmedAt],
  );

  const selectedReturnSale =
    completedSales.find((sale) => sale.id === selectedReturnSaleId) ?? null;

  const returnPaymentEntriesResolved = useMemo(
    () =>
      returnPayments.map((entry) => ({
        ...entry,
        account:
          paymentAccounts.find((account) => account.id === entry.bankCashAccountId) ?? null,
        amountValue: parseAmount(entry.amount),
      })),
    [paymentAccounts, returnPayments],
  );

  const returnPreview = useMemo(() => {
    if (!selectedReturnSale) {
      return {
        totalAmount: 0,
        selectedLineCount: 0,
      };
    }
    return selectedReturnSale.lines.reduce(
      (summary, line) => {
        const quantity = parseAmount(returnQuantities[line.id]);
        if (quantity <= 0) {
          return summary;
        }
        const soldQuantity = parseAmount(line.quantity);
        const ratio = soldQuantity > 0 ? Math.min(quantity, soldQuantity) / soldQuantity : 0;
        summary.selectedLineCount += 1;
        summary.totalAmount += parseAmount(line.lineAmount) * ratio;
        return summary;
      },
      {
        totalAmount: 0,
        selectedLineCount: 0,
      },
    );
  }, [returnQuantities, selectedReturnSale]);

  const buildSaleLinesPayload = () => {
    const isTaxFree = Boolean(posSettings?.runtime.taxFreeEnabled);
    return cartLines.map((line) => {
      const netBeforeInvoiceDiscount = getLineNetBeforeInvoiceDiscount(line);
      const invoiceShare =
        cartMetrics.taxableBase > 0 && taxPolicy === "BEFORE_TAX"
          ? cartMetrics.invoiceDiscount *
          (netBeforeInvoiceDiscount / cartMetrics.taxableBase)
          : 0;
      const afterTaxShare =
        taxPolicy === "AFTER_TAX" && cartMetrics.total > 0
          ? cartMetrics.invoiceDiscount *
          ((netBeforeInvoiceDiscount + getLineTaxAmount(line, 0, "AFTER_TAX", isTaxFree)) /
            (cartMetrics.taxableBase + cartMetrics.tax))
          : 0;
      const totalDiscountAmount = getLineDiscountAmount(line) + invoiceShare;
      const taxAmount = getLineTaxAmount(line, invoiceShare, taxPolicy, isTaxFree);
      const lineAmount =
        taxPolicy === "AFTER_TAX"
          ? getLineTotal(line, afterTaxShare, taxPolicy, isTaxFree)
          : getLineTotal(line, invoiceShare, taxPolicy, isTaxFree);

      return {
        salesInvoiceLineId: line.salesInvoiceLineId,
        itemId: line.itemId,
        warehouseId:
          line.trackInventory && line.warehouseId ? line.warehouseId : undefined,
        itemName: line.name,
        quantity: line.sellByWeight
          ? getCartLineInventoryQuantity(line)
          : line.quantity,
        unitPrice: line.sellByWeight ? (line.baseUnitPrice ?? line.unitPrice) : line.unitPrice,
        discountAmount: Number(
          (getLineDiscountAmount(line) + (taxPolicy === "AFTER_TAX" ? afterTaxShare : invoiceShare)).toFixed(2),
        ),
        taxAmount: Number(taxAmount.toFixed(2)),
        lineAmount: Number(lineAmount.toFixed(2)),
        description: line.lineNote?.trim() || undefined,
        modifiers: line.modifiers ?? undefined,
        revenueAccountId: line.salesAccountId ?? undefined,
      };
    });
  };

  const buildPaymentPayload = () =>
    (
      orderType === "DELIVERY" &&
      deliveryMode === "THIRD_PARTY" &&
      deliveryCollectionMethod === "COMPANY"
        ? []
        : paymentEntriesResolved
    )
      .filter((entry) => entry.bankCashAccountId && entry.amountValue > 0)
      .map((entry) => ({
        bankCashAccountId: entry.bankCashAccountId,
        paymentMethod: entry.paymentMethod,
        amount: Number(entry.amountValue.toFixed(2)),
      }));

  const buildRestaurantPayload = () => ({
    orderType,
    tableId: orderType === "DINE_IN" ? selectedTableId ?? undefined : undefined,
    waiterId: orderType === "DINE_IN" ? selectedWaiterId ?? undefined : undefined,
    serviceChargeAmount: orderType === "DINE_IN" ? serviceChargeAmount : 0,
    deliveryFeeAmount: orderType === "DELIVERY" ? deliveryFee : 0,
    driverId:
      orderType === "DELIVERY" && deliveryMode === "DIRECT"
        ? deliveryDriverId ?? undefined
        : undefined,
    deliveryCompanyId:
      orderType === "DELIVERY" && deliveryMode === "THIRD_PARTY"
        ? deliveryCompanyId ?? undefined
        : undefined,
    deliveryCollectionMethod:
      orderType === "DELIVERY" && deliveryMode === "THIRD_PARTY"
        ? deliveryCollectionMethod
        : undefined,
    deliveryStatus: orderType === "DELIVERY" ? ("PENDING" as DeliveryStatus) : undefined,
    deliveryAddress: orderType === "DELIVERY" ? deliveryAddress.trim() || undefined : undefined,
    deliveryNotes:
      orderType === "DELIVERY" || deliveryNotes.trim()
        ? deliveryNotes.trim() || undefined
        : undefined,
  });

  const setSinglePaymentMethod = (
    method: "CASH" | "CARD" | "CLIQ" | "BANK_TRANSFER" | "WALLET",
  ) => {
    setPaymentEntries((current) => {
      const firstEntry = current[0];
      const currentAmount = firstEntry?.amount?.trim();
      return [
        {
          id: firstEntry?.id ?? createLocalId(),
          paymentMethod: method,
          bankCashAccountId: resolveMappedBankCashAccountId(method),
          amount: currentAmount || "",
          reference: "",
        },
      ];
    });
  };

  const updatePaymentEntryMethod = (
    entryId: string,
    method: "CASH" | "CARD" | "CLIQ" | "BANK_TRANSFER" | "WALLET",
  ) => {
    updatePaymentEntry(entryId, {
      paymentMethod: method,
      bankCashAccountId: resolveMappedBankCashAccountId(method),
      reference: "",
    });
  };

  const pushMessage = (message: string, tone: FlashNotice["tone"] = "success") => {
    setFlashNotice({ message, tone });
    if (messageTimeoutRef.current) {
      window.clearTimeout(messageTimeoutRef.current);
    }
    if (tone === "error") {
      return;
    }
    messageTimeoutRef.current = window.setTimeout(() => {
      setFlashNotice(null);
    }, 3600);
  };

  const pushError = (message: string) => {
    pushMessage(message, "error");
  };

  const kitchenHub = useKitchenPrintHubActions();
  kitchenHubActionsRef.current = kitchenHub;

  const toggleItemFavorite = (itemId: string) => {
    if (!hasPermission(user, "POS_ADD_ITEM_TO_CART")) {
      return;
    }
    const has = favoriteItemIds.includes(itemId);
    const next = has
      ? favoriteItemIds.filter((id) => id !== itemId)
      : [...favoriteItemIds, itemId];
    setFavoriteItemIds(next);
    syncFavoritesMutation.mutate(next);
  };

  const resetSale = () => {
    setEditingInvoiceId(null);
    hadKitchenTicketRef.current = false;
    lastKitchenSyncFingerprintRef.current = null;
    lastSyncedKitchenSnapshotRef.current = [];
    waiterConfirmedAtRef.current = null;
    prevOrderTypeRef.current = defaultOrderType;
    setCartLines([]);
    setInvoiceDiscountType("FIXED");
    setInvoiceDiscountValue(0);
    setSearch("");
    setOrderNotes("");
    setSelectedCustomerId(null);
    setOrderType(defaultOrderType);
    setSelectedTableId(null);
    setSelectedTableNumber(null);
    setSelectedWaiterId(null);
    setDeliveryMode("THIRD_PARTY");
    setDeliveryCompanyId(null);
    setDeliveryCollectionMethod("RESTAURANT");
    setDeliveryDriverId(null);
    setSelectedDeliveryDriverName(null);
    setSelectedDeliveryDriverPhone(null);
    setServiceChargeAmount(0);
    setDeliveryFee(0);
    setDeliveryAddress("");
    setDeliveryNotes("");
    setActiveReservationId(null);
    const defaultCash =
      paymentAccounts.find((account) =>
        account.type.toUpperCase().includes("CASH"),
      ) ?? paymentAccounts[0];
    setPaymentEntries(
      defaultCash
        ? [
          {
            id: createLocalId(),
            paymentMethod: "CASH",
            bankCashAccountId: resolveMappedBankCashAccountId("CASH"),
            amount: "",
            reference: "",
          },
        ]
        : [],
    );
  };
  // Sync the ref every render so mutations (defined earlier in the component)
  // always have a pointer to the latest resetSale closure.
  resetSaleRef.current = resetSale;

  const appendCartLine = (
    item: InventoryItem,
    addons: PosLineAddonSelection[],
    lineNote: string,
    replaceLine?: CartLine | null,
    entryWeight?: number | null,
  ) => {
    if (!sessionState.isOpen) {
      pushMessage(t("pos.sales.alert.sessionClosed"));
      return;
    }
    if (isWaiterOrderLocked) {
      pushError(getOrderWaiterLockMessage(language));
      return;
    }
    const taxRate = parseAmount(item.defaultTax?.rate);
    const lineWarehouseId =
      item.trackInventory
        ? item.preferredWarehouseId || selectedWarehouseId || null
        : null;
    const negOk = Boolean(posSettings?.runtime.negativeStockAllowed);
    const onHand = parseAmount(item.onHandQuantity);
    const baseUnitPrice = parseAmount(item.defaultSalesPrice);
    const sellByWeight = isWeightSaleItem(item);
    const unitPrice = sellByWeight ? baseUnitPrice : baseUnitPrice + sumAddonPrices(addons);
    const modifiers = buildModifiersPayload(addons);
    const quantityPrecision = getQuantityPrecision(item);
    const quantity = sellByWeight ? (entryWeight ?? 0) : 1;

    setCartLines((current) => {
      if (replaceLine) {
        const replaceKey = getCartLineKey(replaceLine);
        return current.map((line) =>
          getCartLineKey(line) === replaceKey
            ? {
                ...line,
                unitPrice,
                baseUnitPrice,
                modifiers,
                lineNote,
              }
            : line,
        );
      }

      if (sellByWeight && quantity <= 0) {
        return current;
      }

      const draftLine: CartLine = {
        itemId: item.id,
        name: item.name,
        code: item.code,
        barcode: item.barcode,
        unit: item.unitOfMeasure,
        itemType: item.type,
        quantity,
        unitPrice,
        baseUnitPrice,
        discountType: "FIXED",
        discountValue: 0,
        taxRate,
        trackInventory: item.trackInventory,
        unitCost: parseAmount(item.defaultPurchasePrice),
        averageCost: parseAmount(item.defaultPurchasePrice),
        salesAccountId: item.salesAccount?.id,
        inventoryAccountId: item.inventoryAccount?.id,
        cogsAccountId: item.cogsAccount?.id,
        warehouseId: lineWarehouseId,
        onHandQuantity: onHand,
        modifiers,
        lineNote,
        sellByWeight,
        quantityPrecision,
        portionCount: sellByWeight ? 1 : undefined,
        clientLineId: sellByWeight ? createLocalId() : undefined,
      };

      if (sellByWeight) {
        const weightMergeKey = getCartLineMergeKey(draftLine);
        const existingWeightIndex = current.findIndex(
          (line) => line.sellByWeight && getCartLineMergeKey(line) === weightMergeKey,
        );
        if (existingWeightIndex >= 0) {
          const nextTotalWeight = getCartItemWeightTotal(current, item.id) + quantity;
          if (item.trackInventory && !negOk && nextTotalWeight > onHand) {
            queueMicrotask(() =>
              pushMessage(
                t("pos.sales.alert.stockExceeded", {
                  item: item.name,
                }),
              ),
            );
            return current;
          }
          return current.map((l, index) =>
            index === existingWeightIndex
              ? { ...l, portionCount: getWeightPortionCount(l) + 1 }
              : l,
          );
        }
        if (item.trackInventory && !negOk && quantity > onHand) {
          queueMicrotask(() =>
            pushMessage(
              t("pos.sales.alert.stockExceeded", {
                item: item.name,
              }),
            ),
          );
          return current;
        }
        return [...current, draftLine];
      }

      const existingIndex = current.findIndex(
        (line) => getCartLineMergeKey(line) === getCartLineMergeKey(draftLine),
      );
      if (existingIndex >= 0) {
        const line = current[existingIndex];
        const nextQty = line.quantity + 1;
        if (item.trackInventory && !negOk && nextQty > line.onHandQuantity) {
          queueMicrotask(() =>
            pushMessage(
              t("pos.sales.alert.stockExceeded", {
                item: item.name,
              }),
            ),
          );
          return current;
        }
        return current.map((l, index) =>
          index === existingIndex ? { ...l, quantity: nextQty } : l,
        );
      }

      if (item.trackInventory && !negOk && onHand <= 0) {
        queueMicrotask(() =>
          pushMessage(
            t("pos.sales.alert.stockExceeded", {
              item: item.name,
            }),
          ),
        );
        return current;
      }

      return [...current, draftLine];
    });
  };

  const openAddonModalForItem = async (
    item: InventoryItem,
    entryWeight?: number | null,
  ) => {
    setPendingEntryWeight(entryWeight ?? null);
    const cachedConfig = addonCatalogByItemId.get(item.id);
    if (cachedConfig) {
      setAddonModalItem(item);
      setAddonModalConfig(cachedConfig);
      setAddonEditLine(null);
      return;
    }
    try {
      const config = await getPosItemAddonConfig(item.id, token);
      setAddonModalItem(item);
      setAddonModalConfig(config);
      setAddonEditLine(null);
    } catch (error) {
      pushMessage(
        getErrorMessage(
          error,
          getLocalizedText("Could not load add-ons / تعذر تحميل الإضافات", language),
        ),
      );
      setAddonModalItem(item);
      setAddonModalConfig({ itemId: item.id, groups: [] });
      setAddonEditLine(null);
    }
  };

  const addItemToCart = async (item: InventoryItem) => {
    if (!sessionState.isOpen) {
      pushMessage(t("pos.sales.alert.sessionClosed"));
      return;
    }
    if (isWaiterOrderLocked) {
      pushError(getOrderWaiterLockMessage(language));
      return;
    }
    await openAddonModalForItem(item);
  };

  const openLineAddonEditor = async (line: CartLine) => {
    if (isWaiterOrderLocked) {
      pushError(getOrderWaiterLockMessage(language));
      return;
    }
    const item = items.find((row) => row.id === line.itemId);
    if (!item) return;
    const cachedConfig = addonCatalogByItemId.get(item.id);
    if (cachedConfig) {
      setAddonModalItem(item);
      setAddonModalConfig(cachedConfig);
      setAddonEditLine(line);
      return;
    }
    try {
      const config = await getPosItemAddonConfig(item.id, token);
      setAddonModalItem(item);
      setAddonModalConfig(config);
      setAddonEditLine(line);
    } catch (error) {
      pushMessage(
        getErrorMessage(
          error,
          getLocalizedText("Could not load add-ons / تعذر تحميل الإضافات", language),
        ),
      );
    }
  };

  const handleBarcodeSubmit = () => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return;
    const match =
      items.find((item) => item.barcode?.trim().toLowerCase() === normalized) ||
      items.find((item) => item.code.trim().toLowerCase() === normalized);
    if (!match) {
      pushMessage(t("pos.sales.alert.noBarcodeMatch"));
      return;
    }
    addItemToCart(match);
    setSearch("");
  };

  const handleCameraScan = (decodedText: string) => {
    const normalized = decodedText.trim().toLowerCase();
    if (!normalized) return;
    const match =
      items.find((item) => item.barcode?.trim().toLowerCase() === normalized) ||
      items.find((item) => item.code.trim().toLowerCase() === normalized);
    if (!match) {
      pushMessage(t("pos.sales.alert.noBarcodeMatch"));
      return;
    }
    addItemToCart(match);
    setIsCameraScannerOpen(false);
    setSearch("");
  };

  const updateLine = (
    targetLine: CartLine,
    updater: (line: CartLine) => CartLine | null,
  ) => {
    if (isWaiterOrderLocked) {
      pushError(getOrderWaiterLockMessage(language));
      return;
    }
    const lineKey = getCartLineKey(targetLine);
    const target = cartLines.find((line) => getCartLineKey(line) === lineKey);
    if (target && isKitchenSentLineLocked(target, waiterOnlyUser)) {
      pushError(
        waiterOnlyUser
          ? getOrderWaiterLockMessage(language)
          : getKitchenProductionLockMessage(language),
      );
      return;
    }
    setCartLines((current) =>
      current
        .map((line) => (getCartLineKey(line) === lineKey ? updater(line) : line))
        .filter(Boolean) as CartLine[],
    );
  };

  const bumpLineQty = (line: CartLine, delta: number) => {
    if (isWaiterOrderLocked) {
      pushError(getOrderWaiterLockMessage(language));
      return;
    }
    if (line.sellByWeight) {
      pushMessage(getWeightLineLockedMessage(language));
      return;
    }
    if (isKitchenSentLineLocked(line, waiterOnlyUser)) {
      pushError(
        waiterOnlyUser
          ? getOrderWaiterLockMessage(language)
          : getKitchenProductionLockMessage(language),
      );
      return;
    }
    const qtyDelta = line.sellByWeight
      ? delta * getWeightQuantityStep(line.quantityPrecision ?? 3)
      : delta;
    if (qtyDelta > 0) {
      const negOk = Boolean(posSettings?.runtime.negativeStockAllowed);
      const nextQty = Number((line.quantity + qtyDelta).toFixed(line.quantityPrecision ?? 3));
      if (line.trackInventory && !negOk && nextQty > line.onHandQuantity) {
        pushMessage(
          t("pos.sales.alert.stockExceeded", {
            item: line.name,
          }),
        );
        return;
      }
    }
    updateLine(line, (current) => {
      const nextQty = Number(
        (current.quantity + qtyDelta).toFixed(current.quantityPrecision ?? 3),
      );
      if (nextQty <= 0) {
        return null;
      }
      return { ...current, quantity: nextQty };
    });
  };

  const duplicateWeightLine = (line: CartLine) => {
    if (isWaiterOrderLocked) {
      pushError(getOrderWaiterLockMessage(language));
      return;
    }
    if (!line.sellByWeight) {
      bumpLineQty(line, 1);
      return;
    }
    const negOk = Boolean(posSettings?.runtime.negativeStockAllowed);
    const nextTotalWeight = getCartItemWeightTotal(cartLines, line.itemId) + line.quantity;
    if (line.trackInventory && !negOk && nextTotalWeight > line.onHandQuantity) {
      pushMessage(
        t("pos.sales.alert.stockExceeded", {
          item: line.name,
        }),
      );
      return;
    }
    if (line.kitchenSentAt && waiterOnlyUser) {
      const duplicate: CartLine = {
        ...line,
        salesInvoiceLineId: undefined,
        clientLineId: createLocalId(),
        kitchenSentAt: null,
        kitchenItemStatus: null,
        portionCount: 1,
      };
      setCartLines((current) => [...current, duplicate]);
      return;
    }
    updateLine(line, (current) => ({
      ...current,
      portionCount: getWeightPortionCount(current) + 1,
    }));
  };

  const removeWeightLine = (line: CartLine) => {
    if (isWaiterOrderLocked) {
      pushError(getOrderWaiterLockMessage(language));
      return;
    }
    if (!line.sellByWeight) {
      bumpLineQty(line, -1);
      return;
    }
    if (line.kitchenSentAt && waiterOnlyUser) {
      pushMessage(getWeightSentPortionRemoveMessage(language));
      return;
    }
    if (isKitchenProductionLocked(line)) {
      pushError(getKitchenProductionLockMessage(language));
      return;
    }
    if (getWeightPortionCount(line) > 1) {
      updateLine(line, (current) => ({
        ...current,
        portionCount: getWeightPortionCount(current) - 1,
      }));
      return;
    }
    updateLine(line, () => null);
  };

  const setLineWeight = (line: CartLine, nextWeight: number) => {
    if (!line.sellByWeight) {
      return;
    }
    pushMessage(getWeightLineLockedMessage(language));
    if (nextWeight <= 0) {
      return;
    }
  };

  const updatePaymentEntry = (
    entryId: string,
    patch: Partial<PaymentEntry>,
  ) => {
    setPaymentEntries((current) =>
      current.map((entry) =>
        entry.id === entryId ? { ...entry, ...patch } : entry,
      ),
    );
  };

  const addPaymentEntry = () => {
    setPaymentEntries((current) => [
      ...current,
      {
        id: createLocalId(),
        paymentMethod: "CASH",
        bankCashAccountId: resolveMappedBankCashAccountId("CASH"),
        amount: "",
        reference: "",
      },
    ]);
  };

  const removePaymentEntry = (entryId: string) => {
    setPaymentEntries((current) => current.filter((entry) => entry.id !== entryId));
  };

  const updateReturnPaymentEntry = (
    entryId: string,
    patch: Partial<ReturnPaymentEntry>,
  ) => {
    setReturnPayments((current) =>
      current.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)),
    );
  };

  const addReturnPaymentEntry = () => {
    const fallbackAccount = paymentAccounts[0];
    setReturnPayments((current) => [
      ...current,
      {
        id: createLocalId(),
        refundMethod: "CASH",
        bankCashAccountId: fallbackAccount?.id ?? "",
        amount: "",
        reference: "",
      },
    ]);
  };

  const removeReturnPaymentEntry = (entryId: string) => {
    setReturnPayments((current) => current.filter((entry) => entry.id !== entryId));
  };

  const autoSaveCurrentTableOrderIfAny = async (tableIdToExclude?: string | null) => {
    if (isWaiterOrderLocked) {
      return;
    }
    if (
      orderType === "DINE_IN" &&
      selectedTableId &&
      cartLines.length > 0 &&
      activeSession?.id
    ) {
      if (tableIdToExclude && selectedTableId === tableIdToExclude) {
        return;
      }
      try {
        await holdSaleMutation.mutateAsync({
          sessionId: activeSession.id,
          invoiceId: editingInvoiceId ?? undefined,
          customerId: selectedCustomerId || undefined,
          description: orderNotes.trim() || undefined,
          ...buildRestaurantPayload(),
          lines: buildSaleLinesPayload(),
          payments: buildPaymentPayload(),
          reservationId: activeReservationId ?? undefined,
        });
      } catch (err) {
        console.error("Failed to auto-save table order:", err);
      }
    }
  };

  const holdSale = () => {
    if (!sessionState.isOpen || !activeSession?.id) {
      pushMessage(t("pos.sales.alert.sessionClosed"));
      return;
    }
    if (isWaiterOrderLocked) {
      pushError(getOrderWaiterLockMessage(language));
      return;
    }
    if (cartLines.length === 0) {
      pushMessage(t("pos.sales.alert.emptyCart"));
      return;
    }
    if (!hasPermission(user, "POS_HOLD_SALE")) {
      pushError(
        getLocalizedText("You do not have permission to hold sales / لا تملك صلاحية تعليق البيع", language),
      );
      return;
    }
    holdSaleMutation.mutate({
      sessionId: activeSession.id,
      invoiceId: editingInvoiceId ?? undefined,
      customerId: selectedCustomerId || undefined,
      description: orderNotes.trim() || undefined,
      ...buildRestaurantPayload(),
      lines: buildSaleLinesPayload(),
      payments: buildPaymentPayload(),
      reservationId: activeReservationId ?? undefined,
    });
  };

  const requestCancelSale = () => {
    if (cartLines.length === 0) {
      resetSale();
      return;
    }
    if (isWaiterOrderLocked) {
      pushError(getOrderWaiterLockMessage(language));
      return;
    }
    setIsCancelSaleOpen(true);
  };

  const confirmCancelSale = async () => {
    const saleIdToVoid = editingInvoiceId;
    if (saleIdToVoid) {
      if (!hasPermission(user, "POS_VOID_DRAFT_SALE")) {
        pushError(
          getLocalizedText("You do not have permission to cancel this sale / لا تملك صلاحية إلغاء البيع", language),
        );
        return;
      }
      try {
        await voidSaleMutation.mutateAsync(saleIdToVoid);
      } catch {
        return;
      }
    }
    resetSale();
    setIsCancelSaleOpen(false);
  };

  const saveDraftSale = () => {
    if (!sessionState.isOpen) {
      pushMessage(t("pos.sales.alert.sessionClosed"));
      return;
    }
    if (isWaiterOrderLocked) {
      pushError(getOrderWaiterLockMessage(language));
      return;
    }
    if (cartLines.length === 0) {
      pushMessage(t("pos.sales.alert.emptyCart"));
      return;
    }
    saveDraftMutation.mutate({
      sessionId: activeSession?.id ?? "",
      invoiceId: editingInvoiceId ?? undefined,
      customerId: selectedCustomerId || undefined,
      description: orderNotes.trim() || undefined,
      ...buildRestaurantPayload(),
      lines: buildSaleLinesPayload(),
      payments: buildPaymentPayload(),
      reservationId: activeReservationId ?? undefined,
    });
  };

  const resumeHeldSale = (heldSaleId: string, catalog?: HeldSale[]) => {
    const target =
      catalog?.find((row) => row.id === heldSaleId) ??
      [...draftSales, ...heldSales].find((row) => row.id === heldSaleId);
    if (!target) return;
    const enrichCartLine = (line: CartLine): CartLine => {
      const catalogItem = items.find((row) => row.id === line.itemId);
      const sellByWeight = catalogItem
        ? isWeightSaleItem(catalogItem)
        : Boolean(line.sellByWeight);
      const enriched: CartLine = {
        ...line,
        unit: catalogItem?.unitOfMeasure ?? line.unit,
        sellByWeight,
        quantityPrecision: catalogItem
          ? getQuantityPrecision(catalogItem)
          : line.quantityPrecision,
        clientLineId:
          line.clientLineId ??
          (sellByWeight && !line.salesInvoiceLineId ? createLocalId() : undefined),
      };
      return enriched;
    };
    setCartLines(target.cartLines.map(enrichCartLine));
    setPaymentEntries(target.paymentEntries);
    setInvoiceDiscountType(target.invoiceDiscountType);
    setInvoiceDiscountValue(target.invoiceDiscountValue);
    setSelectedWarehouseId(target.selectedWarehouseId);
    setSearch(target.search);
    setOrderNotes(target.orderNotes);
    setActiveCategory(normalizeResumeCategory(target.activeCategory));
    setEditingInvoiceId(target.id);
    setSelectedCustomerId(target.customerId ?? null);
    setOrderType(target.orderType);
    setSelectedTableId(target.tableId ?? null);
    setSelectedTableNumber(target.tableNumber ?? null);
    setSelectedWaiterId(target.waiterId ?? null);
    setDeliveryCompanyId(target.deliveryCompanyId ?? null);
    setDeliveryCollectionMethod(target.deliveryCollectionMethod ?? "RESTAURANT");
    setDeliveryDriverId(target.driverId ?? null);
    setSelectedDeliveryDriverName(target.driverName ?? null);
    setSelectedDeliveryDriverPhone(target.driverPhone ?? null);
    setServiceChargeAmount(target.serviceChargeAmount ?? 0);
    setDeliveryFee(target.deliveryFeeAmount ?? 0);
    setDeliveryAddress(target.deliveryAddress ?? "");
    setDeliveryNotes(target.deliveryNotes ?? "");
    setDeliveryMode(target.deliveryCompanyId ? "THIRD_PARTY" : "DIRECT");
    setActiveReservationId(target.heldContext?.reservationId ?? null);
    hadKitchenTicketRef.current = target.cartLines.some((line) => line.kitchenSentAt);
    waiterConfirmedAtRef.current = target.waiterConfirmedAt ?? null;
    lastKitchenSyncFingerprintRef.current = buildCartKitchenFingerprint(
      target.cartLines.map((line) => ({
        salesInvoiceLineId: line.salesInvoiceLineId,
        itemId: line.itemId,
        quantity: getCartLineInventoryQuantity(line),
        kitchenSentAt: line.kitchenSentAt,
      })),
    );
    lastSyncedKitchenSnapshotRef.current = captureKitchenLineSnapshotFromCart(
      mapCartLinesForKitchenSnapshot(target.cartLines),
    );
    if (hadKitchenTicketRef.current) {
      kitchenHubActionsRef.current.markKitchenInvoiceFullyPrinted(target.id);
      kitchenHubActionsRef.current.markKitchenLinesFromCart(
        target.id,
        target.cartLines.map((line) => ({
          salesInvoiceLineId: line.salesInvoiceLineId,
          kitchenSentAt: line.kitchenSentAt,
        })),
      );
      kitchenHubActionsRef.current.markKitchenOrderItemsPrintedForSale(target.id);
    }
    pushMessage(t("pos.sales.alert.resumedHeldSale"));
  };

  const loadOpenTableOrder = (tableId: string) => {
    const openSales = mapOpenPosSalesFromApi(
      draftSalesQuery.data,
      heldSalesQuery.data,
    );
    const table = restaurantTables.find((entry) => entry.id === tableId);
    const target = findOpenSaleForTable(
      openSales,
      tableId,
      table?.activeInvoice?.id,
    );
    if (!target) {
      return false;
    }
    setOrderType("DINE_IN");
    resumeHeldSale(target.id, openSales);
    resumedTableIdRef.current = target.id;
    return true;
  };

  const handleTableSelect = async (tableId: string, waiterId: string | null) => {
    const table = restaurantTables.find((entry) => entry.id === tableId);
    if (!table) return;

    // 1. If switching tables, release the old one if it has no items
    if (selectedTableId && selectedTableId !== tableId) {
      if (cartLines.length === 0 && !editingInvoiceId) {
        try {
          await updatePosTableStatus(selectedTableId, "AVAILABLE", token);
        } catch (e) {
          console.error("Failed to release old table:", e);
        }
      }
    }

    // 2. Determine if we have an active cart/order
    const hasActiveOrder = cartLines.length > 0 || editingInvoiceId !== null;

    if (hasActiveOrder) {
      // Preserve current order state and items, just update table assignment
      setOrderType("DINE_IN");
      setSelectedTableId(tableId);
      setSelectedTableNumber(table.tableNumber);
      setSelectedWaiterId(waiterId || table.assignedWaiter?.id || null);

      // Persist table change to database if session is active
      if (activeSession?.id) {
        try {
          const payload = {
            sessionId: activeSession.id,
            invoiceId: editingInvoiceId ?? undefined,
            customerId: selectedCustomerId || undefined,
            description: orderNotes.trim() || undefined,
            orderType: "DINE_IN" as const,
            tableId: tableId,
            waiterId: waiterId || table.assignedWaiter?.id || undefined,
            serviceChargeAmount: serviceChargeAmount,
            deliveryFeeAmount: 0,
            lines: buildSaleLinesPayload(),
            payments: buildPaymentPayload(),
            reservationId: activeReservationId ?? undefined,
          };
          const updatedSale = await holdPosSale(payload, token);
          if (updatedSale?.id) {
            setEditingInvoiceId(updatedSale.id);
          }
          await refreshPosData();
        } catch (err) {
          console.error("Failed to save table assignment:", err);
          pushError(getLocalizedText("Failed to save table assignment / فشل حفظ تعيين الطاولة", language));
        }
      }
    } else {
      // Empty cart: load existing order from table if any, else assign table to a new empty order
      const loaded = loadOpenTableOrder(tableId);
      if (!loaded) {
        setEditingInvoiceId(null);
        resetSale();
        setOrderType("DINE_IN");
        setSelectedTableId(tableId);
        setSelectedTableNumber(table.tableNumber);
        setSelectedWaiterId(waiterId || table.assignedWaiter?.id || null);
        resumedTableIdRef.current = `new:${tableId}`;
      } else if (waiterId) {
        setSelectedWaiterId(waiterId);
      }
    }
  };

  const printReceipt = (receipt: CompletedReceipt) => {
    printCustomerReceipt(receipt).then((result) => {
      if (result.fallback) {
        pushMessage(
          getLocalizedText(
            "Receipt printer unavailable; browser print opened / تعذر الاتصال بطابعة الإيصال، تم فتح طباعة المتصفح",
            language,
          ),
          "warning",
        );
      }
    }).catch((err) => {
      console.error("Failed to print receipt:", err);
      pushMessage(t("pos.sales.alert.printBlocked"));
    });
  };

  const buildProvisionalReceiptFromCart = (): CompletedReceipt => {
    const payloadLines = buildSaleLinesPayload();
    const subtotalBeforeDiscount = cartMetrics.subtotalBeforeDiscount;
    const taxRatePercent =
      subtotalBeforeDiscount > 0 && cartMetrics.tax > 0
        ? Math.round((cartMetrics.tax / subtotalBeforeDiscount) * 100)
        : null;
    const deliveryCompany = deliveryCompanies.find((row) => row.id === deliveryCompanyId);
    const waiter = waiters.find((row) => row.id === selectedWaiterId);
    const referenceLabel =
      activeEditingSale?.title ??
      (orderType === "DINE_IN" && selectedTableNumber
        ? `TABLE-${selectedTableNumber}`
        : getLocalizedText("Draft order / طلب مسودة", language));

    return buildProvisionalReceiptData({
      referenceLabel,
      branchName: sessionState.branchName || activeSession?.branchName || null,
      cashierName: user?.name?.trim() || user?.email?.trim() || sessionState.terminalName || "Cashier",
      terminalName: sessionState.terminalName || activeSession?.terminalName || null,
      warehouseName: activeSession?.warehouse?.name ?? "—",
      tableNumber: orderType === "DINE_IN" ? selectedTableNumber : null,
      orderType,
      waiterName: waiter?.name ?? waiter?.email ?? null,
      deliveryAddress: orderType === "DELIVERY" ? deliveryAddress.trim() || null : null,
      deliveryNotes: orderType === "DELIVERY" ? deliveryNotes.trim() || null : null,
      deliveryCompanyName:
        orderType === "DELIVERY" && deliveryMode === "THIRD_PARTY"
          ? deliveryCompany?.arabicName?.trim() || deliveryCompany?.name?.trim() || null
          : null,
      driverName:
        orderType === "DELIVERY" && deliveryMode === "DIRECT"
          ? selectedDeliveryDriverName?.trim() || null
          : null,
      serviceChargeAmount: cartMetrics.serviceCharge,
      deliveryFeeAmount: cartMetrics.deliveryCharge,
      taxRatePercent,
      subtotal: subtotalBeforeDiscount,
      discount: cartMetrics.discountTotal,
      tax: cartMetrics.tax,
      total: cartMetrics.total,
      lines: payloadLines.map((line, index) => ({
        name: line.itemName ?? cartLines[index]?.name ?? `Line ${index + 1}`,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountAmount: line.discountAmount,
        taxAmount: line.taxAmount,
        lineTotal: line.lineAmount,
        unitCode: cartLines[index]?.unit,
        modifiers: line.modifiers,
      })),
    });
  };

  const printBillFromCart = () => {
    if (cartLines.length === 0) {
      pushMessage(t("pos.sales.alert.emptyCart"));
      return;
    }
    printReceipt(buildProvisionalReceiptFromCart());
  };

  const printBillForSale = (saleId: string) => {
    printBillMutation.mutate(saleId);
  };

  const canPrintBill =
    hasPermission(user, "POS_PRINT_RECEIPT") && cartLines.length > 0;
  const canReprintReceipt = hasPermission(user, "POS_PRINT_RECEIPT");

  const completeSale = () => {
    const companyCollectedByDelivery =
      orderType === "DELIVERY" &&
      deliveryMode === "THIRD_PARTY" &&
      deliveryCollectionMethod === "COMPANY";
    if (!activeSession?.id) {
      pushMessage(t("pos.sales.alert.sessionClosed"));
      return;
    }
    if (!sessionState.isOpen) {
      pushMessage(t("pos.sales.alert.sessionClosed"));
      return;
    }
    if (cartLines.length === 0) {
      pushMessage(t("pos.sales.alert.emptyCart"));
      return;
    }
    if (orderType === "DINE_IN" && !selectedTableId) {
      pushError(getLocalizedText("Select a table before completing dine-in orders / اختر طاولة قبل إكمال الطلب الداخلي", language));
      return;
    }
    if (orderType === "DELIVERY" && deliveryMode === "DIRECT" && !deliveryAddress.trim()) {
      pushError(getLocalizedText("Enter delivery address before completing delivery orders / أدخل عنوان التوصيل قبل إكمال الطلب", language));
      return;
    }
    if (orderType === "DELIVERY" && deliveryMode === "THIRD_PARTY" && deliveryCompanyId) {
      const mappedCompany = posSettings?.accounts.deliveryCompanies?.find(
        (c) => c.id === deliveryCompanyId
      );
      if (!mappedCompany?.receivableAccountId) {
        pushError(
          getLocalizedText(
            "The order cannot be completed because no receivable account is configured for the selected delivery company / لا يمكن إكمال الطلب لعدم تهيئة حساب ذمم لشركة التوصيل المحددة",
            language
          )
        );
        return;
      }
    }

    if (cartMetrics.amountDue > 0 && !selectedCustomerId && !companyCollectedByDelivery) {
      pushMessage(
        getLocalizedText("Select a customer for partial payment or credit / اختر عميلاً للبيع الآجل أو الجزئي", language),
      );
      return;
    }

    const inventoryViolation = cartLines.find((line) => {
      if (!line.trackInventory) return false;
      if (!line.warehouseId) return true;
      if (posSettings?.runtime.negativeStockAllowed) return false;
      return getCartLineInventoryQuantity(line) > line.onHandQuantity;
    });
    if (inventoryViolation) {
      pushMessage(
        !inventoryViolation.warehouseId
          ? t("pos.sales.alert.warehouseRequired")
          : t("pos.sales.alert.stockExceeded", {
            item: inventoryViolation.name,
          }),
      );
      return;
    }

    if (
      !companyCollectedByDelivery &&
      (
        paymentEntriesResolved.length === 0 ||
        paymentEntriesResolved.every((entry) => !entry.bankCashAccountId || entry.amountValue <= 0)
      )
    ) {
      pushMessage(t("pos.sales.alert.paymentRequired"));
      return;
    }

    const unmappedPayment = companyCollectedByDelivery
      ? null
      : paymentEntriesResolved.find(
      (entry) => entry.amountValue > 0 && !entry.bankCashAccountId,
    );
    if (unmappedPayment) {
      pushError("طريقة الدفع غير مربوطة بحساب محاسبي");
      return;
    }

    if (
      !companyCollectedByDelivery &&
      cartMetrics.paid < cartMetrics.total &&
      !posSettings?.runtime.allowCreditSale
    ) {
      pushMessage(t("pos.sales.alert.insufficientPayment"));
      return;
    }

    completeSaleMutation.mutate({
      sessionId: activeSession?.id ?? "",
      invoiceId: editingInvoiceId ?? undefined,
      customerId: selectedCustomerId || undefined,
      description: orderNotes.trim() || undefined,
      ...buildRestaurantPayload(),
      lines: buildSaleLinesPayload(),
      payments: buildPaymentPayload(),
    });
  };

  const openPayModal = () => {
    if (!activeSession?.id || !sessionState.isOpen) {
      pushMessage(t("pos.sales.alert.sessionClosed"));
      return;
    }
    if (cartLines.length === 0) {
      pushMessage(t("pos.sales.alert.emptyCart"));
      return;
    }
    if (orderType === "DINE_IN" && !selectedTableId) {
      pushError(getLocalizedText("Select a table before completing dine-in orders / اختر طاولة قبل إكمال الطلب الداخلي", language));
      return;
    }
    if (orderType === "DELIVERY" && deliveryMode === "DIRECT" && !deliveryAddress.trim()) {
      pushError(getLocalizedText("Enter delivery address before completing delivery orders / أدخل عنوان التوصيل قبل إكمال الطلب", language));
      return;
    }
    if (orderType === "DELIVERY" && deliveryMode === "THIRD_PARTY" && deliveryCompanyId) {
      const mappedCompany = posSettings?.accounts.deliveryCompanies?.find(
        (c) => c.id === deliveryCompanyId
      );
      if (!mappedCompany?.receivableAccountId) {
        pushError(
          getLocalizedText(
            "The order cannot be completed because no receivable account is configured for the selected delivery company / لا يمكن إكمال الطلب لعدم تهيئة حساب ذمم لشركة التوصيل المحددة",
            language
          )
        );
        return;
      }
    }

    if (orderType === "DELIVERY" && deliveryMode === "THIRD_PARTY") {
      completeSale();
      return;
    }

    const nextMethod = inferSelectedPayMethod();
    setSelectedPayMethod(nextMethod);

    if (nextMethod !== "MIXED") {
      setSinglePaymentMethod(nextMethod);
    }

    setPayFlowStep("tender");
    setIsPayModalOpen(true);
  };

  const openCorrectionModal = (sale: PosSale) => {
    setSelectedCorrectionSale(sale);
    setCorrectionOrderType(sale.orderType ?? defaultOrderType);
    setCorrectionTableId(sale.tableId ?? "");
    setCorrectionDeliveryCompanyId(sale.deliveryCompanyId ?? "");
    setCorrectionDriverId(sale.driverId ?? "");
    setCorrectionServiceCharge(
      !sale.serviceChargeAmount || Number(sale.serviceChargeAmount) === 0
        ? ""
        : sale.serviceChargeAmount
    );
    setCorrectionDeliveryFee(
      !sale.deliveryFeeAmount || Number(sale.deliveryFeeAmount) === 0
        ? ""
        : sale.deliveryFeeAmount
    );
    setCorrectionReason("");
    setIsCorrectOrderTypeOpen(true);
  };

  const openPaymentCorrectionModal = (sale: PosSale) => {
    const currentPayment = sale.payments[0];
    if (!currentPayment) {
      pushError("No payment was found for this invoice.");
      return;
    }
    setSelectedPaymentCorrectionSale(sale);
    setCorrectionPaymentMethod(
      currentPayment.deliveryCompanyId ? "DELIVERY" : currentPayment.paymentMethod,
    );
    setCorrectionPaymentDeliveryCompanyId(currentPayment.deliveryCompanyId ?? "");
    setCorrectionPaymentReference(currentPayment.reference ?? "");
    setCorrectionPaymentReason("");
    setIsCorrectPaymentMethodOpen(true);
  };

  const createReturnFromSelection = () => {
    if (!selectedReturnSale) {
      pushMessage("Select a completed POS sale before creating a return.");
      return;
    }

    const lines = selectedReturnSale.lines
      .map((line) => ({
        salesInvoiceLineId: line.id,
        quantity: Number(parseAmount(returnQuantities[line.id]).toFixed(4)),
      }))
      .filter((line) => line.quantity > 0);

    if (!lines.length) {
      pushMessage("Choose at least one returned quantity.");
      return;
    }

    const payments = returnPaymentEntriesResolved
      .filter((entry) => entry.amountValue > 0)
      .map((entry) => ({
        refundMethod: entry.refundMethod,
        bankCashAccountId:
          entry.refundMethod === "STORE_CREDIT" ? undefined : entry.bankCashAccountId || undefined,
        amount: Number(entry.amountValue.toFixed(2)),
        reference: entry.reference || undefined,
      }));

    if (!payments.length) {
      pushMessage("Add at least one refund method before creating the return.");
      return;
    }

    const refundTotal = Number(
      payments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2),
    );
    const expectedTotal = Number(returnPreview.totalAmount.toFixed(2));
    if (refundTotal !== expectedTotal) {
      pushMessage("Refund allocation must equal the selected return total.");
      return;
    }

    createReturnMutation.mutate({
      salesInvoiceId: selectedReturnSale.id,
      sessionId: activeSession?.id ?? selectedReturnSale.session?.id ?? undefined,
      reason: returnReason || undefined,
      lines,
      payments,
    });
  };

  const renderSalesWorkspace = () => {
    const cashierLabel = user?.name?.trim() || user?.email || "Cashier";
    const singlePaymentEntry = paymentEntriesResolved[0] ?? null;

    if (!sessionState.isOpen || !activeSession) {
      if (waiterMode) {
        return (
          <div className="mx-auto max-w-md space-y-6 py-12 text-center">
            <Card className="rounded-[24px] border-[#dde5df] bg-white p-8 shadow-sm">
              <p className="text-sm font-semibold text-[#506054]">
                {isArabic
                  ? "لا توجد وردية POS مفتوحة. اطلب من الكاشير فتح الوردية أولاً."
                  : "No open POS session. Ask the cashier to open a shift first."}
              </p>
              <button
                type="button"
                onClick={() => router.push("/pos/waiter/tables")}
                className="mt-6 rounded-xl bg-[#46644b] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#38513c]"
              >
                {isArabic ? "العودة للطاولات" : "Back to Tables"}
              </button>
            </Card>
          </div>
        );
      }
      return (
        <div className="mx-auto max-w-4xl space-y-6">
          <Card className="rounded-[32px] border-[#d8e2db] bg-white p-6 shadow-[0_24px_70px_-46px_rgba(43,79,54,0.35)] sm:p-8">
            <div className="mx-auto max-w-3xl space-y-8">
              <div className="space-y-3 text-center">
                <div className="inline-flex items-center rounded-full border border-[#d6e5da] bg-[#f2f8f3] px-4 py-2 text-xs font-black tracking-[0.18em] text-[#4f7059]">
                  {getLocalizedText("POS OPEN SHIFT / فتح الوردية نقاط البيع", language)}
                </div>
                <h1 className="text-3xl font-black tracking-tight text-[#1f3427] arabic-heading">
                  {getLocalizedText("Open Shift / فتح الوردية", language)}
                </h1>
                <p className="text-sm leading-7 text-[#65766b] arabic-auto">
                  {getLocalizedText(
                    "Start the cashier terminal by choosing the terminal, branch, warehouse, and cash register. Selling stays hidden until the shift is opened. / ابدأ تشغيل جهاز الكاشير باختيار الجهاز، الفرع، المستودع، وصندوق الكاش. تظل شاشة البيع مخفية حتى يتم فتح الوردية.",
                    language,
                  )}
                </p>
              </div>

              <OpenShiftPanel
                sessionState={sessionState}
                cashierLabel={cashierLabel}
                warehouses={warehouses}
                paymentAccounts={paymentAccounts}
                canOpenShift={hasPermission(user, "POS_OPEN_SESSION")}
                onSessionStateChange={(patch) =>
                  setSessionState((current) => ({ ...current, ...patch }))
                }
                onOpenSession={(openingCash, warehouseId, cashAccountId) => {
                  openSessionMutation.mutate({
                    openingCash: parseAmount(openingCash),
                    warehouseId,
                    cashAccountId,
                    terminalName: sessionState.terminalName,
                    branchName: sessionState.branchName || undefined,
                  });
                }}
                isPending={openSessionMutation.isPending}
              />
            </div>
          </Card>
        </div>
      );
    }

    const heldListCount = heldSales.length + draftSales.length;
    const catalogTotalPages = Math.max(itemsQuery.data?.totalPages ?? 1, 1);
    const payCannotCompleteCredit =
      cartMetrics.amountDue > 0 &&
      (!posSettings?.runtime.allowCreditSale || !selectedCustomerId);
    const hasValidPayments = paymentEntriesResolved.some(
      (entry) => entry.bankCashAccountId && entry.amountValue > 0,
    );
    const canCompleteThisSale =
      hasPermission(user, "POS_COMPLETE_SALE") &&
      hasPermission(user, "POS_SELECT_PAYMENT_METHOD") &&
      !payCannotCompleteCredit &&
      hasValidPayments;
    const isCartLineLocked = (line: CartLine) =>
      isWaiterOrderLocked || isKitchenSentLineLocked(line, waiterOnlyUser);
    const orderKitchenLocked = isWaiterOrderLocked;
    const productGridClass = waiterMode
      ? posWaiterTabletProductGridClass
      : posProductGridClass;
    const unsentLineCount = cartLines.filter((line) => !line.kitchenSentAt).length;
    const selectedTable =
      restaurantTables.find((table) => table.id === selectedTableId) ?? null;
    const visibleTableLabel = selectedTable?.tableNumber ?? selectedTableNumber;
    const waiterPrimaryKitchenAction = waiterMode && unsentLineCount > 0;

    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-[#f6f7f8]">
        <PosRegisterMainGrid
          waiterMode={waiterMode}
          catalog={
            <section className="flex flex-col gap-3 pb-3">
              <Card className="rounded-[12px] border-[#e4e9e6] bg-white px-3 py-2 shadow-none">
                <div className="flex flex-col gap-3 lg:flex-row">
                  <div className="mb-0 min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="relative flex-1">
                        <LuScanLine className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#7b8d82] rtl:left-auto rtl:right-3.5" />
                        <Input
                          ref={searchInputRef}
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              handleBarcodeSubmit();
                            }
                          }}
                          placeholder={t("pos.sales.barcodePlaceholder")}
                          className="h-12 w-full rounded-[10px] border-[#d7dfda] bg-white py-3 pl-10 pr-3 text-sm focus:border-[#5f8a67] focus:ring-[#5f8a67]/10 rtl:pl-3 rtl:pr-10 shadow-sm transition-all"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCalculatorOpen(true)}
                        className="flex h-12 shrink-0 items-center justify-center rounded-[10px] border border-[#5f8a67] bg-[#5f8a67] px-5 text-sm font-black text-white hover:bg-[#4d7354] active:bg-[#3d5c43] shadow-md transition-all duration-200"
                        title="Calculator"
                      >
                        <LuCalculator className="h-5 w-5 mr-2 rtl:mr-0 rtl:ml-2" />
                        <span className="truncate">{language === "ar" ? "الحاسبة" : "Calculator"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {catalogChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => {
                        setActiveCategory(chip.id);
                        setProductPage(1);
                      }}
                      className={cn(
                        "min-h-[38px] whitespace-nowrap rounded-full border px-5 py-1.5 text-sm font-black transition-all duration-200 active:scale-95 shadow-sm",
                        activeCategory === chip.id
                          ? "border-transparent bg-gradient-to-r from-[#5f8a67] to-[#6d9675] text-white shadow-md shadow-[#5f8a67]/20"
                          : "border-[#e4ebe6] bg-[#f5f8f6] text-[#4e5e53] hover:bg-white hover:border-[#bdd0c0] hover:text-[#5f8a67]",
                      )}
                    >
                      {chip.name}
                    </button>
                  ))}
                </div>
              </Card>

              {itemsQuery.isLoading ? (
                <div className={productGridClass}>
                  {Array.from({ length: 10 }).map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "animate-pulse rounded-[7px] border border-[#e4e9e6] bg-white",
                        waiterMode ? "h-[268px]" : "h-[244px]",
                      )}
                    />
                  ))}
                </div>
              ) : itemsQuery.isError ? (
                <Card className="rounded-[12px] border-[#ead8d4] bg-white p-6 text-center shadow-none">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#f8eded] text-[#96665f]">
                    <LuPackage className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-sm font-bold text-[#233329] arabic-heading">
                    {t("pos.sales.loadErrorTitle")}
                  </div>
                  <p className="mt-1 text-xs leading-6 text-[#6a776f] arabic-auto">
                    {t("pos.sales.loadErrorDescription")}
                  </p>
                </Card>
              ) : filteredItems.length === 0 ? (
                <Card className="rounded-[12px] border-[#e4e9e6] bg-white p-6 text-center shadow-none">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#eef5ef] text-[#5f8a67]">
                    <LuShoppingBasket className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-sm font-bold text-[#233329] arabic-heading">
                    {t("pos.sales.emptyTitle")}
                  </div>
                  <p className="mt-1 text-xs leading-6 text-[#6a776f] arabic-auto">
                    {t("pos.sales.emptyDescription")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void queryClient.invalidateQueries({ queryKey: ["inventory-items", token] });
                    }}
                    className="mt-3 rounded-[6px] border border-[#d6e1d9] bg-[#f7faf8] px-4 py-2 text-xs font-bold text-[#4f6556] hover:bg-white"
                  >
                    {getLocalizedText("Refresh products / تحديث المنتجات", language)}
                  </button>
                </Card>
              ) : (
                <div className={productGridClass}>
                  {filteredItems.map((item) => (
                    <PosProductCard
                      key={item.id}
                      item={item}
                      currencyCode={currencyCode}
                      isFavorite={favoriteIdSet.has(item.id)}
                      onToggleFavorite={() => toggleItemFavorite(item.id)}
                      allowNegativeStock={Boolean(posSettings?.runtime.negativeStockAllowed)}
                      onAdd={() => addItemToCart(item)}
                      disabled={orderKitchenLocked}
                      variant={waiterMode ? "tablet" : "default"}
                    />
                  ))}
                </div>
              )}
              {!itemsQuery.isLoading && !itemsQuery.isError && filteredItems.length > 0 && catalogTotalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-[#e4e9e6] bg-white px-3 py-2">
                  <button
                    type="button"
                    disabled={productPage <= 1 || itemsQuery.isFetching}
                    onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                    className="rounded-[6px] border border-[#d6e1d9] bg-[#f7faf8] px-3 py-1.5 text-xs font-bold text-[#4f6556] disabled:opacity-40"
                  >
                    {getLocalizedText("Previous / السابق", language)}
                  </button>
                  <span className="text-xs font-bold text-[#42564a]">
                    {language === "ar"
                      ? `الصفحة ${itemsQuery.data?.page ?? productPage} / ${catalogTotalPages}`
                      : `Page ${itemsQuery.data?.page ?? productPage} / ${catalogTotalPages}`}
                  </span>
                  <button
                    type="button"
                    disabled={productPage >= catalogTotalPages || itemsQuery.isFetching}
                    onClick={() => setProductPage((p) => p + 1)}
                    className="rounded-[6px] border border-[#d6e1d9] bg-[#f7faf8] px-3 py-1.5 text-xs font-bold text-[#4f6556] disabled:opacity-40"
                  >
                    {getLocalizedText("Next / التالي", language)}
                  </button>
                </div>
              ) : null}
            </section>
          }
          salePanel={
            <div className="flex h-full min-h-0 w-full flex-col" dir={language === "ar" ? "rtl" : "ltr"}>
              {/* 1. Order Header */}
              <div
                className={cn(
                  "shrink-0 border-b border-[#eef1ef] px-3 py-2.5",
                  waiterMode && "bg-[#fbfffc]",
                )}
              >
                {waiterMode ? (
                  <div className="mb-2.5 flex items-center justify-between gap-3 rounded-[14px] border border-[#cde3d2] bg-[#f1f8f3] px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-wide text-[#4f7059]">
                        {getLocalizedText("Selected table / الطاولة المختارة", language)}
                      </div>
                      <div className="truncate text-lg font-black text-[#1f3427] arabic-heading">
                        {visibleTableLabel
                          ? getLocalizedText(`Table ${visibleTableLabel} / طاولة ${visibleTableLabel}`, language)
                          : getLocalizedText("No table selected / لا توجد طاولة", language)}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-[#a7d3ae] bg-white px-2.5 py-1 text-[10px] font-black text-[#2f6b3b]">
                      {unsentLineCount > 0
                        ? getLocalizedText(`${unsentLineCount} unsent / ${unsentLineCount} غير مرسل`, language)
                        : getLocalizedText("Ready / جاهز", language)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {(() => {
                        const statusKey = activeEditingSale?.status === "DRAFT"
                          ? "DRAFT"
                          : editingInvoiceId
                            ? "HELD"
                            : cartLines.length > 0
                              ? "ACTIVE"
                              : selectedTableId
                                ? "SELECTED"
                                : null;
                        const statusLabel =
                          statusKey === "DRAFT"
                            ? getLocalizedText("Draft / مسودة", language)
                            : statusKey === "HELD"
                              ? getLocalizedText("Held / معلقة", language)
                              : statusKey === "ACTIVE"
                                ? getLocalizedText("Active / نشط", language)
                                : statusKey === "SELECTED"
                                  ? getLocalizedText("Selected / تم الاختيار", language)
                                  : null;
                        const statusClass =
                          statusKey === "DRAFT"
                            ? "bg-[#f3f4f6] text-[#6b7280] border-[#e5e7eb]"
                            : statusKey === "HELD"
                              ? "bg-[#fffbeb] text-[#b45309] border-[#fde68a]"
                              : statusKey === "ACTIVE"
                                ? "bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]"
                                : statusKey === "SELECTED"
                                  ? "bg-[#eef2ff] text-[#4338ca] border-[#c7c3ff]"
                                  : "";
                        return statusLabel ? (
                          <span
                            className={cn(
                              "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold",
                              statusClass,
                            )}
                          >
                            {statusLabel}
                          </span>
                        ) : null;
                      })()}
                      <h2 className="text-[15px] font-bold leading-tight text-[#111827] arabic-heading">
                        {t("pos.sales.orderSummary")}
                      </h2>
                    </div>
                    <p className="mt-0.5 text-[11px] font-medium text-[#9ca3af] arabic-auto">
                      {activeEditingSale?.title
                        ? activeEditingSale.title.startsWith("#")
                          ? activeEditingSale.title
                          : `#${activeEditingSale.title}`
                        : editingInvoiceId
                          ? `#${editingInvoiceId.slice(0, 8)}`
                          : cartLines.length > 0
                            ? getLocalizedText("New order / طلب جديد", language)
                            : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!waiterMode && hasPermission(user, "POS_CLOSE_OWN_SESSION") && (
                      <button
                        type="button"
                        onClick={() => {
                          const blockDrafts =
                            (draftSales.length > 0 || heldSales.length > 0) &&
                            !posSettings?.runtime.allowCloseWithDrafts;
                          if (blockDrafts) {
                            pushError(
                              getLocalizedText(
                                "Close blocked: drafts or held sales exist / الإغلاق ممنوع: توجد مسودات أو معلقة",
                                language,
                              ),
                            );
                            return;
                          }
                          setActualCashCount("");
                          setClosingNotes("");
                          setIsCashierCloseModalOpen(true);
                        }}
                        disabled={closeSessionMutation.isPending}
                        className="inline-flex h-7 items-center rounded-[10px] border border-[#f0d9d6] bg-[#fff5f4] px-2.5 text-[10px] font-extrabold text-[#b54b40] hover:bg-[#ffebeb] disabled:opacity-50 transition-colors shadow-sm"
                      >
                        {closeSessionMutation.isPending
                          ? getLocalizedText("Closing... / إغلاق...", language)
                          : getLocalizedText("Close Shift / إغلاق الوردية", language)}
                      </button>
                    )}
                    {!waiterMode && hasPermission(user, "POS_RESUME_OWN_HELD_SALE") ? (
                      <button
                        type="button"
                        onClick={() => setIsHeldOrdersOpen(true)}
                        className="relative inline-flex h-7 shrink-0 items-center rounded-[10px] border border-[#e5e7eb] bg-white px-2 text-[10px] font-semibold text-[#6b7280] hover:border-[#d1d5db]"
                      >
                        {getLocalizedText("Held / معلقة", language)}
                        {heldListCount > 0 ? (
                          <span className="ms-1 rounded-full bg-[#374151] px-1.5 py-px text-[9px] font-bold text-white">
                            {heldListCount}
                          </span>
                        ) : null}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Scrollable middle container to allow cart items to be visible without squishing */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {/* 2. Customer */}
                {!waiterMode && (
                  <div className="border-b border-[#eef1ef] px-3 py-2.5">
                    {selectedCustomer ? (
                      <div className="flex h-9 items-center justify-between gap-2 rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <LuUser className="h-3.5 w-3.5 shrink-0 text-[#6b7280]" />
                          <span className="truncate text-xs font-semibold text-[#111827]">
                            {selectedCustomer.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={orderKitchenLocked}
                          onClick={() => setSelectedCustomerId(null)}
                          className="shrink-0 text-[11px] font-medium text-[#9ca3af] transition hover:text-[#dc2626] disabled:opacity-40"
                          title="Remove customer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <LuUser className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
                        <input
                          type="text"
                          placeholder={getLocalizedText(
                            "Search customer / ابحث عن عميل...",
                            language,
                          )}
                          value={searchCustomer}
                          onChange={(e) => setSearchCustomer(e.target.value)}
                          readOnly={orderKitchenLocked}
                          className="h-9 w-full rounded-[10px] border border-[#e5e7eb] bg-white py-2 ps-8 pe-9 text-xs font-medium text-[#111827] placeholder-[#9ca3af] focus:border-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-[#f3f4f6] read-only:opacity-60"
                        />
                        <button
                          type="button"
                          disabled={orderKitchenLocked}
                          onClick={() => setIsAddCustomerOpen(true)}
                          title={getLocalizedText("Add customer / إضافة عميل", language)}
                          className="absolute end-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[8px] text-[#6b7280] transition hover:bg-[#f3f4f6] disabled:opacity-40"
                        >
                          <LuUserPlus className="h-3.5 w-3.5" />
                        </button>
                        {searchCustomer && customers.length > 0 && (
                          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white shadow-lg">
                            <div className="max-h-48 divide-y divide-[#f3f4f6] overflow-y-auto">
                              {customers
                                .filter((c: Customer) =>
                                  c.name.toLowerCase().includes(searchCustomer.toLowerCase()),
                                )
                                .slice(0, 8)
                                .map((c: Customer) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCustomerId(c.id);
                                      setSearchCustomer("");
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[#111827] hover:bg-[#f9fafb]"
                                  >
                                    <LuUser className="h-3.5 w-3.5 shrink-0 text-[#6b7280]" />
                                    <span className="truncate font-medium">{c.name}</span>
                                  </button>
                                ))}
                              {customers.filter((c: Customer) =>
                                c.name.toLowerCase().includes(searchCustomer.toLowerCase()),
                              ).length === 0 && (
                                <div className="px-3 py-2 text-[11px] text-[#9ca3af]">
                                  {getLocalizedText("No customer found / لا يوجد عميل", language)}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3–4. Order type + restaurant details + notes */}
                <div className="space-y-2.5 border-b border-[#eef1ef] px-3 py-2.5">
                  <PosRestaurantCartControls
                    cartLinesCount={cartLines.length}
                    deliveryAddress={deliveryAddress}
                    deliveryCompanies={deliveryCompanies}
                    deliveryCompanyId={deliveryCompanyId}
                    deliveryCollectionMethod={deliveryCollectionMethod}
                    deliveryDriverId={deliveryDriverId}
                    deliveryDrivers={deliveryDrivers}
                    deliveryFee={deliveryFee}
                    deliveryMode={deliveryMode}
                    deliveryNotes={deliveryNotes}
                    editingInvoiceId={editingInvoiceId}
                    onDeliveryAddressChange={setDeliveryAddress}
                    onDeliveryCompanyChange={setDeliveryCompanyId}
                    onDeliveryCollectionMethodChange={setDeliveryCollectionMethod}
                    onDeliveryDriverChange={(driverId) => {
                      const driver = deliveryDrivers.find((entry) => entry.id === driverId);
                      setDeliveryDriverId(driverId);
                      setSelectedDeliveryDriverName(driver?.name ?? null);
                      setSelectedDeliveryDriverPhone(driver?.phone ?? null);
                    }}
                    onDeliveryFeeChange={(value) => setDeliveryFee(parseAmount(value))}
                    onDeliveryModeChange={setDeliveryMode}
                    onDeliveryNotesChange={setDeliveryNotes}
                    onOpenMergeTables={() => setIsMergeTablesOpen(true)}
                    onOpenSplitBill={() => setIsSplitBillOpen(true)}
                    onOpenTableSelector={() => setIsTableSelectorOpen(true)}
                    onOpenTransferTable={() => setIsTransferTableOpen(true)}
                    onOrderTypeChange={setOrderType}
                    onSelectTable={async (tableId, waiterId) => {
                      await handleTableSelect(tableId, waiterId);
                    }}
                    onBackToTables={async () => {
                      if (orderType === "DINE_IN" && selectedTableId && cartLines.length === 0 && !editingInvoiceId) {
                        try {
                          await updatePosTableStatus(selectedTableId, "AVAILABLE", token);
                        } catch (e) {
                          console.error("Failed to release table on exit:", e);
                        }
                      } else {
                        await autoSaveCurrentTableOrderIfAny();
                      }
                      setSelectedTableId(null);
                      setSelectedTableNumber(null);
                      setSelectedWaiterId(null);
                      setEditingInvoiceId(null);
                      resetSale();
                      router.push(waiterMode ? "/pos/waiter/tables" : "/pos/tables");
                    }}
                    onServiceChargeChange={(value) =>
                      setServiceChargeAmount(parseAmount(value))
                    }
                    onWaiterChange={setSelectedWaiterId}
                    orderType={orderType}
                    restaurantTables={restaurantTables}
                    selectedDeliveryDriverLabel={selectedDeliveryDriverName}
                    selectedDeliveryDriverPhone={selectedDeliveryDriverPhone}
                    selectedTableId={selectedTableId}
                    selectedTableLabel={selectedTableNumber}
                    selectedWaiterId={selectedWaiterId}
                    serviceChargeAmount={serviceChargeAmount}
                    waiters={waiters}
                    language={language}
                    orderLocked={orderKitchenLocked}
                    waiterMode={waiterMode}
                  />

                  {orderKitchenLocked ? (
                    <div className="rounded-[10px] border border-[#fed7aa] bg-[#fff7ed] px-2.5 py-2 text-[10px] font-medium leading-snug text-[#c2410c]">
                      {getOrderWaiterLockMessage(language)}
                    </div>
                  ) : null}

                  {activeReservationId && (
                    <div className="flex items-start gap-2 rounded-[10px] border border-[#c4b5fd] bg-[#f5f3ff] px-2.5 py-2">
                      <span className="mt-0.5 text-[#7c3aed]">⏰</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold text-[#6d28d9]">
                          {language === "ar"
                            ? "وضع الطلب المسبق — الطاولة لم تُفتح بعد"
                            : "Pre-order mode — table not occupied yet"}
                        </div>
                        <div className="text-[10px] text-[#7c3aed]">
                          {language === "ar"
                            ? "ستُحفظ الأصناف. تظل الطاولة متاحة حتى وقت الحجز."
                            : "Items will be held. Table stays Available until the reservation window."}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveReservationId(null)}
                        className="text-xs font-bold text-[#9f7aea] hover:text-[#6d28d9]"
                        title="Dismiss banner"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="block text-[10px] font-semibold text-[#6b7280]">
                        {getLocalizedText("Order note / ملاحظة الطلب", language)}
                      </label>
                      <span
                        className={cn(
                          "text-[10px] font-medium tabular-nums",
                          orderNotes.length >= POS_ORDER_NOTE_MAX
                            ? "text-amber-700"
                            : "text-[#9ca3af]",
                        )}
                      >
                        {orderNotes.length}/{POS_ORDER_NOTE_MAX}
                      </span>
                    </div>
                    <textarea
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(clampKitchenOrderNote(e.target.value))}
                      readOnly={orderKitchenLocked}
                      maxLength={POS_ORDER_NOTE_MAX}
                      rows={2}
                      placeholder={getLocalizedText(
                        "Order notes... / ملاحظات على الطلب...",
                        language,
                      )}
                      className="min-h-[52px] w-full resize-none rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-2.5 py-2 text-xs font-medium text-[#111827] placeholder-[#9ca3af] focus:border-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-[#f3f4f6] read-only:opacity-60"
                    />
                  </div>
                </div>

                {/* 5. Order items */}
                <div className="px-3 py-2">
                  {cartLines.length === 0 ? (
                    <div className="rounded-[10px] border border-dashed border-[#e5e7eb] bg-[#fafafa] px-3 py-5 text-center">
                      <p className="text-xs font-semibold text-[#374151]">
                        {t("pos.sales.cartEmptyTitle")}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-[#9ca3af]">
                        {t("pos.sales.cartEmptyDescription")}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#f3f4f6]">
                      {cartLines.map((line) => (
                        <CompactCartLine
                          key={getCartLineKey(line)}
                          line={line}
                          language={language}
                          currencyCode={currencyCode}
                          taxFreeEnabled={Boolean(posSettings?.runtime.taxFreeEnabled)}
                          locked={orderKitchenLocked || isCartLineLocked(line)}
                          canAdjustWeightPortions={
                            !orderKitchenLocked && line.sellByWeight
                          }
                          onEditAddons={
                            !isCartLineLocked(line) ? () => openLineAddonEditor(line) : undefined
                          }
                          canEditUnitPrice={
                            !isCartLineLocked(line) &&
                            hasPermission(user, "POS_CHANGE_UNIT_PRICE")
                          }
                          canEditLineDiscount={
                            !isCartLineLocked(line) &&
                            hasPermission(user, "POS_COMPLETE_SALE") &&
                            hasPermission(user, "POS_UPDATE_ITEM_QUANTITY")
                          }
                          onIncrease={() =>
                            line.sellByWeight
                              ? duplicateWeightLine(line)
                              : bumpLineQty(line, 1)
                          }
                          onDecrease={() =>
                            line.sellByWeight
                              ? removeWeightLine(line)
                              : bumpLineQty(line, -1)
                          }
                          onWeightChange={
                            line.sellByWeight
                              ? (nextWeight) => setLineWeight(line, nextWeight)
                              : undefined
                          }
                          onRemove={() => updateLine(line, () => null)}
                          onUnitPriceChange={(next) =>
                            updateLine(line, (current) => ({
                              ...current,
                              unitPrice: Math.max(0, next),
                            }))
                          }
                          onDiscountChange={(type, value) =>
                            updateLine(line, (current) => ({
                              ...current,
                              discountType: type,
                              discountValue: value,
                            }))
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* 6. Invoice discount */}
                {hasPermission(user, "POS_COMPLETE_SALE") && !orderKitchenLocked ? (
                  <div className="border-t border-[#eef1ef] px-3 py-2">
                    {!isInvoiceDiscountOpen && invoiceDiscountValue === 0 ? (
                      <button
                        type="button"
                        onClick={() => setIsInvoiceDiscountOpen(true)}
                        className="flex w-full items-center justify-end gap-1 text-[11px] font-semibold text-[#059669] transition hover:text-[#047857]"
                      >
                        <LuPlus className="h-3 w-3" />
                        {getLocalizedText("Add invoice discount + / إضافة خصم الفاتورة +", language)}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-[#6b7280]">
                            {getLocalizedText("Invoice discount / خصم الفاتورة", language)}
                          </span>
                          {invoiceDiscountValue === 0 && (
                            <button
                              type="button"
                              onClick={() => setIsInvoiceDiscountOpen(false)}
                              className="text-[10px] text-[#9ca3af] hover:text-[#6b7280]"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setInvoiceDiscountType((current) =>
                                current === "FIXED" ? "PERCENT" : "FIXED",
                              )
                            }
                            className="rounded-[8px] border border-[#e5e7eb] bg-white px-2 py-1.5 text-[10px] font-semibold text-[#374151]"
                          >
                            {invoiceDiscountType === "FIXED" ? "Fixed" : "%"}
                          </button>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={invoiceDiscountValue === 0 ? "" : invoiceDiscountValue}
                            onChange={(e) =>
                              setInvoiceDiscountValue(Math.max(0, Number(e.target.value) || 0))
                            }
                            className="min-w-0 flex-1 rounded-[8px] border border-[#e5e7eb] bg-white px-2 py-1.5 text-xs font-semibold text-[#111827]"
                            placeholder="0"
                          />
                        </div>
                        {invoiceDiscountType === "PERCENT" &&
                        invoiceDiscountValue >
                          (posSettings?.runtime.cashierDiscountLimitPercent ?? 15) ? (
                          <p className="text-[10px] text-[#d97706]">
                            {getLocalizedText(
                              "Above cashier discount limit / فوق حد خصم الكاشير",
                              language,
                            )}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* 7–8. Payment summary + sticky actions */}
              <div className="shrink-0 border-t border-[#eef1ef] bg-white pb-[env(safe-area-inset-bottom,0px)]">
                <PosPaymentSummaryCard
                  subtotal={formatCurrency(cartMetrics.subtotalBeforeDiscount, currencyCode)}
                  discounts={formatCurrency(cartMetrics.discountTotal, currencyCode)}
                  tax={formatCurrency(cartMetrics.tax, currencyCode)}
                  serviceCharge={formatCurrency(cartMetrics.serviceCharge, currencyCode)}
                  deliveryFee={formatCurrency(cartMetrics.deliveryCharge, currencyCode)}
                  grandTotal={formatCurrency(cartMetrics.total, currencyCode)}
                  labels={{
                    subtotal: t("pos.sales.totalSubtotal"),
                    discounts: t("pos.sales.totalDiscount"),
                    tax: t("pos.sales.totalTax"),
                    serviceCharge: getLocalizedText("Service charge / رسوم الخدمة", language),
                    deliveryFee: getLocalizedText("Delivery fee / رسوم التوصيل", language),
                    grandTotal: t("pos.sales.totalGrand"),
                  }}
                  waiterMode={waiterMode}
                />

                <div className="space-y-2 px-3 pb-3 pt-1">
                  {hasPermission(user, "POS_VIEW_POS_SCREEN") &&
                  !orderKitchenLocked &&
                  hadKitchenTicketRef.current &&
                  (cartLines.length > 0 || editingInvoiceId) ? (
                    <button
                      type="button"
                      onClick={() => updateKitchenMutation.mutate({ silent: false })}
                      disabled={
                        orderKitchenLocked ||
                        updateKitchenMutation.isPending ||
                        sendKitchenMutation.isPending ||
                        saveDraftMutation.isPending ||
                        completeSaleMutation.isPending
                      }
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-[#4338ca] bg-white text-xs font-bold text-[#4338ca] transition hover:bg-[#f5f3ff] disabled:opacity-40"
                    >
                      <LuRefreshCcw className="h-3.5 w-3.5" />
                      {getLocalizedText("Update kitchen / تحديث المطبخ", language)}
                    </button>
                  ) : null}
                  {hasPermission(user, "RST_SEND_KOT") &&
                  !orderKitchenLocked &&
                  cartLines.some((line) => !line.kitchenSentAt) ? (
                    <button
                      type="button"
                      onClick={() => sendKitchenMutation.mutate()}
                      disabled={
                        orderKitchenLocked ||
                        sendKitchenMutation.isPending ||
                        updateKitchenMutation.isPending ||
                        saveDraftMutation.isPending ||
                        cartLines.length === 0
                      }
                      className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-[10px] border-2 transition disabled:opacity-40",
                        waiterPrimaryKitchenAction
                          ? "h-14 border-[#ea580c] bg-[#ea580c] text-sm font-black text-white shadow-[0_14px_28px_-18px_rgba(234,88,12,0.95)] hover:bg-[#c2410c]"
                          : "h-10 border-[#ea580c] bg-white text-xs font-bold text-[#c2410c] hover:bg-[#fff7ed]",
                      )}
                    >
                      <LuChefHat
                        className={cn(
                          "shrink-0",
                          waiterPrimaryKitchenAction ? "h-5 w-5" : "h-3.5 w-3.5",
                        )}
                      />
                      {getLocalizedText(
                        `Send to kitchen (${unsentLineCount}) / إرسال للمطبخ`,
                        language,
                      )}
                    </button>
                  ) : null}

                  {hasPermission(user, "POS_COMPLETE_SALE") ? (
                    <button
                      type="button"
                      onClick={
                        orderType === "DELIVERY" && deliveryMode === "THIRD_PARTY"
                          ? completeSale
                          : openPayModal
                      }
                      disabled={
                        cartLines.length === 0 ||
                        (!(orderType === "DELIVERY" && deliveryMode === "THIRD_PARTY") &&
                          !hasPermission(user, "POS_SELECT_PAYMENT_METHOD"))
                      }
                      className={cn(
                        "flex h-[50px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#16a34a] text-[15px] font-bold text-white shadow-sm transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-40",
                        waiterMode && "hidden",
                      )}
                    >
                      <LuWallet className="h-5 w-5" />
                      {orderType === "DELIVERY" && deliveryMode === "THIRD_PARTY"
                        ? getLocalizedText("Complete Order / إكمال الطلب", language)
                        : getLocalizedText("Pay / دفع", language)}
                    </button>
                  ) : null}

                  {canPrintBill ? (
                    <button
                      type="button"
                      onClick={printBillFromCart}
                      disabled={printBillMutation.isPending}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-[#d7e2d8] bg-[#f7faf8] text-xs font-bold text-[#4e6455] transition hover:bg-white disabled:opacity-40"
                    >
                      <LuReceipt className="h-3.5 w-3.5" />
                      {t("pos.sales.printBill")}
                    </button>
                  ) : null}

                  {!waiterMode && !orderKitchenLocked ? (
                    <div className="flex items-center justify-center gap-4 border-t border-[#f3f4f6] pt-2">
                      <button
                        type="button"
                        onClick={saveDraftSale}
                        disabled={!hasPermission(user, "POS_HOLD_SALE")}
                        className="text-[11px] font-medium text-[#9ca3af] transition hover:text-[#6b7280] disabled:opacity-40"
                      >
                        {getLocalizedText("Draft / مسودة", language)}
                      </button>
                      <span className="text-[#e5e7eb]">|</span>
                      <button
                        type="button"
                        onClick={holdSale}
                        disabled={cartLines.length === 0 || !hasPermission(user, "POS_HOLD_SALE")}
                        className="text-[11px] font-medium text-[#9ca3af] transition hover:text-[#6b7280] disabled:opacity-40"
                      >
                        {getLocalizedText("Hold / تعليق", language)}
                      </button>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={requestCancelSale}
                    disabled={orderKitchenLocked}
                    className="w-full py-1 text-center text-[11px] font-medium text-[#dc2626] transition hover:text-[#b91c1c] disabled:hidden"
                  >
                    {getLocalizedText("Cancel / إلغاء", language)}
                  </button>

                  {lastReceipt ? (
                    <button
                      type="button"
                      onClick={() => printReceipt(lastReceipt)}
                      className="w-full rounded-[10px] border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-[11px] font-semibold text-[#6b7280] transition hover:bg-white"
                    >
                      {t("pos.sales.printLastReceipt")}
                    </button>
                  ) : null}

                  {canReprintReceipt && sessionRecentSales.length > 0 ? (
                    <div className="rounded-[10px] border border-[#e5e7eb] bg-[#fafafa] px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setIsRecentReceiptsOpen((open) => !open)}
                        className="flex w-full items-center justify-between gap-2 text-[11px] font-semibold text-[#6b7280]"
                      >
                        <span>{t("pos.sales.recentReceipts")}</span>
                        {isRecentReceiptsOpen ? (
                          <LuChevronDown className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <LuChevronRight className="h-3.5 w-3.5 shrink-0" />
                        )}
                      </button>
                      {isRecentReceiptsOpen ? (
                        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                          {sessionRecentSales.map((sale) => (
                            <li
                              key={sale.id}
                              className="flex items-center justify-between gap-2 rounded-[8px] bg-white px-2 py-1.5"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-[10px] font-bold text-[#374151]">
                                  {sale.receiptNumber ?? sale.reference}
                                </div>
                                <div className="text-[10px] text-[#9ca3af]">
                                  {formatCurrency(parseAmount(sale.totalAmount), sale.currencyCode)}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => reprintReceiptMutation.mutate(sale.id)}
                                disabled={reprintReceiptMutation.isPending}
                                className="shrink-0 rounded-[6px] border border-[#e5e7eb] px-2 py-1 text-[10px] font-bold text-[#4e6455] hover:bg-[#f7faf8] disabled:opacity-40"
                              >
                                {t("pos.sales.reprintReceipt")}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          }
          mobileCartBar={{
            itemCount: cartLines.length,
            totalLabel: formatCurrency(cartMetrics.total, currencyCode),
            itemsLabel:
              cartLines.length === 0
                ? getLocalizedText("No items / لا أصناف", language)
                : cartLines.length === 1
                  ? getLocalizedText("1 item / صنف واحد", language)
                  : getLocalizedText(`${cartLines.length} items / ${cartLines.length} أصناف`, language),
            viewOrderLabel: getLocalizedText("View order / عرض الطلب", language),
            orderTitle: t("pos.sales.orderSummary"),
          }}
        />

        <Modal
          isOpen={isPayModalOpen}
          onClose={() => {
            setIsPayModalOpen(false);
            setPayFlowStep("tender");
          }}
          title={
            payFlowStep === "success"
              ? getLocalizedText("Paid / تم الدفع", language)
              : getLocalizedText("Pay Sale / دفع الفاتورة", language)
          }
        >
          {payFlowStep === "success" && lastReceipt ? (
            <div className="space-y-5 text-center">
              <div className="rounded-[22px] bg-[#eaf6ec] px-4 py-6">
                <p className="text-sm font-black text-[#2d6a4f] arabic-heading">Sale completed</p>
                <p className="mt-1 text-xs text-[#596760]">تم إتمام البيع بنجاح</p>
                <p className="mt-4 text-2xl font-black text-[#1f3427]">
                  {formatCurrency(lastReceipt.total, currencyCode)}
                </p>
              </div>

              {/* Pre-order handoff: prompt cashier to open the table */}
              {preOrderCompletedTableId ? (
                <div className="rounded-xl border border-[#c7c3ff] bg-[#f5f3ff] p-4 text-left">
                  <p className="text-sm font-black text-[#4338ca]">
                    {language === "ar"
                      ? "الطاولة لا تزال متاحة"
                      : "Table is still Available"}
                  </p>
                  <p className="mt-0.5 text-xs text-[#6d56a8]">
                    {language === "ar"
                      ? "الطلب المسبق أُكمل. هل تريد فتح الطاولة الآن كطلب داخلي نشط؟"
                      : "Pre-order completed. Open the table now as an active dine-in order?"}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const tid = preOrderCompletedTableId;
                        setPreOrderCompletedTableId(null);
                        resetSale();
                        setIsPayModalOpen(false);
                        setPayFlowStep("tender");
                        router.push(`/pos/register?tableId=${tid}`);
                      }}
                      className="rounded-xl bg-[#4338ca] px-4 py-2 text-xs font-black text-white hover:bg-[#372fb4]"
                    >
                      {language === "ar" ? "فتح الطاولة" : "Open Table"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreOrderCompletedTableId(null)}
                      className="rounded-xl border border-[#c7c3ff] px-4 py-2 text-xs font-bold text-[#4338ca] hover:bg-[#efefff]"
                    >
                      {language === "ar" ? "تجاهل" : "Skip"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => printReceipt(lastReceipt)}
                  className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-[#d7e2d8] bg-[#f7faf8] px-4 py-3 text-sm font-bold text-[#4e6455]"
                >
                  <LuPrinter className="h-4 w-4" />
                  Print / طباعة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreOrderCompletedTableId(null);
                    resetSale();
                    setIsPayModalOpen(false);
                    setPayFlowStep("tender");
                    if (waiterMode) {
                      router.push("/pos/waiter/tables");
                    } else {
                      window.requestAnimationFrame(() => searchInputRef.current?.focus());
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-[#5f8a67] px-4 py-3 text-sm font-black text-white"
                >
                  New sale / بيع جديد
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-[22px] bg-[#f3f8f4] p-4 text-center">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#66826e]">
                  {getLocalizedText("Total Amount / إجمالي المبلغ", language)}
                </div>
                <div className="mt-2 text-3xl font-black text-[#1f3427]">
                  {formatCurrency(cartMetrics.total, currencyCode)}
                </div>
              </div>

              <div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(["CASH", "CARD", "BANK_TRANSFER", "CLIQ", "MIXED"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setSelectedPayMethod(method);
                        if (method !== "MIXED") {
                          setSinglePaymentMethod(method);
                        }
                      }}
                      className={cn(
                        "rounded-[18px] border px-4 py-3 text-sm font-bold transition min-h-[48px]",
                        selectedPayMethod === method
                          ? "border-[#5f8a67] bg-[#5f8a67] text-white ring-0"
                          : method === "BANK_TRANSFER"
                            ? "border-2 border-[#c3dec9] bg-[#f0faf2] text-[#274a33] hover:border-[#5f8a67]"
                            : "border-[#d7e2d8] bg-white text-[#4f6556] hover:bg-[#f7faf8]",
                      )}
                    >
                      {getPaymentMethodLabel(method, language)}
                    </button>
                  ))}
                </div>
              </div>

              {posSettings?.runtime.allowCreditSale ? (
                <div className="rounded-[18px] border border-[#d6e8db] bg-[#f8fcfa] px-4 py-3 text-xs font-semibold text-[#3d5c45]">
                  {getLocalizedText(
                    "Credit or partial payment allowed when a customer is selected / يُسمح بالبيع الآجل أو الجزئي بعد اختيار عميل حقيقي",
                    language,
                  )}
                </div>
              ) : null}

              {selectedPayMethod === "MIXED" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-[#233329]">
                      {getLocalizedText("Mixed payment / دفعات متعددة", language)}
                    </div>
                    <button
                      type="button"
                      onClick={addPaymentEntry}
                      className="rounded-full border border-[#d7e2d8] px-3 py-1.5 text-xs font-bold text-[#4f6556]"
                    >
                      {getLocalizedText("Add split / إضافة دفعة", language)}
                    </button>
                  </div>
                  {paymentEntriesResolved.map((entry) => {
                    const entryMethod = entry.paymentMethod;
                    return (
                      <div
                        key={entry.id}
                        className="space-y-3 rounded-[20px] border border-[#e2eae4] bg-[#fbfdfb] p-4"
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <select
                            value={entryMethod}
                            onChange={(event) =>
                              updatePaymentEntryMethod(
                                entry.id,
                                event.target.value as
                                | "CASH"
                                | "CARD"
                                | "CLIQ"
                                | "BANK_TRANSFER"
                                | "WALLET",
                              )
                            }
                            className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
                          >
                            <option value="CASH">{getLocalizedText("Cash / نقد", language)}</option>
                            <option value="CARD">{getLocalizedText("Card / بطاقة", language)}</option>
                            <option value="CLIQ">{getLocalizedText("CliQ / كليك", language)}</option>
                            <option value="BANK_TRANSFER">{getLocalizedText("Bank / بنك", language)}</option>
                            <option value="WALLET">{getLocalizedText("Wallet / محفظة", language)}</option>
                          </select>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={entry.amount}
                            onChange={(event) =>
                              updatePaymentEntry(entry.id, { amount: event.target.value })
                            }
                            placeholder={getLocalizedText("Amount / المبلغ", language)}
                            className="rounded-[16px] border-[#d6e1d9] bg-white py-3 no-spinner"
                          />
                        </div>
                        {!entry.bankCashAccountId ? (
                          <div className="rounded-[14px] border border-[#f2c9c1] bg-[#fff4f1] px-4 py-3 text-xs font-bold text-[#9a4338] arabic-auto">
                            طريقة الدفع غير مربوطة بحساب محاسبي
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removePaymentEntry(entry.id)}
                          disabled={paymentEntriesResolved.length === 1}
                          className="rounded-full border border-[#ead8d4] px-3 py-1.5 text-xs font-bold text-[#8a5952] disabled:opacity-40"
                        >
                          {getLocalizedText("Remove / حذف", language)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4 rounded-[22px] border border-[#e2eae4] bg-[#fbfdfb] p-4">
                  {!singlePaymentEntry?.bankCashAccountId ? (
                    <div className="rounded-[16px] border border-[#f2c9c1] bg-[#fff4f1] px-4 py-3 text-xs font-bold text-[#9a4338] arabic-auto">
                      طريقة الدفع غير مربوطة بحساب محاسبي
                    </div>
                  ) : null}
                  <Field label={t("pos.sales.tenderedAmountLabel")} className="mb-0">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={String(cartTotal)}
                      value={singlePaymentEntry?.amount ?? ""}
                      onChange={(event) =>
                        singlePaymentEntry
                          ? updatePaymentEntry(singlePaymentEntry.id, {
                            amount: event.target.value,
                          })
                          : undefined
                      }
                      className="rounded-[16px] border-[#d6e1d9] bg-white py-3 no-spinner"
                    />
                  </Field>
                </div>
              )}

              <div className="rounded-[22px] bg-[#f6f8f6] p-4">
                <div className="grid gap-3">
                  <TotalRow
                    label={t("pos.sales.tenderedLabel")}
                    value={formatCurrency(cartMetrics.tendered, currencyCode)}
                  />
                  <TotalRow
                    label={t("pos.sales.changeLabel")}
                    value={formatCurrency(cartMetrics.change, currencyCode)}
                    emphasized={cartMetrics.change > 0}
                  />
                  <TotalRow
                    label={t("pos.sales.amountDueLabel")}
                    value={formatCurrency(cartMetrics.amountDue, currencyCode)}
                    emphasized={cartMetrics.amountDue > 0}
                  />
                </div>
              </div>

              {payCannotCompleteCredit && cartMetrics.amountDue > 0 ? (
                <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-950">
                  {posSettings?.runtime.allowCreditSale
                    ? getLocalizedText("Select a customer to continue with partial or credit payment / اختر عميلاً لإكمال الدفع الجزئي أو الآجل", language)
                    : getLocalizedText("Tendered amount is below total and credit is disabled / المدفوع أقل من الإجمالي والبيع الآجل غير مفعّل", language)}
                </div>
              ) : null}

              <label className="flex items-center gap-3 rounded-[18px] border border-[#e2eae4] bg-white px-4 py-3 text-sm font-semibold text-[#42564a]">
                <input
                  type="checkbox"
                  checked={autoPrintReceipt}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setAutoPrintReceipt(checked);
                    updatePosPrinterConfig({ autoPrintReceiptOnPay: checked });
                  }}
                  className="h-4 w-4 rounded border-[#c8d7cc] text-[#5f8a67] focus:ring-[#5f8a67]/20"
                />
                {t("pos.sales.printReceiptLabel")}
              </label>

              {canPrintBill ? (
                <button
                  type="button"
                  onClick={printBillFromCart}
                  disabled={printBillMutation.isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] border border-[#d7e2d8] bg-[#f7faf8] px-4 py-3 text-sm font-bold text-[#4e6455] transition hover:bg-white disabled:opacity-40"
                >
                  <LuReceipt className="h-4 w-4" />
                  {t("pos.sales.printBill")}
                </button>
              ) : null}

              <button
                type="button"
                onClick={completeSale}
                disabled={!canCompleteThisSale || completeSaleMutation.isPending}
                className="w-full rounded-[20px] bg-[#5f8a67] px-4 py-3 text-sm font-black text-white shadow-[0_18px_40px_-26px_rgba(95,138,103,0.95)] transition hover:bg-[#557b5c] disabled:opacity-50"
              >
                {completeSaleMutation.isPending
                  ? t("pos.sales.completingAction")
                  : t("pos.sales.completeAction")}
              </button>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={isHeldOrdersOpen}
          onClose={() => setIsHeldOrdersOpen(false)}
          title={getLocalizedText("Held & drafts / معلقة ومسودات", language)}
        >
          <div className="max-h-[min(70vh,520px)] space-y-6 overflow-y-auto text-sm text-[#42564a]">
            {draftSales.length === 0 && heldSales.length === 0 ? (
              <p className="py-6 text-center text-[#6b7c70]">{getLocalizedText("No held or draft sales / لا توجد مبيعات معلقة أو مسودة", language)}</p>
            ) : null}

            {draftSales.length > 0 ? (
              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[#5f6d66]">
                  {getLocalizedText("Drafts / مسودات", language)}
                </div>
                <ul className="space-y-3">
                  {draftSales.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-[18px] border border-[#dfe8e1] bg-[#fafcf9] px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-[#233329]">{row.title}</div>
                          <div className="text-xs text-[#728579]">
                            {new Date(row.createdAt).toLocaleString()}
                          </div>
                          <div className="mt-2">
                            <HeldSaleKindBadges sale={row} t={t} />
                          </div>
                        </div>
                        <span className="rounded-full bg-[#eef3ef] px-2 py-0.5 text-[11px] font-bold text-[#46644b]">
                          {language === "ar" ? `${row.cartLines.length} أسطر` : `${row.cartLines.length} lines`}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {canReprintReceipt ? (
                          <button
                            type="button"
                            onClick={() => printBillForSale(row.id)}
                            disabled={printBillMutation.isPending}
                            className="rounded-[14px] border border-[#d7e2d8] bg-[#f7faf8] px-3 py-2 text-xs font-black text-[#4e6455] disabled:opacity-40"
                          >
                            {t("pos.sales.printBill")}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={!hasPermission(user, "POS_RESUME_OWN_HELD_SALE")}
                          onClick={() => {
                            setIsHeldOrdersOpen(false);
                            resumeHeldSale(row.id, [row]);
                          }}
                          className={cn(
                            "rounded-[14px] bg-[#5f8a67] px-3 py-2 text-xs font-black text-white disabled:opacity-40",
                            canReprintReceipt ? "" : "sm:col-span-2",
                          )}
                        >
                          {getLocalizedText("Resume / استئناف", language)}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {heldSales.length > 0 ? (
              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[#5f6d66]">
                  {getLocalizedText("Held / معلقة", language)}
                </div>
                <ul className="space-y-3">
                  {heldSales.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-[18px] border border-[#dfe8e1] bg-white px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-[#233329]">{row.title}</div>
                          <div className="text-xs text-[#728579]">
                            {new Date(row.createdAt).toLocaleString()}
                          </div>
                          <div className="mt-2">
                            <HeldSaleKindBadges sale={row} t={t} />
                          </div>
                        </div>
                        <span className="rounded-full bg-[#eef3ef] px-2 py-0.5 text-[11px] font-bold text-[#46644b]">
                          {language === "ar" ? `${row.cartLines.length} أسطر` : `${row.cartLines.length} lines`}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {canReprintReceipt ? (
                          <button
                            type="button"
                            onClick={() => printBillForSale(row.id)}
                            disabled={printBillMutation.isPending}
                            className="rounded-[14px] border border-[#d7e2d8] bg-[#f7faf8] px-3 py-2 text-xs font-black text-[#4e6455] disabled:opacity-40"
                          >
                            {t("pos.sales.printBill")}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={!hasPermission(user, "POS_RESUME_OWN_HELD_SALE")}
                          onClick={() => {
                            setIsHeldOrdersOpen(false);
                            resumeHeldSale(row.id, [row]);
                          }}
                          className={cn(
                            "rounded-[14px] bg-[#5f8a67] px-3 py-2 text-xs font-black text-white disabled:opacity-40",
                            canReprintReceipt ? "" : "sm:col-span-2",
                          )}
                        >
                          {getLocalizedText("Resume / استئناف", language)}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Modal>

        <PosCameraScanner
          isOpen={isCameraScannerOpen}
          onClose={() => setIsCameraScannerOpen(false)}
          onScan={handleCameraScan}
        />
        <PosCalculatorModal
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
        />

        <Modal
          isOpen={isCancelSaleOpen}
          onClose={() => setIsCancelSaleOpen(false)}
          title={getLocalizedText("Cancel sale? / إلغاء البيع؟", language)}
        >
          <div className="space-y-4 text-sm text-[#42564a]">
            <p className="leading-7 text-[#596760] arabic-auto">
              {getLocalizedText(
                editingInvoiceId
                  ? "This will void the held or draft invoice on the server and clear your cart. / سيُلغى المستند في الخادم ويُفرغ السلة."
                  : "This will clear the current cart. / سيتم تفريغ السلة الحالية فقط.",
                language,
              )}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelSaleOpen(false)}
                className="flex-1 rounded-[18px] border border-[#d7e2d8] bg-[#f7faf8] px-4 py-3 text-sm font-bold text-[#4f6556] hover:bg-white"
              >
                {getLocalizedText("Keep editing / متابعة", language)}
              </button>
              <button
                type="button"
                disabled={voidSaleMutation.isPending}
                onClick={() => {
                  void confirmCancelSale();
                }}
                className="flex-1 rounded-[18px] border border-[#ead8d4] bg-[#fff5f5] px-4 py-3 text-sm font-black text-[#8a5952] hover:bg-white disabled:opacity-50"
              >
                {voidSaleMutation.isPending ? "..." : getLocalizedText("Confirm cancel / تأكيد", language)}
              </button>
            </div>
          </div>
        </Modal>

        {/* ── Quick-Create Customer Modal ── */}
        <Modal
          isOpen={isAddCustomerOpen}
          onClose={() => {
            setIsAddCustomerOpen(false);
            setNewCustomerName("");
            setNewCustomerTaxTreatmentId("");
          }}
          title={getLocalizedText("New Customer / عميل جديد", language)}
        >
          <div className="space-y-5">
            <p className="text-sm text-[#6b7c70] arabic-auto">
              {getLocalizedText(
                "Quick-create a customer to attach to this sale. You can fill in more details later from the Sales module. / إنشاء سريع لعميل لربطه بهذا البيع. يمكنك ملء المزيد من التفاصيل لاحقًا من موديول المبيعات.",
                language,
              )}
            </p>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#42564a]">
                {getLocalizedText("Customer Name / اسم العميل", language)} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder={getLocalizedText("e.g. Ahmed Ali / مثال: أحمد علي", language)}
                className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-medium text-[#233329] placeholder-[#a0b0a6] focus:border-[#5f8a67] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#42564a]">
                {getLocalizedText("Tax Treatment / المعالجة الضريبية", language)} <span className="text-red-500">*</span>
              </label>
              <select
                value={newCustomerTaxTreatmentId}
                onChange={(e) => setNewCustomerTaxTreatmentId(e.target.value)}
                className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
              >
                <option value="">{getLocalizedText("— Select — / — اختر —", language)}</option>
                {taxTreatments.map((tt: TaxTreatment) => (
                  <option key={tt.id} value={tt.id}>
                    {language === "ar" ? tt.arabicName : tt.englishName}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={!newCustomerName.trim() || !newCustomerTaxTreatmentId || createCustomerMutation.isPending}
              onClick={() =>
                createCustomerMutation.mutate({
                  name: newCustomerName.trim(),
                  taxTreatmentId: newCustomerTaxTreatmentId,
                })
              }
              className="w-full rounded-[20px] bg-[#5f8a67] px-4 py-3 text-sm font-black text-white shadow-[0_18px_40px_-26px_rgba(95,138,103,0.95)] transition hover:bg-[#557b5c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createCustomerMutation.isPending ? getLocalizedText("Creating… / جارٍ الإنشاء…", language) : getLocalizedText("Create & Select / إنشاء واختيار", language)}
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={isTableSelectorOpen}
          onClose={() => setIsTableSelectorOpen(false)}
          title={getLocalizedText("Floor tables / طاولات المطعم", language)}
        >
          <div className="grid max-h-[70vh] grid-cols-2 gap-3 overflow-y-auto md:grid-cols-3">
            {restaurantTables.map((table) => {
              const isSelected = selectedTableId === table.id;
              const isBusy = Boolean(table.activeInvoice?.id) && table.activeInvoice?.id !== editingInvoiceId && !isSelected;
              return (
                <button
                  key={table.id}
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    setIsTableSelectorOpen(false);
                    if (isBusy && table.activeInvoice?.id) {
                      router.push(buildPosRegisterTablePath(table, waiterMode ? "/pos/waiter/order" : "/pos/register"));
                      return;
                    }
                    await handleTableSelect(table.id, table.assignedWaiter?.id ?? null);
                  }}
                  className={cn(
                    "rounded-[18px] border p-4 text-left transition",
                    isSelected
                      ? "border-[#5f8a67] bg-[#edf5ef]"
                      : isBusy
                        ? "cursor-not-allowed border-[#ead8d4] bg-[#fff6f5] text-[#94665f]"
                        : "border-[#dbe4de] bg-white",
                  )}
                >
                  <div className="text-sm font-black text-[#233329]">{table.tableNumber}</div>
                  <div className="mt-1 text-xs text-[#68776f]">
                    {language === "ar"
                      ? `${table.status.replaceAll("_", " ")} • ${table.capacity} مقاعد`
                      : `${table.status.replaceAll("_", " ")} • ${table.capacity} seats`}
                  </div>
                  <div className="mt-2 text-[11px] text-[#5a6b61]">
                    {table.assignedWaiter?.name ?? getLocalizedText("No waiter assigned / لا يوجد نادل معين", language)}
                  </div>
                </button>
              );
            })}
          </div>
        </Modal>

        <Modal
          isOpen={isTransferTableOpen}
          onClose={() => setIsTransferTableOpen(false)}
          title={getLocalizedText("Transfer Table / نقل الطاولة", language)}
        >
          <div className="space-y-4">
            <select
              value={transferTargetTableId}
              onChange={(event) => setTransferTargetTableId(event.target.value)}
              className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
            >
              <option value="">{getLocalizedText("Select target table / اختر الطاولة الهدف", language)}</option>
              {restaurantTables
                .filter((table) => table.id !== selectedTableId && !table.activeInvoice?.id)
                .map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.tableNumber}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!selectedTableId || !transferTargetTableId || transferTableMutation.isPending}
              onClick={() =>
                transferTableMutation.mutate({
                  fromTableId: selectedTableId!,
                  toTableId: transferTargetTableId,
                })
              }
              className="w-full rounded-[18px] bg-[#5f8a67] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {getLocalizedText("Confirm transfer / تأكيد النقل", language)}
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={isMergeTablesOpen}
          onClose={() => setIsMergeTablesOpen(false)}
          title={getLocalizedText("Merge Tables / دمج الطاولات", language)}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              {restaurantTables
                .filter((table) => table.id !== selectedTableId && table.activeInvoice?.id)
                .map((table) => (
                  <label key={table.id} className="flex items-center gap-3 rounded-[14px] border border-[#dbe4de] bg-[#fafcf9] px-4 py-3 text-sm text-[#42564a]">
                    <input
                      type="checkbox"
                      checked={mergeSourceTableIds.includes(table.id)}
                      onChange={(event) =>
                        setMergeSourceTableIds((current) =>
                          event.target.checked
                            ? [...current, table.id]
                            : current.filter((id) => id !== table.id),
                        )
                      }
                    />
                    <span>{table.tableNumber}</span>
                  </label>
                ))}
            </div>
            <button
              type="button"
              disabled={!selectedTableId || mergeSourceTableIds.length === 0 || mergeTablesMutation.isPending}
              onClick={() =>
                mergeTablesMutation.mutate({
                  sourceTableIds: mergeSourceTableIds,
                  targetTableId: selectedTableId!,
                })
              }
              className="w-full rounded-[18px] bg-[#5f8a67] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {getLocalizedText("Merge into selected table / دمج في الطاولة المختارة", language)}
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={isSplitBillOpen}
          onClose={() => setIsSplitBillOpen(false)}
          title={getLocalizedText("Split Bill / تقسيم الفاتورة", language)}
        >
          <div className="max-h-[70vh] space-y-4 overflow-y-auto">
            {cartLines.map((line) => (
              <div key={line.itemId} className="grid grid-cols-[minmax(0,1fr)_120px] gap-3 rounded-[14px] border border-[#dbe4de] bg-[#fafcf9] p-3">
                <div>
                  <div className="text-sm font-bold text-[#233329]">{line.name}</div>
                  <div className="text-xs text-[#68776f]">
                    {language === "ar" ? `الكمية الحالية: ${line.quantity}` : `Current qty: ${line.quantity}`}
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  max={line.quantity}
                  step="1"
                  value={splitBillQuantities[line.itemId] ?? ""}
                  onChange={(event) =>
                    setSplitBillQuantities((current) => ({
                      ...current,
                      [line.itemId]: event.target.value,
                    }))
                  }
                  className="rounded-[12px] border border-[#d6e1d9] bg-white px-3 py-2 text-sm font-semibold text-[#233329]"
                />
              </div>
            ))}
            <button
              type="button"
              disabled={!selectedTableId || splitBillMutation.isPending}
              onClick={() => {
                const lines = cartLines
                  .map((line) => ({
                    itemId: line.itemId,
                    quantity: parseAmount(splitBillQuantities[line.itemId]),
                  }))
                  .filter((line) => line.quantity > 0);
                if (lines.length === 0) {
                  pushError("Select at least one quantity to split.");
                  return;
                }
                splitBillMutation.mutate({ tableId: selectedTableId!, lines });
              }}
              className="w-full rounded-[18px] bg-[#5f8a67] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {getLocalizedText("Create split invoice / إنشاء فاتورة منفصلة", language)}
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={isCashierCloseModalOpen}
          onClose={() => {
            setIsCashierCloseModalOpen(false);
            setActualCashCount("");
            setClosingNotes("");
          }}
          title={getLocalizedText("Close shift / إغلاق الوردية", language)}
        >
          <div className="space-y-4">
            <div className="text-center py-2 px-3 text-sm font-bold text-[#4c6e52] bg-[#f0f5f1] rounded-[14px]">
              {getLocalizedText(
                "Well done team, thank you for your hard work! / يعطيكم العافية شباب ولله ما قصرتوا",
                language,
              )}
            </div>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={actualCashCount}
              onChange={(event) => setActualCashCount(event.target.value)}
              placeholder={getLocalizedText("Actual counted cash / النقد الفعلي", language)}
              className="rounded-[16px] border-[#d6e1d9] bg-white py-3"
            />
            <Input
              value={closingNotes}
              onChange={(event) => setClosingNotes(event.target.value)}
              placeholder={getLocalizedText("Closing notes / ملاحظات الإغلاق", language)}
              className="rounded-[16px] border-[#d6e1d9] bg-white py-3"
            />
            <button
              type="button"
              disabled={
                !activeSession?.id ||
                closeSessionMutation.isPending ||
                actualCashCount.trim() === ""
              }
              onClick={() =>
                activeSession
                  ? closeSessionMutation.mutate({
                      sessionId: activeSession.id,
                      actualCash: parseAmount(actualCashCount),
                      notes: closingNotes.trim() || undefined,
                    })
                  : undefined
              }
              className="w-full rounded-[18px] bg-[#5f8a67] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {getLocalizedText("Confirm shift close / تأكيد الإغلاق", language)}
            </button>
          </div>
        </Modal>

        <PosLineAddonModal
          isOpen={Boolean(addonModalItem)}
          itemName={addonModalItem?.name ?? ""}
          config={addonModalConfig}
          language={language}
          weightSelection={
            addonModalItem && isWeightSaleItem(addonModalItem) && !addonEditLine
              ? {
                  enabled: true,
                  unitCode: addonModalItem.unitOfMeasure,
                  precision: getQuantityPrecision(addonModalItem),
                  minWeight:
                    addonModalItem.code === "MENU-001" || addonModalItem.code === "MENU-006"
                      ? 0.125
                      : getMinSalesQuantity(addonModalItem),
                  maxWeight:
                    addonModalItem.trackInventory &&
                    !Boolean(posSettings?.runtime.negativeStockAllowed)
                      ? parseAmount(addonModalItem.onHandQuantity)
                      : null,
                  pricePerUnit: parseAmount(addonModalItem.defaultSalesPrice),
                  presets: getCustomWeightPresets(addonModalItem),
                  initialWeight: pendingEntryWeight ?? null,
                }
              : undefined
          }
          initialAddons={
            addonEditLine ? getAddonsFromModifiers(addonEditLine.modifiers) : []
          }
          initialLineNote={addonEditLine?.lineNote ?? ""}
          onClose={() => {
            setAddonModalItem(null);
            setAddonModalConfig(null);
            setAddonEditLine(null);
            setPendingEntryWeight(null);
          }}
          onConfirm={({ addons, lineNote, selectedWeight }) => {
            if (addonModalItem) {
              appendCartLine(
                addonModalItem,
                addons,
                lineNote,
                addonEditLine,
                selectedWeight ?? pendingEntryWeight,
              );
            }
            setAddonModalItem(null);
            setAddonModalConfig(null);
            setAddonEditLine(null);
            setPendingEntryWeight(null);
          }}
        />
      </div>
    );
  };

  const renderSessionsWorkspace = () => {
    const report = sessionReportQuery.data ?? lastSessionReport;

    return (
      <div className="space-y-6">
        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
          <div className="text-2xl font-black text-[#233329] arabic-heading">
            {t("pos.workspace.sessions")}
          </div>
          <p className="mt-2 text-sm text-[#64736b] arabic-auto">
            {activeSession
              ? t("pos.sessions.activeDescription", {
                sessionNumber: activeSession.sessionNumber,
                terminalName: activeSession.terminalName,
              })
              : t("pos.sessions.noOpen")}
          </p>
          {report ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <SoftMetric
                label={t("pos.sessions.expected")}
                value={report.expectedCash}
                hint={t("pos.sales.expectedCash")}
              />
              <SoftMetric
                label={t("pos.sessions.actual")}
                value={report.actualCash ?? "—"}
                hint={t("pos.sessions.actual")}
              />
              <SoftMetric
                label={t("pos.sessions.difference")}
                value={report.difference ?? "—"}
                hint={t("pos.sessions.difference")}
              />
              <SoftMetric
                label={t("pos.sessions.invoices")}
                value={formatCount(report.invoiceCount)}
                hint={t("pos.sessions.returnsHint", { count: report.returnCount })}
              />
            </div>
          ) : null}
        </Card>
        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
          <div className="text-lg font-black text-[#233329] arabic-heading">
            {t("pos.sessions.recent")}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-3">
              {(posSessionsQuery.data ?? []).map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionReportId(session.id)}
                  className={cn(
                    "w-full rounded-[20px] border p-4 text-left transition",
                    selectedSessionId === session.id
                      ? "border-[#46644b] bg-[#f3f7f3]"
                      : "border-[#dbe2dd] bg-[#f8faf8]",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-[#233329]">
                        {session.sessionNumber}
                      </div>
                      <div className="text-sm text-[#66756d]">
                        {session.terminalName} · {session.warehouse.name}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-[#46644b]">
                      {session.status}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {report ? (
              <div className="rounded-[20px] border border-[#dbe2dd] bg-[#f8faf8] p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <DetailTile label={t("pos.sessions.branch")} value={report.branchName || "—"} />
                  <DetailTile label={t("pos.sessions.warehouse")} value={report.warehouse.name} />
                  <DetailTile label={t("pos.sessions.cashAccount")} value={report.cashAccount.name} />
                  <DetailTile label={t("pos.sessions.openingCash")} value={report.openingCash} />
                  <DetailTile label={t("pos.sessions.cashSales")} value={report.cashSales} />
                  <DetailTile label={t("pos.sessions.cashRefunds")} value={report.cashRefunds} />
                  <DetailTile label={t("pos.sessions.cardSales")} value={report.cardSales} />
                  <DetailTile label={t("pos.sessions.cliqSales")} value={report.cliqSales} />
                  <DetailTile label={t("pos.sessions.walletSales")} value={report.walletSales} />
                  <DetailTile label={t("pos.sessions.bankTransferSales")} value={report.bankTransferSales} />
                  <DetailTile label={t("pos.sessions.discounts")} value={report.discounts} />
                  <DetailTile label={t("pos.sessions.tax")} value={report.tax} />
                  <DetailTile label={t("pos.sessions.totalSales")} value={report.totalSales} />
                  <DetailTile label={t("pos.sessions.openedAt")} value={new Date(report.openedAt).toLocaleString()} />
                  <DetailTile
                    label={t("pos.sessions.closedAt")}
                    value={report.closedAt ? new Date(report.closedAt).toLocaleString() : "—"}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-[20px] border border-dashed border-[#dbe2dd] bg-[#fafcf9] p-6 text-sm text-[#64736b]">
                Session report details will appear here once a POS session is selected.
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderHeldWorkspace = () => {
    const renderHeldSaleCard = (
      heldSale: HeldSale,
      resumeLabelKey: "pos.held.resumeDraft" | "pos.sales.resumeHeld",
    ) => (
      <PosHeldSaleCard
        key={heldSale.id}
        sale={heldSale}
        language={language}
        currencyCode={currencyCode}
        resumeLabel={t(resumeLabelKey)}
        t={t}
        onResume={() => {
          stashHeldSaleForResume(heldSale);
          startRoutingTransition(() => {
            router.replace(buildPosRegisterResumePath(heldSale));
          });
        }}
        onVoid={() => voidSaleMutation.mutate(heldSale.id)}
        isVoiding={voidSaleMutation.isPending}
      />
    );

    return (
      <div className="space-y-6">
        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
          <div className="text-2xl font-black text-[#233329] arabic-heading">
            {t("pos.workspace.held")}
          </div>
          <p className="mt-2 text-sm text-[#64736b] arabic-auto">
            {t("pos.held.description")}
          </p>
          <p className="mt-2 text-xs text-[#728579] arabic-auto">{t("pos.held.legend")}</p>
        </Card>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="text-sm font-black uppercase tracking-[0.16em] text-[#5c7463]">
              {getLocalizedText("Draft Sales / مسودات", language)}
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {draftSales.length > 0 ? (
                draftSales.map((heldSale) =>
                  renderHeldSaleCard(heldSale, "pos.held.resumeDraft"),
                )
              ) : (
                <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 text-sm text-[#64736b]">
                  {getLocalizedText("No POS drafts saved yet. / لا توجد مسودات", language)}
                </Card>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-black uppercase tracking-[0.16em] text-[#5c7463]">
              {getLocalizedText("Held Sales / معلقة", language)}
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {heldSales.length > 0 ? (
                heldSales.map((heldSale) =>
                  renderHeldSaleCard(heldSale, "pos.sales.resumeHeld"),
                )
              ) : (
                <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 text-sm text-[#64736b]">
                  {t("pos.held.empty")}
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReviewWorkspace = () => {
    return (
      <PosReviewWorkspace
        sessions={posSessionsQuery.data ?? []}
        onRejectSessionReview={(sessionId) =>
          rejectSessionReviewMutation.mutate(sessionId)
        }
        correctionDeliveryCompanyId={correctionDeliveryCompanyId}
        correctionDeliveryFee={correctionDeliveryFee}
        correctionDriverId={correctionDriverId}
        correctionOrderType={correctionOrderType}
        correctionPaymentDeliveryCompanyId={correctionPaymentDeliveryCompanyId}
        correctionPaymentMethod={correctionPaymentMethod}
        correctionPaymentReason={correctionPaymentReason}
        correctionPaymentReference={correctionPaymentReference}
        correctionReason={correctionReason}
        correctionServiceCharge={correctionServiceCharge}
        correctionTableId={correctionTableId}
        deliveryCompanies={deliveryCompanies}
        deliveryDrivers={deliveryDrivers}
        isCorrectOrderTypeOpen={isCorrectOrderTypeOpen}
        isCorrectPaymentMethodOpen={isCorrectPaymentMethodOpen}
        journalEntries={reviewJournalEntriesQuery.data ?? []}
        paymentAccounts={paymentAccountsQuery.data ?? []}
        onApproveReview={(saleId) => approveReviewMutation.mutate(saleId)}
        onApproveSessionReview={(sessionId, decision, reason) =>
          approveSessionReviewMutation.mutate({ sessionId, decision, reason })
        }
        onAssignDriver={(saleId, driverId) =>
          assignDriverMutation.mutate({ saleId, driverId })
        }
        onCloseCorrectionModal={() => {
          setIsCorrectOrderTypeOpen(false);
          setSelectedCorrectionSale(null);
        }}
        onClosePaymentCorrectionModal={() => {
          setIsCorrectPaymentMethodOpen(false);
          setSelectedPaymentCorrectionSale(null);
        }}
        onCorrectionDeliveryCompanyIdChange={setCorrectionDeliveryCompanyId}
        onCorrectionDeliveryFeeChange={setCorrectionDeliveryFee}
        onCorrectionDriverIdChange={setCorrectionDriverId}
        onCorrectionOrderTypeChange={setCorrectionOrderType}
        onCorrectionPaymentDeliveryCompanyIdChange={setCorrectionPaymentDeliveryCompanyId}
        onCorrectionPaymentMethodChange={setCorrectionPaymentMethod}
        onCorrectionPaymentReasonChange={setCorrectionPaymentReason}
        onCorrectionPaymentReferenceChange={setCorrectionPaymentReference}
        onCorrectionReasonChange={setCorrectionReason}
        onCorrectionServiceChargeChange={setCorrectionServiceCharge}
        onCorrectionTableIdChange={setCorrectionTableId}
        onOpenCorrectionModal={openCorrectionModal}
        onOpenPaymentCorrectionModal={openPaymentCorrectionModal}
        onRejectReview={(saleId) => rejectReviewMutation.mutate(saleId)}
        onReprintReceipt={(saleId) => reprintReceiptMutation.mutate(saleId)}
        onReverseReview={(saleId) => reverseReviewMutation.mutate(saleId)}
        onReviewSessionChange={setReviewSessionId}
        onReviewTabChange={setReviewTab}
        onSaveCorrection={() => {
          if (!selectedCorrectionSale) return;
          correctOrderTypeMutation.mutate({
            saleId: selectedCorrectionSale.id,
            data: {
              orderType: correctionOrderType,
              tableId: correctionTableId || null,
              deliveryCompanyId: correctionDeliveryCompanyId || null,
              driverId: correctionDriverId || null,
              serviceChargeAmount: parseAmount(correctionServiceCharge),
              deliveryFeeAmount: parseAmount(correctionDeliveryFee),
              reason: correctionReason.trim(),
            },
          });
        }}
        onSavePaymentCorrection={() => {
          if (!selectedPaymentCorrectionSale) return;
          correctPaymentMethodMutation.mutate({
            saleId: selectedPaymentCorrectionSale.id,
            data: {
              paymentMethod: correctionPaymentMethod,
              deliveryCompanyId:
                correctionPaymentMethod === "DELIVERY"
                  ? correctionPaymentDeliveryCompanyId || null
                  : null,
              reference: correctionPaymentReference.trim() || null,
              reason: correctionPaymentReason.trim(),
            },
          });
        }}
        onUpdateDeliveryStatus={(saleId, status) =>
          updateDeliveryStatusMutation.mutate({ saleId, status })
        }
        report={reviewSessionReportQuery.data ?? null}
        restaurantTables={restaurantTables}
        reviewQueryDataLength={(reviewQuery.data ?? []).length}
        reviewSessionGroups={reviewSessionGroups}
        reviewTab={reviewTab}
        posSettings={settingsQuery.data ?? null}
        savingCorrection={correctOrderTypeMutation.isPending}
        savingPaymentCorrection={correctPaymentMethodMutation.isPending}
        selectedCorrectionSale={selectedCorrectionSale}
        selectedPaymentCorrectionSale={selectedPaymentCorrectionSale}
        selectedReviewGroup={selectedReviewGroup}
        t={t}
      />
    );
  };

  const renderReturnsWorkspace = () => {
    const returns = returnsQuery.data ?? [];

    return (
      <div className="space-y-6">
        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
          <div className="text-2xl font-black text-[#233329] arabic-heading">
            {t("pos.workspace.returns")}
          </div>
          <p className="mt-2 text-sm text-[#64736b] arabic-auto">
            {t("pos.returns.description")}
          </p>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
            <div className="text-lg font-black text-[#233329]">{t("pos.returns.createTitle")}</div>
            <div className="mt-4 space-y-4">
              <Field label={t("pos.returns.originalSaleLabel")} className="mb-0">
                <select
                  value={selectedReturnSaleId}
                  onChange={(event) => setSelectedReturnSaleId(event.target.value)}
                  className="w-full rounded-[18px] border border-[#d4ddd7] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
                >
                  <option value="">{t("pos.returns.selectSalePlaceholder")}</option>
                  {completedSales.map((sale) => (
                    <option key={sale.id} value={sale.id}>
                      {sale.reference} · {sale.totalAmount} {sale.currencyCode}
                    </option>
                  ))}
                </select>
              </Field>
              {selectedReturnSale ? (
                <>
                  <div className="rounded-[20px] border border-[#dbe2dd] bg-[#f8faf8] p-4">
                    <div className="grid gap-2 md:grid-cols-2">
                      <DetailTile label={t("pos.returns.receiptLabel")} value={selectedReturnSale.receiptNumber ?? "—"} compact />
                      <DetailTile label={t("pos.returns.sessionLabel")} value={selectedReturnSale.session?.sessionNumber ?? "—"} compact />
                      <DetailTile label={t("pos.returns.warehouseLabel")} value={selectedReturnSale.session?.warehouse.name ?? "—"} compact />
                      <DetailTile label={t("pos.returns.invoiceTotalLabel")} value={selectedReturnSale.totalAmount} compact />
                    </div>
                  </div>
                  <Field label={t("pos.returns.reasonLabel")} className="mb-0">
                    <Input
                      value={returnReason}
                      onChange={(event) => setReturnReason(event.target.value)}
                      placeholder={t("pos.returns.reasonPlaceholder")}
                      className="rounded-[18px] border-[#d4ddd7] bg-white py-3"
                    />
                  </Field>
                  <div className="space-y-3">
                    {selectedReturnSale.lines.map((line) => {
                      const soldQuantity = parseAmount(line.quantity);
                      return (
                        <div
                          key={line.id}
                          className="grid gap-3 rounded-[20px] border border-[#dbe2dd] bg-[#fbfcfb] p-4 lg:grid-cols-[minmax(0,1fr)_140px_140px]"
                        >
                          <div>
                            <div className="font-bold text-[#233329]">
                              {line.itemName ?? line.description ?? `Line ${line.lineNumber}`}
                            </div>
                            <div className="mt-1 text-sm text-[#68776f]">
                              {t("pos.returns.soldAt", {
                                quantity: soldQuantity,
                                price: line.unitPrice,
                              })}
                            </div>
                          </div>
                          <DetailTile label={t("pos.returns.lineTotalLabel")} value={line.lineAmount} compact />
                          <Field label={t("pos.returns.returnQtyLabel")} className="mb-0">
                            <Input
                              type="number"
                              min="0"
                              max={String(soldQuantity)}
                              step="0.0001"
                              value={returnQuantities[line.id] ?? ""}
                              onChange={(event) =>
                                setReturnQuantities((current) => ({
                                  ...current,
                                  [line.id]: event.target.value,
                                }))
                              }
                              className="rounded-[16px] border-[#d4ddd7] bg-white py-3"
                            />
                          </Field>
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-3 rounded-[24px] border border-[#dbe2dd] bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-[#233329]">
                        {t("pos.returns.refundMethodsTitle")}
                      </div>
                      <button
                        type="button"
                        onClick={addReturnPaymentEntry}
                        className="rounded-full border border-[#d6ded8] px-3 py-1.5 text-xs font-bold text-[#55645c]"
                      >
                        {t("pos.returns.addRefundAction")}
                      </button>
                    </div>
                    {returnPaymentEntriesResolved.map((entry) => (
                      <div
                        key={entry.id}
                        className="grid gap-3 rounded-[18px] border border-[#e1e7e2] bg-[#fbfcfb] p-3 lg:grid-cols-[0.9fr_1fr_0.85fr_0.9fr_auto]"
                      >
                        <select
                          value={entry.refundMethod}
                          onChange={(event) =>
                            updateReturnPaymentEntry(entry.id, {
                              refundMethod: event.target.value as ReturnPaymentEntry["refundMethod"],
                            })
                          }
                          className="w-full rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
                        >
                          <option value="CASH">{t("pos.returns.method.CASH")}</option>
                          <option value="CARD">{t("pos.returns.method.CARD")}</option>
                          <option value="CLIQ">{t("pos.returns.method.CLIQ")}</option>
                          <option value="BANK_TRANSFER">{t("pos.returns.method.BANK_TRANSFER")}</option>
                          <option value="WALLET">{t("pos.returns.method.WALLET")}</option>
                          <option value="STORE_CREDIT">{t("pos.returns.method.STORE_CREDIT")}</option>
                        </select>
                        <select
                          value={entry.bankCashAccountId}
                          onChange={(event) =>
                            updateReturnPaymentEntry(entry.id, {
                              bankCashAccountId: event.target.value,
                            })
                          }
                          disabled={entry.refundMethod === "STORE_CREDIT"}
                          className="w-full rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-3 text-sm font-semibold text-[#233329] disabled:bg-[#f2f4f2]"
                        >
                          {paymentAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {isArabic ? (account.account?.nameAr || account.name) : account.name}
                            </option>
                          ))}
                        </select>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry.amount}
                          onChange={(event) =>
                            updateReturnPaymentEntry(entry.id, { amount: event.target.value })
                          }
                          className="rounded-[16px] border-[#d4ddd7] bg-white py-3"
                        />
                        <Input
                          value={entry.reference}
                          onChange={(event) =>
                            updateReturnPaymentEntry(entry.id, { reference: event.target.value })
                          }
                          placeholder={t("pos.returns.referencePlaceholder")}
                          className="rounded-[16px] border-[#d4ddd7] bg-white py-3"
                        />
                        <button
                          type="button"
                          onClick={() => removeReturnPaymentEntry(entry.id)}
                          disabled={returnPaymentEntriesResolved.length === 1}
                          className="rounded-[16px] border border-[#ead7d5] px-3 py-3 text-xs font-bold text-[#8f5a55] disabled:opacity-40"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-3 rounded-[24px] border border-[#dbe2dd] bg-[#f8faf8] p-4 sm:grid-cols-3">
                    <DetailTile label={t("pos.returns.returnedLines")} value={String(returnPreview.selectedLineCount)} compact />
                    <DetailTile label={t("pos.returns.expectedRefund")} value={formatCurrency(returnPreview.totalAmount)} compact />
                    <DetailTile
                      label={t("pos.returns.allocatedRefund")}
                      value={formatCurrency(
                        returnPaymentEntriesResolved.reduce(
                          (sum, entry) => sum + entry.amountValue,
                          0,
                        ),
                      )}
                      compact
                    />
                  </div>
                  <button
                    type="button"
                    onClick={createReturnFromSelection}
                    disabled={createReturnMutation.isPending}
                    className="w-full rounded-[20px] bg-[#46644b] px-4 py-3 text-sm font-black text-white"
                  >
                    {createReturnMutation.isPending ? "..." : t("pos.returns.createTitle")}
                  </button>
                </>
              ) : (
                <div className="rounded-[20px] border border-dashed border-[#dbe2dd] bg-[#fafcf9] p-6 text-sm text-[#64736b]">
                  {t("pos.returns.selectSaleHelp")}
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <SoftMetric
                  label={t("pos.returns.returnsMetric")}
                  value={formatCount(returns.length)}
                  hint={t("pos.returns.returnsHint")}
                />
                <SoftMetric
                  label={t("pos.returns.refundedMetric")}
                  value={formatCurrency(
                    returns.reduce((sum, row) => sum + parseAmount(row.refundAmount), 0),
                  )}
                  hint={t("pos.returns.refundedHint")}
                />
                <SoftMetric
                  label={t("pos.returns.pendingMetric")}
                  value={formatCount(
                    returns.filter((row) => row.accountingStatus === "PENDING_REVIEW").length,
                  )}
                  hint={t("pos.returns.pendingHint")}
                />              </div>
            </Card>
            {returns.map((posReturn) => (
              <Card key={posReturn.id} className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-[#233329]">{posReturn.reference}</div>
                    <div className="mt-1 text-sm text-[#68776f]">
                      {posReturn.salesInvoice.reference} · {posReturn.accountingStatus} ·{" "}
                      {formatCurrency(parseAmount(posReturn.totalAmount), posReturn.currencyCode)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {posReturn.accountingStatus === "POSTED" ? (
                      <button
                        type="button"
                        onClick={() => reverseReturnMutation.mutate(posReturn.id)}
                        className="rounded-full border border-[#ead7d5] px-4 py-2 text-xs font-bold text-[#8f5a55]"
                      >
                        Reverse
                      </button>
                    ) : posReturn.accountingStatus !== "REVERSED" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => approveReturnMutation.mutate(posReturn.id)}
                          className="rounded-full bg-[#46644b] px-4 py-2 text-xs font-bold text-white"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectReturnMutation.mutate(posReturn.id)}
                          className="rounded-full border border-[#ead7d5] px-4 py-2 text-xs font-bold text-[#8f5a55]"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#5e6d65]">
                  {posReturn.payments.map((payment) => (
                    <span
                      key={payment.id}
                      className="rounded-full border border-[#d7ddd8] bg-white px-3 py-1.5"
                    >
                      {payment.refundMethod} · {payment.amount}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
            {returns.length === 0 ? (
              <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 text-sm text-[#64736b]">
                No POS returns have been recorded yet.
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const renderReportsWorkspace = () => {
    const overview = reportsOverviewQuery.data;
    const salesByPaymentMethod =
      salesByPaymentMethodQuery.data ?? overview?.salesByPaymentMethod ?? [];
    const salesByCashier = salesByCashierQuery.data ?? overview?.salesByCashier ?? [];
    const salesByBranch = salesByBranchQuery.data ?? overview?.salesByBranch ?? [];
    const salesByItem = salesByItemQuery.data ?? [];
    const inventoryImpact = inventoryImpactQuery.data ?? [];
    const taxSummary = taxSummaryQuery.data ?? overview?.taxSummary ?? [];
    const localizeReportName = (value?: string | null) => {
      if (!value || value === "Unassigned") {
        return t("pos.reports.unassigned");
      }
      if (value === "Untaxed" || value === "UNTAXED") {
        return t("pos.reports.untaxed");
      }
      return getLocalizedText(value, language);
    };
    const localizeReportPaymentMethod = (method: string) => {
      switch (method) {
        case "CASH":
        case "CARD":
        case "CLIQ":
        case "BANK_TRANSFER":
        case "WALLET":
        case "STORE_CREDIT":
          return t(`pos.returns.method.${method}`);
        default:
          return getLocalizedText(method, language);
      }
    };
    const localizeTaxSummaryLabel = (row: PosTaxSummaryRow) => {
      const taxLabel =
        row.taxCode === "UNTAXED"
          ? t("pos.reports.untaxed")
          : getLocalizedText(row.taxCode || row.taxName, language);
      return `${taxLabel} (${row.rate}%)`;
    };

    return (
      <div className="space-y-6">
        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
          <div className="text-2xl font-black text-[#233329] arabic-heading">
            {t("pos.workspace.reports")}
          </div>
          <p className="mt-2 text-sm text-[#64736b] arabic-auto">
            {t("pos.reports.description")}
          </p>
          {overview ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <SoftMetric
                label={t("pos.reports.pendingReviewLabel")}
                value={formatCount(overview.pendingReviewCount)}
                hint={t("pos.reports.pendingReviewHint")}
              />
              <SoftMetric
                label={t("pos.reports.paymentMixLabel")}
                value={formatCount(salesByPaymentMethod.length)}
                hint={t("pos.reports.paymentMixHint")}
              />
              <SoftMetric
                label={t("pos.reports.cashiersLabel")}
                value={formatCount(salesByCashier.length)}
                hint={t("pos.reports.cashiersHint")}
              />
              <SoftMetric
                label={t("pos.reports.branchesLabel")}
                value={formatCount(salesByBranch.length)}
                hint={t("pos.reports.branchesHint")}
              />
            </div>
          ) : null}
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <ReportCard
            title={t("pos.reports.salesByPaymentTitle")}
            rows={salesByPaymentMethod.map((row) => ({
              label: localizeReportPaymentMethod(row.method),
              value: t("pos.reports.paymentValue", {
                amount: row.salesAmount,
                count: row.invoiceCount,
              }),
            }))}
          />
          <ReportCard
            title={t("pos.reports.salesByCashierTitle")}
            rows={salesByCashier.map((row) => ({
              label: localizeReportName(row.cashierName),
              value: t("pos.reports.paymentValue", {
                amount: row.salesAmount,
                count: row.invoiceCount,
              }),
            }))}
          />
          <ReportCard
            title={t("pos.reports.salesByBranchTitle")}
            rows={salesByBranch.map((row) => ({
              label: localizeReportName(row.branchName),
              value: t("pos.reports.paymentValue", {
                amount: row.salesAmount,
                count: row.invoiceCount,
              }),
            }))}
          />
          <ReportCard
            title={t("pos.reports.taxSummaryTitle")}
            rows={taxSummary.map((row: PosTaxSummaryRow) => ({
              label: localizeTaxSummaryLabel(row),
              value: t("pos.reports.taxValue", {
                netTax: row.netTax,
                returnTax: row.returnTax,
              }),
            }))}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <DetailedTableCard
            title={t("pos.reports.salesByItemTitle")}
            headers={[
              t("pos.reports.header.item"),
              t("pos.reports.header.qty"),
              t("pos.reports.header.sales"),
              t("pos.reports.header.tax"),
            ]}
            rows={salesByItem.map((row: PosSalesByItemRow) => [
              localizeReportName(row.itemName),
              row.quantity,
              row.salesAmount,
              row.taxAmount,
            ])}
          />
          <DetailedTableCard
            title={t("pos.reports.inventoryImpactTitle")}
            headers={[
              t("pos.reports.header.reference"),
              t("pos.reports.header.item"),
              t("pos.reports.header.warehouse"),
              t("pos.reports.header.qtyInOut"),
              t("pos.reports.header.runningQty"),
            ]}
            rows={inventoryImpact.map((row: PosInventoryImpactRow) => [
              row.transactionReference,
              row.item?.name ? getLocalizedText(row.item.name, language) : "—",
              row.warehouse?.name ? getLocalizedText(row.warehouse.name, language) : "—",
              `${row.quantityOut} / ${row.quantityIn}`,
              row.runningQuantity,
            ])}
          />
        </div>
      </div>
    );
  };


  const renderWorkspace = () => {
    if (workspace === "sales") {
      return renderSalesWorkspace();
    }

    if (workspace === "sessions") {
      return renderSessionsWorkspace();
    }

    if (workspace === "held") {
      return renderHeldWorkspace();
    }

    if (workspace === "review") {
      return renderReviewWorkspace();
    }

    if (workspace === "returns") {
      return renderReturnsWorkspace();
    }

    if (workspace === "reports") {
      return renderReportsWorkspace();
    }

    if (workspace === "printers") {
      return (
        <div className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8">
          <PosPrinterSettingsPanel />
        </div>
      );
    }

    if (workspace === "settings") {
      return (
        <SettingsWorkspace
          posSettings={posSettings}
          paymentAccounts={paymentAccounts}
          accountOptions={accountOptionsQuery.data ?? []}
          deliveryCompanies={deliveryCompanies}
          t={t}
          isSavingRuntimeSettings={updatePosSettingsMutation.isPending}
          onSaveRuntimeSettings={(payload) => updatePosSettingsMutation.mutate(payload)}
        />
      );
    }

    if (workspace === "delivery") {
      return <PosDeliveryWorkspace embedded />;
    }

    const descriptions: Record<Exclude<PosWorkspace, "sales" | "delivery">, string> = {
      sessions: t("pos.placeholder.sessions"),
      held: t("pos.placeholder.held"),
      review: t("pos.placeholder.review"),
      returns: t("pos.placeholder.returns"),
      reports: t("pos.placeholder.reports"),
      printers: t("pos.placeholder.printers"),
      settings: t("pos.placeholder.settings"),
    };

    return (
      <PlaceholderWorkspace
        title={t(`pos.workspace.${workspace}`)}
        description={(descriptions as Record<string, string>)[workspace] ?? ""}
      />
    );
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#f6f7f8] animate-in fade-in duration-300">
      {flashNotice ? (
        <div className="px-4 pt-4">
          <FlashNoticeBanner
            message={flashNotice.message}
            tone={flashNotice.tone}
            onClose={() => setFlashNotice(null)}
          />
        </div>
      ) : null}
      {renderWorkspace()}
    </div>
  );
}

function SoftMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white/80 p-4 shadow-[0_18px_40px_-32px_rgba(35,51,41,0.5)] backdrop-blur">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-[#718178]">
        {label}
      </div>
      <div className="mt-3 text-2xl font-black text-[#223228]">{value}</div>
      <div className="mt-2 text-sm leading-7 text-[#68766e] arabic-auto">
        {hint}
      </div>
    </div>
  );
}

function FlashNoticeBanner({
  message,
  tone,
  onClose,
}: {
  message: string;
  tone: "success" | "warning" | "error";
  onClose: () => void;
}) {
  const isError = tone === "error";
  const isWarning = tone === "warning";
  const accentClasses = isError
    ? {
        panel: "bg-[#e53810] text-white shadow-[0_26px_70px_-24px_rgba(15,23,42,0.6)]",
        badge: "bg-white/14",
        eyebrow: "text-white/80",
        button: "border-white/30 text-white hover:bg-white/12",
      }
    : isWarning
      ? {
          panel: "bg-[#d97706] text-white shadow-[0_26px_70px_-24px_rgba(146,64,14,0.5)]",
          badge: "bg-white/14",
          eyebrow: "text-white/85",
          button: "border-white/30 text-white hover:bg-white/12",
        }
      : {
          panel:
            "bg-[#0f8f67] text-white shadow-[0_26px_70px_-24px_rgba(6,95,70,0.55)]",
          badge: "bg-white/14",
          eyebrow: "text-white/80",
          button: "border-white/30 text-white hover:bg-white/12",
        };

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
      <div
        className={cn(
          "pointer-events-auto relative w-full max-w-3xl overflow-hidden rounded-[18px]",
          accentClasses.panel,
        )}
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-center gap-5 px-6 py-7 sm:px-8 sm:py-8">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px]",
              accentClasses.badge,
            )}
          >
            <LuTriangleAlert className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "text-sm font-black uppercase tracking-[0.22em]",
                accentClasses.eyebrow,
              )}
            >
              {isError ? "Error" : isWarning ? "Warning" : "Success"}
            </div>
            <div className="mt-2 text-xl font-medium leading-10 arabic-auto sm:text-[2rem]">
              {message}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors",
              accentClasses.button,
            )}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ReportCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
      <div className="text-lg font-black text-[#233329]">{title}</div>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div
              key={`${row.label}-${row.value}`}
              className="flex items-center justify-between gap-3 rounded-[18px] border border-[#e1e7e2] bg-[#f8faf8] px-4 py-3"
            >
              <div className="font-bold text-[#233329]">{row.label}</div>
              <div className="text-sm text-[#68776f]">{row.value}</div>
            </div>
          ))
        ) : (
          <div className="rounded-[18px] border border-dashed border-[#d7ddd8] bg-[#fafcf9] px-4 py-4 text-sm text-[#64736b]">
            <ReportCardEmptyState />
          </div>
        )}
      </div>
    </Card>
  );
}

function ReportCardEmptyState() {
  const { t } = useTranslation();
  return <>{t("pos.reports.noRows")}</>;
}

function OpenShiftPanel({
  sessionState,
  cashierLabel,
  warehouses,
  paymentAccounts,
  onSessionStateChange,
  onOpenSession,
  isPending,
  canOpenShift = true,
}: {
  sessionState: SessionState;
  cashierLabel: string;
  warehouses: InventoryWarehouse[];
  paymentAccounts: BankCashAccount[];
  onSessionStateChange: (patch: Partial<SessionState>) => void;
  onOpenSession: (
    openingCash: string,
    warehouseId: string,
    cashAccountId: string,
  ) => void;
  isPending?: boolean;
  canOpenShift?: boolean;
}) {
  const { t, language } = useTranslation();
  const isArabic = language === "ar";
  const [openingCash, setOpeningCash] = useState(sessionState.openingCash);
  const [warehouseId, setWarehouseId] = useState(sessionState.warehouseId ?? "");
  const [cashAccountId, setCashAccountId] = useState(sessionState.cashAccountId ?? "");

  useEffect(() => {
    if (!warehouseId && warehouses.length > 0) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouseId, warehouses]);

  useEffect(() => {
    if (!cashAccountId && paymentAccounts.length > 0) {
      const defaultCash =
        paymentAccounts.find((account) =>
          normalizePaymentAccountMethod(account) === "CASH",
        ) ?? paymentAccounts[0];
      setCashAccountId(defaultCash.id);
    }
  }, [cashAccountId, paymentAccounts]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={t("pos.sessions.terminalNumberLabel")} className="mb-0">
        <Input
          value={sessionState.terminalName}
          onChange={(event) =>
            onSessionStateChange({ terminalName: event.target.value })
          }
          className="rounded-[18px] border-[#d6e1d9] bg-[#fbfdfb] py-3"
        />
      </Field>
      <Field label={t("pos.sessions.branch")} className="mb-0">
        <Input
          value={sessionState.branchName}
          onChange={(event) =>
            onSessionStateChange({ branchName: event.target.value })
          }
          className="rounded-[18px] border-[#d6e1d9] bg-[#fbfdfb] py-3"
        />
      </Field>
      <Field label={t("pos.sessions.cashierLabel")} className="mb-0">
        <Input
          value={cashierLabel}
          readOnly
          className="rounded-[18px] border-[#d6e1d9] bg-[#f2f6f3] py-3 text-[#53665a]"
        />
      </Field>
      <Field label={t("pos.sessions.openingCash")} className="mb-0">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={openingCash}
          onChange={(event) => setOpeningCash(event.target.value)}
          className="rounded-[18px] border-[#d6e1d9] bg-[#fbfdfb] py-3"
        />
      </Field>
      <Field label={t("pos.sessions.warehouse")} className="mb-0">
        <select
          value={warehouseId}
          onChange={(event) => setWarehouseId(event.target.value)}
          className="w-full rounded-[18px] border border-[#d6e1d9] bg-[#fbfdfb] px-4 py-3 text-sm font-semibold text-[#233329]"
        >
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {getLocalizedText(warehouse.name, language)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("pos.sessions.cashRegisterLabel")} className="mb-0">
        <select
          value={cashAccountId}
          onChange={(event) => setCashAccountId(event.target.value)}
          className="w-full rounded-[18px] border border-[#d6e1d9] bg-[#fbfdfb] px-4 py-3 text-sm font-semibold text-[#233329]"
        >
          {paymentAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {getLocalizedText(isArabic ? (account.account?.nameAr || account.name) : account.name, language)}
            </option>
          ))}
        </select>
      </Field>

      <div className="md:col-span-2">
        <button
          type="button"
          onClick={() => onOpenSession(openingCash, warehouseId, cashAccountId)}
          disabled={isPending || !canOpenShift}
          title={
            !canOpenShift ? getLocalizedText("Requires POS_OPEN_SESSION permission / يتطلب صلاحية فتح الجلسة", language) : undefined
          }
          className="w-full rounded-[20px] bg-[#5f8a67] px-4 py-3 text-sm font-black text-white shadow-[0_18px_42px_-28px_rgba(95,138,103,0.9)] transition hover:bg-[#557b5c] disabled:opacity-50"
        >
          {isPending ? t("pos.sessions.openingAction") : t("pos.sessions.openShiftAction")}
        </button>
      </div>
    </div>
  );
}


function PosPaymentSummaryCard({
  subtotal,
  discounts,
  tax,
  serviceCharge,
  deliveryFee,
  grandTotal,
  labels,
  waiterMode,
}: {
  subtotal: string;
  discounts: string;
  tax: string;
  serviceCharge: string;
  deliveryFee: string;
  grandTotal: string;
  labels: {
    subtotal: string;
    discounts: string;
    tax: string;
    serviceCharge: string;
    deliveryFee: string;
    grandTotal: string;
  };
  waiterMode?: boolean;
}) {
  const rows = [
    { label: labels.subtotal, value: subtotal },
    { label: labels.discounts, value: discounts },
    { label: labels.tax, value: tax },
    { label: labels.serviceCharge, value: serviceCharge },
    { label: labels.deliveryFee, value: deliveryFee },
  ];

  return (
    <div className="mx-3 mt-2 rounded-[12px] border border-[#eef1ef] bg-[#fafafa] px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-[#111827] arabic-auto">{labels.grandTotal}</span>
        <span className="text-[17px] font-bold tabular-nums text-[#111827]" dir="ltr">
          {grandTotal}
        </span>
      </div>
    </div>
  );
}

function CompactCartLine({
  line,
  language,
  currencyCode,
  locked = false,
  canAdjustWeightPortions = false,
  onIncrease,
  onDecrease,
  onRemove,
  onWeightChange,
  onDiscountChange: _onDiscountChange,
  canEditUnitPrice,
  canEditLineDiscount: _canEditLineDiscount,
  onUnitPriceChange,
  onEditAddons,
  taxFreeEnabled = false,
}: {
  line: CartLine;
  language: string;
  currencyCode: string;
  locked?: boolean;
  canAdjustWeightPortions?: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  onWeightChange?: (nextWeight: number) => void;
  onDiscountChange: (type: DiscountType, value: number) => void;
  canEditUnitPrice?: boolean;
  canEditLineDiscount?: boolean;
  onUnitPriceChange?: (next: number) => void;
  onEditAddons?: () => void;
  taxFreeEnabled?: boolean;
}) {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [isEditingWeight, setIsEditingWeight] = useState(false);
  const [weightDraft, setWeightDraft] = useState("");
  const lineTotal = getLineTotal(line, 0, "BEFORE_TAX", taxFreeEnabled);
  const lineTax = getLineTaxAmount(line, 0, "BEFORE_TAX", taxFreeEnabled);
  const hasDiscount = line.discountValue > 0;
  const addonsLabel = formatAddonsForDisplay(line.modifiers, language);
  const unitsLabel = getLocalizedText("Units / وحدات", language);
  const weightPrecision = line.quantityPrecision ?? 3;
  const weightStep = getWeightQuantityStep(weightPrecision);
  const weightPortionCount = line.sellByWeight ? getWeightPortionCount(line) : line.quantity;
  const weightPortionLabel = formatPosWeightDisplay(line.quantity, line.unit, {
    language,
    precision: weightPrecision,
  });
  const quantityLabel = line.sellByWeight
    ? weightPortionCount > 1
      ? `${formatCount(weightPortionCount)} × ${weightPortionLabel}`
      : weightPortionLabel
    : `${formatCount(line.quantity)} ${unitsLabel}`;
  const weightStepperLabel =
    line.sellByWeight && weightPortionCount > 1
      ? `×${formatCount(weightPortionCount)}`
      : weightPortionLabel;
  const showQuantityStepper = !locked || canAdjustWeightPortions;

  return (
    <div
      className={cn(
        "py-2.5 transition-colors",
        locked ? "opacity-90" : "",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[12px] font-semibold text-[#111827] arabic-heading">
              {getLocalizedText(line.name, language)}
              {addonsLabel ? (
                <span className="font-normal text-[#6b7280]">
                  {language === "ar" ? " · " : ", "}
                  {addonsLabel}
                </span>
              ) : null}
            </p>
            {!locked ? (
              <button
                type="button"
                onClick={onRemove}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition active:scale-95"
                title={getLocalizedText("Remove item / حذف الصنف", language)}
              >
                <LuTrash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          {line.lineNote ? (
            <p className="mt-0.5 text-[10px] italic text-amber-700">{line.lineNote}</p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-[#9ca3af]">
            <span dir="ltr">{quantityLabel}</span>
            <span>×</span>
            {canEditUnitPrice && onUnitPriceChange ? (
              isEditingPrice ? (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  autoFocus
                  onBlur={() => setIsEditingPrice(false)}
                  onKeyDown={(e) => e.key === "Enter" && setIsEditingPrice(false)}
                  value={line.unitPrice === 0 ? "" : line.unitPrice}
                  onChange={(e) =>
                    onUnitPriceChange(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-14 border-b border-[#d1d5db] bg-transparent text-[10px] font-medium focus:outline-none"
                  dir="ltr"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingPrice(true)}
                  className="font-medium text-[#6b7280] hover:text-[#374151]"
                  dir="ltr"
                >
                  {formatCurrency(line.unitPrice, currencyCode)}
                </button>
              )
            ) : (
              <span dir="ltr">
                {formatCurrency(
                  line.sellByWeight ? (line.baseUnitPrice ?? line.unitPrice) : line.unitPrice,
                  currencyCode,
                )}
              </span>
            )}
            {line.taxRate > 0 && !taxFreeEnabled ? (
              <>
                <span>/</span>
                <span className="rounded bg-[#fff7ed] px-1 py-px text-[9px] font-semibold text-[#ea580c]">
                  {getLocalizedText("Tax / ض", language)}{" "}
                  {lineTax > 0 ? formatCurrency(lineTax, currencyCode) : `${line.taxRate}%`}
                </span>
              </>
            ) : null}
            {hasDiscount ? (
              <span className="rounded bg-emerald-50 px-1 py-px text-[9px] font-semibold text-emerald-700">
                −
                {line.discountType === "PERCENT"
                  ? `${line.discountValue}%`
                  : formatCurrency(line.discountValue, currencyCode)}
              </span>
            ) : null}
            {onEditAddons ? (
              <button
                type="button"
                onClick={onEditAddons}
                className="text-[9px] font-semibold text-[#059669] hover:underline"
              >
                {getLocalizedText("+ addons / + إضافات", language)}
              </button>
            ) : null}
            {locked ? (
              <span className="text-[9px] text-[#9ca3af]">
                {getLocalizedText("Locked / مقفل", language)}
              </span>
            ) : line.kitchenSentAt ? (
              <span className="text-[9px] text-[#ea580c]">
                {getLocalizedText("Kitchen / مطبخ", language)}
              </span>
            ) : null}
            {line.trackInventory && line.onHandQuantity <= 5 ? (
              <span
                className={cn(
                  "rounded px-1 py-px text-[9px] font-semibold",
                  line.onHandQuantity <= 0
                    ? "bg-rose-50 text-rose-600"
                    : "bg-orange-50 text-orange-600",
                )}
              >
                {line.onHandQuantity <= 0
                  ? getLocalizedText("Out / نفد", language)
                  : `${formatCount(line.onHandQuantity)}`}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-[13px] font-bold tabular-nums text-[#111827]" dir="ltr">
            {formatCurrency(lineTotal, currencyCode)}
          </span>
          {showQuantityStepper ? (
            line.sellByWeight ? (
              <div className="flex items-center rounded-xl border border-emerald-100 bg-white shadow-sm overflow-hidden select-none">
                <button
                  type="button"
                  onClick={onDecrease}
                  className={cn(
                    "flex h-9 w-12 items-center justify-center text-[#475569] transition active:scale-95",
                    weightPortionCount <= 1
                      ? "hover:bg-red-50 hover:text-[#e11d48]"
                      : "hover:bg-gray-50 hover:text-gray-900",
                  )}
                  title={
                    weightPortionCount <= 1
                      ? getLocalizedText("Remove portion / حذف الحصة", language)
                      : getLocalizedText("Decrease count / تقليل العدد", language)
                  }
                >
                  {weightPortionCount <= 1 ? (
                    <LuTrash2 className="h-4 w-4" />
                  ) : (
                    <LuMinus className="h-4 w-4 stroke-[2.5]" />
                  )}
                </button>
                <span
                  className="min-w-[4.5rem] border-x border-emerald-100 bg-[#e8f5e9] px-2 py-1.5 text-center text-sm font-extrabold text-emerald-800"
                  dir="ltr"
                  title={getLocalizedText(
                    "Add another same portion with + / أضف حصة مماثلة بـ +",
                    language,
                  )}
                >
                  {weightStepperLabel}
                </span>
                <button
                  type="button"
                  onClick={onIncrease}
                  className="flex h-9 w-12 items-center justify-center text-[#475569] transition hover:bg-emerald-50 hover:text-[#059669] active:scale-95"
                  title={getLocalizedText("Add same portion / إضافة نفس الحصة", language)}
                >
                  <LuPlus className="h-4 w-4 stroke-[2.5]" />
                </button>
              </div>
            ) : (
              <div className="flex items-center rounded-xl border border-[#cbd5e1] bg-white shadow-sm overflow-hidden select-none">
                <button
                  type="button"
                  onClick={onDecrease}
                  className={cn(
                    "flex h-9 w-12 items-center justify-center text-[#475569] transition active:scale-95",
                    line.quantity <= 1
                      ? "hover:bg-red-50 hover:text-[#e11d48]"
                      : "hover:bg-gray-50 hover:text-gray-900"
                  )}
                  title={line.quantity <= 1 ? "Remove item" : "Decrease quantity"}
                >
                  {line.quantity <= 1 ? (
                    <LuTrash2 className="h-4 w-4" />
                  ) : (
                    <LuMinus className="h-4 w-4 stroke-[2.5]" />
                  )}
                </button>
                <span
                  className="min-w-[3.5rem] px-2 text-center text-sm font-extrabold text-[#1e293b]"
                  dir="ltr"
                >
                  {formatCount(line.quantity)}
                </span>
                <button
                  type="button"
                  onClick={onIncrease}
                  className="flex h-9 w-12 items-center justify-center text-[#475569] transition hover:bg-emerald-50 hover:text-[#059669] active:scale-95"
                  title="Increase quantity"
                >
                  <LuPlus className="h-4 w-4 stroke-[2.5]" />
                </button>
              </div>
            )
          ) : (
            <span className="text-xs font-bold text-[#475569]" dir="ltr">
              ×
              {line.sellByWeight
                ? weightPortionCount > 1
                  ? formatCount(weightPortionCount)
                  : formatPosWeightDisplay(line.quantity, line.unit, {
                      language,
                      precision: weightPrecision,
                    })
                : formatCount(line.quantity)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        emphasized ? "text-[#111827]" : "text-[#6b7280]",
      )}
    >
      <span className={cn("text-sm arabic-auto", emphasized && "font-bold")}>{label}</span>
      <span
        className={cn(
          "shrink-0 font-semibold tabular-nums",
          emphasized ? "text-lg font-bold" : "text-sm",
        )}
        dir="ltr"
      >
        {value}
      </span>
    </div>
  );
}

function PosCartRow({
  line,
  currencyCode,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  line: CartLine;
  currencyCode: string;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {
  const { language } = useTranslation();
  const lineTotal = getLineTotal(line);
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-2 hover:border-gray-200 transition">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
        <LuPackage className="h-5 w-5 text-gray-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-bold text-gray-900">{getLocalizedText(line.name, language)}</p>
        <p className="text-[11px] text-gray-400">{line.code}</p>
      </div>
      <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-1 py-0.5">
        <button type="button" onClick={onDecrease} className="rounded p-0.5 text-gray-500 hover:bg-white hover:text-gray-900 transition">
          <LuMinus className="h-3 w-3" />
        </button>
        <span className="min-w-[20px] text-center text-[12px] font-bold text-gray-800">{formatCount(line.quantity)}</span>
        <button type="button" onClick={onIncrease} className="rounded p-0.5 text-gray-500 hover:bg-white hover:text-gray-900 transition">
          <LuPlus className="h-3 w-3" />
        </button>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[11px] text-gray-400">{formatCurrency(line.unitPrice, currencyCode)}</p>
        <p className="text-[13px] font-bold text-[#2d6a4f]">{formatCurrency(lineTotal, currencyCode)}</p>
      </div>
      <button type="button" onClick={onRemove} className="shrink-0 rounded-lg p-1 text-gray-300 hover:bg-red-50 hover:text-red-400 transition">
        <LuTrash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function PosCalculatorModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { language } = useTranslation();
  const [display, setDisplay] = useState("0");
  const [equation, setEquation] = useState("");

  if (!isOpen) return null;

  const handlePress = (val: string) => {
    if (val === "C") {
      setDisplay("0");
      setEquation("");
      return;
    }
    if (val === "=") {
      try {
        const safeExpr = display.replace(/[^-()\d/*+.]/g, '');
        // eslint-disable-next-line no-new-func
        const result = new Function("return " + safeExpr)();
        setEquation(display + " =");
        setDisplay(String(result));
      } catch (e) {
        setDisplay(language === "ar" ? "خطأ" : "Error");
      }
      return;
    }
    
    if (display === "0" || display === "Error" || display === "خطأ") {
      setDisplay(val);
    } else {
      setDisplay(display + val);
    }
  };

  const buttons = [
    "7", "8", "9", "/",
    "4", "5", "6", "*",
    "1", "2", "3", "-",
    "0", ".", "=", "+"
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getLocalizedText("Calculator / حاسبة", language)} size="sm">
      <div className="p-4 bg-[#f8faf9] rounded-2xl">
        <div className="mb-4 bg-white p-3 text-right rounded-xl border border-[#d7dfda] shadow-inner h-20 flex flex-col justify-end">
          <div className="text-[11px] text-gray-500 h-4">{equation}</div>
          <div className="text-3xl font-black text-[#1f3427] tracking-wider truncate" dir="ltr">{display}</div>
        </div>
        <div className="grid grid-cols-4 gap-2" dir="ltr">
          <button
            onClick={() => handlePress("C")}
            className="col-span-4 bg-[#ffe7e4] text-[#e06555] h-12 rounded-xl text-sm font-bold hover:brightness-95 transition"
          >
            {getLocalizedText("Clear / مسح", language)}
          </button>
          {buttons.map((btn) => (
            <button
              key={btn}
              onClick={() => handlePress(btn)}
              className={cn(
                "h-14 rounded-xl text-xl font-bold shadow-sm transition hover:-translate-y-0.5 active:translate-y-0",
                ["/", "*", "-", "+", "="].includes(btn) 
                  ? "bg-[#5f8a67] text-white hover:bg-[#527859]" 
                  : "bg-white text-[#213327] border border-[#e4e9e6] hover:bg-[#f4f7f5]"
              )}
            >
              {btn}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function SettingToggleCard({
  label,
  value,
  enabled,
  isToggle = true,
  onToggle,
}: {
  label: string;
  value?: string;
  enabled?: boolean;
  isToggle?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-[20px] border border-[#e1e7e2] bg-[#fbfcfb] p-5 transition-colors hover:bg-[#f6f7f8]">
      <div className="font-bold text-[#233329] text-base">{label}</div>
      <div>
        {isToggle ? (
          <Switch checked={!!enabled} onChange={onToggle ?? (() => {})} />
        ) : (
          <div className="text-base font-black tracking-wider text-[#46644b]">{value}</div>
        )}
      </div>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-[#0f8f67]" : "bg-[#d4ddd7]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "rtl:-translate-x-5 ltr:translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

const PERMISSION_LABELS: Record<string, { en: string; ar: string }> = {
  POS_OPEN_SESSION: {
    en: "Open POS Session",
    ar: "فتح وردية جديدة",
  },
  POS_CLOSE_OWN_SESSION: {
    en: "Close Own POS Session",
    ar: "إغلاق الوردية الخاصة بي",
  },
  POS_VIEW_POS_SCREEN: {
    en: "View POS Sale Screen",
    ar: "عرض شاشة المبيعات (POS)",
  },
  POS_SCAN_BARCODE: {
    en: "Scan Item Barcode",
    ar: "قراءة باركود الأصناف",
  },
  POS_SEARCH_ITEM: {
    en: "Search Catalog Items",
    ar: "البحث عن الأصناف في الكتالوج",
  },
  POS_ADD_ITEM_TO_CART: {
    en: "Add Item to Cart",
    ar: "إضافة الأصناف إلى السلة",
  },
  POS_UPDATE_ITEM_QUANTITY: {
    en: "Update Item Quantity",
    ar: "تعديل كمية الصنف في السلة",
  },
  POS_REMOVE_ITEM_FROM_CART: {
    en: "Remove Item from Cart",
    ar: "حذف صنف من السلة",
  },
  POS_HOLD_SALE: {
    en: "Hold / Suspend Sale",
    ar: "تعليق الفواتير / حفظ مؤقت",
  },
  POS_RESUME_OWN_HELD_SALE: {
    en: "Resume Own Held Sale",
    ar: "استئناف الفواتير المعلقة الخاصة بي",
  },
  POS_VOID_DRAFT_SALE: {
    en: "Void Draft Sale",
    ar: "إلغاء مسودة البيع بالكامل",
  },
  POS_COMPLETE_SALE: {
    en: "Complete Sale & Pay",
    ar: "إتمام عملية البيع والدفع",
  },
  POS_SELECT_PAYMENT_METHOD: {
    en: "Select Payment Method",
    ar: "تحديد طريقة الدفع",
  },
  POS_PRINT_RECEIPT: {
    en: "Print Sales Receipt",
    ar: "طباعة فاتورة البيع",
  },
  POS_VIEW_OWN_SESSION_REPORT: {
    en: "View Own Session Report",
    ar: "عرض تقرير ورديتي الحالية",
  },
  POS_VIEW_COMPLETED_SALES: {
    en: "View Completed Sales List",
    ar: "عرض قائمة المبيعات المكتملة",
  },
  POS_VIEW_PENDING_ACCOUNTING: {
    en: "View Pending Accountant Review",
    ar: "عرض الفواتير قيد مراجعة المحاسب",
  },
  POS_VIEW_POS_INVOICE_DETAILS: {
    en: "View Sales Invoice Details",
    ar: "عرض تفاصيل فاتورة المبيعات",
  },
  POS_VIEW_POS_PAYMENTS: {
    en: "View POS Sales Payments",
    ar: "عرض مدفوعات المبيعات",
  },
  POS_VIEW_POS_INVENTORY_MOVEMENTS: {
    en: "View POS Inventory Movements",
    ar: "عرض الحركات المخزنية لنقاط البيع",
  },
  POS_VIEW_SESSIONS: {
    en: "View All POS Sessions",
    ar: "عرض جميع ورديات نقاط البيع",
  },
  POS_VIEW_SESSION_REPORT: {
    en: "View Session Summary Report",
    ar: "عرض التقارير الملخصة للورديات",
  },
  POS_APPROVE_ACCOUNTING: {
    en: "Approve Accountant Review",
    ar: "اعتماد مراجعة وتصفية الوردية",
  },
  POS_REJECT_ACCOUNTING: {
    en: "Reject Accountant Review",
    ar: "رفض مراجعة الوردية وإعادتها",
  },
  POS_POST_BY_INVOICE: {
    en: "Post Accounting By Invoice",
    ar: "ترحيل قيود اليومية لكل فاتورة",
  },
  POS_POST_BY_SESSION: {
    en: "Post Accounting By Session",
    ar: "ترحيل قيود اليومية مجمعة للوردية",
  },
  POS_VIEW_POS_REPORTS: {
    en: "View POS Analytical Reports",
    ar: "عرض التقارير التحليلية لنقاط البيع",
  },
  POS_EXPORT_POS_REPORTS: {
    en: "Export POS Reports Data",
    ar: "تصدير بيانات تقارير نقاط البيع",
  },
  VIEW_JOURNAL_ENTRIES: {
    en: "View Related Journal Entries",
    ar: "عرض قيود اليومية المحاسبية للوردية",
  },
  VIEW_GENERAL_LEDGER: {
    en: "View General Ledger Accounts",
    ar: "عرض كشوفات الحسابات بالأستاذ العام",
  },
  VIEW_INVENTORY_MOVEMENTS: {
    en: "View General Inventory Movements",
    ar: "عرض تقارير حركات المخزون",
  },
  POS_CREDIT_SALE: {
    en: "Allow Sales on Credit (Ajel)",
    ar: "السماح بالبيع الآجل (ذمم عملاء)",
  },
  POS_SELL_NEGATIVE_STOCK: {
    en: "Allow Sell Negative Stock",
    ar: "السماح بالبيع بالسالب دون رصيد مخزني",
  },
  POS_CHANGE_UNIT_PRICE: {
    en: "Allow Changing Item Unit Price",
    ar: "السماح بتعديل سعر بيع الصنف",
  },
};

function SettingsWorkspace({
  posSettings,
  paymentAccounts,
  accountOptions,
  deliveryCompanies,
  t,
  isSavingRuntimeSettings,
  onSaveRuntimeSettings,
}: {
  posSettings: PosSettings | null | undefined;
  paymentAccounts: BankCashAccount[];
  accountOptions: AccountOption[];
  deliveryCompanies: DeliveryCompany[];
  t: (key: string) => string;
  isSavingRuntimeSettings: boolean;
  onSaveRuntimeSettings: (payload: {
    postingMode?: "BY_INVOICE" | "BY_SESSION";
    cogsPostingEnabled?: boolean;
    taxFreeEnabled?: boolean;
    cashAccountId?: string;
    cardAccountId?: string;
    cliqAccountId?: string;
    walletAccountId?: string;
    bankTransferAccountId?: string;
    salesRevenueAccountId?: string;
    outputVatAccountId?: string;
    salesDiscountAccountId?: string;
    salesReturnsAccountId?: string;
    deliveryCompanies?: Array<{
      id: string;
      receivableAccountId: string;
      commissionAccountId?: string;
      serviceFeeAccountId?: string;
    }>;
  }) => void;
}) {
    const settings = posSettings;
    const [searchTerm, setSearchTerm] = useState("");
    const [role, setRole] = useState("MANAGER");
    const [localPermissions, setLocalPermissions] = useState<Record<string, boolean> | null>(null);
    const [localRuntime, setLocalRuntime] = useState<{
      postingMode: "BY_INVOICE" | "BY_SESSION";
      cogsPostingEnabled: boolean;
      taxFreeEnabled: boolean;
    } | null>(null);
    const [localAccountMappings, setLocalAccountMappings] = useState<{
      cashAccountId: string;
      cardAccountId: string;
      cliqAccountId: string;
      walletAccountId: string;
      bankTransferAccountId: string;
      salesRevenueAccountId: string;
      outputVatAccountId: string;
      salesDiscountAccountId: string;
      salesReturnsAccountId: string;
      deliveryCompanies: Array<{
        id: string;
        receivableAccountId: string;
        commissionAccountId: string;
        serviceFeeAccountId: string;
      }>;
    } | null>(null);
    const lastSettingsSeedRef = useRef<string | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
      Session: false,
      Cart: false,
      Accounting: false,
      General: false
    });
    const [expandedMappingGroups, setExpandedMappingGroups] = useState<Record<string, boolean>>({
      payments: true,
      delivery: true,
      posting: true
    });
    const [isRuntimeExpanded, setIsRuntimeExpanded] = useState(true);
    const { language } = useTranslation();
    const isArabic = language === "ar";

    useEffect(() => {
      if (settings && !localPermissions) {
        setLocalPermissions(settings.permissions);
      }
    }, [settings, localPermissions]);

    useEffect(() => {
      if (!settings) {
        return;
      }

      const nextAccountMappings = {
        cashAccountId: settings.accounts.cashAccountId ?? "",
        cardAccountId: settings.accounts.cardAccountId ?? "",
        cliqAccountId: settings.accounts.cliqAccountId ?? "",
        walletAccountId: settings.accounts.walletAccountId ?? "",
        bankTransferAccountId: settings.accounts.bankTransferAccountId ?? "",
        salesRevenueAccountId: settings.accounts.salesRevenueAccountId ?? "",
        outputVatAccountId: settings.accounts.outputVatAccountId ?? "",
        salesDiscountAccountId: settings.accounts.salesDiscountAccountId ?? "",
        salesReturnsAccountId: settings.accounts.salesReturnsAccountId ?? "",
        deliveryCompanies: deliveryCompanies.map((company) => ({
          id: company.id,
          receivableAccountId:
            settings.accounts.deliveryCompanies.find((row) => row.id === company.id)?.receivableAccountId ??
            company.receivableAccountId ??
            "",
          commissionAccountId:
            settings.accounts.deliveryCompanies.find((row) => row.id === company.id)?.commissionAccountId ??
            company.commissionAccountId ??
            "",
          serviceFeeAccountId:
            settings.accounts.deliveryCompanies.find((row) => row.id === company.id)?.serviceFeeAccountId ??
            company.serviceFeeAccountId ??
            "",
        })),
      };

      const nextSeed = JSON.stringify({
        runtime: {
          postingMode: settings.runtime.postingMode,
          cogsPostingEnabled: settings.runtime.cogsPostingEnabled,
          taxFreeEnabled: settings.runtime.taxFreeEnabled,
        },
        accounts: nextAccountMappings,
      });

      if (lastSettingsSeedRef.current === nextSeed) {
        return;
      }

      lastSettingsSeedRef.current = nextSeed;
      setLocalRuntime({
        postingMode: settings.runtime.postingMode,
        cogsPostingEnabled: settings.runtime.cogsPostingEnabled,
        taxFreeEnabled: settings.runtime.taxFreeEnabled,
      });
      setLocalAccountMappings(nextAccountMappings);
    }, [deliveryCompanies, settings]);

    if (!settings || !localPermissions || !localRuntime || !localAccountMappings) {
      return (
        <div className="space-y-6">
          <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 text-sm text-[#64736b]">
            {t("pos.settings.loadError")}
          </Card>
        </div>
      );
    }

    const togglePermission = (key: string) => {
      setLocalPermissions(prev => ({
        ...prev!,
        [key]: !prev![key]
      }));
    };

    const runtimeDirty =
      localRuntime.postingMode !== settings.runtime.postingMode ||
      localRuntime.cogsPostingEnabled !== settings.runtime.cogsPostingEnabled ||
      localRuntime.taxFreeEnabled !== settings.runtime.taxFreeEnabled;
    const accountMappingsDirty =
      localAccountMappings.cashAccountId !== (settings.accounts.cashAccountId ?? "") ||
      localAccountMappings.cardAccountId !== (settings.accounts.cardAccountId ?? "") ||
      localAccountMappings.cliqAccountId !== (settings.accounts.cliqAccountId ?? "") ||
      localAccountMappings.walletAccountId !== (settings.accounts.walletAccountId ?? "") ||
      localAccountMappings.bankTransferAccountId !== (settings.accounts.bankTransferAccountId ?? "") ||
      localAccountMappings.salesRevenueAccountId !== (settings.accounts.salesRevenueAccountId ?? "") ||
      localAccountMappings.outputVatAccountId !== (settings.accounts.outputVatAccountId ?? "") ||
      localAccountMappings.salesDiscountAccountId !== (settings.accounts.salesDiscountAccountId ?? "") ||
      localAccountMappings.salesReturnsAccountId !== (settings.accounts.salesReturnsAccountId ?? "") ||
      JSON.stringify(localAccountMappings.deliveryCompanies) !==
        JSON.stringify(
          deliveryCompanies.map((company) => ({
            id: company.id,
            receivableAccountId:
              settings.accounts.deliveryCompanies.find((row) => row.id === company.id)?.receivableAccountId ??
              company.receivableAccountId ??
              "",
            commissionAccountId:
              settings.accounts.deliveryCompanies.find((row) => row.id === company.id)?.commissionAccountId ??
              company.commissionAccountId ??
              "",
            serviceFeeAccountId:
              settings.accounts.deliveryCompanies.find((row) => row.id === company.id)?.serviceFeeAccountId ??
              company.serviceFeeAccountId ??
              "",
          })),
        );

    const handleRoleChange = (newRole: string) => {
      setRole(newRole);
      if (newRole === "CASHIER") {
        setLocalPermissions(prev => {
          const next = { ...prev! };
          Object.keys(next).forEach(k => {
            if (k.includes("JOURNAL") || k.includes("LEDGER") || k.includes("ACCOUNTING") || k.includes("REPORTS") || k.includes("INVENTORY_MOVEMENTS")) {
              next[k] = false;
            }
          });
          return next;
        });
      }
    };

    const toggleAll = (forceVal?: boolean) => {
      setLocalPermissions(prev => {
        const next = { ...prev! };
        Object.keys(next).forEach(k => {
          next[k] = forceVal !== undefined ? forceVal : !next[k];
        });
        return next;
      });
    };

    const permissionEntries = Object.entries(localPermissions);
    const enabledCount = permissionEntries.filter(([k, v]) => v).length;
    
    const groups = {
      Session: { icon: LuMonitor, keys: [] as string[], label: "الجلسة — Session" },
      Cart: { icon: LuShoppingCart, keys: [] as string[], label: "السلة — Cart" },
      Accounting: { icon: LuCalculator, keys: [] as string[], label: "الحسابات — Accounting" },
      General: { icon: LuSettings2, keys: [] as string[], label: "عام — General" }
    };

    permissionEntries.forEach(([key]) => {
      if (key.includes("SESSION") || key.includes("SCREEN")) {
        groups.Session.keys.push(key);
      } else if (key.includes("CART") || key.includes("SALE") || key.includes("PAYMENT") || key.includes("ITEM") || key.includes("BARCODE")) {
        groups.Cart.keys.push(key);
      } else if (key.includes("JOURNAL") || key.includes("LEDGER") || key.includes("ACCOUNTING") || key.includes("INVENTORY")) {
        groups.Accounting.keys.push(key);
      } else {
        groups.General.keys.push(key);
      }
    });

    const highlightText = (text: string) => {
      if (!searchTerm) return text;
      const regex = new RegExp(`(${searchTerm})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) => 
        regex.test(part) ? <span key={i} className="bg-yellow-200">{part}</span> : part
      );
    };

    return (
      <div className="mx-auto w-full max-w-[1800px] space-y-6 px-4 py-6 md:px-8">
        <PosPrinterSettingsPanel />

        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
          <div className="flex items-center justify-between">
            <div 
              className="flex-1 flex items-center justify-between cursor-pointer select-none"
              onClick={() => setIsRuntimeExpanded(!isRuntimeExpanded)}
            >
              <div>
                <div className="text-2xl font-black text-[#233329] arabic-heading flex items-center gap-2">
                  {t("pos.workspace.settings")}
                </div>
                <p className="mt-2 text-sm text-[#64736b] arabic-auto">
                  {t("pos.settings.description")}
                </p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 transition-colors mr-4"
              >
                {isRuntimeExpanded ? (
                  <LuChevronDown className="h-6 w-6 text-[#64736b]" />
                ) : (
                  <LuChevronRight className="h-6 w-6 text-[#64736b] rtl:rotate-180" />
                )}
              </button>
            </div>
            {(runtimeDirty || accountMappingsDirty) && (
              <button
                type="button"
                onClick={() =>
                  onSaveRuntimeSettings({
                    postingMode: localRuntime.postingMode,
                    cogsPostingEnabled: localRuntime.cogsPostingEnabled,
                    taxFreeEnabled: localRuntime.taxFreeEnabled,
                    cashAccountId: localAccountMappings.cashAccountId,
                    cardAccountId: localAccountMappings.cardAccountId,
                    cliqAccountId: localAccountMappings.cliqAccountId,
                    walletAccountId: localAccountMappings.walletAccountId,
                    bankTransferAccountId: localAccountMappings.bankTransferAccountId,
                    salesRevenueAccountId: localAccountMappings.salesRevenueAccountId,
                    outputVatAccountId: localAccountMappings.outputVatAccountId,
                    salesDiscountAccountId: localAccountMappings.salesDiscountAccountId,
                    salesReturnsAccountId: localAccountMappings.salesReturnsAccountId,
                    deliveryCompanies: localAccountMappings.deliveryCompanies.filter(
                      (row) =>
                        row.receivableAccountId.trim().length > 0 ||
                        row.commissionAccountId.trim().length > 0 ||
                        row.serviceFeeAccountId.trim().length > 0,
                    ).map((row) => ({
                      id: row.id,
                      receivableAccountId: row.receivableAccountId,
                      commissionAccountId: row.commissionAccountId.trim() || undefined,
                      serviceFeeAccountId: row.serviceFeeAccountId.trim() || undefined,
                    })),
                  })
                }
                disabled={isSavingRuntimeSettings}
                className="flex items-center gap-2 rounded-full bg-[#0f8f67] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#0c7a57] disabled:cursor-not-allowed disabled:opacity-60 ml-4 rtl:mr-4 rtl:ml-0"
              >
                <LuSave className="h-4 w-4" />
                {isSavingRuntimeSettings ? t("pos.settings.saving") : t("pos.settings.saveRuntime")}
              </button>
            )}
          </div>

          {isRuntimeExpanded && (
            <>
              <hr className="my-6 border-[#e1e7e2]" />
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-[20px] border border-[#e1e7e2] bg-[#fbfcfb] p-5 transition-colors hover:bg-[#f6f7f8]">
                  <div>
                    <div className="font-bold text-[#233329] text-base">{t("pos.settings.postingMode")}</div>
                    <div className="mt-1 text-xs text-[#64736b]">{t("pos.settings.postingMode.help")}</div>
                  </div>
                  <select
                    value={localRuntime.postingMode}
                    onChange={(event) =>
                      setLocalRuntime((prev) =>
                        prev
                          ? {
                              ...prev,
                              postingMode: event.target.value as "BY_INVOICE" | "BY_SESSION",
                            }
                          : prev,
                      )
                    }
                    className="rounded-[12px] border border-[#d4ddd7] bg-[#fbfcfb] px-3 py-2 text-sm font-bold text-[#233329] outline-none focus:border-[#46644b]"
                  >
                    <option value="BY_SESSION">{t("pos.settings.postingMode.BY_SESSION")}</option>
                    <option value="BY_INVOICE">{t("pos.settings.postingMode.BY_INVOICE")}</option>
                  </select>
                </div>
                <SettingToggleCard
                  label={t("pos.settings.cogsPostingEnabled")}
                  enabled={localRuntime.cogsPostingEnabled}
                  onToggle={() =>
                    setLocalRuntime((prev) =>
                      prev
                        ? {
                            ...prev,
                            cogsPostingEnabled: !prev.cogsPostingEnabled,
                          }
                        : prev,
                    )
                  }
                />
                <SettingToggleCard
                  label={t("pos.settings.taxFreeEnabled")}
                  enabled={localRuntime.taxFreeEnabled}
                  onToggle={() =>
                    setLocalRuntime((prev) =>
                      prev
                        ? {
                            ...prev,
                            taxFreeEnabled: !prev.taxFreeEnabled,
                          }
                        : prev,
                    )
                  }
                />
                <SettingToggleCard
                  label={t("pos.settings.discountTaxPolicy")}
                  value={settings.runtime.invoiceDiscountTaxPolicy}
                  isToggle={false}
                />
                <SettingToggleCard
                  label={t("pos.settings.creditSale")}
                  enabled={settings.runtime.allowCreditSale}
                />
                <SettingToggleCard
                  label={t("pos.settings.autoPost")}
                  enabled={settings.runtime.autoPost}
                />
                <SettingToggleCard
                  label={t("pos.settings.allowCloseWithDrafts")}
                  enabled={settings.runtime.allowCloseWithDrafts}
                />
                <SettingToggleCard
                  label={t("pos.settings.negativeStock")}
                  enabled={settings.runtime.negativeStockAllowed}
                />
                <SettingToggleCard
                  label={t("pos.settings.cashierDiscountLimit")}
                  value={`${settings.runtime.cashierDiscountLimitPercent}%`}
                  isToggle={false}
                />
              </div>
            </>
          )}
        </Card>

        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-0 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-[#e1e7e2] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-2xl font-black text-[#233329] arabic-heading">
                إعدادات حسابات الدفع POS
              </div>
              <p className="mt-2 text-sm text-[#64736b] arabic-auto">
                POS Payment Account Mapping
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-base">
              <thead className="bg-[#f8faf8] border-b border-[#e1e7e2]">
                <tr className="text-start text-[#6d7b73]">
                  <th className="px-6 py-4 font-bold text-start">الحساب المحاسبي / Account Option</th>
                  <th className="min-w-[min(100%,32rem)] px-6 py-4 text-end font-bold">الحساب المحاسبي المربوط / Mapped Account</th>
                </tr>
              </thead>
              <tbody>
                {/* Group 1: طرق الدفع — Payment Methods */}
                <tr 
                  className="cursor-pointer bg-[#fbfcfb] transition-colors hover:bg-[#f6f7f8]"
                  onClick={() => setExpandedMappingGroups(p => ({ ...p, payments: !p.payments }))}
                >
                  <td colSpan={2} className="border-b border-[#e1e7e2] px-6 py-4 border-t border-[#e1e7e2]">
                    <div className="flex items-center gap-3 font-bold text-[#233329]">
                      {expandedMappingGroups.payments ? <LuChevronDown className="h-5 w-5" /> : <LuChevronRight className="h-5 w-5" />}
                      <LuWallet className="h-5 w-5 text-[#46644b]" />
                      طرق الدفع — Payment Methods
                    </div>
                  </td>
                </tr>
                {expandedMappingGroups.payments && (
                  <>
                    <tr className="border-b border-[#f0f3f0] transition-colors hover:bg-[#fbfcfb]">
                      <td className="px-6 py-4 align-middle text-start">
                        <div className="text-sm font-bold text-[#233329]">Cash / النقد</div>
                        <div className="mt-1 text-xs text-[#6b7b72]">Cash Register Account / حساب الصندوق</div>
                      </td>
                      <td className="w-[50%] min-w-[min(100%,32rem)] px-6 py-4 align-middle text-end">
                        <SearchableSelect
                          value={localAccountMappings.cashAccountId}
                          onChange={(val) => setLocalAccountMappings(prev => prev ? { ...prev, cashAccountId: val } : prev)}
                          className="inline-block h-[42px] w-full min-w-[min(100%,28rem)] rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-2.5 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b]"
                          options={[
                            { value: "", label: "غير محدد / Not mapped" },
                            ...paymentAccounts.map((account) => ({
                              value: account.account.id,
                              label: `${isArabic ? (account.account.nameAr || account.name) : account.name} - ${account.account.code}`
                            }))
                          ]}
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-[#f0f3f0] transition-colors hover:bg-[#fbfcfb]">
                      <td className="px-6 py-4 align-middle text-start">
                        <div className="text-sm font-bold text-[#233329]">Card / Visa</div>
                        <div className="mt-1 text-xs text-[#6b7b72]">Card Clearing Account / حساب وسيط البطاقات</div>
                      </td>
                      <td className="w-[50%] min-w-[min(100%,32rem)] px-6 py-4 align-middle text-end">
                        <SearchableSelect
                          value={localAccountMappings.cardAccountId}
                          onChange={(val) => setLocalAccountMappings(prev => prev ? { ...prev, cardAccountId: val } : prev)}
                          className="inline-block h-[42px] w-full min-w-[min(100%,28rem)] rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-2.5 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b]"
                          options={[
                            { value: "", label: "غير محدد / Not mapped" },
                            ...paymentAccounts.map((account) => ({
                              value: account.account.id,
                              label: `${isArabic ? (account.account.nameAr || account.name) : account.name} - ${account.account.code}`
                            }))
                          ]}
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-[#f0f3f0] transition-colors hover:bg-[#fbfcfb]">
                      <td className="px-6 py-4 align-middle text-start">
                        <div className="text-sm font-bold text-[#233329]">CliQ / كليك</div>
                        <div className="mt-1 text-xs text-[#6b7b72]">CliQ Clearing Account / حساب وسيط كليك</div>
                      </td>
                      <td className="w-[50%] min-w-[min(100%,32rem)] px-6 py-4 align-middle text-end">
                        <SearchableSelect
                          value={localAccountMappings.cliqAccountId}
                          onChange={(val) => setLocalAccountMappings(prev => prev ? { ...prev, cliqAccountId: val } : prev)}
                          className="inline-block h-[42px] w-full min-w-[min(100%,28rem)] rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-2.5 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b]"
                          options={[
                            { value: "", label: "غير محدد / Not mapped" },
                            ...paymentAccounts.map((account) => ({
                              value: account.account.id,
                              label: `${isArabic ? (account.account.nameAr || account.name) : account.name} - ${account.account.code}`
                            }))
                          ]}
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-[#f0f3f0] transition-colors hover:bg-[#fbfcfb]">
                      <td className="px-6 py-4 align-middle text-start">
                        <div className="text-sm font-bold text-[#233329]">Wallet / محفظة</div>
                        <div className="mt-1 text-xs text-[#6b7b72]">Wallet Clearing Account / حساب وسيط المحفظة</div>
                      </td>
                      <td className="w-[50%] min-w-[min(100%,32rem)] px-6 py-4 align-middle text-end">
                        <SearchableSelect
                          value={localAccountMappings.walletAccountId}
                          onChange={(val) => setLocalAccountMappings(prev => prev ? { ...prev, walletAccountId: val } : prev)}
                          className="inline-block h-[42px] w-full min-w-[min(100%,28rem)] rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-2.5 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b]"
                          options={[
                            { value: "", label: "غير محدد / Not mapped" },
                            ...paymentAccounts.map((account) => ({
                              value: account.account.id,
                              label: `${isArabic ? (account.account.nameAr || account.name) : account.name} - ${account.account.code}`
                            }))
                          ]}
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-[#f0f3f0] transition-colors hover:bg-[#fbfcfb]">
                      <td className="px-6 py-4 align-middle text-start">
                        <div className="text-sm font-bold text-[#233329]">Bank Transfer / تحويل بنكي</div>
                        <div className="mt-1 text-xs text-[#6b7b72]">Bank Account / حساب البنك</div>
                      </td>
                      <td className="w-[50%] min-w-[min(100%,32rem)] px-6 py-4 align-middle text-end">
                        <SearchableSelect
                          value={localAccountMappings.bankTransferAccountId}
                          onChange={(val) => setLocalAccountMappings(prev => prev ? { ...prev, bankTransferAccountId: val } : prev)}
                          className="inline-block h-[42px] w-full min-w-[min(100%,28rem)] rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-2.5 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b]"
                          options={[
                            { value: "", label: "غير محدد / Not mapped" },
                            ...paymentAccounts.map((account) => ({
                              value: account.account.id,
                              label: `${isArabic ? (account.account.nameAr || account.name) : account.name} - ${account.account.code}`
                            }))
                          ]}
                        />
                      </td>
                    </tr>
                  </>
                )}

                {/* Group 2: شركات التوصيل — Delivery Companies */}
                <tr 
                  className="cursor-pointer bg-[#fbfcfb] transition-colors hover:bg-[#f6f7f8]"
                  onClick={() => setExpandedMappingGroups(p => ({ ...p, delivery: !p.delivery }))}
                >
                  <td colSpan={2} className="border-b border-[#e1e7e2] px-6 py-4 border-t border-[#e1e7e2]">
                    <div className="flex items-center gap-3 font-bold text-[#233329]">
                      {expandedMappingGroups.delivery ? <LuChevronDown className="h-5 w-5" /> : <LuChevronRight className="h-5 w-5" />}
                      <LuPackage className="h-5 w-5 text-[#46644b]" />
                      شركات التوصيل — Delivery Companies
                    </div>
                  </td>
                </tr>
                {expandedMappingGroups.delivery && (
                  <>
                    {deliveryCompanies.map((company) => (
                      <tr key={company.id} className="border-b border-[#f0f3f0] transition-colors hover:bg-[#fbfcfb]">
                        <td className="px-6 py-4 align-middle text-start">
                          <div className="text-sm font-bold text-[#233329]">{company.arabicName?.trim() || company.name}</div>
                          <div className="mt-1 text-xs text-[#6b7b72]">
                            {`${company.name} / ${company.arabicName?.trim() || company.name}`}
                          </div>
                          <div className="mt-2 text-[11px] text-[#8a968f]">
                            {`Commission ${company.commissionRate}%`}
                          </div>
                        </td>
                        <td className="w-[50%] min-w-[min(100%,32rem)] px-6 py-4 align-middle text-end">
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="text-start">
                              <div className="mb-1 text-[11px] font-bold text-[#6b7b72]">
                                Receivable / الذمم
                              </div>
                              <SearchableSelect
                                value={localAccountMappings.deliveryCompanies.find((row) => row.id === company.id)?.receivableAccountId ?? ""}
                                onChange={(val) =>
                                  setLocalAccountMappings((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          deliveryCompanies: prev.deliveryCompanies.map((row) =>
                                            row.id === company.id ? { ...row, receivableAccountId: val } : row,
                                          ),
                                        }
                                      : prev,
                                  )
                                }
                                className="inline-block h-[42px] w-full rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-2.5 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b]"
                                options={[
                                  { value: "", label: "غير محدد / Not mapped" },
                                  ...accountOptions.map((account) => ({
                                    value: account.id,
                                    label: `${account.code} - ${isArabic ? (account.nameAr || account.name) : account.name}`
                                  }))
                                ]}
                              />
                            </div>
                            <div className="text-start">
                              <div className="mb-1 text-[11px] font-bold text-[#6b7b72]">
                                Commission / عمولة
                              </div>
                              <SearchableSelect
                                value={localAccountMappings.deliveryCompanies.find((row) => row.id === company.id)?.commissionAccountId ?? ""}
                                onChange={(val) =>
                                  setLocalAccountMappings((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          deliveryCompanies: prev.deliveryCompanies.map((row) =>
                                            row.id === company.id ? { ...row, commissionAccountId: val } : row,
                                          ),
                                        }
                                      : prev,
                                  )
                                }
                                className="inline-block h-[42px] w-full rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-2.5 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b]"
                                options={[
                                  { value: "", label: "غير محدد / Not mapped" },
                                  ...accountOptions.map((account) => ({
                                    value: account.id,
                                    label: `${account.code} - ${isArabic ? (account.nameAr || account.name) : account.name}`
                                  }))
                                ]}
                              />
                            </div>
                            <div className="text-start">
                              <div className="mb-1 text-[11px] font-bold text-[#6b7b72]">
                                Service fee / رسوم الخدمة
                              </div>
                              <SearchableSelect
                                value={localAccountMappings.deliveryCompanies.find((row) => row.id === company.id)?.serviceFeeAccountId ?? ""}
                                onChange={(val) =>
                                  setLocalAccountMappings((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          deliveryCompanies: prev.deliveryCompanies.map((row) =>
                                            row.id === company.id ? { ...row, serviceFeeAccountId: val } : row,
                                          ),
                                        }
                                      : prev,
                                  )
                                }
                                className="inline-block h-[42px] w-full rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-2.5 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b]"
                                options={[
                                  { value: "", label: "غير محدد / Not mapped" },
                                  ...accountOptions.map((account) => ({
                                    value: account.id,
                                    label: `${account.code} - ${isArabic ? (account.nameAr || account.name) : account.name}`
                                  }))
                                ]}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {/* Group 3: حسابات ترحيل المبيعات — Posting Accounts */}
                <tr 
                  className="cursor-pointer bg-[#fbfcfb] transition-colors hover:bg-[#f6f7f8]"
                  onClick={() => setExpandedMappingGroups(p => ({ ...p, posting: !p.posting }))}
                >
                  <td colSpan={2} className="border-b border-[#e1e7e2] px-6 py-4 border-t border-[#e1e7e2]">
                    <div className="flex items-center gap-3 font-bold text-[#233329]">
                      {expandedMappingGroups.posting ? <LuChevronDown className="h-5 w-5" /> : <LuChevronRight className="h-5 w-5" />}
                      <LuReceipt className="h-5 w-5 text-[#46644b]" />
                      حسابات ترحيل المبيعات — Sales Posting Accounts
                    </div>
                  </td>
                </tr>
                {expandedMappingGroups.posting && (
                  <>
                    <tr className="border-b border-[#f0f3f0] transition-colors hover:bg-[#fbfcfb]">
                      <td className="px-6 py-4 align-middle text-start">
                        <div className="text-sm font-bold text-[#233329]">Sales Revenue Account / حساب إيرادات المبيعات</div>
                      </td>
                      <td className="w-[50%] min-w-[min(100%,32rem)] px-6 py-4 align-middle text-end">
                        <SearchableSelect
                          value={localAccountMappings.salesRevenueAccountId}
                          onChange={(val) => setLocalAccountMappings(prev => prev ? { ...prev, salesRevenueAccountId: val } : prev)}
                          className="inline-block h-[42px] w-full min-w-[min(100%,28rem)] rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-2.5 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b]"
                          options={[
                            { value: "", label: "غير محدد / Not mapped" },
                            ...accountOptions.map((account) => ({
                              value: account.id,
                              label: `${account.code} - ${isArabic ? (account.nameAr || account.name) : account.name}`
                            }))
                          ]}
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-[#f0f3f0] transition-colors hover:bg-[#fbfcfb]">
                      <td className="px-6 py-4 align-middle text-start">
                        <div className="text-sm font-bold text-[#233329]">Output VAT Account / حساب ضريبة المخرجات</div>
                      </td>
                      <td className="w-[50%] min-w-[min(100%,32rem)] px-6 py-4 align-middle text-end">
                        <SearchableSelect
                          value={localAccountMappings.outputVatAccountId}
                          onChange={(val) => setLocalAccountMappings(prev => prev ? { ...prev, outputVatAccountId: val } : prev)}
                          className="inline-block h-[42px] w-full min-w-[min(100%,28rem)] rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-2.5 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b]"
                          options={[
                            { value: "", label: "غير محدد / Not mapped" },
                            ...accountOptions.map((account) => ({
                              value: account.id,
                              label: `${account.code} - ${isArabic ? (account.nameAr || account.name) : account.name}`
                            }))
                          ]}
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-[#f0f3f0] transition-colors hover:bg-[#fbfcfb]">
                      <td className="px-6 py-4 align-middle text-start">
                        <div className="text-sm font-bold text-[#233329]">Sales Discount Account / حساب خصم المبيعات</div>
                      </td>
                      <td className="w-[50%] min-w-[min(100%,32rem)] px-6 py-4 align-middle text-end">
                        <SearchableSelect
                          value={localAccountMappings.salesDiscountAccountId}
                          onChange={(val) => setLocalAccountMappings(prev => prev ? { ...prev, salesDiscountAccountId: val } : prev)}
                          className="inline-block h-[42px] w-full min-w-[min(100%,28rem)] rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-2.5 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b]"
                          options={[
                            { value: "", label: "غير محدد / Not mapped" },
                            ...accountOptions.map((account) => ({
                              value: account.id,
                              label: `${account.code} - ${isArabic ? (account.nameAr || account.name) : account.name}`
                            }))
                          ]}
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-[#f0f3f0] transition-colors hover:bg-[#fbfcfb]">
                      <td className="px-6 py-4 align-middle text-start">
                        <div className="text-sm font-bold text-[#233329]">Sales Returns Account / حساب مردودات المبيعات</div>
                      </td>
                      <td className="w-[50%] min-w-[min(100%,32rem)] px-6 py-4 align-middle text-end">
                        <SearchableSelect
                          value={localAccountMappings.salesReturnsAccountId}
                          onChange={(val) => setLocalAccountMappings(prev => prev ? { ...prev, salesReturnsAccountId: val } : prev)}
                          className="inline-block h-[42px] w-full min-w-[min(100%,28rem)] rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-2.5 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b]"
                          options={[
                            { value: "", label: "غير محدد / Not mapped" },
                            ...accountOptions.map((account) => ({
                              value: account.id,
                              label: `${account.code} - ${isArabic ? (account.nameAr || account.name) : account.name}`
                            }))
                          ]}
                        />
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <PosAddonAdminPanel />

        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-0 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-[#e1e7e2] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-black text-[#233329]">{t("pos.settings.roleActionsTitle")}</div>
              <div className="text-sm text-[#68776f]">({enabledCount} / {permissionEntries.length} مفعل)</div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select 
                value={role} 
                onChange={e => handleRoleChange(e.target.value)}
                className="rounded-[16px] border border-[#d4ddd7] bg-[#fbfcfb] px-4 py-2.5 text-sm font-bold text-[#233329]"
              >
                <option value="MANAGER">مدير النظام (Manager)</option>
                <option value="CASHIER">كاشير (Cashier)</option>
              </select>
              
              <div className="relative">
                <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8f9b94]" />
                <input
                  type="text"
                  placeholder="ابحث عن إجراء..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full rounded-[16px] border border-[#d4ddd7] bg-[#fbfcfb] pl-10 pr-4 py-2.5 text-sm outline-none transition-colors focus:border-[#46644b]"
                />
              </div>

              <button 
                onClick={() => toggleAll()}
                className="rounded-[16px] border border-[#d4ddd7] bg-[#fbfcfb] px-4 py-2.5 text-sm font-bold text-[#233329] hover:bg-[#f2f4f2]"
              >
                تبديل الكل
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="min-w-full text-base">
              <thead className="sticky top-0 bg-[#f8faf8] z-10 shadow-sm border-b border-[#e1e7e2]">
                <tr className="text-start text-[#6d7b73]">
                  <th className="px-6 py-4 font-bold">{t("pos.settings.header.action")}</th>
                  <th className="px-6 py-4 font-bold w-32 text-end">{t("pos.settings.header.allowed")}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groups).map(([groupKey, group]) => {
                  const matchingKeys = group.keys.filter(k => {
                    const search = searchTerm.toLowerCase().trim();
                    if (!search) return true;
                    if (k.toLowerCase().includes(search)) return true;
                    const labelObj = PERMISSION_LABELS[k];
                    if (labelObj) {
                      if (labelObj.en.toLowerCase().includes(search)) return true;
                      if (labelObj.ar.toLowerCase().includes(search)) return true;
                    }
                    return false;
                  });
                  if (matchingKeys.length === 0) return null;
                  
                  const isExpanded = expandedGroups[groupKey];
                  const Icon = group.icon;

                  const getPermissionLabel = (key: string) => {
                    const labelObj = PERMISSION_LABELS[key];
                    if (!labelObj) return key;
                    return isArabic ? labelObj.ar : labelObj.en;
                  };

                  return (
                    <React.Fragment key={groupKey}>
                      <tr 
                        className="cursor-pointer bg-[#fbfcfb] transition-colors hover:bg-[#f6f7f8]"
                        onClick={() => setExpandedGroups(p => ({ ...p, [groupKey]: !p[groupKey] }))}
                      >
                        <td colSpan={2} className="border-b border-[#e1e7e2] px-6 py-4">
                          <div className="flex items-center gap-3 font-bold text-[#233329]">
                            {isExpanded ? <LuChevronDown className="h-5 w-5" /> : <LuChevronRight className="h-5 w-5" />}
                            <Icon className="h-5 w-5 text-[#46644b]" />
                            {group.label}
                            <span className="text-xs font-normal text-[#8f9b94] ml-2">
                              ({matchingKeys.length})
                            </span>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && matchingKeys.map(key => (
                        <tr key={key} className="border-b border-[#f0f3f0] transition-colors hover:bg-[#fbfcfb]">
                          <td className="px-6 py-4 font-medium text-[#445149]">
                            <div className="font-semibold text-[#233329]">
                              {highlightText(getPermissionLabel(key))}
                            </div>
                            <div className="text-[11px] font-mono text-[#8f9b94] mt-0.5">
                              {key}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-end">
                            <Switch 
                              checked={localPermissions[key]} 
                              onChange={() => togglePermission(key)} 
                            />
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
}

function PosPaymentMappingField({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  options: BankCashAccount[];
  onChange: (value: string) => void;
}) {
  const { language } = useTranslation();
  const isArabic = language === "ar";
  return (
    <div className="rounded-[22px] border border-[#e1e7e2] bg-[#fbfcfb] p-4">
      <div className="text-sm font-black text-[#233329] arabic-auto">{label}</div>
      <div className="mt-1 text-xs font-semibold text-[#6b7b72] arabic-auto">{hint}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
      >
        <option value="">غير محدد / Not mapped</option>
        {options.map((account) => (
          <option key={account.id} value={account.account.id}>
            {isArabic ? (account.account.nameAr || account.name) : account.name} - {account.account.code}
          </option>
        ))}
      </select>
    </div>
  );
}

function PosAccountSelectorField({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  options: AccountOption[];
  onChange: (value: string) => void;
}) {
  const { language } = useTranslation();
  const isArabic = language === "ar";
  return (
    <div className="rounded-[22px] border border-[#e1e7e2] bg-[#fbfcfb] p-4">
      <div className="text-sm font-black text-[#233329] arabic-auto">{label}</div>
      {hint ? <div className="mt-1 text-xs font-semibold text-[#6b7b72] arabic-auto">{hint}</div> : null}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
      >
        <option value="">غير محدد / Not mapped</option>
        {options.map((account) => (
          <option key={account.id} value={account.id}>
            {account.code} - {isArabic ? (account.nameAr || account.name) : account.name}
          </option>
        ))}
      </select>
    </div>
  );
}
