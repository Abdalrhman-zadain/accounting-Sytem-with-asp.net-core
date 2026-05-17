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
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LuArrowRightLeft,
  LuBanknote,
  LuChartColumn,
  LuCreditCard,
  LuPackage,
  LuPrinter,
  LuReceipt,
  LuRefreshCcw,
  LuSave,
  LuSearch,
  LuSettings2,
  LuShoppingBasket,
  LuStore,
  LuTimerReset,
  LuWallet,
} from "react-icons/lu";

import { Card, PageShell } from "@/components/ui";
import { Field, Input } from "@/components/ui/forms";
import {
  approvePosAccounting,
  closePosSession,
  completePosSale,
  getBankCashAccounts,
  getActivePosSession,
  getHeldPosSales,
  getInventoryItems,
  getInventoryWarehouses,
  getPendingPosReview,
  getPosReportsOverview,
  getPosReturns,
  getPosSessions,
  holdPosSale,
  openPosSession,
  rejectPosAccounting,
  reprintPosReceipt,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type {
  BankCashAccount,
  InventoryItem,
  InventoryWarehouse,
  PosReportsOverview,
  PosReturn,
  PosSale,
  PosSession,
  PosSessionReport,
} from "@/types/api";
import { POS_THEME } from "./pos-theme";

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

type HeldSale = {
  id: string;
  title: string;
  createdAt: string;
  search: string;
  activeCategory: string;
  selectedWarehouseId: string;
  invoiceDiscountType: DiscountType;
  invoiceDiscountValue: number;
  cartLines: CartLine[];
  paymentEntries: PaymentEntry[];
};

type SessionState = {
  isOpen: boolean;
  terminalName: string;
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

const workspaceTabs: WorkspaceTab[] = [
  { id: "sales", labelKey: "pos.workspace.sales", icon: LuStore },
  { id: "sessions", labelKey: "pos.workspace.sessions", icon: LuTimerReset },
  { id: "held", labelKey: "pos.workspace.held", icon: LuReceipt },
  { id: "review", labelKey: "pos.workspace.review", icon: LuReceipt },
  { id: "returns", labelKey: "pos.workspace.returns", icon: LuArrowRightLeft },
  { id: "reports", labelKey: "pos.workspace.reports", icon: LuChartColumn },
  { id: "settings", labelKey: "pos.workspace.settings", icon: LuSettings2 },
];

const HELD_SALES_KEY = "pos-held-sales";
const SESSION_KEY = "pos-session-state";
const LAST_RECEIPT_KEY = "pos-last-receipt";

function createLocalId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getItemCategory(item: InventoryItem) {
  return (
    item.itemCategory?.name ||
    item.itemGroup?.name ||
    item.category ||
    (item.trackInventory ? "Inventory" : "Services")
  );
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

function getLineTaxAmount(line: CartLine, invoiceDiscountShare = 0) {
  const taxableAfterInvoiceDiscount = Math.max(
    getLineNetBeforeInvoiceDiscount(line) - invoiceDiscountShare,
    0,
  );
  return taxableAfterInvoiceDiscount * (line.taxRate / 100);
}

function getLineTotal(line: CartLine, invoiceDiscountShare = 0) {
  const taxableAfterInvoiceDiscount = Math.max(
    getLineNetBeforeInvoiceDiscount(line) - invoiceDiscountShare,
    0,
  );
  return taxableAfterInvoiceDiscount + getLineTaxAmount(line, invoiceDiscountShare);
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
  };
}

function mapReceiptResponse(receipt: {
  receiptNumber: string;
  soldAt: string;
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
        <h1>إيصال نقطة بيع</h1>
        <h2>${receipt.receiptNumber}</h2>
        <div class="meta">
          <p>التاريخ: ${new Date(receipt.soldAt).toLocaleString()}</p>
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
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [workspace, setWorkspace] = useState<PosWorkspace>("sales");
  const [, startRoutingTransition] = useTransition();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [invoiceDiscountType, setInvoiceDiscountType] =
    useState<DiscountType>("FIXED");
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState(0);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>({
    isOpen: false,
    terminalName: "الجهاز رقم 01",
    openingCash: "",
    expectedCash: 0,
    completedSales: 0,
  });
  const [lastReceipt, setLastReceipt] = useState<CompletedReceipt | null>(null);
  const [lastSessionReport, setLastSessionReport] = useState<PosSessionReport | null>(
    null,
  );
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const messageTimeoutRef = useRef<number | null>(null);

  const itemsQuery = useQuery({
    queryKey: queryKeys.inventoryItems(token, {
      isActive: "true",
      page: 1,
      limit: 100,
    }),
    queryFn: () =>
      getInventoryItems({ isActive: "true", page: 1, limit: 100 }, token),
    enabled: Boolean(token),
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

  const reviewQuery = useQuery({
    queryKey: queryKeys.posReview(token),
    queryFn: () => getPendingPosReview(token),
    enabled: Boolean(token),
  });

  const returnsQuery = useQuery({
    queryKey: queryKeys.posReturns(token),
    queryFn: () => getPosReturns(token),
    enabled: Boolean(token),
  });

  const reportsOverviewQuery = useQuery({
    queryKey: queryKeys.posReportsOverview(token),
    queryFn: () => getPosReportsOverview(token),
    enabled: Boolean(token),
  });

  const refreshPosData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.posActiveSession(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posSessions(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posReview(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posReturns(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posReportsOverview(token) }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.posHeldSales(token, activeSessionQuery.data?.id ?? null),
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
      pushMessage(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
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
      pushMessage(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
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
      pushMessage(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const completeSaleMutation = useMutation({
    mutationFn: (payload: Parameters<typeof completePosSale>[0]) =>
      completePosSale(payload, token),
    onSuccess: async (response) => {
      setEditingInvoiceId(null);
      const receipt = mapReceiptResponse(response.receipt);
      setLastReceipt(receipt);
      resetSale();
      await refreshPosData();
      pushMessage(t("pos.sales.alert.saleCompleted"));
      printReceipt(receipt);
    },
    onError: (error) => {
      pushMessage(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const approveReviewMutation = useMutation({
    mutationFn: (saleId: string) => approvePosAccounting(saleId, {}, token),
    onSuccess: async () => {
      await refreshPosData();
    },
    onError: (error) => {
      pushMessage(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const rejectReviewMutation = useMutation({
    mutationFn: (saleId: string) => rejectPosAccounting(saleId, {}, token),
    onSuccess: async () => {
      await refreshPosData();
    },
    onError: (error) => {
      pushMessage(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
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
  const requestedWorkspace = searchParams.get("tab");

  useEffect(() => {
    if (!requestedWorkspace) {
      startRoutingTransition(() => {
        router.replace("/pos?tab=sales");
      });
      return;
    }
    if (!workspaceTabs.some((tab) => tab.id === requestedWorkspace)) return;
    if (workspace === requestedWorkspace) return;
    setWorkspace(requestedWorkspace as PosWorkspace);
  }, [requestedWorkspace, router, workspace]);

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

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(items.map((item) => getItemCategory(item)).filter(Boolean)),
    );
    return ["all", ...values];
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory =
        activeCategory === "all" || getItemCategory(item) === activeCategory;
      if (!matchesCategory) return false;
      if (!term) return true;
      return [
        item.name,
        item.code,
        item.barcode,
        item.itemCategory?.name,
        item.itemGroup?.name,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  }, [activeCategory, deferredSearch, items]);

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
      taxableBase,
    );
    const tax = cartLines.reduce((sum, line) => {
      const lineBase = getLineNetBeforeInvoiceDiscount(line);
      if (taxableBase <= 0) return sum;
      const invoiceShare = invoiceDiscount * (lineBase / taxableBase);
      const lineTaxable = Math.max(lineBase - invoiceShare, 0);
      return sum + lineTaxable * (line.taxRate / 100);
    }, 0);
    const total = Math.max(taxableBase - invoiceDiscount, 0) + tax;
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
  ]);

  const buildSaleLinesPayload = () => {
    return cartLines.map((line) => {
      const netBeforeInvoiceDiscount = getLineNetBeforeInvoiceDiscount(line);
      const invoiceShare =
        cartMetrics.taxableBase > 0
          ? cartMetrics.invoiceDiscount *
            (netBeforeInvoiceDiscount / cartMetrics.taxableBase)
          : 0;
      const totalDiscountAmount = getLineDiscountAmount(line) + invoiceShare;
      const taxAmount = getLineTaxAmount(line, invoiceShare);
      const lineAmount = getLineTotal(line, invoiceShare);

      return {
        itemId: line.itemId,
        warehouseId:
          line.trackInventory && line.warehouseId ? line.warehouseId : undefined,
        itemName: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountAmount: Number(totalDiscountAmount.toFixed(2)),
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

  const pushMessage = (message: string) => {
    setFlashMessage(message);
    if (messageTimeoutRef.current) {
      window.clearTimeout(messageTimeoutRef.current);
    }
    messageTimeoutRef.current = window.setTimeout(() => {
      setFlashMessage(null);
    }, 3600);
  };

  const resetSale = () => {
    setEditingInvoiceId(null);
    setCartLines([]);
    setInvoiceDiscountType("FIXED");
    setInvoiceDiscountValue(0);
    setSearch("");
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

    setCartLines((current) => {
      const existingIndex = current.findIndex((line) => line.itemId === item.id);
      if (existingIndex >= 0) {
        return current.map((line, index) =>
          index === existingIndex
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
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
      description: search || undefined,
      lines: buildSaleLinesPayload(),
      payments: buildPaymentPayload(),
    });
  };

  const resumeHeldSale = (heldSaleId: string) => {
    const target = heldSales.find((row) => row.id === heldSaleId);
    if (!target) return;
    setCartLines(target.cartLines);
    setPaymentEntries(target.paymentEntries);
    setInvoiceDiscountType(target.invoiceDiscountType);
    setInvoiceDiscountValue(target.invoiceDiscountValue);
    setSelectedWarehouseId(target.selectedWarehouseId);
    setSearch(target.search);
    setActiveCategory(target.activeCategory);
    setEditingInvoiceId(target.id);
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

    const inventoryViolation = cartLines.find(
      (line) =>
        line.trackInventory &&
        (!line.warehouseId || line.quantity > line.onHandQuantity),
    );
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

    const accountViolation = cartLines.find((line) => {
      if (!line.salesAccountId) {
        return true;
      }
      if (line.trackInventory && (!line.inventoryAccountId || !line.cogsAccountId)) {
        return true;
      }
      return false;
    });
    if (accountViolation) {
      pushMessage(
        t("pos.sales.alert.accountMappingRequired", {
          item: accountViolation.name,
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

    if (cartMetrics.paid < cartMetrics.total) {
      pushMessage(t("pos.sales.alert.insufficientPayment"));
      return;
    }

    completeSaleMutation.mutate({
      sessionId: activeSession?.id ?? "",
      invoiceId: editingInvoiceId ?? undefined,
      description: search || undefined,
      lines: buildSaleLinesPayload(),
      payments: buildPaymentPayload(),
    });
  };

  const renderSalesWorkspace = () => {
    return (
      <div
        className="space-y-6"
        style={{ backgroundColor: POS_THEME.colors.pageSurface }}
      >
        <section
          className="overflow-hidden rounded-[32px] border shadow-[0_32px_100px_-55px_rgba(35,51,41,0.45)]"
          style={{
            borderColor: POS_THEME.colors.outline,
            background: POS_THEME.colors.heroGradient,
            boxShadow: POS_THEME.shadows.hero,
          }}
        >
          <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="rounded-full border bg-white/75 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em]"
                  style={{
                    borderColor: POS_THEME.colors.primaryBorderStrong,
                    color: POS_THEME.colors.primaryMuted,
                  }}
                >
                  {t("pos.sales.kicker")}
                </span>
                <span
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-bold",
                    sessionState.isOpen
                      ? "bg-[#46644b] text-white"
                      : "bg-[#ead7d5] text-[#7d3f38]",
                  )}
                >
                  {sessionState.isOpen
                    ? t("pos.sales.sessionOpen")
                    : t("pos.sales.sessionClosed")}
                </span>
              </div>
              <div className="space-y-3">
                <h1
                  className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl arabic-heading"
                  style={{ color: POS_THEME.colors.primaryDark }}
                >
                  {t("pos.sales.title")}
                </h1>
                <p
                  className="max-w-3xl text-base leading-8 arabic-auto"
                  style={{ color: POS_THEME.colors.textMuted }}
                >
                  {t("pos.sales.description")}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <SoftMetric
                  label={t("pos.sales.metric.catalog")}
                  value={formatCount(items.length)}
                  hint={t("pos.sales.metric.catalogHint")}
                />
                <SoftMetric
                  label={t("pos.sales.metric.warehouses")}
                  value={formatCount(warehouses.length)}
                  hint={
                    selectedWarehouse?.name ??
                    t("pos.sales.metric.warehouseNotSelected")
                  }
                />
                <SoftMetric
                  label={t("pos.sales.metric.paymentMethods")}
                  value={formatCount(paymentAccounts.length)}
                  hint={t("pos.sales.metric.paymentHint")}
                />
                <SoftMetric
                  label={t("pos.sales.metric.heldSales")}
                  value={formatCount(heldSales.length)}
                  hint={t("pos.sales.metric.heldHint")}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <SessionCard
                sessionState={sessionState}
                warehouses={warehouses}
                paymentAccounts={paymentAccounts}
                onOpenSession={(openingCash, warehouseId, cashAccountId) => {
                  openSessionMutation.mutate({
                    openingCash: parseAmount(openingCash),
                    warehouseId,
                    cashAccountId,
                    terminalName: sessionState.terminalName,
                  });
                }}
                onCloseSession={() => {
                  if (!activeSession) return;
                  const raw = window.prompt(
                    "Enter actual cash counted in the drawer",
                    String(sessionState.expectedCash.toFixed(2)),
                  );
                  if (raw === null) return;
                  closeSessionMutation.mutate({
                    sessionId: activeSession.id,
                    actualCash: parseAmount(raw),
                  });
                }}
                t={t}
              />
              <ActionNotice
                message={flashMessage}
                lastReceipt={lastReceipt}
                onPrintLastReceipt={() => {
                  if (lastReceipt) {
                    printReceipt(lastReceipt);
                  }
                }}
                t={t}
              />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_440px]">
          <section className="space-y-5">
            <Card className="rounded-[28px] border-[#d7ddd8] bg-[#f9faf8] p-5 shadow-[0_18px_55px_-40px_rgba(40,64,48,0.45)]">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_220px]">
                <Field label={t("pos.sales.searchLabel")} className="mb-0">
                  <div className="relative">
                    <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#76867c] rtl:left-auto rtl:right-4" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleBarcodeSubmit();
                        }
                      }}
                      placeholder={t("pos.sales.searchPlaceholder")}
                      className="rounded-[20px] border-[#d4ddd7] bg-white py-3 pl-11 pr-4 text-sm focus:border-[#46644b] focus:ring-[#46644b]/10 rtl:pl-4 rtl:pr-11"
                    />
                  </div>
                </Field>
                <Field label={t("pos.sales.warehouseLabel")} className="mb-0">
                  <select
                    value={selectedWarehouseId}
                    onChange={(event) => setSelectedWarehouseId(event.target.value)}
                    className="w-full rounded-[20px] border border-[#d4ddd7] bg-white px-4 py-3 text-sm font-semibold text-[#233329] outline-none transition focus:border-[#46644b] focus:ring-4 focus:ring-[#46644b]/10"
                  >
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("pos.sales.invoiceDiscountType")} className="mb-0">
                  <select
                    value={invoiceDiscountType}
                    onChange={(event) =>
                      setInvoiceDiscountType(event.target.value as DiscountType)
                    }
                    className="w-full rounded-[20px] border border-[#d4ddd7] bg-white px-4 py-3 text-sm font-semibold text-[#233329] outline-none transition focus:border-[#46644b] focus:ring-4 focus:ring-[#46644b]/10"
                  >
                    <option value="FIXED">{t("pos.sales.discountFixed")}</option>
                    <option value="PERCENT">
                      {t("pos.sales.discountPercent")}
                    </option>
                  </select>
                </Field>
                <Field label={t("pos.sales.invoiceDiscountValue")} className="mb-0">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={String(invoiceDiscountValue)}
                    onChange={(event) =>
                      setInvoiceDiscountValue(parseAmount(event.target.value))
                    }
                    className="rounded-[20px] border-[#d4ddd7] bg-white py-3"
                  />
                </Field>
              </div>
            </Card>

            <div className="flex gap-3 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition",
                    activeCategory === category
                      ? "border-[#46644b] bg-[#46644b] text-white shadow-[0_14px_36px_-22px_rgba(70,100,75,0.85)]"
                      : "border-[#d4ddd7] bg-white text-[#58675f] hover:border-[#b9c8bc] hover:bg-[#f6f8f6]",
                  )}
                >
                  {category === "all" ? t("pos.sales.categoryAll") : category}
                </button>
              ))}
            </div>

            {heldSales.length > 0 ? (
              <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-5 shadow-[0_18px_55px_-40px_rgba(40,64,48,0.3)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-black text-[#233329] arabic-heading">
                      {t("pos.sales.heldSectionTitle")}
                    </div>
                    <div className="mt-1 text-sm text-[#6c7a72] arabic-auto">
                      {t("pos.sales.heldSectionDescription")}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {heldSales.map((heldSale) => (
                    <div
                      key={heldSale.id}
                      className="rounded-[22px] border border-[#dbe2dd] bg-[#f9faf8] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-black text-[#233329] arabic-heading">
                            {heldSale.title}
                          </div>
                          <div className="mt-1 text-xs text-[#708078]">
                            {new Date(heldSale.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => resumeHeldSale(heldSale.id)}
                          className="rounded-full bg-[#46644b] px-4 py-2 text-xs font-bold text-white"
                        >
                          {t("pos.sales.resumeHeld")}
                        </button>
                      </div>
                      <div className="mt-3 text-sm text-[#5f6d66] arabic-auto">
                        {t("pos.sales.heldSummary", {
                          count: heldSale.cartLines.length,
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {itemsQuery.isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-56 animate-pulse rounded-[28px] border border-[#dbe2dd] bg-[#eef3ef]"
                  />
                ))}
              </div>
            ) : itemsQuery.isError ? (
              <Card className="rounded-[28px] border-[#e4d1cf] bg-white/95 p-8 text-center shadow-[0_18px_55px_-40px_rgba(40,64,48,0.45)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f6ecea] text-[#8f5a55]">
                  <LuPackage className="h-6 w-6" />
                </div>
                <div className="mt-4 text-lg font-bold text-[#233329] arabic-heading">
                  {t("pos.sales.loadErrorTitle")}
                </div>
                <p className="mt-2 text-sm leading-7 text-[#6a776f] arabic-auto">
                  {t("pos.sales.loadErrorDescription")}
                </p>
              </Card>
            ) : filteredItems.length === 0 ? (
              <Card className="rounded-[28px] border-[#d7ddd8] bg-white/95 p-8 text-center shadow-[0_18px_55px_-40px_rgba(40,64,48,0.45)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3ef] text-[#46644b]">
                  <LuShoppingBasket className="h-6 w-6" />
                </div>
                <div className="mt-4 text-lg font-bold text-[#233329] arabic-heading">
                  {t("pos.sales.emptyTitle")}
                </div>
                <p className="mt-2 text-sm leading-7 text-[#6a776f] arabic-auto">
                  {t("pos.sales.emptyDescription")}
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {filteredItems.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    currencyCode={currencyCode}
                    onAdd={() => addItemToCart(item)}
                    t={t}
                  />
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <Card className="rounded-[30px] border-[#d7ddd8] bg-[#fcfcfb] p-0 shadow-[0_24px_80px_-48px_rgba(40,64,48,0.45)]">
              <div className="border-b border-[#e1e7e2] px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-black text-[#233329] arabic-heading">
                      {t("pos.sales.cartTitle")}
                    </div>
                    <div className="mt-1 text-sm text-[#6c7a72] arabic-auto">
                      {t("pos.sales.cartSubtitle", { count: cartLines.length })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetSale}
                    className="rounded-full border border-[#d6ded8] bg-white px-3 py-2 text-xs font-bold text-[#5d6c64] transition hover:border-[#bcc9c0] hover:bg-[#f7f9f7]"
                  >
                    {t("pos.sales.clearCart")}
                  </button>
                </div>
              </div>

              <div className="max-h-[380px] space-y-3 overflow-y-auto px-5 py-5">
                {cartLines.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[#d0dad3] bg-[#f7faf8] px-5 py-8 text-center">
                    <div className="text-sm font-bold text-[#233329] arabic-auto">
                      {t("pos.sales.cartEmptyTitle")}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[#6c7a72] arabic-auto">
                      {t("pos.sales.cartEmptyDescription")}
                    </p>
                  </div>
                ) : (
                  cartLines.map((line) => (
                    <CartLineCard
                      key={line.itemId}
                      line={line}
                      warehouses={warehouses}
                      currencyCode={currencyCode}
                      onChange={(patch) =>
                        updateLine(line.itemId, (current) => ({ ...current, ...patch }))
                      }
                      onRemove={() => updateLine(line.itemId, () => null)}
                      t={t}
                    />
                  ))
                )}
              </div>

              <div className="space-y-4 border-t border-[#e1e7e2] px-5 py-5">
                <div className="grid gap-3 rounded-[24px] bg-[#f4f7f4] p-4">
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

                <div className="space-y-3 rounded-[24px] border border-[#dbe2dd] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-[#233329] arabic-heading">
                      {t("pos.sales.paymentSectionTitle")}
                    </div>
                    <button
                      type="button"
                      onClick={addPaymentEntry}
                      className="rounded-full border border-[#d6ded8] px-3 py-1.5 text-xs font-bold text-[#55645c]"
                    >
                      {t("pos.sales.addPayment")}
                    </button>
                  </div>
                  {paymentEntriesResolved.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="rounded-[18px] border border-[#e1e7e2] bg-[#fbfcfb] p-3"
                    >
                      <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr_0.9fr_auto]">
                        <select
                          value={entry.bankCashAccountId}
                          onChange={(event) =>
                            updatePaymentEntry(entry.id, {
                              bankCashAccountId: event.target.value,
                            })
                          }
                          className="w-full rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-3 text-sm font-semibold text-[#233329] outline-none"
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
                            updatePaymentEntry(entry.id, { amount: event.target.value })
                          }
                          placeholder={
                            entry.account?.type.toUpperCase().includes("CASH")
                              ? t("pos.sales.cashTenderedLabel")
                              : t("pos.sales.paymentAmount")
                          }
                          className="rounded-[16px] border-[#d4ddd7] bg-white py-3"
                        />
                        <Input
                          value={entry.reference}
                          onChange={(event) =>
                            updatePaymentEntry(entry.id, { reference: event.target.value })
                          }
                          placeholder={t("pos.sales.paymentReference")}
                          className="rounded-[16px] border-[#d4ddd7] bg-white py-3"
                        />
                        <button
                          type="button"
                          onClick={() => removePaymentEntry(entry.id)}
                          disabled={paymentEntriesResolved.length === 1}
                          className="rounded-[16px] border border-[#ead7d5] px-3 py-3 text-xs font-bold text-[#8f5a55] disabled:opacity-40"
                          title={t("pos.sales.removePayment")}
                        >
                          {index + 1}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 rounded-[24px] border border-[#dbe2dd] bg-white p-4">
                  <TotalRow
                    label={t("pos.sales.cashTenderedLabel")}
                    value={formatCurrency(cartMetrics.tendered, currencyCode)}
                    emphasized={cartMetrics.tendered > 0}
                  />
                  <TotalRow
                    label={t("pos.sales.totalPaid")}
                    value={formatCurrency(cartMetrics.paid, currencyCode)}
                  />
                  <TotalRow
                    label={t("pos.sales.totalChange")}
                    value={formatCurrency(cartMetrics.change, currencyCode)}
                    emphasized={cartMetrics.change > 0}
                  />
                  <TotalRow
                    label={t("pos.sales.amountDue")}
                    value={formatCurrency(cartMetrics.amountDue, currencyCode)}
                    emphasized={cartMetrics.amountDue > 0}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <SoftActionButton
                    icon={LuSave}
                    label={t("pos.sales.holdAction")}
                    onClick={holdSale}
                  />
                  <SoftActionButton
                    icon={LuRefreshCcw}
                    label={t("pos.sales.voidAction")}
                    onClick={() => {
                      resetSale();
                      pushMessage(t("pos.sales.alert.voidedDraft"));
                    }}
                  />
                  <SoftActionButton
                    icon={LuPrinter}
                    label={t("pos.sales.printLastReceipt")}
                    onClick={() => {
                      if (lastReceipt) {
                        printReceipt(lastReceipt);
                        return;
                      }
                      pushMessage(t("pos.sales.alert.noReceiptYet"));
                    }}
                  />
                  <button
                    type="button"
                    onClick={completeSale}
                    disabled={completeSaleMutation.isPending}
                    className="inline-flex items-center justify-center rounded-[22px] bg-[#46644b] px-5 py-4 text-sm font-black text-white shadow-[0_20px_45px_-24px_rgba(70,100,75,0.95)] transition hover:-translate-y-0.5 hover:bg-[#3f5a44]"
                  >
                    {completeSaleMutation.isPending
                      ? "..."
                      : t("pos.sales.completeAction")}
                  </button>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    );
  };

  const renderSessionsWorkspace = () => {
    return (
      <div className="space-y-6">
        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
          <div className="text-2xl font-black text-[#233329] arabic-heading">
            {t("pos.workspace.sessions")}
          </div>
          <p className="mt-2 text-sm text-[#64736b] arabic-auto">
            {activeSession
              ? `Open session ${activeSession.sessionNumber} at ${activeSession.terminalName}`
              : t("pos.sessions.noOpen")}
          </p>
          {lastSessionReport ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <SoftMetric
                label={t("pos.sessions.expected")}
                value={lastSessionReport.expectedCash}
                hint={t("pos.sales.expectedCash")}
              />
              <SoftMetric
                label={t("pos.sessions.actual")}
                value={lastSessionReport.actualCash ?? "—"}
                hint={t("pos.sessions.actual")}
              />
              <SoftMetric
                label={t("pos.sessions.difference")}
                value={lastSessionReport.difference ?? "—"}
                hint={t("pos.sessions.difference")}
              />
            </div>
          ) : null}
        </Card>
        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
          <div className="text-lg font-black text-[#233329] arabic-heading">
            {t("pos.sessions.recent")}
          </div>
          <div className="mt-4 space-y-3">
            {(posSessionsQuery.data ?? []).map((session) => (
              <div
                key={session.id}
                className="rounded-[20px] border border-[#dbe2dd] bg-[#f8faf8] p-4"
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
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  const renderReviewWorkspace = () => {
    return (
      <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
        <div className="text-2xl font-black text-[#233329] arabic-heading">
          {t("pos.workspace.review")}
        </div>
        <div className="mt-5 space-y-4">
          {(reviewQuery.data ?? []).map((sale) => (
            <div
              key={sale.id}
              className="rounded-[22px] border border-[#dbe2dd] bg-[#f9faf8] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-black text-[#233329]">{sale.reference}</div>
                  <div className="text-sm text-[#68776f]">
                    {sale.posAccountingStatus} · {sale.totalAmount} {sale.currencyCode}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => reprintReceiptMutation.mutate(sale.id)}
                    className="rounded-full border border-[#d6e0d8] px-4 py-2 text-xs font-bold text-[#46644b]"
                  >
                    {t("pos.sales.printLastReceipt")}
                  </button>
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
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
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
            Completed POS returns, refund methods, and accounting review status.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SoftMetric
              label="Returns"
              value={formatCount(returns.length)}
              hint="Operational returns created from completed POS sales."
            />
            <SoftMetric
              label="Refunded"
              value={formatCurrency(
                returns.reduce((sum, row) => sum + parseAmount(row.refundAmount), 0),
              )}
              hint="Total refund amount recorded across POS returns."
            />
            <SoftMetric
              label="Pending"
              value={formatCount(
                returns.filter((row) => row.accountingStatus === "PENDING_REVIEW").length,
              )}
              hint="Returns waiting for accounting review."
            />
          </div>
        </Card>

        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
          <div className="space-y-4">
            {returns.map((posReturn) => (
              <div
                key={posReturn.id}
                className="rounded-[22px] border border-[#dbe2dd] bg-[#f9faf8] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-black text-[#233329]">{posReturn.reference}</div>
                    <div className="text-sm text-[#68776f]">
                      {posReturn.salesInvoice.reference} · {posReturn.accountingStatus} ·{" "}
                      {formatCurrency(parseAmount(posReturn.totalAmount), posReturn.currencyCode)}
                    </div>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#6a7a71]">
                    {posReturn.status}
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
              </div>
            ))}
            {returns.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[#d7ddd8] bg-[#fafcf9] p-6 text-sm text-[#64736b]">
                No POS returns have been recorded yet.
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    );
  };

  const renderReportsWorkspace = () => {
    const overview = reportsOverviewQuery.data;

    return (
      <div className="space-y-6">
        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
          <div className="text-2xl font-black text-[#233329] arabic-heading">
            {t("pos.workspace.reports")}
          </div>
          <p className="mt-2 text-sm text-[#64736b] arabic-auto">
            Payment mix, cashier performance, branch totals, and tax summary for POS activity.
          </p>
          {overview ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <SoftMetric
                label="Pending Review"
                value={formatCount(overview.pendingReviewCount)}
                hint="Completed POS sales waiting for accounting."
              />
              <SoftMetric
                label="Payment Mix"
                value={formatCount(overview.salesByPaymentMethod.length)}
                hint="Distinct payment methods used in POS sales."
              />
              <SoftMetric
                label="Cashiers"
                value={formatCount(overview.salesByCashier.length)}
                hint="Cashiers with completed POS sales in the current report."
              />
              <SoftMetric
                label="Branches"
                value={formatCount(overview.salesByBranch.length)}
                hint="Branches represented in POS reporting."
              />
            </div>
          ) : null}
        </Card>

        {overview ? (
          <div className="grid gap-6 xl:grid-cols-2">
            <ReportCard
              title="Sales by payment method"
              rows={overview.salesByPaymentMethod.map((row) => ({
                label: row.method,
                value: `${row.salesAmount} · ${row.invoiceCount} invoices`,
              }))}
            />
            <ReportCard
              title="Sales by cashier"
              rows={overview.salesByCashier.map((row) => ({
                label: row.cashierName,
                value: `${row.salesAmount} · ${row.invoiceCount} invoices`,
              }))}
            />
            <ReportCard
              title="Sales by branch"
              rows={overview.salesByBranch.map((row) => ({
                label: row.branchName,
                value: `${row.salesAmount} · ${row.invoiceCount} invoices`,
              }))}
            />
            <ReportCard
              title="Tax summary"
              rows={overview.taxSummary.map((row) => ({
                label: `${row.taxCode} (${row.rate}%)`,
                value: `${row.netTax} net tax`,
              }))}
            />
          </div>
        ) : null}
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

    if (workspace === "review") {
      return renderReviewWorkspace();
    }

    if (workspace === "returns") {
      return renderReturnsWorkspace();
    }

    if (workspace === "reports") {
      return renderReportsWorkspace();
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

  return <PageShell>{renderWorkspace()}</PageShell>;
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

function SessionCard({
  sessionState,
  warehouses,
  paymentAccounts,
  onOpenSession,
  onCloseSession,
  t,
}: {
  sessionState: SessionState;
  warehouses: InventoryWarehouse[];
  paymentAccounts: BankCashAccount[];
  onOpenSession: (
    openingCash: string,
    warehouseId: string,
    cashAccountId: string,
  ) => void;
  onCloseSession: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
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
          account.type.toUpperCase().includes("CASH"),
        ) ?? paymentAccounts[0];
      setCashAccountId(defaultCash.id);
    }
  }, [cashAccountId, paymentAccounts]);

  return (
    <div className="rounded-[28px] border border-[#dbe2dd] bg-white/92 p-5 shadow-[0_18px_48px_-36px_rgba(35,51,41,0.55)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#708078]">
            {t("pos.sales.sessionCard")}
          </div>
          <div className="mt-2 text-xl font-black text-[#223228] arabic-heading">
            {sessionState.terminalName}
          </div>
        </div>
        <div className="rounded-full bg-[#eef3ef] p-3 text-[#46644b]">
          <LuWallet className="h-5 w-5" />
        </div>
      </div>

      {sessionState.isOpen ? (
        <>
          <div className="mt-5 space-y-3 text-sm text-[#55645c]">
            <DetailRow
              label={t("pos.sales.sessionWarehouse")}
              value={
                warehouses.find((row) => row.id === sessionState.warehouseId)?.name ??
                "—"
              }
            />
            <DetailRow
              label={t("pos.sales.sessionPayment")}
              value={
                paymentAccounts.find((row) => row.id === sessionState.cashAccountId)
                  ?.name ?? "—"
              }
            />
            <DetailRow
              label={t("pos.sales.sessionStatus")}
              value={t("pos.sales.sessionOpen")}
            />
            <DetailRow
              label={t("pos.sales.openingCash")}
              value={sessionState.openingCash || "0.00"}
            />
            <DetailRow
              label={t("pos.sales.expectedCash")}
              value={sessionState.expectedCash.toFixed(2)}
            />
          </div>
          <button
            type="button"
            onClick={onCloseSession}
            className="mt-5 w-full rounded-[18px] border border-[#ccd7cf] bg-[#f7faf8] px-4 py-3 text-sm font-bold text-[#42564a] transition hover:border-[#b7c7bb] hover:bg-white"
          >
            {t("pos.sales.closeSessionAction")}
          </button>
        </>
      ) : (
        <div className="mt-5 space-y-3">
          <Field label={t("pos.sales.openingCash")} className="mb-0">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={openingCash}
              onChange={(event) => setOpeningCash(event.target.value)}
              className="rounded-[18px] border-[#d4ddd7] bg-white py-3"
            />
          </Field>
          <Field label={t("pos.sales.sessionWarehouse")} className="mb-0">
            <select
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              className="w-full rounded-[18px] border border-[#d4ddd7] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
            >
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("pos.sales.sessionPayment")} className="mb-0">
            <select
              value={cashAccountId}
              onChange={(event) => setCashAccountId(event.target.value)}
              className="w-full rounded-[18px] border border-[#d4ddd7] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
            >
              {paymentAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            onClick={() => onOpenSession(openingCash, warehouseId, cashAccountId)}
            className="mt-2 w-full rounded-[18px] bg-[#46644b] px-4 py-3 text-sm font-bold text-white"
          >
            {t("pos.sales.openSessionAction")}
          </button>
        </div>
      )}
    </div>
  );
}

function ActionNotice({
  message,
  lastReceipt,
  onPrintLastReceipt,
  t,
}: {
  message: string | null;
  lastReceipt: CompletedReceipt | null;
  onPrintLastReceipt: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div className="rounded-[28px] border border-[#dbe2dd] bg-[#243229] p-5 text-white shadow-[0_24px_56px_-36px_rgba(36,50,41,0.9)]">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-[#b8ccb9]">
        {t("pos.sales.quickNote")}
      </div>
      <div className="mt-3 text-lg font-black arabic-heading">
        {message ?? t("pos.sales.quickNoteDefault")}
      </div>
      <p className="mt-3 text-sm leading-7 text-[#dbe7dd] arabic-auto">
        {lastReceipt
          ? `${t("pos.sales.lastReceipt")}: ${lastReceipt.receiptNumber}`
          : t("pos.sales.quickNoteHint")}
      </p>
      {lastReceipt ? (
        <button
          type="button"
          onClick={onPrintLastReceipt}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white"
        >
          <LuPrinter className="h-4 w-4" />
          {t("pos.sales.printLastReceipt")}
        </button>
      ) : null}
    </div>
  );
}

function ProductCard({
  item,
  currencyCode,
  onAdd,
  t,
}: {
  item: InventoryItem;
  currencyCode: string;
  onAdd: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const price = parseAmount(item.defaultSalesPrice);
  const category = getItemCategory(item);
  const availableQty = parseAmount(item.onHandQuantity);

  return (
    <button
      type="button"
      onClick={onAdd}
      className="group overflow-hidden rounded-[28px] border border-[#dbe2dd] bg-white text-left shadow-[0_18px_55px_-42px_rgba(40,64,48,0.5)] transition hover:-translate-y-1 hover:shadow-[0_28px_70px_-38px_rgba(40,64,48,0.45)]"
    >
      <div className="relative h-40 overflow-hidden bg-[linear-gradient(135deg,_#f5f3f3_0%,_#dde4df_45%,_#c9ebcc_100%)]">
        {item.itemImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.itemImageUrl}
            alt={item.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-full bg-white/85 p-4 text-[#46644b] shadow">
              <LuPackage className="h-8 w-8" />
            </div>
          </div>
        )}
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#5b6a62]">
          {category}
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-black text-[#223228] arabic-heading">
              {item.name}
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#76867c]">
              {item.code}
            </div>
          </div>
          <div className="text-base font-black text-[#46644b]">
            {formatCurrency(price, currencyCode)}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-[#5f6d66]">
          <span className="arabic-auto">{item.unitOfMeasure}</span>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold",
              item.trackInventory
                ? "bg-[#eef3ef] text-[#46644b]"
                : "bg-[#f2efec] text-[#746860]",
            )}
          >
            {item.trackInventory
              ? `${t("pos.sales.onHand")} ${formatCount(availableQty)}`
              : t("pos.sales.serviceItem")}
          </span>
        </div>
      </div>
    </button>
  );
}

function CartLineCard({
  line,
  warehouses,
  currencyCode,
  onChange,
  onRemove,
  t,
}: {
  line: CartLine;
  warehouses: InventoryWarehouse[];
  currencyCode: string;
  onChange: (patch: Partial<CartLine>) => void;
  onRemove: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const taxAmount = getLineTaxAmount(line);

  return (
    <div className="rounded-[24px] border border-[#dde4df] bg-[#fbfcfb] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-[#223228] arabic-heading">
            {line.name}
          </div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#77867e]">
            {line.code}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-bold text-[#8f5a55] transition hover:text-[#7d3f38]"
        >
          {t("pos.sales.removeLine")}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input
          type="number"
          min="1"
          step="1"
          value={String(line.quantity)}
          onChange={(event) =>
            onChange({ quantity: Math.max(1, parseAmount(event.target.value)) })
          }
          className="rounded-[16px] border-[#d4ddd7] bg-white py-3"
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          value={String(line.unitPrice)}
          onChange={(event) =>
            onChange({ unitPrice: parseAmount(event.target.value) })
          }
          className="rounded-[16px] border-[#d4ddd7] bg-white py-3"
        />
        <select
          value={line.discountType}
          onChange={(event) =>
            onChange({ discountType: event.target.value as DiscountType })
          }
          className="w-full rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
        >
          <option value="FIXED">{t("pos.sales.discountFixed")}</option>
          <option value="PERCENT">{t("pos.sales.discountPercent")}</option>
        </select>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={String(line.discountValue)}
          onChange={(event) =>
            onChange({ discountValue: parseAmount(event.target.value) })
          }
          className="rounded-[16px] border-[#d4ddd7] bg-white py-3"
        />
        {line.trackInventory ? (
          <select
            value={line.warehouseId ?? ""}
            onChange={(event) => onChange({ warehouseId: event.target.value })}
            className="w-full rounded-[16px] border border-[#d4ddd7] bg-white px-4 py-3 text-sm font-semibold text-[#233329] sm:col-span-2"
          >
            <option value="">{t("pos.sales.selectWarehouseLine")}</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-[#617067]">
        <MiniStat
          label={t("pos.sales.onHand")}
          value={line.trackInventory ? formatCount(line.onHandQuantity) : "—"}
        />
        <MiniStat
          label={t("pos.sales.totalTax")}
          value={formatCurrency(taxAmount, currencyCode)}
        />
        <MiniStat
          label={t("pos.sales.lineTotal")}
          value={formatCurrency(getLineTotal(line), currencyCode)}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[#617067]">
        <MiniStat
          label={t("pos.sales.unitCost")}
          value={formatCurrency(line.unitCost, currencyCode)}
        />
        <MiniStat
          label={t("pos.sales.totalCost")}
          value={formatCurrency(getLineTotalCost(line), currencyCode)}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-white px-3 py-2">
      <div className="text-[11px] text-[#7b8b82]">{label}</div>
      <div className="mt-1 font-bold text-[#223228]">{value}</div>
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
      <span className={cn("text-sm arabic-auto", emphasized && "font-bold")}>
        {label}
      </span>
      <span className={cn("text-sm font-black", emphasized && "text-lg")}>
        {value}
      </span>
    </div>
  );
}

function SoftActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-[#d8dfda] bg-white px-4 py-4 text-sm font-bold text-[#55645c] transition hover:border-[#bfcabf] hover:bg-[#f7faf8]"
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#7b8b82]">
        {label}
      </span>
      <span className="text-sm font-semibold text-[#223228] arabic-auto">
        {value}
      </span>
    </div>
  );
}
