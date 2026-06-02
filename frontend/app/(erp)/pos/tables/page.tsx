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
  LuSettings
} from "react-icons/lu";

import { PageShell, Card, PageSkeleton, Modal } from "@/components/ui";
import { getPosTables, createPosTable, deletePosTable, reservePosTable, cancelPosTableReservation } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useTranslation } from "@/lib/i18n";
import { PosTable } from "@/types/api";
import { cn } from "@/lib/utils";

export default function TablesPage() {
  const router = useRouter();
  const { token } = useAuth();
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
  const [reserveNotes, setReserveNotes] = React.useState("");
  const [reserveError, setReserveError] = React.useState<string | null>(null);
  const [isSubmittingReserve, setIsSubmittingReserve] = React.useState(false);

  const { data: tables, isLoading, refetch } = useQuery({
    queryKey: ["pos-tables", token],
    queryFn: () => getPosTables(token),
    enabled: Boolean(token),
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
    const now = new Date();
    const nextReservation = table.reservations?.[0] ?? null;
    if (nextReservation?.status === "ACTIVE") {
      const from = new Date(nextReservation.reservedFrom);
      const to = new Date(nextReservation.reservedTo);
      const isWithinWindow = now >= from && now <= to;
      if (!isWithinWindow && !table.activeInvoice) {
        alert(
          isAr
            ? `الطاولة محجوزة من ${from.toLocaleString()} إلى ${to.toLocaleString()}`
            : `Table is reserved from ${from.toLocaleString()} to ${to.toLocaleString()}`,
        );
        return;
      }
    }

    router.push(`/pos/register?tableId=${table.id}`);
  };

  const openReserveModal = (table: PosTable, mode?: "IMMEDIATE" | "SPECIAL") => {
    setReserveTable(table);
    setReserveError(null);
    setReserveNotes("");
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
    router.push(`/pos/register?tableId=${tableId}`);
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
    setIsSubmittingReserve(true);
    try {
      // Compose local datetime using selected date + time, then convert to ISO for backend.
      const fromLocal = new Date(`${reservationDate}T${reservedFromTime}`);
      const toLocal = new Date(`${reservationDate}T${reservedToTime}`);
      if (Number.isNaN(fromLocal.getTime()) || Number.isNaN(toLocal.getTime())) {
        throw new Error(isAr ? "تاريخ/وقت غير صالح" : "Invalid date/time");
      }
      const fromIso = fromLocal.toISOString();
      const toIso = toLocal.toISOString();
      await reservePosTable(
        reserveTable.id,
        { reservedFrom: fromIso, reservedTo: toIso, notes: reserveNotes.trim() || undefined },
        token,
      );
      setIsReserveOpen(false);
      setReserveTable(null);
      refetch();
    } catch (err: any) {
      setReserveError(err.message || (isAr ? "فشل إنشاء الحجز" : "Failed to create reservation"));
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

  if (isLoading) {
    return <PageSkeleton />;
  }

  const activeTablesList = tables || [];
  const totalCount = activeTablesList.length;
  const occupiedCount = activeTablesList.filter(t => Boolean(t.activeInvoice)).length;
  const vacantCount = totalCount - occupiedCount;

  return (
    <PageShell>
      <div className="flex flex-col gap-6" dir={isAr ? "rtl" : "ltr"}>
        {/* Header Dashboard section */}
        <div className="relative overflow-hidden rounded-[24px] border border-[#d6e5da] bg-gradient-to-br from-[#f3faf5] via-[#ffffff] to-[#ecf7f0] p-6 shadow-sm">
          <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-[#e3f4e8]/40 blur-2xl" />
          
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#e1f2e6] px-3.5 py-1 text-xs font-bold text-[#2e5d3c]">
                <LuLayoutGrid className="h-3.5 w-3.5" />
                <span>{isAr ? "مخطط الصالة والخدمة داخل المطعم" : "Dine-In Floor Plan & Service"}</span>
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#1e2c23] arabic-heading">
                {isAr ? "صالة الطعام / Dine-In" : "Restaurant Tables / Dine-In"}
              </h1>
              <p className="max-w-2xl text-sm font-semibold text-[#506055] mt-1">
                {isAr 
                  ? "اختر طاولة فارغة لبدء طلب جديد، أو اختر طاولة مشغولة لاستكمال الحساب وإضافة الطلبات."
                  : "Select a vacant table to open a new receipt, or select an occupied table to resume the current bill."}
              </p>
            </div>

            {/* Quick stats indicator widget */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5 rounded-[16px] border border-[#e2e8e4] bg-white px-4 py-2.5 shadow-sm">
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
                className="flex items-center gap-2 rounded-[16px] border border-[#d6e5da] bg-[#eef7f1] hover:bg-[#e1f2e5] px-4 py-2.5 shadow-sm text-sm font-bold text-[#1e532d] transition-all"
              >
                <LuSettings className="h-4 w-4 shrink-0" />
                <span>{isAr ? "إدارة الطاولات" : "Manage Tables"}</span>
              </button>
            </div>
          </div>
        </div>

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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {activeTablesList.map((table) => {
              const activeInvoice = table.activeInvoice;
              const isOccupied = Boolean(activeInvoice);
              const invoiceTotal = activeInvoice ? Number(activeInvoice.totalAmount) : 0;
              const nextReservation = table.reservations?.[0] ?? null;
              const isReserved = nextReservation?.status === "ACTIVE";
              const now = new Date();
              const reservedFromDate = isReserved ? new Date(nextReservation!.reservedFrom) : null;
              const reservedToDate = isReserved ? new Date(nextReservation!.reservedTo) : null;
              const isWithinReservationWindow =
                isReserved && reservedFromDate && reservedToDate
                  ? now >= reservedFromDate && now <= reservedToDate
                  : false;

              return (
                <div
                  key={table.id}
                  onClick={() => handleOpenTable(table)}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-[24px] border-2 p-5 text-start shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer ${
                    isOccupied
                      ? "border-[#f7cc9e] bg-gradient-to-br from-[#fffdfa] to-[#fff6ec] hover:from-[#fffcf7] hover:to-[#fff2e0]"
                      : isReserved
                        ? "border-[#d6d3f0] bg-gradient-to-br from-[#fbfbff] to-[#f3f2ff] hover:from-[#f7f7ff] hover:to-[#ecebff]"
                        : "border-[#d1dfd6] bg-gradient-to-br from-[#fafdfb] to-[#f1faf4] hover:from-[#f7fcf8] hover:to-[#e8f7ed]"
                  }`}
                >
                  {/* Reservation Status */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isOccupied
                            ? "bg-[#ffeccc] text-[#b06000]"
                            : isReserved
                              ? "bg-[#e9e7ff] text-[#4338ca]"
                              : "bg-[#e2f3e7] text-[#245834]"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          isOccupied ? "bg-[#e8710a]" : isReserved ? "bg-[#6366f1]" : "bg-[#1e8e3e]"
                        }`} />
                        <span>
                          {isOccupied
                            ? isAr
                              ? "مشغولة"
                              : "Occupied"
                            : isReserved
                              ? isAr
                                ? "محجوزة"
                                : "Reserved"
                              : isAr
                                ? "متاحة"
                                : "Available"}
                        </span>
                      </span>
                    </div>

                    <div className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                      isOccupied 
                        ? "border-[#fadcb9] bg-white text-[#d97706]" 
                        : "border-[#cce5d6] bg-white text-[#16a34a]"
                    }`}>
                      <LuUtensils className="h-4.5 w-4.5" />
                    </div>
                  </div>

                  {/* Body Content Details */}
                  <div className="mt-4 flex-1">
                    <h3 className={`text-2xl font-black tracking-tight ${
                      isOccupied ? "text-[#78350f]" : "text-[#14532d]"
                    }`}>
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
                        <div className="flex items-center gap-2">
                          <LuClock className="h-3.5 w-3.5 text-[#6366f1]" />
                          <span className="truncate text-[#4338ca]">
                            {isAr ? "الحجز: " : "Reserved: "}
                            {reservedFromDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–
                            {reservedToDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Foot Total & Button */}
                  <div className="mt-5 border-t border-black/5 pt-4">
                    {isOccupied ? (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-bold text-[#8c6d4f] uppercase">
                            {isAr ? "قيمة الفاتورة" : "Amount Due"}
                          </div>
                          <div className="text-lg font-black text-[#78350f]">
                            {invoiceTotal.toFixed(2)} JOD
                          </div>
                        </div>
                        <button className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#d97706] to-[#b45309] px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:from-[#b45309] hover:to-[#78350f]">
                          <LuCheck className="h-3.5 w-3.5" />
                          <span>{isAr ? "عرض الطلب" : "Open Bill"}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
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
                            className="flex items-center gap-1 rounded-xl bg-white border border-[#c7c3ff] px-3.5 py-2 text-xs font-bold text-[#4338ca] shadow-sm hover:bg-[#f6f5ff]"
                          >
                            <LuClock className="h-3.5 w-3.5" />
                            <span>{isAr ? "تعديل الحجز" : "Edit"}</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openReserveModal(table);
                              }}
                              className="flex items-center gap-1 rounded-xl bg-white border border-[#d6e1d9] px-3.5 py-2 text-xs font-bold text-[#233329] shadow-sm hover:bg-[#f6faf7]"
                            >
                              <LuClock className="h-3.5 w-3.5" />
                              <span>{isAr ? "حجز" : "Reserve"}</span>
                            </button>
                            <button className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#15803d] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:from-[#15803d] hover:to-[#14532d]">
                              <LuPlus className="h-3.5 w-3.5" />
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
        }}
        title={isAr ? "حجز طاولة" : "Reserve Table"}
      >
        <div className="flex flex-col gap-4 p-1" dir={isAr ? "rtl" : "ltr"}>
          {reserveError && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-600">
              {reserveError}
            </div>
          )}

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

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#46644b]">{isAr ? "ملاحظات" : "Notes"}</label>
                <input
                  type="text"
                  value={reserveNotes}
                  onChange={(e) => setReserveNotes(e.target.value)}
                  className="w-full rounded-[12px] border border-[#d6e1d9] bg-white px-3 py-2 text-sm font-semibold text-[#233329]"
                  placeholder={isAr ? "اختياري" : "Optional"}
                />
              </div>

              {reserveTable?.reservations?.[0]?.id ? (
                <button
                  type="button"
                  onClick={() => handleCancelReservation(reserveTable.reservations![0].id)}
                  className="rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100"
                >
                  {isAr ? "إلغاء الحجز الحالي" : "Cancel current reservation"}
                </button>
              ) : null}

              <button
                type="submit"
                disabled={isSubmittingReserve}
                className="rounded-xl bg-[#4338ca] py-2.5 text-sm font-bold text-white hover:bg-[#372fb4] disabled:opacity-50"
              >
                {isAr ? "حفظ الحجز" : "Save reservation"}
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
    </PageShell>
  );
}
