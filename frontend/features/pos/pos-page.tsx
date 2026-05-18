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
  approvePosReturnAccounting,
  closePosSession,
  completePosSale,
  createPosReturn,
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
  voidPosSale,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type {
  BankCashAccount,
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

  const settingsQuery = useQuery({
    queryKey: queryKeys.posSettings(token),
    queryFn: () => getPosSettings(token),
    enabled: Boolean(token && (workspace === "sales" || workspace === "settings")),
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
      pushMessage("POS sale approved and posted.");
    },
    onError: (error) => {
      pushMessage(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const rejectReviewMutation = useMutation({
    mutationFn: (saleId: string) => rejectPosAccounting(saleId, {}, token),
    onSuccess: async () => {
      await refreshPosData();
      pushMessage("POS sale moved to rejected review status.");
    },
    onError: (error) => {
      pushMessage(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
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
      pushMessage(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
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
      pushMessage(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
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
      pushMessage(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const approveReturnMutation = useMutation({
    mutationFn: (returnId: string) => approvePosReturnAccounting(returnId, {}, token),
    onSuccess: async () => {
      await refreshPosData();
      pushMessage("POS return approved and posted.");
    },
    onError: (error) => {
      pushMessage(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
    },
  });

  const rejectReturnMutation = useMutation({
    mutationFn: (returnId: string) => rejectPosReturnAccounting(returnId, {}, token),
    onSuccess: async () => {
      await refreshPosData();
      pushMessage("POS return marked as rejected.");
    },
    onError: (error) => {
      pushMessage(getErrorMessage(error, t("pos.sales.loadErrorDescription")));
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
  const posSettings = settingsQuery.data;
  const taxPolicy = posSettings?.runtime.invoiceDiscountTaxPolicy ?? "BEFORE_TAX";
  const completedSales = completedSalesQuery.data ?? [];
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
      description: search || undefined,
      lines: buildSaleLinesPayload(),
      payments: buildPaymentPayload(),
    });
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
                      if (editingInvoiceId) {
                        voidSaleMutation.mutate(editingInvoiceId);
                        return;
                      }
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
    const report = sessionReportQuery.data ?? lastSessionReport;

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
                label="Invoices"
                value={formatCount(report.invoiceCount)}
                hint={`${report.returnCount} returns`}
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
                  <DetailTile label="Branch" value={report.branchName || "—"} />
                  <DetailTile label="Warehouse" value={report.warehouse.name} />
                  <DetailTile label="Cash Account" value={report.cashAccount.name} />
                  <DetailTile label="Opening Cash" value={report.openingCash} />
                  <DetailTile label="Cash Sales" value={report.cashSales} />
                  <DetailTile label="Cash Refunds" value={report.cashRefunds} />
                  <DetailTile label="Card Sales" value={report.cardSales} />
                  <DetailTile label="CliQ Sales" value={report.cliqSales} />
                  <DetailTile label="Wallet Sales" value={report.walletSales} />
                  <DetailTile label="Bank Transfer" value={report.bankTransferSales} />
                  <DetailTile label="Discounts" value={report.discounts} />
                  <DetailTile label="Tax" value={report.tax} />
                  <DetailTile label="Total Sales" value={report.totalSales} />
                  <DetailTile label="Opened" value={new Date(report.openedAt).toLocaleString()} />
                  <DetailTile
                    label="Closed"
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
            Resume or void held POS sales without affecting inventory, cash, or accounting.
          </p>
        </Card>

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
                    {heldSale.cartLines.length} lines
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
                      setWorkspace("sales");
                      startRoutingTransition(() => {
                        router.replace("/pos?tab=sales");
                      });
                      resumeHeldSale(heldSale.id);
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
              No held POS sales are waiting to be resumed.
            </Card>
          )}
        </div>
      </div>
    );
  };

  const renderReviewWorkspace = () => {
    return (
      <div className="space-y-6">
        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
          <div className="text-2xl font-black text-[#233329] arabic-heading">
            {t("pos.workspace.review")}
          </div>
          <p className="mt-2 text-sm text-[#64736b] arabic-auto">
            Review completed POS sales, inventory relief, captured payments, and draft accounting before posting.
          </p>
        </Card>
        <div className="space-y-4">
          {(reviewQuery.data ?? []).map((sale) => (
            <Card key={sale.id} className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-black text-[#233329]">{sale.reference}</div>
                  <div className="mt-1 text-sm text-[#68776f]">
                    {sale.posAccountingStatus} · {sale.totalAmount} {sale.currencyCode}
                  </div>
                  <div className="mt-1 text-sm text-[#68776f]">
                    Session: {sale.session?.sessionNumber ?? "—"} · Warehouse:{" "}
                    {sale.session?.warehouse.name ?? "—"}
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
                      Reverse
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
                <DetailTile label="Subtotal" value={sale.subtotalAmount} />
                <DetailTile label="Discount" value={sale.discountAmount} />
                <DetailTile label="Tax" value={sale.taxAmount} />
                <DetailTile label="Change" value={sale.posChangeAmount ?? "0.00"} />
              </div>
              <div className="mt-5 grid gap-3 xl:grid-cols-2">
                <div className="rounded-[20px] border border-[#dbe2dd] bg-[#f8faf8] p-4">
                  <div className="font-bold text-[#233329]">Lines</div>
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
                  <div className="font-bold text-[#233329]">Payments</div>
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
          {(reviewQuery.data ?? []).length === 0 ? (
            <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 text-sm text-[#64736b]">
              No POS sales are waiting for accountant review right now.
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
            Capture cashier-side POS returns and then route them through accounting approval or reversal.
          </p>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
            <div className="text-lg font-black text-[#233329]">Create POS return</div>
            <div className="mt-4 space-y-4">
              <Field label="Original sale" className="mb-0">
                <select
                  value={selectedReturnSaleId}
                  onChange={(event) => setSelectedReturnSaleId(event.target.value)}
                  className="w-full rounded-[18px] border border-[#d4ddd7] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
                >
                  <option value="">Select a completed POS sale</option>
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
                      <DetailTile label="Receipt" value={selectedReturnSale.receiptNumber ?? "—"} compact />
                      <DetailTile label="Session" value={selectedReturnSale.session?.sessionNumber ?? "—"} compact />
                      <DetailTile label="Warehouse" value={selectedReturnSale.session?.warehouse.name ?? "—"} compact />
                      <DetailTile label="Invoice total" value={selectedReturnSale.totalAmount} compact />
                    </div>
                  </div>
                  <Field label="Return reason" className="mb-0">
                    <Input
                      value={returnReason}
                      onChange={(event) => setReturnReason(event.target.value)}
                      placeholder="Damaged item, customer cancellation, pricing correction..."
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
                              Sold {soldQuantity} at {line.unitPrice} each
                            </div>
                          </div>
                          <DetailTile label="Line total" value={line.lineAmount} compact />
                          <Field label="Return qty" className="mb-0">
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
                        Refund methods
                      </div>
                      <button
                        type="button"
                        onClick={addReturnPaymentEntry}
                        className="rounded-full border border-[#d6ded8] px-3 py-1.5 text-xs font-bold text-[#55645c]"
                      >
                        Add refund
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
                          <option value="CASH">Cash</option>
                          <option value="CARD">Card</option>
                          <option value="CLIQ">CliQ</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="WALLET">Wallet</option>
                          <option value="STORE_CREDIT">Store Credit</option>
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
                          placeholder="Reference"
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
                    <DetailTile label="Returned lines" value={String(returnPreview.selectedLineCount)} compact />
                    <DetailTile label="Expected refund" value={formatCurrency(returnPreview.totalAmount)} compact />
                    <DetailTile
                      label="Allocated refund"
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
                    {createReturnMutation.isPending ? "..." : "Create POS return"}
                  </button>
                </>
              ) : (
                <div className="rounded-[20px] border border-dashed border-[#dbe2dd] bg-[#fafcf9] p-6 text-sm text-[#64736b]">
                  Choose a completed POS sale to start a return.
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
              <div className="grid gap-3 sm:grid-cols-3">
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
            Payment mix, cashier performance, branch totals, pending review exposure, stock impact, and tax summary for POS activity.
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
                value={formatCount(salesByPaymentMethod.length)}
                hint="Distinct payment methods used in POS sales."
              />
              <SoftMetric
                label="Cashiers"
                value={formatCount(salesByCashier.length)}
                hint="Cashiers with completed POS sales in the current report."
              />
              <SoftMetric
                label="Branches"
                value={formatCount(salesByBranch.length)}
                hint="Branches represented in POS reporting."
              />
            </div>
          ) : null}
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <ReportCard
            title="Sales by payment method"
            rows={salesByPaymentMethod.map((row) => ({
              label: row.method,
              value: `${row.salesAmount} · ${row.invoiceCount} invoices`,
            }))}
          />
          <ReportCard
            title="Sales by cashier"
            rows={salesByCashier.map((row) => ({
              label: row.cashierName,
              value: `${row.salesAmount} · ${row.invoiceCount} invoices`,
            }))}
          />
          <ReportCard
            title="Sales by branch"
            rows={salesByBranch.map((row) => ({
              label: row.branchName,
              value: `${row.salesAmount} · ${row.invoiceCount} invoices`,
            }))}
          />
          <ReportCard
            title="Tax summary"
            rows={taxSummary.map((row: PosTaxSummaryRow) => ({
              label: `${row.taxCode} (${row.rate}%)`,
              value: `${row.netTax} net tax · ${row.returnTax} returns`,
            }))}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <DetailedTableCard
            title="Sales by item"
            headers={["Item", "Qty", "Sales", "Tax"]}
            rows={salesByItem.map((row: PosSalesByItemRow) => [
              row.itemName,
              row.quantity,
              row.salesAmount,
              row.taxAmount,
            ])}
          />
          <DetailedTableCard
            title="Inventory impact"
            headers={["Reference", "Item", "Warehouse", "Qty Out / In", "Running Qty"]}
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
            Runtime POS policies and role-based access derived from current system configuration.
          </p>
        </Card>

        {settings ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DetailTile
                label="Invoice discount tax policy"
                value={settings.runtime.invoiceDiscountTaxPolicy}
              />
              <DetailTile
                label="Credit sale"
                value={settings.runtime.allowCreditSale ? "Enabled" : "Disabled"}
              />
              <DetailTile
                label="Auto post"
                value={settings.runtime.autoPost ? "Enabled" : "Disabled"}
              />
              <DetailTile
                label="Allow close with drafts"
                value={settings.runtime.allowCloseWithDrafts ? "Enabled" : "Disabled"}
              />
              <DetailTile
                label="Negative stock"
                value={settings.runtime.negativeStockAllowed ? "Allowed" : "Blocked"}
              />
              <DetailTile
                label="Cashier discount limit"
                value={`${settings.runtime.cashierDiscountLimitPercent}%`}
              />
            </div>

            <DetailedTableCard
              title="Role-based POS actions"
              headers={["Action", "Allowed"]}
              rows={Object.entries(settings.permissions).map(([action, allowed]) => [
                action,
                allowed ? "Yes" : "No",
              ])}
            />
          </>
        ) : (
          <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 text-sm text-[#64736b]">
            POS runtime settings could not be loaded.
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

function SessionCard({
  sessionState,
  warehouses,
  paymentAccounts,
  onSessionStateChange,
  onOpenSession,
  onCloseSession,
  t,
}: {
  sessionState: SessionState;
  warehouses: InventoryWarehouse[];
  paymentAccounts: BankCashAccount[];
  onSessionStateChange: (patch: Partial<SessionState>) => void;
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
          <Field label="Terminal" className="mb-0">
            <Input
              value={sessionState.terminalName}
              onChange={(event) => onSessionStateChange({ terminalName: event.target.value })}
              className="rounded-[18px] border-[#d4ddd7] bg-white py-3"
            />
          </Field>
          <Field label="Branch" className="mb-0">
            <Input
              value={sessionState.branchName}
              onChange={(event) => onSessionStateChange({ branchName: event.target.value })}
              className="rounded-[18px] border-[#d4ddd7] bg-white py-3"
            />
          </Field>
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
