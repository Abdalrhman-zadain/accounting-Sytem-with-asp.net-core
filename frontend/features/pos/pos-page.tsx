"use client";

import type { ComponentType } from "react";
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
  LuLock,
} from "react-icons/lu";

import { Card, Modal, PageShell } from "@/components/ui";
import { Field, Input } from "@/components/ui/forms";
import {
  approvePosAccounting,
  approvePosSessionAccounting,
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
  getPosTaxSummaryReport,
  getInventoryItems,
  getInventoryWarehouses,
  getPendingPosReview,
  getPosReportsOverview,
  getPosReturns,
  getPosSessions,
  holdPosSale,
  openPosSession,
  rejectPosAccounting,
  rejectPosReturnAccounting,
  reprintPosReceipt,
  reversePosAccounting,
  reversePosReturnAccounting,
  getCustomers,
  createCustomer,
  getActiveTaxTreatments,
  savePosDraft,
  setPosFavoriteItemIds,
  voidPosSale,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { hasPermission } from "@/lib/auth-access";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import {
  POS_CATALOG_CHIPS,
  catalogItemMatchesChip,
  getPosItemShelfCategory,
  normalizeResumeCategory,
  type PosCatalogChip,
} from "@/features/pos/pos-catalog-chips";
import { PosProductCard } from "@/features/pos/pos-product-card";
import { PosRegisterMainGrid } from "@/features/pos/pos-register-layout";
import { PosSessionBar } from "@/features/pos/pos-session-bar";
import type {
  BankCashAccount,
  Customer,
  InventoryItem,
  InventoryWarehouse,
  PosInventoryImpactRow,
  PosReportsOverview,
  PosSalesByItemRow,
  PosSettings,
  PosReturn,
  PosSale,
  PosSession,
  PosSessionReport,
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
  | "settings";

type WorkspaceTab = {
  id: PosWorkspace;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
};

type DiscountType = "FIXED" | "PERCENT";

type CartLine = {
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
};

type PaymentEntry = {
  id: string;
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
  activeCategory: string;
  selectedWarehouseId: string;
  invoiceDiscountType: DiscountType;
  invoiceDiscountValue: number;
  cartLines: CartLine[];
  paymentEntries: PaymentEntry[];
  customerId?: string | null;
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

type CompletedReceipt = {
  receiptNumber: string;
  soldAt: string;
  companyName: string;
  branchName?: string | null;
  taxNumber?: string | null;
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
  tax: number;
  lines: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    taxAmount: number;
    lineTotal: number;
  }>;
};

type FlashNotice = {
  message: string;
  tone: "success" | "error";
};

const workspaceTabs: WorkspaceTab[] = [
  { id: "sales", labelKey: "pos.workspace.sales", icon: LuStore },
  { id: "sessions", labelKey: "pos.workspace.sessions", icon: LuTimerReset },
  { id: "held", labelKey: "pos.workspace.held", icon: LuReceipt },
  { id: "review", labelKey: "pos.workspace.review", icon: LuReceipt },
  { id: "returns", labelKey: "pos.workspace.returns", icon: LuArrowRightLeft },
  { id: "reports", labelKey: "pos.workspace.reports", icon: LuChartColumn },
  { id: "settings", labelKey: "pos.workspace.settings", icon: LuSettings2 },
];

const pathnameWorkspaceMap: Record<string, PosWorkspace> = {
  "/pos/register": "sales",
  "/pos/session": "sessions",
  "/pos/sessions": "sessions",
  "/pos/held-sales": "held",
  "/pos/accounting-review": "review",
  "/pos/completed-sales": "review",
  "/pos/returns": "returns",
  "/pos/reports": "reports",
  "/pos/settings": "settings",
};

const HELD_SALES_KEY = "pos-held-sales";
const SESSION_KEY = "pos-session-state";
const LAST_RECEIPT_KEY = "pos-last-receipt";

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
) {
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
) {
  const netBeforeInvoiceDiscount = getLineNetBeforeInvoiceDiscount(line);
  if (taxPolicy === "AFTER_TAX") {
    const taxAmount = getLineTaxAmount(line, 0, taxPolicy);
    return Math.max(netBeforeInvoiceDiscount + taxAmount - invoiceDiscountShare, 0);
  }
  const taxableAfterInvoiceDiscount = Math.max(
    netBeforeInvoiceDiscount - invoiceDiscountShare,
    0,
  );
  return taxableAfterInvoiceDiscount + getLineTaxAmount(line, invoiceDiscountShare, taxPolicy);
}

function getLineTotalCost(line: CartLine) {
  return line.quantity * line.unitCost;
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
    itemId: line.itemId ?? line.id,
    name: line.itemName ?? line.description ?? `Line ${line.lineNumber}`,
    code: line.item?.code ?? line.itemId ?? line.id,
    unit: "",
    itemType: line.item?.type ?? "SERVICE",
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
  }));

  return {
    id: sale.id,
    status: sale.posOperationalStatus === "DRAFT" ? "DRAFT" : "HELD",
    title: sale.reference,
    createdAt: sale.updatedAt,
    search: "",
    activeCategory: "all",
    selectedWarehouseId: cartLines.find((line) => line.warehouseId)?.warehouseId ?? "",
    invoiceDiscountType: "FIXED",
    invoiceDiscountValue: 0,
    cartLines,
    paymentEntries: sale.payments.map((payment) => ({
      id: payment.id,
      bankCashAccountId: payment.bankCashAccount.id,
      amount: payment.tenderedAmount ?? payment.amount,
      reference: payment.reference ?? "",
    })),
    customerId: sale.customer?.id ?? null,
  };
}

function mapReceiptResponse(receipt: {
  receiptNumber: string;
  soldAt: string;
  companyName: string;
  branchName?: string | null;
  taxNumber?: string | null;
  cashierName: string;
  terminalName?: string | null;
  warehouseName: string;
  paymentSummary: string;
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
  }>;
}): CompletedReceipt {
  return {
    receiptNumber: receipt.receiptNumber,
    soldAt: receipt.soldAt,
    companyName: receipt.companyName,
    branchName: receipt.branchName,
    taxNumber: receipt.taxNumber,
    cashierName: receipt.cashierName,
    terminalName: receipt.terminalName,
    warehouseName: receipt.warehouseName,
    paymentSummary: receipt.paymentSummary,
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
    })),
  };
}

