"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  LuUtensils, 
  LuUser, 
  LuClock, 
  LuUsers, 
  LuPlus, 
  LuChefHat, 
  LuCheck,
  LuLayoutGrid,
  LuTrash2,
  LuSettings,
  LuSparkles,
  LuTimerReset,
} from "react-icons/lu";

import { PageShell, Card, PageSkeleton, Modal } from "@/components/ui";
import {
  ApiError,
  cancelPosTableReservation,
  createPosTable,
  deletePosTable,
  getPosTables,
  getPosWaiters,
  openPosReservationPreOrder,
  reservePosTable,
  updatePosTableStatus,
  updatePosTableWaiter,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { isWaiterOnlyUser } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import {
  posTableFloorGridClass,
  posTouchButtonClass,
  posTouchOrHoverRevealClass,
} from "@/features/pos/pos-layout-classes";
import { PosTable } from "@/types/api";
import { cn } from "@/lib/utils";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return fallback;
}

function formatReservationDateTime(date: Date, isAr: boolean) {
  const locale = isAr ? "ar-JO" : undefined;
  return date.toLocaleString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type TableReservation = NonNullable<PosTable["reservations"]>[number];

function ReservationCard({
  reservation,
  isAr,
  tableLabel,
  isTableOccupied,
  isLoadingPreOrder,
  onOpenPreOrder,
  onManage,
  onCancel,
}: {
  reservation: TableReservation;
  isAr: boolean;
  tableLabel?: string;
  isTableOccupied: boolean;
  isLoadingPreOrder: boolean;
  onOpenPreOrder: () => void;
  onManage?: () => void;
  onCancel: () => void;
}) {
  const from = new Date(reservation.reservedFrom);
  const to = new Date(reservation.reservedTo);
  const preOrder = (reservation as TableReservation & { preOrder?: TableReservation["preOrder"] }).preOrder ?? null;
  const itemsPreview = preOrder?.itemsPreview ?? [];
  const now = new Date();
  const isLive = now >= from && now <= to;

  return (
    <article className="overflow-hidden rounded-xl border border-[#e1e7e2] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#eef2ef] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          {tableLabel ? (
            <div className="flex shrink-0 flex-col items-center justify-center rounded-xl border-2 border-[#c7c3ff] bg-gradient-to-br from-[#fbfbff] to-[#ecebff] px-3 py-2 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#6366f1]">
                {isAr ? "طاولة" : "Table"}
              </div>
              <div className="text-lg font-black leading-none text-[#4338ca]">{tableLabel}</div>
            </div>
          ) : (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d6d3f0] bg-[#f3f2ff] text-[#4338ca]">
              <LuClock className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            {isLive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#4338ca] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                {isAr ? "الآن" : "Now"}
              </span>
            ) : null}
            <div className="text-xs font-black uppercase tracking-wide text-[#68776f]">
              {isAr ? "من" : "From"}
            </div>
            <div className="text-sm font-bold text-[#233329]">{formatReservationDateTime(from, isAr)}</div>
            <div className="text-xs font-black uppercase tracking-wide text-[#68776f]">
              {isAr ? "إلى" : "To"}
            </div>
            <div className="text-sm font-semibold text-[#506054]">{formatReservationDateTime(to, isAr)}</div>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[11rem]">
          {onManage ? (
            <button
              type="button"
              onClick={onManage}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#d6e1d9] bg-[#fbfcfb] px-3 py-2 text-xs font-bold text-[#233329] hover:bg-[#f6faf7]"
            >
              <LuClock className="h-3.5 w-3.5 shrink-0" />
              <span>{isAr ? "إدارة الحجز" : "Manage"}</span>
            </button>
          ) : null}
          <button
            type="button"
            disabled={isTableOccupied || isLoadingPreOrder}
            onClick={onOpenPreOrder}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors disabled:opacity-50",
              preOrder
                ? "border-[#7c3aed] bg-[#f3e8ff] text-[#6d28d9] hover:bg-[#ede9fe]"
                : "border-[#4338ca] bg-[#efefff] text-[#4338ca] hover:bg-[#e5e3ff]",
            )}
          >
            <LuChefHat className="h-3.5 w-3.5 shrink-0" />
            <span className="text-center">
              {isLoadingPreOrder
                ? isAr
                  ? "جارٍ الفتح…"
                  : "Opening…"
                : preOrder
                  ? isAr
                    ? "عرض / تعديل الطلب المسبق"
                    : "View / edit pre-order"
                  : isAr
                    ? "طلب مسبق للمنتجات"
                    : "Pre-order products"}
            </span>
          </button>
        </div>
      </div>

      {preOrder ? (
        <div className="border-b border-[#eef2ef] bg-[#faf5ff] px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-xs font-black text-[#6d28d9]">{isAr ? "الطلب المسبق" : "Pre-order"}</span>
            <span className="text-xs font-bold tabular-nums text-[#5b21b6]">
              {preOrder.lineCount} {isAr ? "أصناف" : "items"}
              <span className="mx-1.5 text-[#c4b5fd]">·</span>
              {Number(preOrder.totalAmount).toFixed(2)} JOD
            </span>
          </div>
          {itemsPreview.length > 0 ? (
            <ul className="mt-2.5 space-y-1.5">
              {itemsPreview.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#ede9fe] bg-white/80 px-2.5 py-1.5 text-xs"
                >
                  <span dir="auto" className="min-w-0 flex-1 font-semibold text-[#5b21b6]">
                    {item.name}
                  </span>
                  <span
                    dir="ltr"
                    className="shrink-0 rounded-md bg-[#f3e8ff] px-1.5 py-0.5 font-black tabular-nums text-[#6d28d9]"
                  >
                    ×{item.quantity}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2 bg-[#fbfcfb] px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
        >
          {isAr ? "إلغاء الحجز" : "Cancel reservation"}
        </button>
      </div>
    </article>
  );
}

export default function TablesPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const waiterOnly = isWaiterOnlyUser(user);
  const orderRoute = waiterOnly ? "/pos/waiter/order" : "/pos/register";
  const { language } = useTranslation();

  const isAr = language === "ar";
  const queryClient = useQueryClient();

  const [isManageOpen, setIsManageOpen] = React.useState(false);
  const [newTableNum, setNewTableNum] = React.useState("");
  const [newTableCap, setNewTableCap] = React.useState(4);
  const [isSubmittingTable, setIsSubmittingTable] = React.useState(false);
  const [tableError, setTableError] = React.useState<string | null>(null);

  const [isReserveOpen, setIsReserveOpen] = React.useState(false);
  const [reserveTable, setReserveTable] = React.useState<PosTable | null>(null);
  const [reserveMode, setReserveMode] = React.useState<"IMMEDIATE" | "SPECIAL" | null>(null);
  const [reservationDate, setReservationDate] = React.useState("");
  const [reservedFromTime, setReservedFromTime] = React.useState("");
  const [reservedToTime, setReservedToTime] = React.useState("");
  const [reserveError, setReserveError] = React.useState<string | null>(null);
  const [reserveSuccess, setReserveSuccess] = React.useState<string | null>(null);
  const [isSubmittingReserve, setIsSubmittingReserve] = React.useState(false);
  const [isOpeningPreOrder, setIsOpeningPreOrder] = React.useState<Record<string, boolean>>({});

  // Table status / waiter-assign state
  const [statusTable, setStatusTable] = React.useState<PosTable | null>(null);
  const [pendingStatus, setPendingStatus] = React.useState<string>("");
  const [pendingWaiterId, setPendingWaiterId] = React.useState<string>("");
  const [isSavingTableStatus, setIsSavingTableStatus] = React.useState(false);

  const { data: tables, isLoading, refetch } = useQuery({
    queryKey: queryKeys.posTables(token),
    queryFn: () => getPosTables(token),
    enabled: Boolean(token),
  });

  const { data: waiters = [] } = useQuery({
    queryKey: ["pos-waiters", token],
    queryFn: () => getPosWaiters(token),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
  });

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNum.trim()) {
      setTableError(isAr ? "رقم الطاولة مطلوب" : "Table number is required");
      return;
    }
    setTableError(null);
    setIsSubmittingTable(true);
    try {
      await createPosTable(
        {
          tableNumber: newTableNum.trim(),
          capacity: newTableCap,
        },
        token
      );
      setNewTableNum("");
      setNewTableCap(4);
      refetch();
    } catch (err: any) {
      setTableError(err.message || "Failed to create table / فشل إنشاء الطاولة");
    } finally {
      setIsSubmittingTable(false);
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!window.confirm(isAr ? "هل أنت متأكد من حذف هذه الطاولة؟" : "Are you sure you want to delete this table?")) {
      return;
    }
    try {
      await deletePosTable(id, token);
      refetch();
    } catch (err: any) {
      alert(err.message || "Failed to delete table / فشل حذف الطاولة");
    }
  };

  const handleOpenTable = (table: PosTable) => {
    const params = new URLSearchParams({ tableId: table.id });
    const invoice = table.activeInvoice;
    if (
      invoice?.id &&
      (invoice.posOperationalStatus === "DRAFT" ||
        invoice.posOperationalStatus === "HELD")
    ) {
      params.set("resume", invoice.id);
    }
    router.push(`${orderRoute}?${params.toString()}`);
  };

  const openReserveModal = (table: PosTable, mode?: "IMMEDIATE" | "SPECIAL") => {
    setReserveTable(table);
    setReserveError(null);
    setReserveSuccess(null);
    setReserveMode(mode ?? null);
    if (mode === "SPECIAL") {
      const now = new Date();
      // Build local YYYY-MM-DD for <input type="date"> (browser expects local date, not UTC)
      const localDateStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      const existing = table.reservations?.[0];
      if (existing?.reservedFrom && existing?.reservedTo) {
        const from = new Date(existing.reservedFrom);
        const to = new Date(existing.reservedTo);
        const fromDateStr = new Date(from.getTime() - from.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        const fromTimeStr = `${String(from.getHours()).padStart(2, "0")}:${String(from.getMinutes()).padStart(2, "0")}`;
        const toTimeStr = `${String(to.getHours()).padStart(2, "0")}:${String(to.getMinutes()).padStart(2, "0")}`;
        setReservationDate(fromDateStr || localDateStr);
        setReservedFromTime(fromTimeStr);
        setReservedToTime(toTimeStr);
      } else {
        setReservationDate(localDateStr);
        setReservedFromTime("");
        setReservedToTime("");
      }
    } else {
      setReservationDate("");
    }
    if (mode !== "SPECIAL") {
      setReservedFromTime("");
      setReservedToTime("");
    }
    setIsReserveOpen(true);
  };

  const handleImmediateReservation = () => {
    if (!reserveTable) return;
    const tableId = reserveTable.id;
    setIsReserveOpen(false);
    setReserveTable(null);
    setReserveMode(null);
    router.push(`${orderRoute}?tableId=${tableId}`);
  };

  const handleReserve = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reserveTable) return;
    if (!reservationDate || !reservedFromTime || !reservedToTime) {
      setReserveError(
        isAr ? "الرجاء اختيار اليوم ووقت البداية والنهاية" : "Please pick date and start/end time",
      );
      return;
    }
    setReserveError(null);
    setReserveSuccess(null);
    setIsSubmittingReserve(true);
    try {
      const fromLocal = new Date(`${reservationDate}T${reservedFromTime}:00`);
      const toLocal = new Date(`${reservationDate}T${reservedToTime}:00`);
      if (Number.isNaN(fromLocal.getTime()) || Number.isNaN(toLocal.getTime())) {
        throw new Error(isAr ? "تاريخ/وقت غير صالح" : "Invalid date/time");
      }
      if (toLocal <= fromLocal) {
        throw new Error(
          isAr ? "وقت النهاية يجب أن يكون بعد وقت البداية" : "End time must be after start time",
        );
      }
      const fromIso = fromLocal.toISOString();
      const toIso = toLocal.toISOString();
      await reservePosTable(
        reserveTable.id,
        {
          reservedFrom: fromIso,
          reservedTo: toIso,
        },
        token,
      );
      setReservedFromTime("");
      setReservedToTime("");
      const refreshed = await getPosTables(token);
      const updatedTable = refreshed?.find((t) => t.id === reserveTable.id);
      if (updatedTable) {
        setReserveTable(updatedTable);
      }
      await refetch();
      setReserveError(null);
      setReserveSuccess(
        isAr
          ? `تم حفظ الحجز من ${reservedFromTime} إلى ${reservedToTime}`
          : `Reservation saved (${reservedFromTime} – ${reservedToTime})`,
      );
    } catch (err: unknown) {
      setReserveError(
        getErrorMessage(err, isAr ? "فشل إنشاء الحجز" : "Failed to create reservation"),
      );
    } finally {
      setIsSubmittingReserve(false);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!window.confirm(isAr ? "إلغاء الحجز؟" : "Cancel reservation?")) return;
    try {
      await cancelPosTableReservation(reservationId, {}, token);
      refetch();
    } catch (err: any) {
      alert(err.message || (isAr ? "فشل إلغاء الحجز" : "Failed to cancel reservation"));
    }
  };

  const handleOpenPreOrder = async (
    reservationId: string,
    preOrderSaleId?: string | null,
    tableIdOverride?: string,
  ) => {
    setIsOpeningPreOrder((prev) => ({ ...prev, [reservationId]: true }));
    try {
      const tableId = tableIdOverride ?? reserveTable?.id;
      if (preOrderSaleId) {
        setIsReserveOpen(false);
        router.push(
          `/pos/register?reservationId=${reservationId}&tableId=${tableId ?? ""}&resume=${preOrderSaleId}`,
        );
        return;
      }
      const result = await openPosReservationPreOrder(reservationId, token);
      setIsReserveOpen(false);
      router.push(
        `/pos/register?reservationId=${result.reservationId}&tableId=${tableId ?? ""}&resume=${result.preOrderSaleId}`,
      );
    } catch (err: any) {
      alert(err.message || (isAr ? "فشل فتح الطلب المسبق" : "Failed to open pre-order"));
    } finally {
      setIsOpeningPreOrder((prev) => ({ ...prev, [reservationId]: false }));
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  const activeTablesList = tables || [];
  const totalCount = activeTablesList.length;
  const occupiedCount = activeTablesList.filter((t) => Boolean(t.activeInvoice)).length;
  const vacantCount = totalCount - occupiedCount;
  const reservedCount = activeTablesList.reduce(
    (count, table) =>
      count + (table.reservations ?? []).filter((r) => r.status === "ACTIVE").length,
    0,
  );

  return (
    <PageShell className="px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 sm:gap-6" dir={isAr ? "rtl" : "ltr"}>
        {/* Header Dashboard section */}
        <div className="relative overflow-hidden rounded-[20px] border border-[#d6e5da] bg-gradient-to-br from-[#f3faf5] via-[#ffffff] to-[#ecf7f0] p-4 shadow-sm sm:rounded-[24px] sm:p-6">
          <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-[#e3f4e8]/40 blur-2xl" />
          
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#e1f2e6] px-3.5 py-1 text-xs font-bold text-[#2e5d3c]">
                <LuLayoutGrid className="h-3.5 w-3.5" />
                <span>{isAr ? "مخطط الصالة والخدمة داخل المطعم" : "Dine-In Floor Plan & Service"}</span>
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-[#1e2c23] arabic-heading sm:text-3xl">
                {isAr ? "صالة الطعام / Dine-In" : "Restaurant Tables / Dine-In"}
              </h1>
              <p className="mt-1 max-w-2xl text-sm font-semibold text-[#506055]">
                {isAr 
                  ? "اختر طاولة فارغة لبدء طلب جديد، أو اختر طاولة مشغولة لاستكمال الحساب وإضافة الطلبات."
                  : "Select a vacant table to open a new receipt, or select an occupied table to resume the current bill."}
              </p>
            </div>

            {/* Quick stats indicator widget */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center lg:gap-3">
              <div className="flex items-center gap-2.5 rounded-[16px] border border-[#e2e8e4] bg-white px-3 py-2.5 shadow-sm sm:px-4">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#e6f4ea] text-[#137333]">
                  <span className="h-2 w-2 rounded-full bg-[#1e8e3e]" />
                </span>
                <div>
                  <div className="text-[10px] font-bold text-[#627267] uppercase tracking-wider">
                    {isAr ? "متاحة" : "Vacant"}
                  </div>
                  <div className="text-sm font-black text-[#1e2d23]">{vacantCount}</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-[16px] border border-[#fbe9d5] bg-[#fffbf6] px-4 py-2.5 shadow-sm">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#fef0e0] text-[#b06000]">
                  <span className="h-2 w-2 rounded-full bg-[#e8710a]" />
                </span>
                <div>
                  <div className="text-[10px] font-bold text-[#8c6d4f] uppercase tracking-wider">
                    {isAr ? "مشغولة" : "Occupied"}
                  </div>
                  <div className="text-sm font-black text-[#6d3e15]">{occupiedCount}</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-[16px] border border-[#d6d3f0] bg-[#fbfbff] px-4 py-2.5 shadow-sm">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#e9e7ff] text-[#4338ca]">
                  <LuClock className="h-2.5 w-2.5" />
                </span>
                <div>
                  <div className="text-[10px] font-bold text-[#5b56a8] uppercase tracking-wider">
                    {isAr ? "حجوزات قادمة" : "Reservations"}
                  </div>
                  <div className="text-sm font-black text-[#4338ca]">{reservedCount}</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-[16px] border border-[#dce3de] bg-[#f5f8f6] px-4 py-2.5 shadow-sm">
                <LuUtensils className="h-4 w-4 text-[#4e5f54]" />
                <div>
                  <div className="text-[10px] font-bold text-[#627267] uppercase tracking-wider">
                    {isAr ? "الإجمالي" : "Total"}
                  </div>
                  <div className="text-sm font-black text-[#1e2d23]">{totalCount}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsManageOpen(true)}
                className={cn(
                  "col-span-2 flex items-center justify-center gap-2 rounded-[16px] border border-[#d6e5da] bg-[#eef7f1] px-4 py-2.5 text-sm font-bold text-[#1e532d] shadow-sm transition-all hover:bg-[#e1f2e5] sm:col-span-1 lg:col-auto",
                  posTouchButtonClass,
                )}
              >
                <LuSettings className="h-4 w-4 shrink-0" />
                <span>{isAr ? "إدارة الطاولات" : "Manage Tables"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex flex-col gap-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#46644b]">
              {isAr ? "مخطط الطاولات" : "Floor plan"}
            </h2>

        {/* Floor Plan Tables Grid */}
        {activeTablesList.length === 0 ? (
          <Card className="rounded-[24px] border-[#e1e7e3] bg-white p-12 text-center shadow-none">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f7f5] text-[#718578]">
              <LuChefHat className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#233329]">
              {isAr ? "لا توجد طاولات حالياً" : "No Tables Configured"}
            </h3>
            <p className="mt-1 text-sm text-[#627367]">
              {isAr 
                ? "يرجى الانتقال إلى إعدادات نقاط البيع لإضافة طاولات جديدة وتحديد سعتها."
                : "Please navigate to POS Settings in the sales register to setup your restaurant tables."}
            </p>
          </Card>
        ) : (
          <div className={posTableFloorGridClass}>
            {activeTablesList.map((table) => {
              const activeInvoice = table.activeInvoice;
              const isOccupied = Boolean(activeInvoice);
              const invoiceTotal = activeInvoice ? Number(activeInvoice.totalAmount) : 0;
              const tableStatus = table.status;
              const isWaiting = tableStatus === "WAITING_FOR_PAYMENT";
              const isCleaning = tableStatus === "CLEANING";
              const activeReservations = (table.reservations ?? []).filter((r) => r.status === "ACTIVE");
              const nextReservation = activeReservations[0] ?? null;
              const isReserved = Boolean(nextReservation);
              const extraReservationCount = Math.max(0, activeReservations.length - 1);
              const now = new Date();
              const reservedFromDate = isReserved ? new Date(nextReservation.reservedFrom) : null;
              const reservedToDate = isReserved ? new Date(nextReservation.reservedTo) : null;
              const isWithinReservationWindow =
                isReserved && reservedFromDate && reservedToDate
                  ? now >= reservedFromDate && now <= reservedToDate
                  : false;

              const cardBorder = isWaiting
                ? "border-[#fde68a] bg-gradient-to-br from-[#fffdf5] to-[#fef9e7]"
                : isCleaning
                  ? "border-[#e0e7ff] bg-gradient-to-br from-[#f5f7ff] to-[#eef1ff]"
                  : isOccupied
                    ? "border-[#f7cc9e] bg-gradient-to-br from-[#fffdfa] to-[#fff6ec] hover:from-[#fffcf7] hover:to-[#fff2e0]"
                    : isReserved
                      ? "border-[#d6d3f0] bg-gradient-to-br from-[#fbfbff] to-[#f3f2ff] hover:from-[#f7f7ff] hover:to-[#ecebff]"
                      : "border-[#d1dfd6] bg-gradient-to-br from-[#fafdfb] to-[#f1faf4] hover:from-[#f7fcf8] hover:to-[#e8f7ed]";

              const showOccupiedBadge =
                isOccupied || (tableStatus === "OCCUPIED" && !isWaiting && !isCleaning);
              const showReservedBadge =
                isReserved || (activeReservations.length > 0 && !showOccupiedBadge);

              const statusBadge = isWaiting
                ? { bg: "bg-[#fef9c3] text-[#854d0e]", dot: "bg-[#d97706]", label: isAr ? "انتظار الدفع" : "Awaiting payment" }
                : isCleaning
                  ? { bg: "bg-[#e0e7ff] text-[#3730a3]", dot: "bg-[#6366f1]", label: isAr ? "تنظيف" : "Cleaning" }
                  : showOccupiedBadge
                    ? { bg: "bg-[#ffeccc] text-[#b06000]", dot: "bg-[#e8710a]", label: isAr ? "مشغولة" : "In use" }
                    : showReservedBadge
                      ? { bg: "bg-[#e9e7ff] text-[#4338ca]", dot: "bg-[#6366f1]", label: isAr ? "محجوزة" : "Reserved" }
                      : { bg: "bg-[#e2f3e7] text-[#245834]", dot: "bg-[#1e8e3e]", label: isAr ? "متاحة" : "Available" };

              return (
                <div
                  key={table.id}
                  onClick={() => handleOpenTable(table)}
                  className={cn(
                    "group relative flex min-w-0 cursor-pointer flex-col justify-between overflow-hidden rounded-[20px] border-2 p-4 text-start shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md sm:rounded-[24px] sm:p-5",
                    cardBorder,
                  )}
                >
                  {/* Status badge row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold", statusBadge.bg)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", statusBadge.dot)} />
                        <span>{statusBadge.label}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Quick status/waiter action */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusTable(table);
                          setPendingStatus(table.status);
                          setPendingWaiterId(table.assignedWaiterId ?? "");
                        }}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full border border-[#e1e7e2] bg-white text-[#68776f] transition hover:bg-[#f6faf7] hover:text-[#233329] sm:h-8 sm:w-8",
                          posTouchOrHoverRevealClass,
                        )}
                        title={isAr ? "إدارة الطاولة" : "Manage table"}
                      >
                        <LuSettings className="h-3.5 w-3.5" />
                      </button>
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full border bg-white",
                          isWaiting
                            ? "border-[#fde68a] text-[#d97706]"
                            : isCleaning
                              ? "border-[#e0e7ff] text-[#6366f1]"
                              : isOccupied
                                ? "border-[#fadcb9] text-[#d97706]"
                                : isReserved
                                  ? "border-[#d6d3f0] text-[#4338ca]"
                                  : "border-[#cce5d6] text-[#16a34a]",
                        )}
                      >
                        {isCleaning ? <LuSparkles className="h-4 w-4" /> : isWaiting ? <LuTimerReset className="h-4 w-4" /> : <LuUtensils className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Body Content Details */}
                  <div className="mt-4 flex-1">
                    <h3
                      className={cn(
                        "text-2xl font-black tracking-tight",
                        isWaiting
                          ? "text-[#854d0e]"
                          : isCleaning
                            ? "text-[#3730a3]"
                            : isOccupied
                              ? "text-[#78350f]"
                              : isReserved
                                ? "text-[#4338ca]"
                                : "text-[#14532d]",
                      )}
                    >
                      {isAr ? `طاولة ${table.tableNumber}` : `Table ${table.tableNumber}`}
                    </h3>

                    <div className="mt-3.5 space-y-2 border-t border-dashed border-black/5 pt-3.5 text-xs font-semibold text-[#506054]">
                      <div className="flex items-center gap-2">
                        <LuUsers className="h-3.5 w-3.5 text-[#728578]" />
                        <span>
                          {isAr 
                            ? `السعة: ${table.capacity} مقاعد` 
                            : `Capacity: ${table.capacity} Guests`}
                        </span>
                      </div>

                      {isOccupied && activeInvoice && (
                        <>
                          {table.assignedWaiter && (
                            <div className="flex items-center gap-2">
                              <LuUser className="h-3.5 w-3.5 text-[#d97706]" />
                              <span className="truncate">
                                {isAr ? "الويتر: " : "Waiter: "}
                                {table.assignedWaiter.name || table.assignedWaiter.email}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <LuClock className="h-3.5 w-3.5 text-[#d97706]" />
                            <span className="truncate">
                              {isAr ? "رقم الفاتورة: " : "Ref: "}
                              {activeInvoice.reference}
                            </span>
                          </div>
                        </>
                      )}

                      {!isOccupied && isReserved && reservedFromDate && reservedToDate && (
                        <>
                          <div className="flex items-center gap-2">
                            <LuClock className="h-3.5 w-3.5 shrink-0 text-[#6366f1]" />
                            <span className="truncate text-[#4338ca]">
                              {formatReservationDateTime(reservedFromDate, isAr)}
                            </span>
                          </div>
                          {extraReservationCount > 0 ? (
                            <div className="text-[10px] font-bold text-[#6366f1]">
                              {isAr
                                ? `+${extraReservationCount} حجوزات أخرى`
                                : `+${extraReservationCount} more booking${extraReservationCount > 1 ? "s" : ""}`}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Foot Total & Button */}
                  <div className="mt-4 border-t border-black/5 pt-3 sm:mt-5 sm:pt-4">
                    {isOccupied ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-[10px] font-bold uppercase text-[#8c6d4f]">
                              {isAr ? "قيمة الفاتورة" : "Amount Due"}
                            </div>
                            <div className="text-lg font-black text-[#78350f]">
                              {invoiceTotal.toFixed(2)} JOD
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTable(table);
                            }}
                            className={cn(
                              "flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d97706] to-[#b45309] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:from-[#b45309] hover:to-[#78350f] sm:w-auto sm:text-xs",
                              posTouchButtonClass,
                            )}
                          >
                            <LuCheck className="h-4 w-4 shrink-0 sm:h-3.5 sm:w-3.5" />
                            <span>{isAr ? "عرض الطلب" : "Open Bill"}</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openReserveModal(table, "SPECIAL");
                          }}
                          className={cn(
                            "w-full rounded-xl border border-[#c7c3ff] bg-white px-3 py-2.5 text-xs font-bold text-[#4338ca] hover:bg-[#f6f5ff]",
                            posTouchButtonClass,
                          )}
                        >
                          {isAr ? "+ حجز وقت آخر" : "+ Book another time slot"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        <span className="text-xs font-bold text-[#627367]">
                          {isReserved
                            ? isWithinReservationWindow
                              ? isAr
                                ? "وقت الحجز"
                                : "Reservation time"
                              : isAr
                                ? "محجوزة"
                                : "Reserved"
                            : isAr
                              ? "جاهزة للفتح"
                              : "Ready to serve"}
                        </span>

                        {isReserved && !isWithinReservationWindow ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openReserveModal(table, "SPECIAL");
                            }}
                            className={cn(
                              "flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#c7c3ff] bg-white px-4 py-2.5 text-sm font-bold text-[#4338ca] shadow-sm hover:bg-[#f6f5ff] sm:text-xs",
                              posTouchButtonClass,
                            )}
                          >
                            <LuClock className="h-4 w-4 shrink-0 sm:h-3.5 sm:w-3.5" />
                            <span>{isAr ? "تعديل الحجز" : "Edit"}</span>
                          </button>
                        ) : (
                          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openReserveModal(table);
                              }}
                              className={cn(
                                "flex items-center justify-center gap-1.5 rounded-xl border border-[#d6e1d9] bg-white px-3 py-2.5 text-sm font-bold text-[#233329] shadow-sm hover:bg-[#f6faf7] sm:text-xs",
                                posTouchButtonClass,
                              )}
                            >
                              <LuClock className="h-4 w-4 shrink-0 sm:h-3.5 sm:w-3.5" />
                              <span>{isAr ? "حجز" : "Reserve"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTable(table);
                              }}
                              className={cn(
                                "flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#15803d] px-3 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:from-[#15803d] hover:to-[#14532d] sm:text-xs",
                                posTouchButtonClass,
                              )}
                            >
                              <LuPlus className="h-4 w-4 shrink-0 sm:h-3.5 sm:w-3.5" />
                              <span>{isAr ? "طلب جديد" : "New Order"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* Reserve Table Modal */}
      <Modal
        isOpen={isReserveOpen}
        onClose={() => {
          setIsReserveOpen(false);
          setReserveTable(null);
          setReserveMode(null);
          setReservationDate("");
          setReservedFromTime("");
          setReservedToTime("");
          setReserveError(null);
          setReserveSuccess(null);
        }}
        title={isAr ? "حجز طاولة" : "Reserve Table"}
      >
        <div className="flex flex-col gap-4 p-1" dir={isAr ? "rtl" : "ltr"}>
          {reserveError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
              {reserveError}
            </div>
          ) : null}
          {reserveSuccess ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
              {reserveSuccess}
            </div>
          ) : null}

          <div className="text-sm font-black text-[#233329]">
            {reserveTable ? (isAr ? `طاولة ${reserveTable.tableNumber}` : `Table ${reserveTable.tableNumber}`) : ""}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setReserveError(null);
                setReserveMode("IMMEDIATE");
              }}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm font-black transition-colors",
                reserveMode === "IMMEDIATE"
                  ? "border-[#16a34a] bg-[#eaf7ef] text-[#14532d]"
                  : "border-[#d6e1d9] bg-white text-[#233329] hover:bg-[#f6faf7]",
              )}
            >
              {isAr ? "حجز فوري (الانتقال إلى نقاط البيع)" : "Immediate reservation (go to POS)"}
            </button>

            <button
              type="button"
              onClick={() => {
                setReserveError(null);
                setReserveMode("SPECIAL");
                const now = new Date();
                const localDateStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
                setReservationDate((prev) => prev || localDateStr);
                setReservedFromTime("");
                setReservedToTime("");
              }}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm font-black transition-colors",
                reserveMode === "SPECIAL"
                  ? "border-[#4338ca] bg-[#efefff] text-[#2f2ab5]"
                  : "border-[#d6e1d9] bg-white text-[#233329] hover:bg-[#f7f7ff]",
              )}
            >
              {isAr ? "حجز خاص (من وقت إلى وقت)" : "Special reservation (from/to datetime)"}
            </button>
          </div>

          {reserveMode === "IMMEDIATE" ? (
            <div className="flex flex-col gap-2">
              <div className="rounded-xl border border-[#d6e1d9] bg-[#fbfcfb] p-3 text-xs font-semibold text-[#506054]">
                {isAr
                  ? "الحجز الفوري يفتح الطاولة مباشرة في شاشة نقاط البيع."
                  : "Immediate reservation opens the table directly in the POS register."}
              </div>
              <button
                type="button"
                onClick={handleImmediateReservation}
                className="rounded-xl bg-[#16a34a] py-2.5 text-sm font-black text-white hover:bg-[#15803d]"
              >
                {isAr ? "فتح نقاط البيع الآن" : "Open POS now"}
              </button>
            </div>
          ) : reserveMode === "SPECIAL" ? (
            <form onSubmit={handleReserve} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#46644b]">{isAr ? "اليوم" : "Date"}</label>
                <input
                  type="date"
                  value={reservationDate}
                  onChange={(e) => setReservationDate(e.target.value)}
                  className="w-full rounded-[12px] border border-[#d6e1d9] bg-white px-3 py-2 text-sm font-semibold text-[#233329]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#46644b]">{isAr ? "من (وقت)" : "From (time)"}</label>
                  <input
                    type="time"
                    value={reservedFromTime}
                    onChange={(e) => setReservedFromTime(e.target.value)}
                    step={300}
                    className="w-full rounded-[12px] border border-[#d6e1d9] bg-white px-3 py-2 text-sm font-semibold text-[#233329]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#46644b]">{isAr ? "إلى (وقت)" : "To (time)"}</label>
                  <input
                    type="time"
                    value={reservedToTime}
                    onChange={(e) => setReservedToTime(e.target.value)}
                    step={300}
                    className="w-full rounded-[12px] border border-[#d6e1d9] bg-white px-3 py-2 text-sm font-semibold text-[#233329]"
                  />
                </div>
              </div>

              {reserveTable?.reservations?.length ? (
                <div className="rounded-2xl border border-[#e1e7e2] bg-[#fbfcfb] p-4">
                  <h4 className="text-sm font-black text-[#233329]">
                    {isAr ? "الحجوزات القادمة" : "Upcoming reservations"}
                  </h4>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#68776f]">
                    {isAr
                      ? "إدارة الحجوزات والطلبات المسبقة لهذه الطاولة"
                      : "Manage scheduled windows and pre-orders for this table"}
                  </p>
                  <div className="mt-4 flex flex-col gap-3">
                    {reserveTable.reservations.map((r) => {
                      const preOrderSaleId = (r as { preOrderSaleId?: string | null }).preOrderSaleId ?? null;
                      const activeInvoiceId = reserveTable.activeInvoice?.id ?? null;
                      const blocksPreOrder =
                        Boolean(activeInvoiceId) && activeInvoiceId !== preOrderSaleId;
                      return (
                        <ReservationCard
                          key={r.id}
                          reservation={r}
                          isAr={isAr}
                          isTableOccupied={blocksPreOrder}
                          isLoadingPreOrder={Boolean(isOpeningPreOrder[r.id])}
                          onOpenPreOrder={() => handleOpenPreOrder(r.id, preOrderSaleId, reserveTable.id)}
                          onCancel={() => handleCancelReservation(r.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmittingReserve}
                className="rounded-xl bg-[#4338ca] py-2.5 text-sm font-bold text-white hover:bg-[#372fb4] disabled:opacity-50"
              >
                {isAr ? "إضافة حجز جديد" : "Add new reservation"}
              </button>
            </form>
          ) : (
            <div className="rounded-xl border border-[#d6e1d9] bg-[#fbfcfb] p-3 text-xs font-semibold text-[#506054]">
              {isAr ? "اختر نوع الحجز للمتابعة." : "Pick a reservation type to continue."}
            </div>
          )}
        </div>
      </Modal>

      {/* Table Management Modal */}
      <Modal
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        title={isAr ? "إدارة طاولات الصالة / Table Manager" : "Floor Plan & Table Manager"}
      >
        <div className="flex flex-col gap-6 p-1" dir={isAr ? "rtl" : "ltr"}>
          {/* Create Table Form */}
          <form onSubmit={handleCreateTable} className="flex flex-col gap-4 rounded-2xl border border-[#e1e7e2] bg-[#fbfcfb] p-5">
            <h4 className="text-sm font-black text-[#233329]">
              {isAr ? "إضافة طاولة جديدة / Add New Table" : "Add New Table"}
            </h4>

            {tableError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-600">
                {tableError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#46644b]">
                  {isAr ? "رقم الطاولة" : "Table Number"}
                </label>
                <input
                  type="text"
                  value={newTableNum}
                  onChange={(e) => setNewTableNum(e.target.value)}
                  placeholder="e.g. T13"
                  className="w-full rounded-[12px] border border-[#d6e1d9] bg-white px-3 py-2 text-sm font-semibold text-[#233329] outline-none focus:border-[#46644b]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#46644b]">
                  {isAr ? "عدد المقاعد" : "Capacity"}
                </label>
                <select
                  value={newTableCap}
                  onChange={(e) => setNewTableCap(Number(e.target.value))}
                  className="w-full rounded-[12px] border border-[#d6e1d9] bg-white px-3 py-2 text-sm font-semibold text-[#233329]"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16].map((num) => (
                    <option key={num} value={num}>
                      {num} {isAr ? "مقاعد" : "seats"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingTable}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#0f8f67] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0c7a57] disabled:opacity-50"
            >
              <LuPlus className="h-4 w-4" />
              <span>{isAr ? "إضافة الطاولة" : "Add Table"}</span>
            </button>
          </form>

          {/* Table List */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-black text-[#233329]">
              {isAr ? "قائمة الطاولات الحالية" : "Current Tables"}
            </h4>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {activeTablesList.map((table) => {
                const isOccupied = Boolean(table.activeInvoice);
                return (
                  <div
                    key={table.id}
                    className="flex items-center justify-between rounded-xl border border-[#e1e7e2] bg-[#fbfcfb] p-3 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-[#233329]">
                          {isAr ? `طاولة ${table.tableNumber}` : `Table ${table.tableNumber}`}
                        </span>
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            isOccupied ? "bg-orange-500" : "bg-emerald-500"
                          )}
                        />
                      </div>
                      <div className="text-[10px] text-[#68776f] mt-0.5">
                        {table.capacity} {isAr ? "مقاعد" : "seats"} • {isOccupied ? (isAr ? "مشغولة" : "Busy") : (isAr ? "متاحة" : "Available")}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isOccupied}
                      onClick={() => handleDeleteTable(table.id)}
                      className={cn(
                        "rounded-lg p-1.5 transition-colors",
                        isOccupied
                          ? "text-[#cbe5d5] cursor-not-allowed"
                          : "text-[#ef4444] hover:bg-red-50"
                      )}
                      title={isOccupied ? "Cannot delete table with active order" : "Delete Table"}
                    >
                      <LuTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Table Status / Waiter Assign Modal */}
      <Modal
        isOpen={Boolean(statusTable)}
        onClose={() => setStatusTable(null)}
        title={
          statusTable
            ? isAr
              ? `إدارة طاولة ${statusTable.tableNumber}`
              : `Manage Table ${statusTable.tableNumber}`
            : ""
        }
      >
        {statusTable ? (
          <div className="flex flex-col gap-4 p-1" dir={isAr ? "rtl" : "ltr"}>
            {/* Status picker */}
            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-widest text-[#46644b]">
                {isAr ? "حالة الطاولة" : "Table status"}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(
                  [
                    { value: "AVAILABLE", en: "Available", ar: "متاحة", active: "border-[#16a34a] bg-[#e9f7ed] text-[#14532d]" },
                    { value: "OCCUPIED", en: "Occupied", ar: "مشغولة", active: "border-[#d97706] bg-[#fff7e8] text-[#78350f]" },
                    { value: "RESERVED", en: "Reserved", ar: "محجوزة", active: "border-[#4338ca] bg-[#efefff] text-[#2f2ab5]" },
                    { value: "WAITING_FOR_PAYMENT", en: "Awaiting payment", ar: "انتظار الدفع", active: "border-[#d97706] bg-[#fef9c3] text-[#854d0e]" },
                    { value: "CLEANING", en: "Cleaning", ar: "تنظيف", active: "border-[#6366f1] bg-[#e0e7ff] text-[#3730a3]" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setPendingStatus(s.value)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-bold transition-colors",
                      pendingStatus === s.value
                        ? s.active
                        : "border-[#d6e1d9] bg-white text-[#506054] hover:bg-[#f6faf7]",
                    )}
                  >
                    {isAr ? s.ar : s.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Waiter picker */}
            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-widest text-[#46644b]">
                {isAr ? "الويتر المعين" : "Assigned waiter"}
              </div>
              <select
                value={pendingWaiterId}
                onChange={(e) => setPendingWaiterId(e.target.value)}
                className="w-full rounded-xl border border-[#d6e1d9] bg-white px-3 py-2 text-sm font-semibold text-[#233329]"
              >
                <option value="">{isAr ? "— بدون ويتر —" : "— No waiter —"}</option>
                {waiters.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name || w.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isSavingTableStatus}
                onClick={async () => {
                  if (!statusTable) return;
                  setIsSavingTableStatus(true);
                  try {
                    await Promise.all([
                      pendingStatus !== statusTable.status
                        ? updatePosTableStatus(statusTable.id, pendingStatus, token)
                        : Promise.resolve(),
                      pendingWaiterId !== (statusTable.assignedWaiterId ?? "")
                        ? updatePosTableWaiter(statusTable.id, pendingWaiterId || null, token)
                        : Promise.resolve(),
                    ]);
                    refetch();
                    setStatusTable(null);
                  } catch (err: unknown) {
                    alert(
                      err instanceof Error
                        ? err.message
                        : isAr
                          ? "فشل حفظ التغييرات"
                          : "Failed to save changes",
                    );
                  } finally {
                    setIsSavingTableStatus(false);
                  }
                }}
                className="flex-1 rounded-xl bg-[#0f8f67] py-2.5 text-sm font-bold text-white hover:bg-[#0c7a57] disabled:opacity-50"
              >
                {isSavingTableStatus ? (isAr ? "جاري الحفظ…" : "Saving…") : isAr ? "حفظ" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setStatusTable(null)}
                className="rounded-xl border border-[#d6e1d9] px-4 py-2.5 text-sm font-bold text-[#506054] hover:bg-[#f6faf7]"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </PageShell>
  );
}
