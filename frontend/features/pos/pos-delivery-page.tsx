"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LuAlertTriangle,
  LuMapPin,
  LuRefreshCcw,
  LuSearch,
  LuTruck,
  LuUser,
  LuX,
} from "react-icons/lu";

import { PageShell, PageSkeleton } from "@/components/ui";
import {
  assignDriver,
  createDeliveryCompanySettlement,
  getAccountOptions,
  getBankCashAccounts,
  getCompletedPosSales,
  getDeliveryCompanies,
  getDeliveryCompanyReceivableReport,
  getDeliveryCompanySettlements,
  getDeliveryDrivers,
  previewDeliveryCompanySettlement,
  reverseDeliveryCompanySettlement,
  updateDeliveryStatus,
  updateDeliveryCompanyStatus,
} from "@/lib/api";
import { hasPermission } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type {
  AccountOption,
  BankCashAccount,
  DeliveryCollectionMethod,
  DeliveryCompany,
  DeliveryCompanySettlement,
  DeliveryCompanySettlementPreview,
  DeliverySettlementStatus,
  DeliveryStatus,
  PosSale,
} from "@/types/api";

const DELIVERY_PIPELINE: DeliveryStatus[] = [
  "PENDING",
  "PREPARING",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const DELIVERY_COLUMNS: Array<{
  status: DeliveryStatus;
  labelKey: string;
  headerClass: string;
  dotClass: string;
  isTerminal?: boolean;
}> = [
  {
    status: "PENDING",
    labelKey: "pos.delivery.column.pending",
    headerClass: "bg-amber-500",
    dotClass: "bg-amber-400",
  },
  {
    status: "PREPARING",
    labelKey: "pos.delivery.column.preparing",
    headerClass: "bg-orange-500",
    dotClass: "bg-orange-400",
  },
  {
    status: "READY_FOR_DELIVERY",
    labelKey: "pos.delivery.column.ready",
    headerClass: "bg-blue-500",
    dotClass: "bg-blue-400",
  },
  {
    status: "OUT_FOR_DELIVERY",
    labelKey: "pos.delivery.column.out",
    headerClass: "bg-indigo-500",
    dotClass: "bg-indigo-400",
  },
  {
    status: "DELIVERED",
    labelKey: "pos.delivery.column.delivered",
    headerClass: "bg-emerald-500",
    dotClass: "bg-emerald-400",
    isTerminal: true,
  },
  {
    status: "CANCELLED",
    labelKey: "pos.delivery.column.cancelled",
    headerClass: "bg-slate-500",
    dotClass: "bg-slate-400",
    isTerminal: true,
  },
];

function nextDeliveryStatus(current: DeliveryStatus): DeliveryStatus | null {
  const idx = DELIVERY_PIPELINE.indexOf(current);
  if (idx < 0 || idx >= DELIVERY_PIPELINE.length - 1) return null;
  return DELIVERY_PIPELINE[idx + 1] ?? null;
}

const NEXT_STATUS_LABEL_KEY: Record<DeliveryStatus, string> = {
  PENDING: "pos.delivery.column.pending",
  PREPARING: "pos.delivery.column.preparing",
  READY_FOR_DELIVERY: "pos.delivery.column.ready",
  OUT_FOR_DELIVERY: "pos.delivery.column.out",
  DELIVERED: "pos.delivery.column.delivered",
  CANCELLED: "pos.delivery.column.cancelled",
};

function DeliveryOrderCard({
  sale,
  language,
  drivers,
  onAssignDriver,
  onAdvance,
  onCancel,
  isUpdating,
  t,
}: {
  sale: PosSale;
  language: string;
  drivers: Array<{ id: string; name: string }>;
  onAssignDriver: (saleId: string, driverId: string) => void;
  onAdvance: (saleId: string, status: DeliveryStatus) => void;
  onCancel: (saleId: string) => void;
  isUpdating: boolean;
  t: (key: string) => string;
}) {
  const isAr = language === "ar";
  const status = sale.deliveryStatus ?? "PENDING";
  const next = nextDeliveryStatus(status);
  const driver = sale.driver;
  const company = sale.deliveryCompany;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[#e1e7e2] bg-white shadow-sm">
      <div className="border-b border-[#eef2ef] bg-[#fbfcfb] px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-black text-[#233329]">{sale.reference}</div>
            {sale.customer?.name ? (
              <div className="mt-0.5 truncate text-[10px] font-semibold text-[#506054]">
                {sale.customer.name}
              </div>
            ) : null}
            {sale.deliveryAddress ? (
              <div className="mt-1 flex items-start gap-1 text-[10px] text-[#68776f]">
                <LuMapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="line-clamp-2" dir="auto">
                  {sale.deliveryAddress}
                </span>
              </div>
            ) : null}
          </div>
          <div className="shrink-0 text-xs font-black text-[#46644b]">
            {Number(sale.totalAmount).toFixed(2)} JOD
          </div>
        </div>
        {sale.deliveryNotes ? (
          <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-semibold italic text-amber-800">
            {sale.deliveryNotes}
          </p>
        ) : null}
      </div>

      <div className="px-3 py-2">
        {driver ? (
          <div className="flex items-center gap-1 text-[10px] font-semibold text-[#4338ca]">
            <LuUser className="h-3 w-3" />
            {driver.name}
          </div>
        ) : company ? (
          <div className="flex items-center gap-1 text-[10px] font-semibold text-[#0891b2]">
            <LuTruck className="h-3 w-3" />
            {company.name}
          </div>
        ) : drivers.length > 0 && status !== "CANCELLED" && status !== "DELIVERED" ? (
          <select
            className="h-8 w-full rounded-lg border border-[#d6e1d9] bg-[#f6faf7] px-2 text-[10px] font-semibold text-[#233329]"
            value=""
            disabled={isUpdating}
            onChange={(e) => {
              if (e.target.value) onAssignDriver(sale.id, e.target.value);
            }}
          >
            <option value="">{t("pos.delivery.assignDriver")}</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {status !== "CANCELLED" && status !== "DELIVERED" ? (
        <div className="flex flex-wrap gap-1.5 border-t border-[#eef2ef] p-2">
          {next ? (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onAdvance(sale.id, next)}
              className="flex-1 rounded-xl bg-[#46644b] py-2 text-[10px] font-black text-white hover:bg-[#3a523e] disabled:opacity-50"
            >
              → {t(NEXT_STATUS_LABEL_KEY[next])}
            </button>
          ) : null}
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onCancel(sale.id)}
            className="rounded-xl border border-red-100 bg-red-50 px-2.5 py-2 text-[10px] font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
            title={t("pos.delivery.cancel")}
          >
            <LuX className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="border-t border-[#eef2ef] bg-[#f3f4f6] px-3 py-2 text-center text-[10px] font-bold uppercase text-[#68776f]">
          {status === "DELIVERED"
            ? isAr
              ? "تم التسليم"
              : "Delivered"
            : isAr
              ? "ملغي"
              : "Cancelled"}
        </div>
      )}
    </article>
  );
}

export function PosDeliveryWorkspace({ embedded = false }: { embedded?: boolean }) {
  const { token, user } = useAuth();
  const { language, t } = useTranslation();
  const isAr = language === "ar";
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showDone, setShowDone] = React.useState(false);
  const canManageSettlements = hasPermission(user, "POS_VIEW_POS_REPORTS");
  const canViewOperationalBoard =
    !canManageSettlements &&
    (hasPermission(user, "POS_VIEW_POS_SCREEN") ||
      hasPermission(user, "RST_CREATE_DELIVERY_ORDER") ||
      hasPermission(user, "RST_ASSIGN_DRIVER"));
  const [selectedCompanyId, setSelectedCompanyId] = React.useState("");
  const [periodFrom, setPeriodFrom] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [periodTo, setPeriodTo] = React.useState(() => new Date().toISOString().slice(0, 10));
  
  // Step 2 & 3 States
  const [statementReference, setStatementReference] = React.useState("");
  const [statementDate, setStatementDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [commissionAmount, setCommissionAmount] = React.useState("0");
  const [serviceFeeAmount, setServiceFeeAmount] = React.useState("0");
  const [refundAmount, setRefundAmount] = React.useState("0");
  const [adjustmentAmount, setAdjustmentAmount] = React.useState("0");
  const [differenceReason, setDifferenceReason] = React.useState("");
  const [differenceAccountId, setDifferenceAccountId] = React.useState("");
  const [differenceNotes, setDifferenceNotes] = React.useState("");

  const [settlementDate, setSettlementDate] = React.useState(() => new Date().toISOString().slice(0, 10)); // Bank Receipt Date
  const [bankCashAccountId, setBankCashAccountId] = React.useState("");
  const [netAmountReceived, setNetAmountReceived] = React.useState("0");

  const { data: allSales = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: queryKeys.posCompletedSales(token),
    queryFn: () => getCompletedPosSales(token),
    enabled: Boolean(token && canViewOperationalBoard),
    refetchInterval: 15000,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["pos-delivery-drivers", token],
    queryFn: () => getDeliveryDrivers(token),
    enabled: Boolean(token && canViewOperationalBoard),
  });

  const { data: deliveryCompanies = [] } = useQuery({
    queryKey: ["pos-delivery-companies", token],
    queryFn: () => getDeliveryCompanies(token),
    enabled: Boolean(token && (canViewOperationalBoard || canManageSettlements)),
  });

  const { data: receivableRows = [] } = useQuery({
    queryKey: ["pos-delivery-receivables", token],
    queryFn: () => getDeliveryCompanyReceivableReport(token),
    enabled: Boolean(token && canManageSettlements),
  });

  const { data: settlementRows = [] } = useQuery({
    queryKey: ["pos-delivery-settlements", token],
    queryFn: () => getDeliveryCompanySettlements({}, token),
    enabled: Boolean(token && canManageSettlements),
  });

  const { data: paymentAccounts = [] } = useQuery({
    queryKey: queryKeys.bankCashAccounts(token, { isActive: "true" }),
    queryFn: () => getBankCashAccounts({ isActive: "true" }, token),
    enabled: Boolean(token && canManageSettlements),
  });

  const { data: accountOptions = [] } = useQuery({
    queryKey: queryKeys.accounts(token, { isActive: "true", isPosting: "true", view: "selector" }),
    queryFn: () => getAccountOptions({ isActive: "true", isPosting: "true" }, token),
    enabled: Boolean(token && canManageSettlements),
  });

  const deliverySales = React.useMemo(
    () => allSales.filter((s) => s.orderType === "DELIVERY"),
    [allSales],
  );

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { saleId: string; status: DeliveryStatus }) =>
      updateDeliveryStatus(payload.saleId, payload.status, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posCompletedSales(token) });
    },
  });

  const assignDriverMutation = useMutation({
    mutationFn: (payload: { saleId: string; driverId: string }) =>
      assignDriver(payload.saleId, payload.driverId, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posCompletedSales(token) });
    },
  });

  const previewSettlementMutation = useMutation({
    mutationFn: (payload: { deliveryCompanyId: string; periodFrom: string; periodTo: string }) =>
      previewDeliveryCompanySettlement(payload, token),
  });

  const calculatedStatementAmount = React.useMemo(() => {
    return (
      Number(netAmountReceived || 0) +
      Number(commissionAmount || 0) +
      Number(serviceFeeAmount || 0) +
      Number(refundAmount || 0) +
      Number(adjustmentAmount || 0)
    );
  }, [netAmountReceived, commissionAmount, serviceFeeAmount, refundAmount, adjustmentAmount]);

  const createSettlementMutation = useMutation({
    mutationFn: () =>
      createDeliveryCompanySettlement(
        {
          deliveryCompanyId: selectedCompanyId,
          periodFrom,
          periodTo,
          settlementDate,
          bankCashAccountId,
          statementReference: statementReference || undefined,
          statementAmount: calculatedStatementAmount,
          commissionAmount: Number(commissionAmount || 0),
          serviceFeeAmount: Number(serviceFeeAmount || 0),
          refundAmount: Number(refundAmount || 0),
          adjustmentAmount: Number(adjustmentAmount || 0),
          differenceReason: differenceReason || undefined,
          differenceAccountId: differenceAccountId || undefined,
          differenceNotes: differenceNotes
            ? `[Statement Date: ${statementDate}] ${differenceNotes}`
            : `[Statement Date: ${statementDate}]`,
          salesInvoiceIds: previewSettlementMutation.data?.orders.map((row) => row.id) ?? [],
        },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-delivery-settlements", token] });
      queryClient.invalidateQueries({ queryKey: ["pos-delivery-receivables", token] });
      queryClient.invalidateQueries({ queryKey: queryKeys.posCompletedSales(token) });
      previewSettlementMutation.reset();
      // Reset form fields
      setNetAmountReceived("0");
      setCommissionAmount("0");
      setServiceFeeAmount("0");
      setRefundAmount("0");
      setAdjustmentAmount("0");
      setStatementReference("");
      setDifferenceReason("");
      setDifferenceAccountId("");
      setDifferenceNotes("");
    },
  });

  const reverseSettlementMutation = useMutation({
    mutationFn: (id: string) => reverseDeliveryCompanySettlement(id, {}, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-delivery-settlements", token] });
      queryClient.invalidateQueries({ queryKey: ["pos-delivery-receivables", token] });
      queryClient.invalidateQueries({ queryKey: queryKeys.posCompletedSales(token) });
    },
  });

  const toggleCompanyMutation = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) =>
      updateDeliveryCompanyStatus(payload.id, payload.isActive, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-delivery-companies", token] });
    },
  });

  const filteredSales = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return deliverySales.filter((sale) => {
      const status = sale.deliveryStatus ?? "PENDING";
      if (!showDone && (status === "DELIVERED" || status === "CANCELLED")) return false;
      if (!q) return true;
      return (
        sale.reference.toLowerCase().includes(q) ||
        (sale.deliveryAddress?.toLowerCase().includes(q) ?? false) ||
        (sale.customer?.name?.toLowerCase().includes(q) ?? false) ||
        (sale.driver?.name?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [deliverySales, searchQuery, showDone]);

  const salesByStatus = React.useMemo(() => {
    const map: Record<DeliveryStatus, PosSale[]> = {
      PENDING: [],
      PREPARING: [],
      READY_FOR_DELIVERY: [],
      OUT_FOR_DELIVERY: [],
      DELIVERED: [],
      CANCELLED: [],
    };
    for (const sale of filteredSales) {
      const status = sale.deliveryStatus ?? "PENDING";
      map[status].push(sale);
    }
    for (const terminal of ["DELIVERED", "CANCELLED"] as const) {
      map[terminal].sort(
        (a, b) =>
          new Date(b.posCompletedAt ?? b.invoiceDate).getTime() -
          new Date(a.posCompletedAt ?? a.invoiceDate).getTime(),
      );
      map[terminal] = map[terminal].slice(0, 30);
    }
    return map;
  }, [filteredSales]);

  const activeCount = deliverySales.filter(
    (s) => !["DELIVERED", "CANCELLED"].includes(s.deliveryStatus ?? "PENDING"),
  ).length;

  const outCount = deliverySales.filter((s) => s.deliveryStatus === "OUT_FOR_DELIVERY").length;

  const grossOrders = React.useMemo(() => {
    return Number(previewSettlementMutation.data?.grossOrdersAmount || 0);
  }, [previewSettlementMutation.data?.grossOrdersAmount]);

  const netExpectedAmount = React.useMemo(() => {
    return (
      grossOrders -
      Number(commissionAmount || 0) -
      Number(serviceFeeAmount || 0) -
      Number(refundAmount || 0) -
      Number(adjustmentAmount || 0)
    );
  }, [grossOrders, commissionAmount, serviceFeeAmount, refundAmount, adjustmentAmount]);

  const computedDifference = React.useMemo(() => {
    return Number(netAmountReceived || 0) - netExpectedAmount;
  }, [netAmountReceived, netExpectedAmount]);

  const isDifferenceInvalid = React.useMemo(() => {
    return Math.abs(computedDifference) >= 0.01 && (!differenceReason.trim() || !differenceAccountId);
  }, [computedDifference, differenceReason, differenceAccountId]);

  const visibleColumns = DELIVERY_COLUMNS.filter(
    (col) => showDone || !col.isTerminal,
  );

  if (canViewOperationalBoard && isLoading) {
    return embedded ? (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <PageSkeleton />
      </div>
    ) : (
      <PageShell>
        <PageSkeleton />
      </PageShell>
    );
  }

  const board = (
    <div
      className={cn(
        "flex flex-col",
        embedded ? "h-full min-h-0" : "min-h-[calc(100vh-4rem)]",
      )}
      dir={isAr ? "rtl" : "ltr"}
    >
        <div className="border-b border-[#e1e7e2] bg-gradient-to-br from-[#1a2744] via-[#2d3f6b] to-[#4338ca] px-5 py-4 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <LuTruck className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-xl font-black">{t("pos.delivery.title")}</h1>
                <p className="mt-0.5 text-sm font-semibold text-white/80">
                  {canManageSettlements
                    ? t("pos.delivery.accountingSubtitle")
                    : t("pos.delivery.subtitle")}
                </p>
              </div>
            </div>
            {canViewOperationalBoard ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-white/70">
                    {t("pos.delivery.activeCount")}
                  </div>
                  <div className="text-2xl font-black">{activeCount}</div>
                </div>
                {outCount > 0 ? (
                  <div className="rounded-xl border border-indigo-300/50 bg-indigo-500/30 px-4 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-indigo-100">
                      {t("pos.delivery.outCount")}
                    </div>
                    <div className="text-2xl font-black text-indigo-50">{outCount}</div>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/20"
                >
                  <LuRefreshCcw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                  {t("pos.delivery.refresh")}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {canViewOperationalBoard ? (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b border-[#e1e7e2] bg-white px-5 py-3">
              <div className="relative min-w-[200px] max-w-md flex-1">
                <LuSearch className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#68776f] ltr:left-3 rtl:right-3" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("pos.delivery.searchPlaceholder")}
                  className="h-10 w-full rounded-xl border border-[#d6e1d9] bg-[#fbfcfb] text-sm font-semibold text-[#233329] ltr:pl-10 ltr:pr-3 rtl:pl-3 rtl:pr-10"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-[#506054]">
                <input
                  type="checkbox"
                  checked={showDone}
                  onChange={(e) => setShowDone(e.target.checked)}
                  className="h-4 w-4 rounded border-[#d6e1d9]"
                />
                {t("pos.delivery.showDone")}
              </label>
              <span className="text-xs font-semibold text-[#68776f]">
                {t("pos.delivery.autoRefresh")}
              </span>
            </div>

            <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto p-4">
              {visibleColumns.map((col) => {
                const colSales = salesByStatus[col.status];
                return (
                  <section
                    key={col.status}
                    className="flex w-[min(100%,300px)] shrink-0 flex-col rounded-2xl border border-[#e1e7e2] bg-[#f6f7f8]"
                  >
                    <header
                      className={cn(
                        "flex items-center justify-between rounded-t-2xl px-4 py-3 text-white",
                        col.headerClass,
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", col.dotClass)} />
                        <h2 className="text-sm font-black">{t(col.labelKey)}</h2>
                      </div>
                      <span className="rounded-full bg-black/20 px-2.5 py-0.5 text-xs font-black">
                        {colSales.length}
                      </span>
                    </header>
                    <div className="flex max-h-[calc(100vh-16rem)] min-h-[200px] flex-1 flex-col gap-3 overflow-y-auto p-3">
                      {colSales.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#d6e1d9] bg-white py-10 text-center">
                          <LuTruck className="h-6 w-6 text-[#c5d0c8]" />
                          <p className="mt-2 text-xs font-semibold text-[#68776f]">
                            {t("pos.delivery.emptyColumn")}
                          </p>
                        </div>
                      ) : (
                        colSales.map((sale) => (
                          <DeliveryOrderCard
                            key={sale.id}
                            sale={sale}
                            language={language}
                            drivers={drivers}
                            isUpdating={
                              updateStatusMutation.isPending || assignDriverMutation.isPending
                            }
                            t={t}
                            onAssignDriver={(saleId, driverId) =>
                              assignDriverMutation.mutate({ saleId, driverId })
                            }
                            onAdvance={(saleId, status) =>
                              updateStatusMutation.mutate({ saleId, status })
                            }
                            onCancel={(saleId) =>
                              updateStatusMutation.mutate({ saleId, status: "CANCELLED" })
                            }
                          />
                        ))
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        ) : null}
        {canManageSettlements ? (
          <div className="space-y-4 border-t border-[#e1e7e2] bg-[#f7faf8] p-4">
            <section className="rounded-2xl border border-[#d9e4dc] bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-[#233329]">
                    {t("pos.delivery.receivablesTitle")}
                  </h2>
                  <p className="text-xs font-semibold text-[#68776f]">
                    {t("pos.delivery.receivablesSubtitle")}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {receivableRows.map((row) => (
                  <div key={row.deliveryCompanyId} className="rounded-xl border border-[#e6eeea] bg-[#fbfcfb] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-black text-[#233329]">
                          {isAr ? (row.deliveryCompanyArabicName || row.deliveryCompanyName) : row.deliveryCompanyName}
                        </div>
                        {isAr && row.deliveryCompanyArabicName ? (
                          <div className="text-[11px] text-[#68776f]">{row.deliveryCompanyName}</div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          toggleCompanyMutation.mutate({
                            id: row.deliveryCompanyId,
                            isActive:
                              deliveryCompanies.find((company) => company.id === row.deliveryCompanyId)?.isActive === false,
                          })
                        }
                        className="rounded-full border border-[#d8e2dc] px-3 py-1 text-[10px] font-bold text-[#46644b]"
                      >
                        {deliveryCompanies.find((company) => company.id === row.deliveryCompanyId)?.isActive === false
                          ? t("pos.delivery.activate")
                          : t("pos.delivery.deactivate")}
                      </button>
                    </div>
                    <div className="mt-3 space-y-1 text-xs font-semibold text-[#42564a]">
                      <div>{t("pos.delivery.outstanding")}: {row.outstandingBalance} JOD</div>
                      <div>{t("pos.delivery.settled")}: {row.settledBalance} JOD</div>
                      <div>{t("pos.delivery.total")}: {row.totalReceivable} JOD</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Step-by-Step Settlement Process */}
            <section className="rounded-2xl border border-[#d9e4dc] bg-white p-6 shadow-sm">
              <div className="mb-6 border-b border-[#e1e7e2] pb-4">
                <h2 className="text-xl font-black text-[#1a2744]">
                  {t("pos.delivery.settlementTitle")}
                </h2>
                <p className="mt-1 text-xs font-semibold text-[#68776f]">
                  {t("pos.delivery.settlementSubtitle")}
                </p>
              </div>

              <div className="space-y-8">
                {/* Step 1: Select delivery company and period */}
                <div className="relative rounded-xl border border-[#e1e7e2] bg-[#fbfcfb] p-5">
                  <div className="absolute -top-3 left-4 rtl:right-4 rtl:left-auto flex h-6 items-center rounded-full bg-[#1a2744] px-3 text-xs font-bold text-white">
                    {isAr ? "الخطوة 1: اختيار الشركة والفترة" : "Step 1: Company & Period"}
                  </div>
                  <div className="mt-2 grid gap-4 md:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-[#233329]">
                        {t("pos.delivery.selectCompany")}
                      </label>
                      <select
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                        className="h-10 rounded-xl border border-[#d6e1d9] bg-white px-3 text-sm font-semibold text-[#233329] focus:border-[#1f6f5f] focus:outline-none"
                      >
                        <option value="">{t("pos.delivery.selectCompany")}</option>
                        {deliveryCompanies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {isAr ? (company.arabicName || company.name) : company.name}
                          </option>
                        ))}
                      </select>
                      <span className="text-[11px] text-[#68776f]">
                        {isAr ? "اختر شركة التوصيل لإجراء التسوية لها" : "Select delivery company to settle"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-[#233329]">
                        {isAr ? "من تاريخ" : "From Date"}
                      </label>
                      <input
                        type="date"
                        value={periodFrom}
                        onChange={(e) => setPeriodFrom(e.target.value)}
                        className="h-10 rounded-xl border border-[#d6e1d9] bg-white px-3 text-sm font-semibold text-[#233329] focus:border-[#1f6f5f] focus:outline-none"
                      />
                      <span className="text-[11px] text-[#68776f]">
                        {isAr ? "بداية الفترة المحاسبية للتسوية" : "Start of the settlement period"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-[#233329]">
                        {isAr ? "إلى تاريخ" : "To Date"}
                      </label>
                      <input
                        type="date"
                        value={periodTo}
                        onChange={(e) => setPeriodTo(e.target.value)}
                        className="h-10 rounded-xl border border-[#d6e1d9] bg-white px-3 text-sm font-semibold text-[#233329] focus:border-[#1f6f5f] focus:outline-none"
                      />
                      <span className="text-[11px] text-[#68776f]">
                        {isAr ? "نهاية الفترة المحاسبية للتسوية" : "End of the settlement period"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={!selectedCompanyId || previewSettlementMutation.isPending}
                      onClick={() =>
                        previewSettlementMutation.mutate({
                          deliveryCompanyId: selectedCompanyId,
                          periodFrom,
                          periodTo,
                        })
                      }
                      className="flex items-center gap-2 rounded-xl bg-[#1f6f5f] px-5 py-2.5 text-sm font-black text-white hover:bg-[#19594c] disabled:opacity-50 transition-all shadow-sm"
                    >
                      <LuRefreshCcw className={cn("h-4 w-4", previewSettlementMutation.isPending && "animate-spin")} />
                      {t("pos.delivery.previewSettlement")}
                    </button>
                  </div>
                </div>

                {/* Steps 2 & 3: Activated only when unsettled orders are loaded */}
                {!previewSettlementMutation.data ? (
                  <div className="rounded-xl border border-dashed border-[#d6e1d9] bg-[#fbfcfb] p-8 text-center text-sm font-semibold text-[#68776f]">
                    {isAr
                      ? "الرجاء تحديد شركة التوصيل والفترة ثم الضغط على 'جلب الطلبات غير المسواة' لتفعيل الخطوات التالية."
                      : "Please select a company and period then click 'Load Unsettled Orders' to unlock the next steps."}
                  </div>
                ) : (
                  <>
                    {/* Step 2: Delivery company statement details */}
                    <div className="relative rounded-xl border border-[#e1e7e2] bg-[#fbfcfb] p-5">
                      <div className="absolute -top-3 left-4 rtl:right-4 rtl:left-auto flex h-6 items-center rounded-full bg-[#1a2744] px-3 text-xs font-bold text-white">
                        {isAr ? "الخطوة 2: تفاصيل كشف شركة التوصيل" : "Step 2: Statement Details"}
                      </div>
                      <div className="mt-2 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-black text-[#233329]">
                            {t("pos.delivery.statementReference")}
                          </label>
                          <input
                            type="text"
                            value={statementReference}
                            onChange={(e) => setStatementReference(e.target.value)}
                            placeholder={t("pos.delivery.statementReference")}
                            className="h-10 rounded-xl border border-[#d6e1d9] bg-white px-3 text-sm font-semibold text-[#233329] focus:border-[#1f6f5f] focus:outline-none"
                          />
                          <span className="text-[11px] text-[#68776f]">
                            {isAr ? "رقم مرجع كشف الحساب أو الفاتورة المستلمة" : "Statement ID or invoice number received"}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-black text-[#233329]">
                            {isAr ? "تاريخ كشف الحساب" : "Statement Date"}
                          </label>
                          <input
                            type="date"
                            value={statementDate}
                            onChange={(e) => setStatementDate(e.target.value)}
                            className="h-10 rounded-xl border border-[#d6e1d9] bg-white px-3 text-sm font-semibold text-[#233329] focus:border-[#1f6f5f] focus:outline-none"
                          />
                          <span className="text-[11px] text-[#68776f]">
                            {isAr ? "تاريخ مستند كشف الحساب المرفق" : "The date on the statement document"}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-black text-[#233329]">
                            {t("pos.delivery.commission")}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={commissionAmount}
                            onChange={(e) => setCommissionAmount(e.target.value)}
                            className="h-10 rounded-xl border border-[#d6e1d9] bg-white px-3 text-sm font-semibold text-[#233329] focus:border-[#1f6f5f] focus:outline-none"
                          />
                          <span className="text-[11px] text-[#68776f]">
                            {isAr ? "عمولة شركة التوصيل المخصومة من الحساب" : "Commission fee deducted by the company"}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-black text-[#233329]">
                            {t("pos.delivery.serviceFees")}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={serviceFeeAmount}
                            onChange={(e) => setServiceFeeAmount(e.target.value)}
                            className="h-10 rounded-xl border border-[#d6e1d9] bg-white px-3 text-sm font-semibold text-[#233329] focus:border-[#1f6f5f] focus:outline-none"
                          />
                          <span className="text-[11px] text-[#68776f]">
                            {isAr ? "رسوم تشغيل إضافية أو رسوم لوجستية" : "Service or operation fees charged"}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-black text-[#233329]">
                            {t("pos.delivery.refunds")}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            className="h-10 rounded-xl border border-[#d6e1d9] bg-white px-3 text-sm font-semibold text-[#233329] focus:border-[#1f6f5f] focus:outline-none"
                          />
                          <span className="text-[11px] text-[#68776f]">
                            {isAr ? "المرتجع المالي أو التسويات الممنوحة للعملاء" : "Customer refunds/discounts deducted"}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-black text-[#233329]">
                            {t("pos.delivery.adjustments")}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={adjustmentAmount}
                            onChange={(e) => setAdjustmentAmount(e.target.value)}
                            className="h-10 rounded-xl border border-[#d6e1d9] bg-white px-3 text-sm font-semibold text-[#233329] focus:border-[#1f6f5f] focus:outline-none"
                          />
                          <span className="text-[11px] text-[#68776f]">
                            {isAr ? "تسويات أو تسويات فرق أخرى" : "Any other deductions or manual adjustments"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-1.5">
                        <label className="text-xs font-black text-[#233329]">
                          {t("pos.delivery.notes")}
                        </label>
                        <input
                          type="text"
                          value={differenceNotes}
                          onChange={(e) => setDifferenceNotes(e.target.value)}
                          placeholder={t("pos.delivery.notes")}
                          className="h-10 rounded-xl border border-[#d6e1d9] bg-white px-3 text-sm font-semibold text-[#233329] focus:border-[#1f6f5f] focus:outline-none"
                        />
                        <span className="text-[11px] text-[#68776f]">
                          {isAr ? "ملاحظات إضافية بخصوص كشف الحساب وتفاصيله" : "Additional information about the statement"}
                        </span>
                      </div>
                    </div>

                    {/* Step 3: Bank receipt details */}
                    <div className="relative rounded-xl border border-[#e1e7e2] bg-[#fbfcfb] p-5">
                      <div className="absolute -top-3 left-4 rtl:right-4 rtl:left-auto flex h-6 items-center rounded-full bg-[#1a2744] px-3 text-xs font-bold text-white">
                        {isAr ? "الخطوة 3: تفاصيل الإيصال البنكي والتأكيد" : "Step 3: Bank Receipt & Confirm"}
                      </div>
                      <div className="mt-2 grid gap-4 md:grid-cols-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-black text-[#233329]">
                            {isAr ? "تاريخ إيصال البنك" : "Bank Receipt Date"}
                          </label>
                          <input
                            type="date"
                            value={settlementDate}
                            onChange={(e) => setSettlementDate(e.target.value)}
                            className="h-10 rounded-xl border border-[#d6e1d9] bg-white px-3 text-sm font-semibold text-[#233329] focus:border-[#1f6f5f] focus:outline-none"
                          />
                          <span className="text-[11px] text-[#68776f]">
                            {isAr ? "تاريخ إيداع المبلغ في حساب البنك" : "Date of deposit/receipt in the bank account"}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-black text-[#233329]">
                            {isAr ? "حساب البنك / النقد" : "Bank Account"}
                          </label>
                          <select
                            value={bankCashAccountId}
                            onChange={(e) => setBankCashAccountId(e.target.value)}
                            className="h-10 rounded-xl border border-[#d6e1d9] bg-white px-3 text-sm font-semibold text-[#233329] focus:border-[#1f6f5f] focus:outline-none"
                          >
                            <option value="">{t("pos.delivery.selectBankAccount")}</option>
                            {paymentAccounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {isAr ? (account.account?.nameAr || account.name) : account.name}
                              </option>
                            ))}
                          </select>
                          <span className="text-[11px] text-[#68776f]">
                            {isAr ? "حساب البنك المستلم للحوالة المالية" : "The bank account receiving the transfer"}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-black text-[#233329]">
                            {t("pos.delivery.netReceived")}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={netAmountReceived}
                            onChange={(e) => setNetAmountReceived(e.target.value)}
                            className="h-10 rounded-xl border border-[#d6e1d9] bg-white px-3 text-sm font-semibold text-[#233329] focus:border-[#1f6f5f] focus:outline-none"
                          />
                          <span className="text-[11px] text-[#68776f]">
                            {isAr ? "المبلغ الفعلي المقيد في كشف الحساب البنكي" : "The actual amount deposited in bank account"}
                          </span>
                        </div>
                      </div>

                      {/* Calculations & Discrepancies Summary */}
                      <div className="mt-6 border-t border-[#e1e7e2] pt-5">
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#233329] mb-3">
                          {isAr ? "ملخص الحسابات والتسوية" : "Settlement Calculations Summary"}
                        </h4>
                        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                          <div className="rounded-xl border border-[#e6eeea] bg-white p-3 shadow-sm">
                            <span className="block text-[10px] font-bold text-[#68776f] uppercase">
                              {t("pos.delivery.gross")}
                            </span>
                            <span className="text-base font-black text-[#1a2744]">
                              {previewSettlementMutation.data.grossOrdersAmount} JOD
                            </span>
                          </div>

                          <div className="rounded-xl border border-[#e6eeea] bg-white p-3 shadow-sm">
                            <span className="block text-[10px] font-bold text-[#68776f] uppercase">
                              {t("pos.delivery.netExpected")}
                            </span>
                            <span className="text-base font-black text-[#1a2744]">
                              {netExpectedAmount.toFixed(2)} JOD
                            </span>
                          </div>

                          <div className="rounded-xl border border-[#e6eeea] bg-white p-3 shadow-sm">
                            <span className="block text-[10px] font-bold text-[#68776f] uppercase">
                              {t("pos.delivery.netReceived")}
                            </span>
                            <span className="text-base font-black text-[#1f6f5f]">
                              {Number(netAmountReceived || 0).toFixed(2)} JOD
                            </span>
                          </div>

                          <div className={cn(
                            "rounded-xl border p-3 shadow-sm transition-colors",
                            Math.abs(computedDifference) < 0.01
                              ? "border-[#e6eeea] bg-white text-[#233329]"
                              : computedDifference < 0
                                ? "border-red-200 bg-red-50/50 text-red-700"
                                : "border-emerald-200 bg-emerald-50/50 text-emerald-700"
                          )}>
                            <span className="block text-[10px] font-bold text-[#68776f] uppercase">
                              {t("pos.delivery.difference")}
                            </span>
                            <span className="text-base font-black">
                              {computedDifference.toFixed(2)} JOD
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Difference Handling Area */}
                      {Math.abs(computedDifference) >= 0.01 && (
                        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                          <div className="flex gap-2.5 text-amber-800">
                            <LuAlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                            <div>
                              <h5 className="text-xs font-black">
                                {isAr ? "تنبيه: يوجد فرق تسوية" : "Warning: Settlement Difference Detected"}
                              </h5>
                              <p className="mt-1 text-xs leading-normal">
                                {isAr
                                  ? `يوجد فرق تسوية بقيمة (${computedDifference.toFixed(2)} د.أ). يجب تحديد سبب الفارق واختيار الحساب المالي لتسوية الفروقات قبل التأكيد.`
                                  : `There is a difference of (${computedDifference.toFixed(2)} JOD). You must select a difference account and specify the reason/code before you can confirm.`}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-black text-[#233329]">
                                {t("pos.delivery.differenceReason")} <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={differenceReason}
                                onChange={(e) => setDifferenceReason(e.target.value)}
                                placeholder={t("pos.delivery.differenceReason")}
                                className="h-10 rounded-xl border border-amber-300 bg-white px-3 text-sm font-semibold text-[#233329] focus:border-amber-500 focus:outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-black text-[#233329]">
                                {t("pos.delivery.selectDifferenceAccount")} <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={differenceAccountId}
                                onChange={(e) => setDifferenceAccountId(e.target.value)}
                                className="h-10 rounded-xl border border-amber-300 bg-white px-3 text-sm font-semibold text-[#233329] focus:border-amber-500 focus:outline-none"
                              >
                                <option value="">{t("pos.delivery.selectDifferenceAccount")}</option>
                                {accountOptions.map((account) => (
                                  <option key={account.id} value={account.id}>
                                    {account.code} - {isAr ? (account.nameAr || account.name) : account.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Confirmation and Submit */}
                      <div className="mt-6 flex justify-end border-t border-[#e1e7e2] pt-4">
                        <button
                          type="button"
                          disabled={
                            !bankCashAccountId ||
                            !selectedCompanyId ||
                            createSettlementMutation.isPending ||
                            previewSettlementMutation.data.orders.length === 0 ||
                            isDifferenceInvalid
                          }
                          onClick={() => createSettlementMutation.mutate()}
                          className="rounded-xl bg-[#233329] px-6 py-3 text-sm font-black text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1a2720] transition-colors shadow-md"
                        >
                          {createSettlementMutation.isPending
                            ? (isAr ? "جاري التأكيد..." : "Confirming...")
                            : t("pos.delivery.confirmSettlement")}
                        </button>
                      </div>
                    </div>

                    {/* Orders Listing in Preview */}
                    <div className="rounded-xl border border-[#e1e7e2] bg-[#fbfcfb] p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-sm font-black text-[#233329]">{t("pos.delivery.ordersInPreview")}</div>
                        <span className="rounded-full bg-[#e6eeea] px-2.5 py-0.5 text-xs font-black text-[#46644b]">
                          {previewSettlementMutation.data.orders.length}
                        </span>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1.5">
                        {previewSettlementMutation.data.orders.map((row) => (
                          <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#edf2ee] bg-white px-4 py-3 shadow-xs">
                            <span className="text-xs font-bold text-[#233329]">{row.reference}</span>
                            <span className="text-xs font-black text-[#1f6f5f]">{row.totalAmount} JOD</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[#d9e4dc] bg-white p-4">
              <h2 className="mb-3 text-lg font-black text-[#233329]">
                {t("pos.delivery.settlementsHistoryTitle")}
              </h2>
              <div className="space-y-3">
                {settlementRows.map((row) => (
                  <div key={row.id} className="rounded-xl border border-[#e6eeea] bg-[#fbfcfb] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-[#233329]">{row.reference}</div>
                        <div className="text-[11px] text-[#68776f]">
                          {isAr ? (row.deliveryCompany?.arabicName || row.deliveryCompany?.name) : row.deliveryCompany?.name} · {t(`pos.delivery.settlementStatus.${row.status}`)} · {row.netReceivedAmount} JOD
                        </div>
                      </div>
                      {row.status !== "REVERSED" ? (
                        <button
                          type="button"
                          onClick={() => reverseSettlementMutation.mutate(row.id)}
                          className="rounded-full border border-[#ead7d5] px-3 py-1 text-[11px] font-bold text-[#8f5a55]"
                        >
                          {t("pos.delivery.reverse")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
    </div>
  );

  if (embedded) {
    return board;
  }

  return <PageShell>{board}</PageShell>;
}

export function PosDeliveryPage() {
  return <PosDeliveryWorkspace />;
}