function buildReceiptHtml(receipt: CompletedReceipt) {
  const rows = receipt.lines
    .map(
      (line) => `
        <tr>
          <td>${line.name}</td>
          <td>${line.quantity}</td>
          <td>${line.unitPrice.toFixed(2)}</td>
          <td>${line.discountAmount.toFixed(2)}</td>
          <td>${line.taxAmount.toFixed(2)}</td>
          <td>${line.lineTotal.toFixed(2)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <html lang="ar" dir="rtl">
      <head>
        <title>${receipt.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #233329; }
          h1, h2, p { margin: 0 0 8px; }
          .meta, .totals { margin-top: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border-bottom: 1px solid #d7ddd8; padding: 8px; text-align: right; font-size: 12px; }
          th { background: #eef3ef; }
          .totals-row { display: flex; justify-content: space-between; margin-top: 6px; }
        </style>
      </head>
      <body>
        <h1>${receipt.companyName}</h1>
        <h2>${receipt.receiptNumber}</h2>
        <div class="meta">
          <p>الفرع: ${receipt.branchName || "—"}</p>
          <p>الرقم الضريبي: ${receipt.taxNumber || "—"}</p>
          <p>التاريخ: ${new Date(receipt.soldAt).toLocaleString()}</p>
          <p>الكاشير: ${receipt.cashierName}</p>
          <p>الجهاز: ${receipt.terminalName || "—"}</p>
          <p>المستودع: ${receipt.warehouseName}</p>
          <p>الدفع: ${receipt.paymentSummary}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>الصنف</th>
              <th>الكمية</th>
              <th>سعر الوحدة</th>
              <th>الخصم</th>
              <th>الضريبة</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="totals">
          <div class="totals-row"><span>الإجمالي قبل الضريبة</span><strong>${receipt.subtotal.toFixed(2)}</strong></div>
          <div class="totals-row"><span>الخصومات</span><strong>${receipt.discount.toFixed(2)}</strong></div>
          <div class="totals-row"><span>الضريبة</span><strong>${receipt.tax.toFixed(2)}</strong></div>
          <div class="totals-row"><span>الإجمالي النهائي</span><strong>${receipt.total.toFixed(2)}</strong></div>
          <div class="totals-row"><span>المبلغ المقبوض</span><strong>${receipt.tendered.toFixed(2)}</strong></div>
          <div class="totals-row"><span>المدفوع</span><strong>${receipt.paid.toFixed(2)}</strong></div>
          <div class="totals-row"><span>الباقي</span><strong>${receipt.change.toFixed(2)}</strong></div>
        </div>
        <p style="margin-top: 24px;">شكراً لزيارتكم</p>
      </body>
    </html>
  `;
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

export function PosPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [workspace, setWorkspace] = useState<PosWorkspace>("sales");
  const [, startRoutingTransition] = useTransition();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeCategory, setActiveCategory] = useState<PosCatalogChip>("all");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [invoiceDiscountType, setInvoiceDiscountType] =
    useState<DiscountType>("FIXED");
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState(0);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
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
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState<
    "CASH" | "CARD" | "CLIQ" | "BANK_TRANSFER" | "MIXED"
  >("CASH");
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);
  const messageTimeoutRef = useRef<number | null>(null);
  const resumedSaleRef = useRef<string | null>(null);

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
      pushMessage("Customer created successfully / تم إنشاء العميل بنجاح");
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

  const activeSessionQuery = useQuery({
    queryKey: queryKeys.posActiveSession(token),
    queryFn: () => getActivePosSession(token),
    enabled: Boolean(token),
  });

  const PAGE_SIZE = 48;

  const itemsQuery = useQuery({
    queryKey: queryKeys.inventoryItems(token, {
      isActive: "true",
      page: productPage,
      limit: PAGE_SIZE,
      search: deferredSearch.trim() || undefined,
      warehouseId: selectedWarehouseId || undefined,
    }),
    queryFn: () =>
      getInventoryItems(
        {
          isActive: "true",
          page: productPage,
          limit: PAGE_SIZE,
          search: deferredSearch.trim() || undefined,
          warehouseId: selectedWarehouseId || undefined,
        },
        token,
      ),
    enabled: Boolean(token && activeSessionQuery.data?.id && workspace === "sales"),
    placeholderData: (previousData) => previousData,
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.posSettings(token),
    queryFn: () => getPosSettings(token),
    enabled: Boolean(token && (workspace === "sales" || workspace === "settings")),
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

  const salesShiftReportQuery = useQuery({
    queryKey: queryKeys.posSessionReport(token, activeSessionQuery.data?.id ?? ""),
    queryFn: () => getPosSessionReport(activeSessionQuery.data!.id, token),
    enabled: Boolean(
      token && workspace === "sales" && activeSessionQuery.data?.id,
    ),
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
    enabled: Boolean(token && workspace === "returns"),
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
    mutationFn: (payload: { sessionId: string; actualCash: number }) =>
      closePosSession(payload.sessionId, { actualCash: payload.actualCash }, token),
    onSuccess: async ({ report }) => {
      setLastSessionReport(report);
      await refreshPosData();
      pushMessage(t("pos.sales.alert.sessionMarkedClosed"));
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

  const holdSaleMutation = useMutation({
    mutationFn: (payload: Parameters<typeof holdPosSale>[0]) =>
      holdPosSale(payload, token),
    onSuccess: async () => {
      setEditingInvoiceId(null);
      resetSale();
      await refreshPosData();
      pushMessage(t("pos.sales.alert.savedToHold"));
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const completeSaleMutation = useMutation({
    mutationFn: (payload: Parameters<typeof completePosSale>[0]) =>
      completePosSale(payload, token),
    onSuccess: async (response) => {
      setEditingInvoiceId(null);
      const receipt = mapReceiptResponse(response.receipt);
      setLastReceipt(receipt);
      setPayFlowStep("success");
      await refreshPosData();
      pushMessage(t("pos.sales.alert.saleCompleted"));
      if (autoPrintReceipt) {
        printReceipt(receipt);
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
      pushMessage("POS sale approved and posted.");
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const approveSessionReviewMutation = useMutation({
    mutationFn: (sessionId: string) =>
      approvePosSessionAccounting(sessionId, {}, token),
    onSuccess: async (response) => {
      await refreshPosData();
      pushMessage(
        `Posted ${response.approvedCount} POS sale${response.approvedCount === 1 ? "" : "s"} for session ${response.sessionNumber}.`,
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
      pushMessage("POS sale moved to rejected review status.");
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
      pushMessage("POS accounting reversal has been created.");
    },
    onError: (error) => {
      pushError(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const voidSaleMutation = useMutation({
    mutationFn: (saleId: string) => voidPosSale(saleId, {}, token),
    onSuccess: async () => {
      if (editingInvoiceId) {
        resetSale();
      }
      await refreshPosData();
      pushMessage("Held POS sale was voided.");
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

  const items = itemsQuery.data?.data ?? [];
  const warehouses = warehousesQuery.data ?? [];
  const paymentAccounts = paymentAccountsQuery.data ?? [];
  const activeSession = activeSessionQuery.data;
  const posSettings = settingsQuery.data;
  const customers: Customer[] = customersQuery.data ?? [];
  const taxTreatments: TaxTreatment[] = activeTaxTreatmentsQuery.data ?? [];
  const selectedCustomer = customers.find((c: Customer) => c.id === selectedCustomerId) || null;
  const taxPolicy = posSettings?.runtime.invoiceDiscountTaxPolicy ?? "BEFORE_TAX";
  const completedSales = completedSalesQuery.data ?? [];
  const favoriteIdSet = useMemo(() => new Set(favoriteItemIds), [favoriteItemIds]);
  const shiftReportForRegister = salesShiftReportQuery.data ?? null;
  const availableWorkspaceTabs = useMemo(() => {
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
      if (tab.id === "returns") return false;
      if (tab.id === "reports") return hasPermission(user, "POS_VIEW_POS_REPORTS");
      if (tab.id === "settings") return hasPermission(user, "POS_VIEW_POS_REPORTS");
      return false;
    });

    return visible.length ? visible : workspaceTabs.filter((tab) => tab.id === "sales");
  }, [user]);
  const requestedWorkspace = pathnameWorkspaceMap[pathname] ?? searchParams.get("tab");
  const resumeSaleId = searchParams.get("resume");
  const fallbackWorkspace = availableWorkspaceTabs[0]?.id ?? "sales";

  useEffect(() => {
    if (!requestedWorkspace) {
      startRoutingTransition(() => {
        router.replace(`/pos?tab=${fallbackWorkspace}`);
      });
      return;
    }
    if (!availableWorkspaceTabs.some((tab) => tab.id === requestedWorkspace)) {
      startRoutingTransition(() => {
        router.replace(`/pos?tab=${fallbackWorkspace}`);
      });
      return;
    }
    if (workspace === requestedWorkspace) return;
    setWorkspace(requestedWorkspace as PosWorkspace);
  }, [availableWorkspaceTabs, fallbackWorkspace, requestedWorkspace, router, workspace]);

  useEffect(() => {
    if (workspace !== "sales" || !resumeSaleId) {
      if (!resumeSaleId) {
        resumedSaleRef.current = null;
      }
      return;
    }

    if (resumedSaleRef.current === resumeSaleId) {
      return;
    }

    const target = [...draftSales, ...heldSales].find((row) => row.id === resumeSaleId);
    if (!target) {
      return;
    }

    resumedSaleRef.current = resumeSaleId;
    resumeHeldSale(resumeSaleId);
    startRoutingTransition(() => {
      router.replace("/pos/register", { scroll: false });
    });
  }, [draftSales, heldSales, resumeSaleId, router, workspace]);

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
    if (paymentEntries.length === 0 && paymentAccounts.length > 0) {
      const defaultCash =
        paymentAccounts.find((account) =>
          account.type.toUpperCase().includes("CASH"),
        ) ?? paymentAccounts[0];
      setPaymentEntries([
        {
          id: createLocalId(),
          bankCashAccountId: defaultCash.id,
          amount: "",
          reference: "",
        },
      ]);
    }
  }, [paymentAccounts, paymentEntries.length]);

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
    return items.filter((item) =>
      catalogItemMatchesChip(item, activeCategory, favoriteIdSet),
    );
  }, [activeCategory, favoriteIdSet, items]);

  const selectedWarehouse =
    warehouses.find((warehouse) => warehouse.id === selectedWarehouseId) ?? null;

  const paymentEntriesResolved = useMemo(
    () =>
      paymentEntries.map((entry) => ({
        ...entry,
        account:
          paymentAccounts.find(
            (account) => account.id === entry.bankCashAccountId,
          ) ?? null,
        amountValue: parseAmount(entry.amount),
      })),
    [paymentAccounts, paymentEntries],
  );

  const getAccountsForMethod = (
    method: "CASH" | "CARD" | "CLIQ" | "BANK_TRANSFER" | "WALLET",
  ) =>
    paymentAccounts.filter(
      (account) => normalizePaymentAccountMethod(account) === method,
    );

  const inferSelectedPayMethod = () => {
    if (paymentEntriesResolved.length > 1) {
      return "MIXED" as const;
    }
    const firstEntry = paymentEntriesResolved[0];
    if (!firstEntry?.account) {
      return "CASH" as const;
    }
    const inferred = normalizePaymentAccountMethod(firstEntry.account);
    if (inferred === "BANK_TRANSFER") {
      return "BANK_TRANSFER" as const;
    }
    if (inferred === "WALLET") {
      return "MIXED" as const;
    }
    return inferred as "CASH" | "CARD" | "CLIQ";
  };

  const currencyCode =
    paymentEntriesResolved.find((entry) => entry.account)?.account?.currencyCode ||
    items[0]?.currencyCode ||
    "JOD";

  const cartMetrics = useMemo(() => {
    const subtotalBeforeDiscount = cartLines.reduce(
      (sum, line) => sum + getLineBase(line),
      0,
    );
    const lineDiscountTotal = cartLines.reduce(
      (sum, line) => sum + getLineDiscountAmount(line),
      0,
    );
    const taxableBase = cartLines.reduce(
      (sum, line) => sum + getLineNetBeforeInvoiceDiscount(line),
      0,
    );
    const invoiceDiscount = getInvoiceDiscountAmount(
      invoiceDiscountType,
      invoiceDiscountValue,
      taxPolicy === "AFTER_TAX"
        ? taxableBase +
            cartLines.reduce(
              (sum, line) => sum + getLineTaxAmount(line, 0, "AFTER_TAX"),
              0,
            )
        : taxableBase,
    );
    const tax = cartLines.reduce((sum, line) => {
      const lineBase = getLineNetBeforeInvoiceDiscount(line);
      if (taxPolicy === "AFTER_TAX") {
        return sum + getLineTaxAmount(line, 0, taxPolicy);
      }
      if (taxableBase <= 0) return sum;
      const invoiceShare = invoiceDiscount * (lineBase / taxableBase);
      return sum + getLineTaxAmount(line, invoiceShare, taxPolicy);
    }, 0);
    const total =
      taxPolicy === "AFTER_TAX"
        ? Math.max(taxableBase + tax - invoiceDiscount, 0)
        : Math.max(taxableBase - invoiceDiscount, 0) + tax;
    const tendered = paymentEntriesResolved.reduce(
      (sum, entry) => sum + entry.amountValue,
      0,
    );
    const paid = Math.min(tendered, total);
    const change = Math.max(tendered - total, 0);
    const amountDue = Math.max(total - tendered, 0);

    return {
      subtotalBeforeDiscount,
      lineDiscountTotal,
      invoiceDiscount,
      discountTotal: lineDiscountTotal + invoiceDiscount,
      taxableBase,
      tax,
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
    taxPolicy,
  ]);

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
            ((netBeforeInvoiceDiscount + getLineTaxAmount(line, 0, "AFTER_TAX")) /
              (cartMetrics.taxableBase + cartMetrics.tax))
          : 0;
      const totalDiscountAmount = getLineDiscountAmount(line) + invoiceShare;
      const taxAmount = getLineTaxAmount(line, invoiceShare, taxPolicy);
      const lineAmount =
        taxPolicy === "AFTER_TAX"
          ? getLineTotal(line, afterTaxShare, taxPolicy)
          : getLineTotal(line, invoiceShare, taxPolicy);

      return {
        itemId: line.itemId,
        warehouseId:
          line.trackInventory && line.warehouseId ? line.warehouseId : undefined,
        itemName: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountAmount: Number(
          (getLineDiscountAmount(line) + (taxPolicy === "AFTER_TAX" ? afterTaxShare : invoiceShare)).toFixed(2),
        ),
        taxAmount: Number(taxAmount.toFixed(2)),
        lineAmount: Number(lineAmount.toFixed(2)),
        description: line.name,
        revenueAccountId: line.salesAccountId ?? undefined,
      };
    });
  };

  const buildPaymentPayload = () =>
    paymentEntriesResolved
      .filter((entry) => entry.bankCashAccountId && entry.amountValue > 0)
      .map((entry) => ({
        bankCashAccountId: entry.bankCashAccountId,
        amount: Number(entry.amountValue.toFixed(2)),
        reference: entry.reference || undefined,
      }));

  const setSinglePaymentMethod = (
    method: "CASH" | "CARD" | "CLIQ" | "BANK_TRANSFER" | "WALLET",
  ) => {
    const matchingAccounts = getAccountsForMethod(method);
    const fallbackAccount = matchingAccounts[0] ?? paymentAccounts[0];
    if (!fallbackAccount) {
      return;
    }

    setPaymentEntries((current) => {
      const firstEntry = current[0];
      const currentAmount = firstEntry?.amount?.trim();
      return [
        {
          id: firstEntry?.id ?? createLocalId(),
          bankCashAccountId:
            matchingAccounts.find((account) => account.id === firstEntry?.bankCashAccountId)?.id ??
            fallbackAccount.id,
          amount: currentAmount || cartMetrics.total.toFixed(2),
          reference: firstEntry?.reference ?? "",
        },
      ];
    });
  };

  const updatePaymentEntryMethod = (
    entryId: string,
    method: "CASH" | "CARD" | "CLIQ" | "BANK_TRANSFER" | "WALLET",
  ) => {
    const matchingAccounts = getAccountsForMethod(method);
    const fallbackAccount = matchingAccounts[0] ?? paymentAccounts[0];
    if (!fallbackAccount) {
      return;
    }
    updatePaymentEntry(entryId, {
      bankCashAccountId: fallbackAccount.id,
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
    setCartLines([]);
    setInvoiceDiscountType("FIXED");
    setInvoiceDiscountValue(0);
    setSearch("");
    setSelectedCustomerId(null);
    const defaultCash =
      paymentAccounts.find((account) =>
        account.type.toUpperCase().includes("CASH"),
      ) ?? paymentAccounts[0];
    setPaymentEntries(
      defaultCash
        ? [
            {
              id: createLocalId(),
              bankCashAccountId: defaultCash.id,
              amount: "",
              reference: "",
            },
          ]
        : [],
    );
  };

  const addItemToCart = (item: InventoryItem) => {
    if (!sessionState.isOpen) {
      pushMessage(t("pos.sales.alert.sessionClosed"));
      return;
    }
    const taxRate = parseAmount(item.defaultTax?.rate);
    const lineWarehouseId =
      item.trackInventory
        ? item.preferredWarehouseId || selectedWarehouseId || null
        : null;
    const negOk = Boolean(posSettings?.runtime.negativeStockAllowed);
    const onHand = parseAmount(item.onHandQuantity);

    setCartLines((current) => {
      const existingIndex = current.findIndex((line) => line.itemId === item.id);
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

      return [
        ...current,
        {
          itemId: item.id,
          name: item.name,
          code: item.code,
          barcode: item.barcode,
          unit: item.unitOfMeasure,
          itemType: item.type,
          quantity: 1,
          unitPrice: parseAmount(item.defaultSalesPrice),
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
          onHandQuantity: parseAmount(item.onHandQuantity),
        },
      ];
    });
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

  const updateLine = (
    itemId: string,
    updater: (line: CartLine) => CartLine | null,
  ) => {
    setCartLines((current) =>
      current
        .map((line) => (line.itemId === itemId ? updater(line) : line))
        .filter(Boolean) as CartLine[],
    );
  };

  const bumpLineQty = (line: CartLine, delta: number) => {
    if (delta > 0) {
      const negOk = Boolean(posSettings?.runtime.negativeStockAllowed);
      const nextQty = line.quantity + delta;
      if (line.trackInventory && !negOk && nextQty > line.onHandQuantity) {
        pushMessage(
          t("pos.sales.alert.stockExceeded", {
            item: line.name,
          }),
        );
        return;
      }
    }
    updateLine(line.itemId, (current) =>
      delta > 0
        ? { ...current, quantity: current.quantity + delta }
        : current.quantity + delta <= 0
          ? current
          : { ...current, quantity: current.quantity + delta },
    );
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
    const fallbackAccount = paymentAccounts[0];
    if (!fallbackAccount) return;
    setPaymentEntries((current) => [
      ...current,
      {
        id: createLocalId(),
        bankCashAccountId: fallbackAccount.id,
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

  const holdSale = () => {
    if (!sessionState.isOpen) {
      pushMessage(t("pos.sales.alert.sessionClosed"));
      return;
    }
    if (cartLines.length === 0) {
      pushMessage(t("pos.sales.alert.emptyCart"));
      return;
    }
    holdSaleMutation.mutate({
      sessionId: activeSession?.id ?? "",
      invoiceId: editingInvoiceId ?? undefined,
      customerId: selectedCustomerId || undefined,
      description: search || undefined,
      lines: buildSaleLinesPayload(),
      payments: buildPaymentPayload(),
    });
  };

  const saveDraftSale = () => {
    if (!sessionState.isOpen) {
      pushMessage(t("pos.sales.alert.sessionClosed"));
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
      description: search || undefined,
      lines: buildSaleLinesPayload(),
      payments: buildPaymentPayload(),
    });
  };

  const resumeHeldSale = (heldSaleId: string) => {
    const target = [...draftSales, ...heldSales].find((row) => row.id === heldSaleId);
    if (!target) return;
    setCartLines(target.cartLines);
    setPaymentEntries(target.paymentEntries);
    setInvoiceDiscountType(target.invoiceDiscountType);
    setInvoiceDiscountValue(target.invoiceDiscountValue);
    setSelectedWarehouseId(target.selectedWarehouseId);
    setSearch(target.search);
    setActiveCategory(normalizeResumeCategory(target.activeCategory));
    setEditingInvoiceId(target.id);
    setSelectedCustomerId(target.customerId ?? null);
    pushMessage(t("pos.sales.alert.resumedHeldSale"));
  };

  const printReceipt = (receipt: CompletedReceipt) => {
    if (typeof window === "undefined") return;
    const popup = window.open("", "_blank", "width=720,height=900");
    if (!popup) {
      pushMessage(t("pos.sales.alert.printBlocked"));
      return;
    }
    popup.document.write(buildReceiptHtml(receipt));
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const completeSale = () => {
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

    if (cartMetrics.amountDue > 0 && !selectedCustomerId) {
      pushMessage(
        "Select a customer for partial payment or credit / اختر عميلاً للبيع الآجل أو الجزئي",
      );
      return;
    }

    const inventoryViolation = cartLines.find((line) => {
      if (!line.trackInventory) return false;
      if (!line.warehouseId) return true;
      if (posSettings?.runtime.negativeStockAllowed) return false;
      return line.quantity > line.onHandQuantity;
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
      paymentEntriesResolved.length === 0 ||
      paymentEntriesResolved.every((entry) => !entry.bankCashAccountId || entry.amountValue <= 0)
    ) {
      pushMessage(t("pos.sales.alert.paymentRequired"));
      return;
    }

    if (cartMetrics.paid < cartMetrics.total && !posSettings?.runtime.allowCreditSale) {
      pushMessage(t("pos.sales.alert.insufficientPayment"));
      return;
    }

    completeSaleMutation.mutate({
      sessionId: activeSession?.id ?? "",
      invoiceId: editingInvoiceId ?? undefined,
      customerId: selectedCustomerId || undefined,
      description: search || undefined,
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

    const nextMethod = inferSelectedPayMethod();
    setSelectedPayMethod(nextMethod);

    if (nextMethod !== "MIXED") {
      setSinglePaymentMethod(nextMethod);
    }

    setPayFlowStep("tender");
    setIsPayModalOpen(true);
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
    const singleMethodAccounts =
      selectedPayMethod === "MIXED"
        ? []
        : getAccountsForMethod(selectedPayMethod).length > 0
          ? getAccountsForMethod(selectedPayMethod)
          : paymentAccounts;

    if (!sessionState.isOpen || !activeSession) {
      return (
        <div className="mx-auto max-w-4xl space-y-6">
          <Card className="rounded-[32px] border-[#d8e2db] bg-white p-6 shadow-[0_24px_70px_-46px_rgba(43,79,54,0.35)] sm:p-8">
            <div className="mx-auto max-w-3xl space-y-8">
              <div className="space-y-3 text-center">
                <div className="inline-flex items-center rounded-full border border-[#d6e5da] bg-[#f2f8f3] px-4 py-2 text-xs font-black tracking-[0.18em] text-[#4f7059]">
                  POS OPEN SHIFT
                </div>
                <h1 className="text-3xl font-black tracking-tight text-[#1f3427] arabic-heading">
                  فتح الوردية / Open Shift
                </h1>
                <p className="text-sm leading-7 text-[#65766b] arabic-auto">
                  Start the cashier terminal by choosing the terminal, branch, warehouse, and cash register. Selling stays hidden until the shift is opened.
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

    const shiftReportLive = shiftReportForRegister;
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

    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#f6f7f8]">
        <PosSessionBar
          session={activeSession}
          cashierLabel={cashierLabel}
          warehouses={warehouses}
          selectedWarehouseId={selectedWarehouseId}
          onWarehouseChange={setSelectedWarehouseId}
          shiftReport={shiftReportLive}
          currencyCode={currencyCode}
          canCloseSession={hasPermission(user, "POS_CLOSE_OWN_SESSION")}
          onCloseSession={() => {
            const blockDrafts =
              (draftSales.length > 0 || heldSales.length > 0) &&
              !posSettings?.runtime.allowCloseWithDrafts;
            if (blockDrafts) {
              pushError(
                "Close blocked: drafts or held sales exist / الإغلاق ممنوع: توجد مسودات أو معلقة",
              );
              return;
            }
            const raw = window.prompt(
              "Enter actual cash counted in the drawer / أدخل النقد الفعلي",
              String(sessionState.expectedCash.toFixed(2)),
            );
            if (raw === null) return;
            closeSessionMutation.mutate({
              sessionId: activeSession.id,
              actualCash: parseAmount(raw),
            });
          }}
          isPending={closeSessionMutation.isPending}
        />

        <PosRegisterMainGrid
          catalog={
            <section className="space-y-3">
            <Card className="rounded-[12px] border-[#e4e9e6] bg-white p-3 shadow-none">
              <div className="flex flex-wrap items-end gap-3">
                <Field
                  label={t("pos.sales.barcodeSearch")}
                  className="mb-0 min-w-0 flex-1"
                >
                  <div className="relative flex gap-2">
                    <LuScanLine className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-[#7b8d82] rtl:left-auto rtl:right-3" />
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
                      className="h-9 rounded-[6px] border-[#d7dfda] bg-white py-2 pl-9 pr-3 text-xs focus:border-[#5f8a67] focus:ring-[#5f8a67]/10 rtl:pl-3 rtl:pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void queryClient.invalidateQueries({
                          queryKey: ["inventory-items", token],
                        });
                      }}
                      className="h-9 shrink-0 rounded-[6px] border border-[#d7dfda] bg-[#f7f9f8] px-3 text-[11px] font-bold text-[#4e6455] hover:bg-white"
                    >
                      Refresh / تحديث
                    </button>
                  </div>
                </Field>
              </div>

              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
                {POS_CATALOG_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setActiveCategory(chip)}
                    className={cn(
                      "min-h-[28px] whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold transition",
                      activeCategory === chip
                        ? "border-[#5f8a67] bg-[#5f8a67] text-white"
                        : "border-[#d6e1d9] bg-[#f9fcfa] text-[#5b6e61] hover:border-[#bdd0c0] hover:bg-white",
                    )}
                  >
                    {chip === "all"
                      ? t("pos.sales.allCategories")
                      : chip === "drinks"
                        ? "Drinks / مشروبات"
                        : chip === "food"
                          ? "Food / طعام"
                          : chip === "services"
                            ? "Services / خدمات"
                            : chip === "offers"
                              ? "Offers / عروض"
                              : "Favorites / المفضلة"}
                  </button>
                ))}
              </div>
            </Card>

            {itemsQuery.isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[244px] animate-pulse rounded-[7px] border border-[#e4e9e6] bg-white"
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
                  Refresh products / تحديث المنتجات
                </button>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredItems.map((item) => (
                  <PosProductCard
                    key={item.id}
                    item={item}
                    currencyCode={currencyCode}
                    isFavorite={favoriteIdSet.has(item.id)}
                    onToggleFavorite={() => toggleItemFavorite(item.id)}
                    allowNegativeStock={Boolean(posSettings?.runtime.negativeStockAllowed)}
                    onAdd={() => addItemToCart(item)}
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
                  Previous / السابق
                </button>
                <span className="text-xs font-bold text-[#42564a]">
                  Page {itemsQuery.data?.page ?? productPage} / {catalogTotalPages}
                </span>
                <button
                  type="button"
                  disabled={productPage >= catalogTotalPages || itemsQuery.isFetching}
                  onClick={() => setProductPage((p) => p + 1)}
                  className="rounded-[6px] border border-[#d6e1d9] bg-[#f7faf8] px-3 py-1.5 text-xs font-bold text-[#4f6556] disabled:opacity-40"
                >
                  Next / التالي
                </button>
              </div>
            ) : null}
          </section>
          }
          salePanel={
          <div className="w-full">
            <Card className="overflow-hidden rounded-[12px] border-[#e4e9e6] bg-white p-0 shadow-none">
              <div className="border-b border-[#edf1ef] px-3.5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[15px] font-black text-[#223328] arabic-heading">
                      {t("pos.sales.orderSummary")}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#7a8780] arabic-auto">
                      {t("pos.sales.itemsCount", { count: cartLines.length })}
                    </div>
                  </div>
                  {hasPermission(user, "POS_RESUME_OWN_HELD_SALE") ? (
                    <button
                      type="button"
                      onClick={() => setIsHeldOrdersOpen(true)}
                      className="relative inline-flex min-h-[28px] shrink-0 items-center rounded-full border border-[#d6e1d9] bg-[#f8faf9] px-2.5 py-1 text-[10px] font-bold text-[#42564a] hover:bg-white"
                    >
                      Held
                      {heldListCount > 0 ? (
                        <span className="ms-1.5 rounded-full bg-[#5f8a67] px-1.5 py-0.5 text-[9px] font-black text-white">
                          {heldListCount}
                        </span>
                      ) : null}
                    </button>
                  ) : null}
                </div>
                {editingInvoiceId ? (
                  <span className="mt-2 inline-flex rounded-full bg-[#edf5ef] px-2 py-0.5 text-[10px] font-bold text-[#4f7059]">
                    Held / معلقة
                  </span>
                ) : null}
              </div>

              {/* ── Customer Selector ── */}
              <div className="border-b border-[#edf1ef] px-3.5 py-2.5">
                {selectedCustomer ? (
                  <div className="flex items-center justify-between gap-2 rounded-[8px] bg-[#edf5ef] px-2.5 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <LuUser className="h-3.5 w-3.5 shrink-0 text-[#5f8a67]" />
                      <span className="truncate text-xs font-bold text-[#233329]">{selectedCustomer.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerId(null)}
                      className="shrink-0 text-xs font-bold text-[#8aad92] transition hover:text-[#96665f]"
                      title="Remove customer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <LuUser className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8aad92]" />
                      <input
                        type="text"
                        placeholder="Walk-In Customer / زبون عابر"
                        value={searchCustomer}
                        onChange={(e) => setSearchCustomer(e.target.value)}
                        className="h-8 w-full rounded-[6px] border border-[#d6e1d9] bg-[#fbfcfb] py-1.5 pl-7 pr-2 text-[11px] font-medium text-[#233329] placeholder-[#a0b0a6] focus:border-[#5f8a67] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/15"
                      />
                      {searchCustomer && customers.length > 0 && (
                        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-[8px] border border-[#d6e1d9] bg-white shadow-[0_8px_32px_-12px_rgba(43,79,54,0.25)]">
                          <div className="max-h-48 divide-y divide-[#eef5ef] overflow-y-auto">
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
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#233329] hover:bg-[#f4f8f5]"
                                >
                                  <LuUser className="h-3.5 w-3.5 shrink-0 text-[#5f8a67]" />
                                  <span className="truncate font-medium">{c.name}</span>
                                </button>
                              ))}
                            {customers.filter((c: Customer) =>
                              c.name.toLowerCase().includes(searchCustomer.toLowerCase()),
                            ).length === 0 && (
                              <div className="px-3 py-2 text-[11px] text-[#8aad92]">No customer found / لا يوجد عميل</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddCustomerOpen(true)}
                      title="Quick-add customer / إضافة عميل سريع"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[#d6e1d9] bg-[#fbfcfb] text-[#5f8a67] transition hover:border-[#5f8a67] hover:bg-[#edf5ef]"
                    >
                      <LuUserPlus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="max-h-[360px] space-y-2 overflow-y-auto px-3.5 py-3">
                {cartLines.length === 0 ? (
                  <div className="rounded-[8px] border border-dashed border-[#d4ddd6] bg-[#fafbfa] px-4 py-6 text-center">
                    <div className="text-xs font-bold text-[#233329]">
                      {t("pos.sales.cartEmptyTitle")}
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-[#6c7a72]">
                      {t("pos.sales.cartEmptyDescription")}
                    </p>
                  </div>
                ) : (
                  cartLines.map((line) => (
                    <CompactCartLine
                      key={line.itemId}
                      line={line}
                      currencyCode={currencyCode}
                      canEditUnitPrice={hasPermission(user, "POS_CHANGE_UNIT_PRICE")}
                      canEditLineDiscount={
                        hasPermission(user, "POS_COMPLETE_SALE") &&
                        hasPermission(user, "POS_UPDATE_ITEM_QUANTITY")
                      }
                      onIncrease={() => bumpLineQty(line, 1)}
                      onDecrease={() => bumpLineQty(line, -1)}
                      onRemove={() => updateLine(line.itemId, () => null)}
                      onUnitPriceChange={(next) =>
                        updateLine(line.itemId, (current) => ({
                          ...current,
                          unitPrice: Math.max(0, next),
                        }))
                      }
                      onDiscountChange={(type, value) =>
                        updateLine(line.itemId, (current) => ({
                          ...current,
                          discountType: type,
                          discountValue: value,
                        }))
                      }
                    />
                  ))
                )}
              </div>

              {hasPermission(user, "POS_COMPLETE_SALE") ? (
                <div className="space-y-2 border-t border-[#edf1ef] px-3.5 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7a8780]">
                    Invoice discount / خصم الفاتورة
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setInvoiceDiscountType((current) =>
                          current === "FIXED" ? "PERCENT" : "FIXED",
                        )
                      }
                      className="rounded-[6px] border border-[#d6e1d9] bg-[#f8faf9] px-2.5 py-1.5 text-[10px] font-bold text-[#4f6556]"
                    >
                      {invoiceDiscountType === "FIXED" ? "Fixed JOD" : "Percent %"}
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={invoiceDiscountValue === 0 ? "" : invoiceDiscountValue}
                      onChange={(e) =>
                        setInvoiceDiscountValue(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="min-w-0 flex-1 rounded-[6px] border border-[#d6e1d9] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#233329]"
                      placeholder="0"
                    />
                  </div>
                  {invoiceDiscountType === "PERCENT" &&
                  invoiceDiscountValue >
                    (posSettings?.runtime.cashierDiscountLimitPercent ?? 15) ? (
                    <p className="text-[10px] font-semibold text-[#b08040]">
                      Above cashier discount limit ({posSettings?.runtime.cashierDiscountLimitPercent ?? 15}
                      %) — accountant approval may be required.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="sticky bottom-0 space-y-3 border-t border-[#edf1ef] bg-white px-3.5 py-3">
                <div className="rounded-[8px] bg-[#f7f9f8] p-3">
                  <div className="grid gap-2">
                    <TotalRow
                      label={t("pos.sales.totalSubtotal")}
                      value={formatCurrency(
                        cartMetrics.subtotalBeforeDiscount,
                        currencyCode,
                      )}
                    />
                    <TotalRow
                      label={t("pos.sales.totalDiscount")}
                      value={formatCurrency(cartMetrics.discountTotal, currencyCode)}
                    />
                    <TotalRow
                      label={t("pos.sales.totalTax")}
                      value={formatCurrency(cartMetrics.tax, currencyCode)}
                    />
                    <TotalRow
                      label={t("pos.sales.totalGrand")}
                      value={formatCurrency(cartMetrics.total, currencyCode)}
                      emphasized
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={saveDraftSale}
                    disabled={!hasPermission(user, "POS_HOLD_SALE")}
                    className="inline-flex min-h-[42px] flex-col items-center justify-center gap-1 rounded-[7px] border border-[#d7e2d8] bg-[#f8faf9] px-1.5 py-2 text-[9px] font-bold text-[#4e6455] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <LuSave className="h-3.5 w-3.5" />
                    Draft
                  </button>
                  <button
                    type="button"
                    onClick={holdSale}
                    disabled={!hasPermission(user, "POS_HOLD_SALE")}
                    className="inline-flex min-h-[42px] flex-col items-center justify-center gap-1 rounded-[7px] border border-[#d7e2d8] bg-white px-1.5 py-2 text-[9px] font-bold text-[#4e6455] transition hover:bg-[#f8fbf8] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <LuSave className="h-3.5 w-3.5" />
                    Hold
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasPermission(user, "POS_VOID_DRAFT_SALE")) {
                        pushError(
                          "You do not have permission to cancel this sale / لا تملك صلاحية إلغاء البيع",
                        );
                        return;
                      }
                      if (cartLines.length === 0) {
                        resetSale();
                        return;
                      }
                      setIsCancelSaleOpen(true);
                    }}
                    className="inline-flex min-h-[42px] flex-col items-center justify-center gap-1 rounded-[7px] border border-[#ead8d4] bg-[#fffafa] px-1.5 py-2 text-[9px] font-bold text-[#8a5952] transition hover:bg-white"
                  >
                    <LuRefreshCcw className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={openPayModal}
                    disabled={
                      cartLines.length === 0 ||
                      !hasPermission(user, "POS_COMPLETE_SALE") ||
                      !hasPermission(user, "POS_SELECT_PAYMENT_METHOD")
                    }
                    className="inline-flex min-h-[42px] flex-col items-center justify-center gap-1 rounded-[7px] bg-[#5f8a67] px-1.5 py-2 text-[9px] font-black text-white transition hover:bg-[#557b5c] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <LuWallet className="h-3.5 w-3.5" />
                    Pay
                  </button>
                </div>

                {lastReceipt ? (
                  <button
                    type="button"
                    onClick={() => printReceipt(lastReceipt)}
                    className="w-full rounded-[7px] border border-[#d7e2d8] bg-[#f8faf9] px-3 py-2 text-xs font-bold text-[#4e6455] transition hover:bg-white"
                  >
                    {t("pos.sales.printLastReceipt")}
                  </button>
                ) : null}
              </div>
            </Card>
          </div>
          }
        />

        <Modal
          isOpen={isPayModalOpen}
          onClose={() => {
            setIsPayModalOpen(false);
            setPayFlowStep("tender");
          }}
          title={
            payFlowStep === "success"
              ? "Paid / تم الدفع"
              : "Pay Sale / دفع الفاتورة"
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
                    resetSale();
                    setIsPayModalOpen(false);
                    setPayFlowStep("tender");
                    window.requestAnimationFrame(() => searchInputRef.current?.focus());
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
                Total Amount
              </div>
              <div className="mt-2 text-3xl font-black text-[#1f3427]">
                {formatCurrency(cartMetrics.total, currencyCode)}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#6b7c70]">
                Bank transfer highlighted / تحويل بنكي بارز
              </div>
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
                    {getPaymentMethodLabel(method)}
                  </button>
                ))}
              </div>
            </div>

            {posSettings?.runtime.allowCreditSale ? (
              <div className="rounded-[18px] border border-[#d6e8db] bg-[#f8fcfa] px-4 py-3 text-xs font-semibold text-[#3d5c45]">
                Credit or partial payment allowed when a customer is selected / يُسمح بالبيع الآجل أو الجزئي
                بعد اختيار عميل حقيقي
              </div>
            ) : null}

            {selectedPayMethod === "MIXED" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-[#233329]">
                    Mixed payment / دفعات متعددة
                  </div>
                  <button
                    type="button"
                    onClick={addPaymentEntry}
                    className="rounded-full border border-[#d7e2d8] px-3 py-1.5 text-xs font-bold text-[#4f6556]"
                  >
                    Add split / إضافة دفعة
                  </button>
                </div>
                {paymentEntriesResolved.map((entry) => {
                  const entryMethod = entry.account
                    ? normalizePaymentAccountMethod(entry.account)
                    : "CASH";
                  const methodAccounts =
                    getAccountsForMethod(entryMethod).length > 0
                      ? getAccountsForMethod(entryMethod)
                      : paymentAccounts;
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
                          <option value="CASH">Cash / نقد</option>
                          <option value="CARD">Card / بطاقة</option>
                          <option value="CLIQ">CliQ / كليك</option>
                          <option value="BANK_TRANSFER">Bank / بنك</option>
                          <option value="WALLET">Wallet / محفظة</option>
                        </select>
                        <select
                          value={entry.bankCashAccountId}
                          onChange={(event) =>
                            updatePaymentEntry(entry.id, {
                              bankCashAccountId: event.target.value,
                            })
                          }
                          className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
                        >
                          {methodAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry.amount}
                          onChange={(event) =>
                            updatePaymentEntry(entry.id, { amount: event.target.value })
                          }
                          placeholder="Amount / المبلغ"
                          className="rounded-[16px] border-[#d6e1d9] bg-white py-3"
                        />
                        <Input
                          value={entry.reference}
                          onChange={(event) =>
                            updatePaymentEntry(entry.id, { reference: event.target.value })
                          }
                          placeholder="Reference / المرجع"
                          className="rounded-[16px] border-[#d6e1d9] bg-white py-3"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePaymentEntry(entry.id)}
                        disabled={paymentEntriesResolved.length === 1}
                        className="rounded-full border border-[#ead8d4] px-3 py-1.5 text-xs font-bold text-[#8a5952] disabled:opacity-40"
                      >
                        Remove / حذف
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4 rounded-[22px] border border-[#e2eae4] bg-[#fbfdfb] p-4">
                <Field label={t("pos.sales.accountLabel")} className="mb-0">
                  <select
                    value={singlePaymentEntry?.bankCashAccountId ?? ""}
                    onChange={(event) =>
                      singlePaymentEntry
                        ? updatePaymentEntry(singlePaymentEntry.id, {
                            bankCashAccountId: event.target.value,
                          })
                        : undefined
                    }
                    className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
                  >
                    {singleMethodAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("pos.sales.tenderedAmountLabel")} className="mb-0">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={singlePaymentEntry?.amount ?? ""}
                    onChange={(event) =>
                      singlePaymentEntry
                        ? updatePaymentEntry(singlePaymentEntry.id, {
                            amount: event.target.value,
                          })
                        : undefined
                    }
                    className="rounded-[16px] border-[#d6e1d9] bg-white py-3"
                  />
                </Field>
                <Field label={t("pos.sales.paymentReference")} className="mb-0">
                  <Input
                    value={singlePaymentEntry?.reference ?? ""}
                    onChange={(event) =>
                      singlePaymentEntry
                        ? updatePaymentEntry(singlePaymentEntry.id, {
                            reference: event.target.value,
                          })
                        : undefined
                    }
                    placeholder={t("pos.sales.referencePlaceholder")}
                    className="rounded-[16px] border-[#d6e1d9] bg-white py-3"
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
                  ? "Select a customer to continue with partial or credit payment / اختر عميلاً لإكمال الدفع الجزئي أو الآجل"
                  : "Tendered amount is below total and credit is disabled / المدفوع أقل من الإجمالي والبيع الآجل غير مفعّل"}
              </div>
            ) : null}

            <label className="flex items-center gap-3 rounded-[18px] border border-[#e2eae4] bg-white px-4 py-3 text-sm font-semibold text-[#42564a]">
              <input
                type="checkbox"
                checked={autoPrintReceipt}
                onChange={(event) => setAutoPrintReceipt(event.target.checked)}
                className="h-4 w-4 rounded border-[#c8d7cc] text-[#5f8a67] focus:ring-[#5f8a67]/20"
              />
              {t("pos.sales.printReceiptLabel")}
            </label>

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
          title="Held & drafts / معلقة ومسودات"
        >
          <div className="max-h-[min(70vh,520px)] space-y-6 overflow-y-auto text-sm text-[#42564a]">
            {draftSales.length === 0 && heldSales.length === 0 ? (
              <p className="py-6 text-center text-[#6b7c70]">No held or draft sales / لا يوجد</p>
            ) : null}

            {draftSales.length > 0 ? (
              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[#5f6d66]">
                  Drafts / مسودات
                </div>
                <ul className="space-y-3">
                  {draftSales.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-[18px] border border-[#dfe8e1] bg-[#fafcf9] px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-[#233329]">{row.title}</div>
                          <div className="text-xs text-[#728579]">
                            {new Date(row.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <span className="rounded-full bg-[#eef3ef] px-2 py-0.5 text-[11px] font-bold text-[#46644b]">
                          {row.cartLines.length} lines
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={!hasPermission(user, "POS_RESUME_OWN_HELD_SALE")}
                        onClick={() => {
                          resumeHeldSale(row.id);
                          setIsHeldOrdersOpen(false);
                        }}
                        className="mt-3 w-full rounded-[14px] bg-[#5f8a67] px-3 py-2 text-xs font-black text-white disabled:opacity-40"
                      >
                        Resume / استئناف
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {heldSales.length > 0 ? (
              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[#5f6d66]">
                  Held / معلقة
                </div>
                <ul className="space-y-3">
                  {heldSales.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-[18px] border border-[#dfe8e1] bg-white px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-[#233329]">{row.title}</div>
                          <div className="text-xs text-[#728579]">
                            {new Date(row.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <span className="rounded-full bg-[#eef3ef] px-2 py-0.5 text-[11px] font-bold text-[#46644b]">
                          {row.cartLines.length} lines
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={!hasPermission(user, "POS_RESUME_OWN_HELD_SALE")}
                        onClick={() => {
                          resumeHeldSale(row.id);
                          setIsHeldOrdersOpen(false);
                        }}
                        className="mt-3 w-full rounded-[14px] bg-[#5f8a67] px-3 py-2 text-xs font-black text-white disabled:opacity-40"
                      >
                        Resume / استئناف
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Modal>

        <Modal
          isOpen={isCancelSaleOpen}
          onClose={() => setIsCancelSaleOpen(false)}
          title="Cancel sale? / إلغاء البيع؟"
        >
          <div className="space-y-4 text-sm text-[#42564a]">
            <p className="leading-7 text-[#596760]">
              {editingInvoiceId
                ? "This will void the held or draft invoice on the server and clear your cart."
                : "This will clear the current cart."}{" "}
              <span className="arabic-auto block text-[13px] text-[#6b7c70] mt-2">
                {editingInvoiceId
                  ? "سيُلغى المستند في الخادم ويُفرغ السلة."
                  : "سيتم تفريغ السلة الحالية فقط."}
              </span>
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelSaleOpen(false)}
                className="flex-1 rounded-[18px] border border-[#d7e2d8] bg-[#f7faf8] px-4 py-3 text-sm font-bold text-[#4f6556] hover:bg-white"
              >
                Keep editing / متابعة
              </button>
              <button
                type="button"
                disabled={voidSaleMutation.isPending}
                onClick={() => {
                  if (editingInvoiceId) {
                    voidSaleMutation.mutate(editingInvoiceId);
                  }
                  resetSale();
                  setIsCancelSaleOpen(false);
                }}
                className="flex-1 rounded-[18px] border border-[#ead8d4] bg-[#fff5f5] px-4 py-3 text-sm font-black text-[#8a5952] hover:bg-white disabled:opacity-50"
              >
                Confirm cancel / تأكيد
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
          title="New Customer / عميل جديد"
        >
          <div className="space-y-5">
            <p className="text-sm text-[#6b7c70] arabic-auto">
              Quick-create a customer to attach to this sale. You can fill in more details later from the Sales module.
            </p>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#42564a]">
                Customer Name / اسم العميل <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="e.g. Ahmed Ali"
                className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-medium text-[#233329] placeholder-[#a0b0a6] focus:border-[#5f8a67] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#42564a]">
                Tax Treatment / المعالجة الضريبية <span className="text-red-500">*</span>
              </label>
              <select
                value={newCustomerTaxTreatmentId}
                onChange={(e) => setNewCustomerTaxTreatmentId(e.target.value)}
                className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
              >
                <option value="">— Select / اختر —</option>
                {taxTreatments.map((tt: TaxTreatment) => (
                  <option key={tt.id} value={tt.id}>
                    {tt.englishName} / {tt.arabicName}
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
              {createCustomerMutation.isPending ? "Creating… / جارٍ الإنشاء…" : "Create & Select / إنشاء واختيار"}
            </button>
          </div>
        </Modal>
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
    return (
      <div className="space-y-6">
        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
          <div className="text-2xl font-black text-[#233329] arabic-heading">
            {t("pos.workspace.held")}
          </div>
          <p className="mt-2 text-sm text-[#64736b] arabic-auto">
            {t("pos.held.description")}
          </p>
        </Card>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="text-sm font-black uppercase tracking-[0.16em] text-[#5c7463]">
              Draft Sales / مسودات
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {draftSales.length > 0 ? (
                draftSales.map((heldSale) => (
                  <Card key={heldSale.id} className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-black text-[#233329]">{heldSale.title}</div>
                        <div className="mt-1 text-sm text-[#66756d]">
                          {new Date(heldSale.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-full bg-[#eef3ef] px-3 py-1 text-xs font-bold text-[#46644b]">
                        {t("pos.held.linesCount", { count: heldSale.cartLines.length })}
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-[#5f6d66]">
                      {heldSale.cartLines.slice(0, 4).map((line) => (
                        <div key={`${heldSale.id}-${line.itemId}`} className="flex items-center justify-between gap-3">
                          <span>{line.name}</span>
                          <span>
                            {line.quantity} x {formatCurrency(line.unitPrice, currencyCode)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          startRoutingTransition(() => {
                            router.replace(`/pos/register?resume=${heldSale.id}`);
                          });
                        }}
                        className="rounded-full bg-[#46644b] px-4 py-2 text-xs font-bold text-white"
                      >
                        Resume Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => voidSaleMutation.mutate(heldSale.id)}
                        className="rounded-full border border-[#ead7d5] px-4 py-2 text-xs font-bold text-[#8f5a55]"
                      >
                        {t("pos.sales.voidAction")}
                      </button>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 text-sm text-[#64736b]">
                  No POS drafts saved yet.
                </Card>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-black uppercase tracking-[0.16em] text-[#5c7463]">
              Held Sales / معلقة
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {heldSales.length > 0 ? (
                heldSales.map((heldSale) => (
              <Card key={heldSale.id} className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-black text-[#233329]">{heldSale.title}</div>
                    <div className="mt-1 text-sm text-[#66756d]">
                      {new Date(heldSale.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-full bg-[#eef3ef] px-3 py-1 text-xs font-bold text-[#46644b]">
                    {t("pos.held.linesCount", { count: heldSale.cartLines.length })}
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-[#5f6d66]">
                  {heldSale.cartLines.slice(0, 4).map((line) => (
                    <div key={`${heldSale.id}-${line.itemId}`} className="flex items-center justify-between gap-3">
                      <span>{line.name}</span>
                      <span>
                        {line.quantity} x {formatCurrency(line.unitPrice, currencyCode)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      startRoutingTransition(() => {
                        router.replace(`/pos/register?resume=${heldSale.id}`);
                      });
                    }}
                    className="rounded-full bg-[#46644b] px-4 py-2 text-xs font-bold text-white"
                  >
                    {t("pos.sales.resumeHeld")}
                  </button>
                  <button
                    type="button"
                    onClick={() => voidSaleMutation.mutate(heldSale.id)}
                    className="rounded-full border border-[#ead7d5] px-4 py-2 text-xs font-bold text-[#8f5a55]"
                  >
                    {t("pos.sales.voidAction")}
                  </button>
                </div>
              </Card>
                ))
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
    const sessionGroups = Array.from(
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
    ).map(([, value]) => value);

    return (
      <div className="space-y-6">
        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
          <div className="text-2xl font-black text-[#233329] arabic-heading">
            {t("pos.workspace.review")}
          </div>
          <p className="mt-2 text-sm text-[#64736b] arabic-auto">
            {t("pos.review.description")}
          </p>
        </Card>
        <div className="space-y-6">
          {sessionGroups.map((group) => (
            <div key={group.sessionId ?? group.sessionNumber} className="space-y-4">
              <Card className="rounded-[24px] border-[#d7ddd8] bg-[#f7faf8] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.16em] text-[#5b7362]">
                      Session Review
                    </div>
                    <div className="mt-1 text-lg font-black text-[#233329]">
                      {group.sessionNumber}
                    </div>
                    <div className="mt-1 text-sm text-[#68776f]">
                      {group.sales.length} sale(s) pending review · {group.warehouseName}
                    </div>
                  </div>
                  {group.sessionId ? (
                    <button
                      type="button"
                      onClick={() => approveSessionReviewMutation.mutate(group.sessionId!)}
                      className="rounded-full bg-[#46644b] px-4 py-2 text-xs font-bold text-white"
                    >
                      Approve Session
                    </button>
                  ) : null}
                </div>
              </Card>
              {group.sales.map((sale) => (
                <Card key={sale.id} className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-black text-[#233329]">{sale.reference}</div>
                      <div className="mt-1 text-sm text-[#68776f]">
                        {sale.posAccountingStatus} · {sale.totalAmount} {sale.currencyCode}
                      </div>
                      <div className="mt-1 text-sm text-[#68776f]">
                        {t("pos.review.sessionWarehouse", {
                          session: sale.session?.sessionNumber ?? "—",
                          warehouse: sale.session?.warehouse.name ?? "—",
                        })}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => reprintReceiptMutation.mutate(sale.id)}
                        className="rounded-full border border-[#d6e0d8] px-4 py-2 text-xs font-bold text-[#46644b]"
                      >
                        {t("pos.sales.printLastReceipt")}
                      </button>
                      {sale.posAccountingStatus === "POSTED" ? (
                        <button
                          type="button"
                          onClick={() => reverseReviewMutation.mutate(sale.id)}
                          className="rounded-full border border-[#ead7d5] px-4 py-2 text-xs font-bold text-[#8f5a55]"
                        >
                          {t("pos.review.reverse")}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => approveReviewMutation.mutate(sale.id)}
                            className="rounded-full bg-[#46644b] px-4 py-2 text-xs font-bold text-white"
                          >
                            {t("pos.review.approve")}
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectReviewMutation.mutate(sale.id)}
                            className="rounded-full border border-[#ead7d5] px-4 py-2 text-xs font-bold text-[#8f5a55]"
                          >
                            {t("pos.review.reject")}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <DetailTile label={t("pos.review.subtotal")} value={sale.subtotalAmount} />
                    <DetailTile label={t("pos.review.discount")} value={sale.discountAmount} />
                    <DetailTile label={t("pos.review.tax")} value={sale.taxAmount} />
                    <DetailTile label={t("pos.review.change")} value={sale.posChangeAmount ?? "0.00"} />
                  </div>
                  <div className="mt-5 grid gap-3 xl:grid-cols-2">
                    <div className="rounded-[20px] border border-[#dbe2dd] bg-[#f8faf8] p-4">
                      <div className="font-bold text-[#233329]">{t("pos.review.linesTitle")}</div>
                      <div className="mt-3 space-y-2 text-sm text-[#5f6d66]">
                        {sale.lines.map((line) => (
                          <div key={line.id} className="flex items-center justify-between gap-3">
                            <span>
                              {line.itemName ?? line.description ?? `Line ${line.lineNumber}`}
                            </span>
                            <span>
                              {line.quantity} x {line.unitPrice} = {line.lineAmount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-[#dbe2dd] bg-[#f8faf8] p-4">
                      <div className="font-bold text-[#233329]">{t("pos.review.paymentsTitle")}</div>
                      <div className="mt-3 space-y-2 text-sm text-[#5f6d66]">
                        {sale.payments.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between gap-3">
                            <span>
                              {payment.paymentMethod} · {payment.bankCashAccount.name}
                            </span>
                            <span>
                              {payment.amount}
                              {payment.tenderedAmount ? ` / tendered ${payment.tenderedAmount}` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ))}
          {(reviewQuery.data ?? []).length === 0 ? (
            <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 text-sm text-[#64736b]">
              {t("pos.review.empty")}
            </Card>
          ) : null}
        </div>
      </div>
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
                              {account.name}
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
              label: row.method,
              value: t("pos.reports.paymentValue", {
                amount: row.salesAmount,
                count: row.invoiceCount,
              }),
            }))}
          />
          <ReportCard
            title={t("pos.reports.salesByCashierTitle")}
            rows={salesByCashier.map((row) => ({
              label: row.cashierName,
              value: t("pos.reports.paymentValue", {
                amount: row.salesAmount,
                count: row.invoiceCount,
              }),
            }))}
          />
          <ReportCard
            title={t("pos.reports.salesByBranchTitle")}
            rows={salesByBranch.map((row) => ({
              label: row.branchName,
              value: t("pos.reports.paymentValue", {
                amount: row.salesAmount,
                count: row.invoiceCount,
              }),
            }))}
          />
          <ReportCard
            title={t("pos.reports.taxSummaryTitle")}
            rows={taxSummary.map((row: PosTaxSummaryRow) => ({
              label: `${row.taxCode} (${row.rate}%)`,
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
              row.itemName,
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
              row.item?.name ?? "—",
              row.warehouse?.name ?? "—",
              `${row.quantityOut} / ${row.quantityIn}`,
              row.runningQuantity,
            ])}
          />
        </div>
      </div>
    );
  };

  const renderSettingsWorkspace = () => {
    const settings = posSettings;

    return (
      <div className="space-y-6">
        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
          <div className="text-2xl font-black text-[#233329] arabic-heading">
            {t("pos.workspace.settings")}
          </div>
          <p className="mt-2 text-sm text-[#64736b] arabic-auto">
            {t("pos.settings.description")}
          </p>
        </Card>

        {settings ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DetailTile
                label={t("pos.settings.discountTaxPolicy")}
                value={settings.runtime.invoiceDiscountTaxPolicy}
              />
              <DetailTile
                label={t("pos.settings.creditSale")}
                value={settings.runtime.allowCreditSale ? t("pos.settings.enabled") : t("pos.settings.disabled")}
              />
              <DetailTile
                label={t("pos.settings.autoPost")}
                value={settings.runtime.autoPost ? t("pos.settings.enabled") : t("pos.settings.disabled")}
              />
              <DetailTile
                label={t("pos.settings.allowCloseWithDrafts")}
                value={settings.runtime.allowCloseWithDrafts ? t("pos.settings.enabled") : t("pos.settings.disabled")}
              />
              <DetailTile
                label={t("pos.settings.negativeStock")}
                value={settings.runtime.negativeStockAllowed ? t("pos.settings.allowed") : t("pos.settings.blocked")}
              />
              <DetailTile
                label={t("pos.settings.cashierDiscountLimit")}
                value={`${settings.runtime.cashierDiscountLimitPercent}%`}
              />
            </div>

            <DetailedTableCard
              title={t("pos.settings.roleActionsTitle")}
              headers={[t("pos.settings.header.action"), t("pos.settings.header.allowed")]}
              rows={Object.entries(settings.permissions).map(([action, allowed]) => [
                action,
                allowed ? t("pos.settings.yes") : t("pos.settings.no"),
              ])}
            />
          </>
        ) : (
          <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 text-sm text-[#64736b]">
            {t("pos.settings.loadError")}
          </Card>
        )}
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

    if (workspace === "settings") {
      return renderSettingsWorkspace();
    }

    const descriptions: Record<Exclude<PosWorkspace, "sales">, string> = {
      sessions: t("pos.placeholder.sessions"),
      held: t("pos.placeholder.held"),
      review: t("pos.placeholder.review"),
      returns: t("pos.placeholder.returns"),
      reports: t("pos.placeholder.reports"),
      settings: t("pos.placeholder.settings"),
    };

    return (
      <PlaceholderWorkspace
        title={t(`pos.workspace.${workspace}`)}
        description={descriptions[workspace]}
      />
    );
  };

  return (
    <PageShell>
      {flashNotice ? (
        <FlashNoticeBanner
          message={flashNotice.message}
          tone={flashNotice.tone}
          onClose={() => setFlashNotice(null)}
        />
      ) : null}
      {renderWorkspace()}
    </PageShell>
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
  tone: "success" | "error";
  onClose: () => void;
}) {
  const isError = tone === "error";
  const accentClasses = isError
    ? {
        panel: "bg-[#e53810] text-white shadow-[0_26px_70px_-24px_rgba(15,23,42,0.6)]",
        badge: "bg-white/14",
        eyebrow: "text-white/80",
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
              {isError ? "Error" : "Success"}
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
            No report rows available.
          </div>
        )}
      </div>
    </Card>
  );
}

function DetailedTableCard({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
      <div className="text-lg font-black text-[#233329]">{title}</div>
      {rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#e1e7e2] text-left text-[#6d7b73]">
                {headers.map((header) => (
                  <th key={header} className="px-3 py-2 font-bold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="border-b border-[#f0f3f0]">
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${index}-${cellIndex}`} className="px-3 py-3 text-[#233329]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 rounded-[18px] border border-dashed border-[#d7ddd8] bg-[#fafcf9] px-4 py-4 text-sm text-[#64736b]">
          No report rows available.
        </div>
      )}
    </Card>
  );
}

function DetailTile({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("rounded-[18px] border border-[#e1e7e2] bg-white", compact ? "px-3 py-3" : "px-4 py-4")}>
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#718178]">
        {label}
      </div>
      <div className="mt-2 text-sm font-bold text-[#233329]">{value}</div>
    </div>
  );
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
  const { t } = useTranslation();
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
              {warehouse.name}
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
              {account.name}
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
            !canOpenShift ? "Requires POS_OPEN_SESSION permission / يتطلب صلاحية فتح الجلسة" : undefined
          }
          className="w-full rounded-[20px] bg-[#5f8a67] px-4 py-3 text-sm font-black text-white shadow-[0_18px_42px_-28px_rgba(95,138,103,0.9)] transition hover:bg-[#557b5c] disabled:opacity-50"
        >
          {isPending ? t("pos.sessions.openingAction") : t("pos.sessions.openShiftAction")}
        </button>
      </div>
    </div>
  );
}


function CompactCartLine({
  line,
  currencyCode,
  onIncrease,
  onDecrease,
  onRemove,
  onDiscountChange,
  canEditUnitPrice,
  canEditLineDiscount,
  onUnitPriceChange,
}: {
  line: CartLine;
  currencyCode: string;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  onDiscountChange: (type: DiscountType, value: number) => void;
  canEditUnitPrice?: boolean;
  canEditLineDiscount?: boolean;
  onUnitPriceChange?: (next: number) => void;
}) {
  const [showDiscount, setShowDiscount] = useState(false);
  const lineTotal = getLineTotal(line);
  const hasDiscount = line.discountValue > 0;

  return (
    <div className={cn(
      "rounded-[8px] border bg-white p-2.5 transition",
      hasDiscount ? "border-[#c8deca]" : "border-[#e2eae4]"
    )}>
      {/* Top row: name + remove */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-black text-[#213327] arabic-heading">
            {line.name}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-[#728579]">
            <span>{line.code}</span>
            <span aria-hidden className="text-[#cdd8d0]">
              ·
            </span>
            {canEditUnitPrice && onUnitPriceChange ? (
              <label className="inline-flex items-center gap-1 ps-1">
                <span className="whitespace-nowrap font-semibold text-[#5f6d66]">Unit:</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitPrice === 0 ? "" : line.unitPrice}
                  onChange={(e) =>
                    onUnitPriceChange(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-20 rounded-[5px] border border-[#d6e1d9] bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#213327] focus:border-[#5f8a67] focus:outline-none"
                />
              </label>
            ) : (
              <span>{formatCurrency(line.unitPrice, currencyCode)}</span>
            )}
            {line.trackInventory && (
              <span
                className={cn(
                  "ps-1",
                  line.onHandQuantity <= 0
                    ? "text-[#b85c52]"
                    : line.onHandQuantity <= 5
                      ? "text-[#b08040]"
                      : "text-[#5a8a62]",
                )}
              >
                (
                {line.onHandQuantity <= 0 ? "Out of stock / نفد" : `${formatCount(line.onHandQuantity)} avail`})
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-full bg-[#fff1ef] p-1 text-[#965f58] transition hover:bg-[#ffe7e4]"
          title="Remove"
        >
          <LuTrash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Bottom row: qty controls + discount toggle + line total */}
      <div className="mt-2 flex items-center gap-1.5">
        {/* Quantity stepper */}
        <div className="inline-flex items-center rounded-full border border-[#d7e2d8] bg-[#fbfcfb] p-0.5">
          <button
            type="button"
            onClick={onDecrease}
            className="rounded-full p-1 text-[#4f6556] transition hover:bg-white"
          >
            <LuMinus className="h-3 w-3" />
          </button>
          <span className="min-w-7 px-1.5 text-center text-xs font-black text-[#213327]">
            {formatCount(line.quantity)}
          </span>
          <button
            type="button"
            onClick={onIncrease}
            className="rounded-full p-1 text-[#4f6556] transition hover:bg-white"
          >
            <LuPlus className="h-3 w-3" />
          </button>
        </div>

        {canEditLineDiscount ? (
          <button
            type="button"
            onClick={() => setShowDiscount((v) => !v)}
            title="Line discount / خصم السطر"
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold transition",
              hasDiscount
                ? "border-[#5f8a67] bg-[#edf5ef] text-[#3f6e47]"
                : "border-[#d7e2d8] bg-white text-[#8aad92] hover:border-[#b7cbb9] hover:text-[#4f6556]",
            )}
          >
            %
            {hasDiscount && (
              <span>
                {line.discountType === "PERCENT"
                  ? `${line.discountValue}%`
                  : formatCurrency(line.discountValue, currencyCode)}
              </span>
            )}
          </button>
        ) : (
          hasDiscount && (
            <span className="text-[9px] font-semibold text-[#8aad92]">
              {line.discountType === "PERCENT"
                ? `${line.discountValue}%`
                : formatCurrency(line.discountValue, currencyCode)}{" "}
              off
            </span>
          )
        )}

        {/* Line total */}
        <div className="ms-auto text-end">
          <div className="text-xs font-black text-[#31543a]">
            {formatCurrency(lineTotal, currencyCode)}
          </div>
          {hasDiscount && (
            <div className="text-[9px] text-[#8aad92] line-through">
              {formatCurrency(line.unitPrice * line.quantity, currencyCode)}
            </div>
          )}
        </div>
      </div>

      {/* Expandable discount editor */}
      {showDiscount && canEditLineDiscount && (
        <div className="mt-2 flex items-center gap-1.5 rounded-[7px] border border-[#d6e1d9] bg-[#f7fbf8] px-2 py-1.5">
          <button
            type="button"
            onClick={() => onDiscountChange(
              line.discountType === "FIXED" ? "PERCENT" : "FIXED",
              line.discountValue,
            )}
            className="shrink-0 rounded-[5px] border border-[#c8d9ca] bg-white px-2 py-1 text-[10px] font-black text-[#4f6556] transition hover:bg-[#edf5ef]"
          >
            {line.discountType === "FIXED" ? "JOD" : "%"}
          </button>
          <input
            type="number"
            min="0"
            step="0.01"
            value={line.discountValue === 0 ? "" : line.discountValue}
            onChange={(e) =>
              onDiscountChange(line.discountType, Math.max(0, Number(e.target.value) || 0))
            }
            placeholder="0"
            className="min-w-0 flex-1 bg-transparent text-xs font-bold text-[#213327] placeholder-[#adc0b0] focus:outline-none"
          />
          {hasDiscount && (
            <button
              type="button"
              onClick={() => {
                onDiscountChange("FIXED", 0);
                setShowDiscount(false);
              }}
              className="shrink-0 text-[#adc0b0] hover:text-[#965f58] text-xs font-bold transition"
            >
              ✕
            </button>
          )}
        </div>
      )}
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
        "flex items-center justify-between gap-4",
        emphasized ? "text-[#223228]" : "text-[#5f6d66]",
      )}
    >
      <span className={cn("text-[11px] arabic-auto", emphasized && "font-bold")}>
        {label}
      </span>
      <span className={cn("text-xs font-black", emphasized && "text-sm")}>
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
  const lineTotal = getLineTotal(line);
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-2 hover:border-gray-200 transition">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
        <LuPackage className="h-5 w-5 text-gray-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-bold text-gray-900">{line.name}</p>
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
