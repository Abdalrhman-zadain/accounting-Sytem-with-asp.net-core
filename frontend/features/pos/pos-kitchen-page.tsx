"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LuBell,
  LuCheck,
  LuChefHat,
  LuClock,
  LuFlame,
  LuMaximize2,
  LuMinimize2,
  LuPlay,
  LuPrinter,
  LuRefreshCcw,
  LuSearch,
  LuX,
} from "react-icons/lu";

import { PageSkeleton } from "@/components/ui";
import {
  dismissKitchenOrderNotification,
  getPosKitchenOrders,
  reprintKot,
  updateKitchenOrderStatus,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { formatAddonsForDisplay } from "@/features/pos/pos-addon-utils";
import { printKitchenTicket } from "@/features/pos/pos-print-service";
import { useAuth } from "@/providers/auth-provider";
import { useKdsMode } from "@/providers/kds-mode-provider";
import type { KitchenOrder, KitchenStatus, PosOrderType, PosSale } from "@/types/api";

const MAIN_COLUMNS: Array<{
  status: KitchenStatus;
  labelKey: string;
  headerClass: string;
  accent: string;
}> = [
  {
    status: "NEW",
    labelKey: "pos.kitchen.column.new",
    headerClass: "bg-amber-500",
    accent: "#d97706",
  },
  {
    status: "PREPARING",
    labelKey: "pos.kitchen.column.preparing",
    headerClass: "bg-orange-500",
    accent: "#ea580c",
  },
  {
    status: "READY",
    labelKey: "pos.kitchen.column.ready",
    headerClass: "bg-emerald-600",
    accent: "#059669",
  },
];

const DONE_COLUMN = {
  status: "SERVED" as const,
  labelKey: "pos.kitchen.column.done",
  headerClass: "bg-slate-500",
  accent: "#64748b",
};

function elapsedMinutes(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function formatClockTime(iso: string, language: string) {
  return new Date(iso).toLocaleTimeString(language === "ar" ? "ar-JO" : undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function orderTypeLabel(orderType: PosOrderType, language: string) {
  if (language === "ar") {
    if (orderType === "DINE_IN") return "صالة";
    if (orderType === "TAKEAWAY") return "سفري";
    if (orderType === "DELIVERY") return "توصيل";
    return "استلام";
  }
  if (orderType === "DINE_IN") return "Dine-in";
  if (orderType === "TAKEAWAY") return "Takeaway";
  if (orderType === "DELIVERY") return "Delivery";
  return "Pickup";
}

function nextOrderStatus(current: KitchenStatus): KitchenStatus | null {
  if (current === "NEW") return "PREPARING";
  if (current === "PREPARING") return "READY";
  if (current === "READY") return "SERVED";
  return null;
}

function sortKitchenOrders(orders: KitchenOrder[], status: KitchenStatus) {
  const sorted = [...orders];
  if (status === "SERVED") {
    return sorted.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }
  return sorted.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function playKitchenUpdateChime() {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.36);
    void ctx.close();
  } catch {
    // Audio not available
  }
}

function formatModifiers(modifiers: unknown, language: string): string | null {
  return formatAddonsForDisplay(modifiers, language);
}

function getUrgency(createdAt: string, status: KitchenStatus) {
  const mins = elapsedMinutes(createdAt);
  if (status === "SERVED") return { mins, level: "normal" as const };
  if (mins >= 15) return { mins, level: "late" as const };
  if (mins >= 8) return { mins, level: "rush" as const };
  return { mins, level: "normal" as const };
}

function buildStatusTimeline(order: KitchenOrder, language: string) {
  const isAr = language === "ar";
  const labels: Record<KitchenStatus, string> = isAr
    ? { NEW: "جديد", PREPARING: "قيد التحضير", READY: "جاهز", SERVED: "منتهي" }
    : { NEW: "New", PREPARING: "Preparing", READY: "Ready", SERVED: "Served" };

  const flow: KitchenStatus[] = ["NEW", "PREPARING", "READY", "SERVED"];
  const currentIndex = flow.indexOf(order.status);

  return flow.slice(0, currentIndex + 1).map((status, index) => ({
    status,
    label: labels[status],
    at: index === 0 ? order.createdAt : order.updatedAt,
    isCurrent: status === order.status,
  }));
}

function KdsOrderCard({
  order,
  language,
  onSelect,
}: {
  order: KitchenOrder;
  language: string;
  onSelect: (order: KitchenOrder) => void;
}) {
  const isAr = language === "ar";
  const { mins, level } = getUrgency(order.createdAt, order.status);
  const previewItems = order.items.slice(0, 4);
  const hiddenCount = Math.max(0, order.items.length - previewItems.length);
  const hasUpdate = order.hasUpdateNotification;

  return (
    <button
      type="button"
      onClick={() => onSelect(order)}
      className={cn(
        "w-full rounded-2xl border bg-white p-4 text-start shadow-sm transition active:scale-[0.99]",
        "hover:border-slate-300 hover:shadow-md",
        hasUpdate && "border-blue-400 ring-2 ring-blue-200",
        level === "late" && !hasUpdate && "border-rose-300 bg-rose-50/40",
        level === "rush" && !hasUpdate && "border-amber-200",
        !hasUpdate && level === "normal" && "border-slate-200",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
              {orderTypeLabel(order.orderType, language)}
            </span>
            {order.tableName ? (
              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                {isAr ? "طاولة" : "Table"} {order.tableName}
              </span>
            ) : null}
            {hasUpdate ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">
                <LuBell className="h-3.5 w-3.5" />
                {isAr ? "تحديث" : "Updated"}
              </span>
            ) : null}
            {level === "late" ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white">
                <LuFlame className="h-3.5 w-3.5" />
                {isAr ? "متأخر" : "Late"}
              </span>
            ) : null}
          </div>
          <p className="truncate text-xl font-black tracking-tight text-slate-900">
            #{order.orderNumber}
          </p>
          {order.waiterName ? (
            <p className="truncate text-sm font-medium text-slate-500">
              {isAr ? "ويتر:" : "Waiter:"} {order.waiterName}
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl text-center",
            level === "late"
              ? "bg-rose-600 text-white"
              : level === "rush"
                ? "bg-amber-500 text-white"
                : "bg-slate-100 text-slate-800",
          )}
        >
          <LuClock className="mb-0.5 h-4 w-4 opacity-80" />
          <span className="text-lg font-black leading-none tabular-nums">{mins}</span>
          <span className="text-[10px] font-bold uppercase opacity-80">{isAr ? "د" : "min"}</span>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {previewItems.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-slate-900 text-base font-black text-white">
              {Math.floor(Number(item.quantity))}
            </span>
            <div className="min-w-0 flex-1">
              <p dir="auto" className="text-base font-semibold leading-snug text-slate-900">
                {item.itemName}
              </p>
              {item.notes ? (
                <p className="mt-0.5 text-sm text-slate-500">{item.notes}</p>
              ) : null}
            </div>
          </li>
        ))}
        {hiddenCount > 0 ? (
          <li className="ps-12 text-sm font-semibold text-slate-500">
            {isAr ? `+${hiddenCount} بنود إضافية` : `+${hiddenCount} more items`}
          </li>
        ) : null}
        {order.items.length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-500">
            {isAr ? "لا بنود" : "No items"}
          </li>
        ) : null}
      </ul>
    </button>
  );
}

function KdsOrderDrawer({
  order,
  language,
  isOpen,
  onClose,
  isUpdating,
  isPrinting,
  onAdvance,
  onDismissNotification,
  onPrint,
}: {
  order: KitchenOrder | null;
  language: string;
  isOpen: boolean;
  onClose: () => void;
  isUpdating: boolean;
  isPrinting: boolean;
  onAdvance: (orderId: string, status: KitchenStatus) => void;
  onDismissNotification: (orderId: string) => void;
  onPrint: (orderId: string) => void;
}) {
  const isAr = language === "ar";
  const { t } = useTranslation();

  if (!isOpen || !order || typeof document === "undefined") return null;

  const { mins, level } = getUrgency(order.createdAt, order.status);
  const next = nextOrderStatus(order.status);
  const timeline = buildStatusTimeline(order, language);

  const actionButtons: Array<{
    key: string;
    label: string;
    icon: React.ReactNode;
    className: string;
    onClick: () => void;
    show: boolean;
    disabled?: boolean;
  }> = [
    {
      key: "preparing",
      label: t("pos.kitchen.startPreparing"),
      icon: <LuPlay className="h-5 w-5" />,
      className: "bg-amber-500 hover:bg-amber-600",
      onClick: () => onAdvance(order.id, "PREPARING"),
      show: order.status === "NEW",
    },
    {
      key: "ready",
      label: t("pos.kitchen.markReady"),
      icon: <LuChefHat className="h-5 w-5" />,
      className: "bg-orange-500 hover:bg-orange-600",
      onClick: () => onAdvance(order.id, "READY"),
      show: order.status === "PREPARING",
    },
    {
      key: "served",
      label: t("pos.kitchen.markServed"),
      icon: <LuCheck className="h-5 w-5" />,
      className: "bg-emerald-600 hover:bg-emerald-700",
      onClick: () => onAdvance(order.id, "SERVED"),
      show: order.status === "READY",
    },
    {
      key: "print",
      label: t("pos.kitchen.printTicket"),
      icon: <LuPrinter className="h-5 w-5" />,
      className: "bg-slate-700 hover:bg-slate-800",
      onClick: () => onPrint(order.id),
      show: true,
      disabled: isPrinting,
    },
    {
      key: "dismiss",
      label: t("pos.kitchen.dismissNotification"),
      icon: <LuX className="h-5 w-5" />,
      className: "bg-blue-600 hover:bg-blue-700",
      onClick: () => onDismissNotification(order.id),
      show: order.hasUpdateNotification,
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[250] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label={t("pos.kitchen.closeDrawer")}
      />
      <aside
        className={cn(
          "relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl",
          "animate-in slide-in-from-right fade-in duration-200",
          "rtl:animate-in rtl:slide-in-from-left",
        )}
        role="dialog"
        aria-modal="true"
        aria-label={t("pos.kitchen.orderDetails")}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-500">{t("pos.kitchen.orderDetails")}</p>
            <h2 className="mt-1 truncate text-2xl font-black text-slate-900">#{order.orderNumber}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                {orderTypeLabel(order.orderType, language)}
              </span>
              {order.tableName ? (
                <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                  {isAr ? "طاولة" : "Table"} {order.tableName}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            <LuX className="h-6 w-6" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {t("pos.kitchen.placedAt")}
              </p>
              <p className="mt-1 text-lg font-black text-slate-900">
                {formatClockTime(order.createdAt, language)}
              </p>
              <p className="text-sm text-slate-500 tabular-nums">
                {mins} {isAr ? "دقيقة" : "min"}
              </p>
            </div>
            <div
              className={cn(
                "rounded-2xl p-4",
                level === "late"
                  ? "bg-rose-50 text-rose-900"
                  : level === "rush"
                    ? "bg-amber-50 text-amber-900"
                    : "bg-slate-50 text-slate-900",
              )}
            >
              <p className="text-xs font-bold uppercase tracking-wide opacity-70">
                {t("pos.kitchen.updatedAt")}
              </p>
              <p className="mt-1 text-lg font-black">{formatClockTime(order.updatedAt, language)}</p>
            </div>
          </div>

          {order.waiterName ? (
            <p className="mt-4 text-base font-semibold text-slate-700">
              {isAr ? "ويتر:" : "Waiter:"} {order.waiterName}
            </p>
          ) : null}

          {order.notes ? (
            <p className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              {order.notes}
            </p>
          ) : null}

          {order.hasUpdateNotification ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
              <LuBell className="h-5 w-5 shrink-0" />
              {t("pos.kitchen.cashierUpdated")}
            </div>
          ) : null}

          <div className="mt-6">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
              {t("pos.kitchen.statusHistory")}
            </h3>
            <ol className="mt-3 space-y-2">
              {timeline.map((step) => (
                <li
                  key={step.status}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold",
                    step.isCurrent ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600",
                  )}
                >
                  <span>{step.label}</span>
                  <span className="tabular-nums opacity-80">
                    {formatClockTime(step.at, language)}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">
              {isAr ? "البنود" : "Items"}
            </h3>
            <ul className="space-y-3">
              {order.items.map((item) => {
                const mods = formatModifiers(item.modifiers, language);
                return (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-slate-900 text-lg font-black text-white">
                        {Math.floor(Number(item.quantity))}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p dir="auto" className="text-base font-bold text-slate-900">
                          {item.itemName}
                          {mods ? (
                            <span className="font-semibold text-slate-500">
                              {language === "ar" ? " · " : ", "}
                              {mods}
                            </span>
                          ) : null}
                        </p>
                        {item.notes ? (
                          <p className="mt-1 text-sm italic text-slate-500">{item.notes}</p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="shrink-0 space-y-3 border-t border-slate-100 bg-white p-4">
          {next ? (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onAdvance(order.id, next)}
              className={cn(
                "flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-base font-black text-white disabled:opacity-50",
                order.status === "NEW"
                  ? "bg-amber-500"
                  : order.status === "PREPARING"
                    ? "bg-orange-500"
                    : "bg-emerald-600",
              )}
            >
              {order.status === "NEW" ? (
                <LuPlay className="h-5 w-5" />
              ) : order.status === "READY" ? (
                <LuCheck className="h-5 w-5" />
              ) : (
                <LuChefHat className="h-5 w-5" />
              )}
              {order.status === "NEW"
                ? t("pos.kitchen.startPreparing")
                : order.status === "PREPARING"
                  ? t("pos.kitchen.markReady")
                  : t("pos.kitchen.markServed")}
            </button>
          ) : null}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {actionButtons
              .filter((btn) => btn.show && btn.key !== "preparing" && btn.key !== "ready" && btn.key !== "served")
              .map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  disabled={btn.disabled || isUpdating}
                  onClick={btn.onClick}
                  className={cn(
                    "flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-white disabled:opacity-50",
                    btn.className,
                  )}
                >
                  {btn.icon}
                  {btn.label}
                </button>
              ))}
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

export function PosKitchenWorkspace({ embedded = false }: { embedded?: boolean }) {
  const { token } = useAuth();
  const { language, t } = useTranslation();
  const isAr = language === "ar";
  const queryClient = useQueryClient();
  const { kitchenMode, toggleKitchenMode } = useKdsMode();
  const boardRef = React.useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [showDone, setShowDone] = React.useState(false);
  const [rushOnly, setRushOnly] = React.useState(false);
  const [updatesOnly, setUpdatesOnly] = React.useState(false);
  const [mobileTab, setMobileTab] = React.useState<KitchenStatus>("NEW");
  const [selectedOrder, setSelectedOrder] = React.useState<KitchenOrder | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [printError, setPrintError] = React.useState<string | null>(null);

  const knownUpdateIdsRef = React.useRef<Set<string>>(new Set());
  const updateChimePrimedRef = React.useRef(false);

  const { data: orders = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: queryKeys.posKitchenOrders(token),
    queryFn: () => getPosKitchenOrders(token),
    enabled: Boolean(token),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { orderId: string; status: KitchenStatus }) =>
      updateKitchenOrderStatus(payload.orderId, payload.status, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posKitchenOrders(token) });
    },
  });

  const dismissNotificationMutation = useMutation({
    mutationFn: (orderId: string) => dismissKitchenOrderNotification(orderId, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posKitchenOrders(token) });
    },
  });

  const reprintMutation = useMutation({
    mutationFn: (orderId: string) => reprintKot(orderId, "KDS_REPRINT", token),
    onSuccess: async (_result, orderId) => {
      const order = orders.find((row) => row.id === orderId);
      if (!order) return;
      setPrintError(null);
      try {
        await printKitchenTicket(
          {
            reference: order.orderNumber,
            table: order.tableName ? { tableNumber: order.tableName } : null,
            waiter: order.waiterName ? { name: order.waiterName } : null,
            description: order.notes ?? null,
            lines: order.items.map((item, index) => ({
              id: item.id,
              lineNumber: index + 1,
              itemId: item.itemId,
              itemName: item.itemName,
              description: item.notes || item.itemName,
              quantity: item.quantity,
              modifiers: item.modifiers,
              kitchenSentAt: item.createdAt,
            })),
          } as PosSale,
          language,
        );
      } catch (error) {
        setPrintError(error instanceof Error ? error.message : String(error));
      }
    },
    onError: (error) => {
      setPrintError(error instanceof Error ? error.message : String(error));
    },
  });

  React.useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  React.useEffect(() => {
    if (!selectedOrder) return;
    const fresh = orders.find((row) => row.id === selectedOrder.id);
    if (fresh) setSelectedOrder(fresh);
  }, [orders, selectedOrder?.id]);

  const updateNotificationCount = React.useMemo(
    () => orders.filter((order) => order.hasUpdateNotification).length,
    [orders],
  );

  React.useEffect(() => {
    const activeIds = new Set(
      orders.filter((order) => order.hasUpdateNotification).map((order) => order.id),
    );
    if (!updateChimePrimedRef.current) {
      knownUpdateIdsRef.current = activeIds;
      updateChimePrimedRef.current = true;
      return;
    }
    let hasNew = false;
    for (const id of activeIds) {
      if (!knownUpdateIdsRef.current.has(id)) {
        hasNew = true;
        break;
      }
    }
    knownUpdateIdsRef.current = activeIds;
    if (hasNew) playKitchenUpdateChime();
  }, [orders]);

  const filteredOrders = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (!showDone && order.status === "SERVED") return false;
      if (updatesOnly && !order.hasUpdateNotification) return false;
      if (rushOnly && (order.status === "SERVED" || elapsedMinutes(order.createdAt) < 8)) {
        return false;
      }
      if (!q) return true;
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        (order.tableName?.toLowerCase().includes(q) ?? false) ||
        (order.waiterName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [orders, searchQuery, showDone, rushOnly, updatesOnly]);

  const ordersByStatus = React.useMemo(() => {
    const map: Record<KitchenStatus, KitchenOrder[]> = {
      NEW: [],
      PREPARING: [],
      READY: [],
      SERVED: [],
    };
    for (const order of filteredOrders) {
      map[order.status].push(order);
    }
    (Object.keys(map) as KitchenStatus[]).forEach((status) => {
      map[status] = sortKitchenOrders(map[status], status);
      if (status === "SERVED") map.SERVED = map.SERVED.slice(0, 30);
    });
    return map;
  }, [filteredOrders]);

  const activeCount = orders.filter((o) => o.status !== "SERVED").length;
  const readyCount = orders.filter((o) => o.status === "READY").length;
  const rushCount = orders.filter(
    (o) => o.status !== "SERVED" && elapsedMinutes(o.createdAt) >= 8,
  ).length;

  const boardColumns = React.useMemo(() => {
    const cols = [...MAIN_COLUMNS];
    if (showDone) cols.push(DONE_COLUMN);
    return cols;
  }, [showDone]);

  React.useEffect(() => {
    if (!showDone && mobileTab === "SERVED") {
      setMobileTab("NEW");
    }
  }, [showDone, mobileTab]);

  const toggleFullscreen = async () => {
    const node = boardRef.current;
    if (!node) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await node.requestFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by browser policy
    }
  };

  const handleAdvance = (orderId: string, status: KitchenStatus) => {
    updateStatusMutation.mutate(
      { orderId, status },
      {
        onSuccess: () => {
          if (status === "SERVED") setSelectedOrder(null);
        },
      },
    );
  };

  const renderColumnCards = (status: KitchenStatus, columnOrders: KitchenOrder[]) => (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
      {columnOrders.length === 0 ? (
        <div className="flex min-h-[10rem] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/80 px-4 py-10 text-center text-sm font-medium text-slate-500">
          {t("pos.kitchen.emptyColumn")}
        </div>
      ) : (
        columnOrders.map((order) => (
          <KdsOrderCard
            key={order.id}
            order={order}
            language={language}
            onSelect={setSelectedOrder}
          />
        ))
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-slate-100",
          embedded ? "h-full min-h-[50vh]" : "min-h-[calc(100vh-3rem)]",
          kitchenMode && "min-h-screen",
        )}
      >
        <PageSkeleton />
      </div>
    );
  }

  const board = (
    <div
      ref={boardRef}
      className={cn(
        "flex flex-col overflow-hidden bg-slate-100",
        embedded ? "h-full min-h-0" : kitchenMode ? "h-screen min-h-0" : "h-[calc(100vh-3rem)] min-h-0",
      )}
      dir={isAr ? "rtl" : "ltr"}
    >
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <LuChefHat className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-900 sm:text-2xl">
                {t("pos.kitchen.title")}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">{t("pos.kitchen.subtitle")}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t("pos.kitchen.activeCount")}
              </p>
              <p className="text-2xl font-black tabular-nums text-slate-900">{activeCount}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                {t("pos.kitchen.readyCount")}
              </p>
              <p className="text-2xl font-black tabular-nums text-emerald-800">{readyCount}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                {isAr ? "مستعجل" : "Rush"}
              </p>
              <p className="text-2xl font-black tabular-nums text-amber-800">{rushCount}</p>
            </div>
            <button
              type="button"
              onClick={toggleKitchenMode}
              className={cn(
                "flex min-h-[44px] items-center gap-2 rounded-xl border px-4 text-sm font-bold transition",
                kitchenMode
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {kitchenMode ? <LuMinimize2 className="h-4 w-4" /> : <LuMaximize2 className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {kitchenMode ? t("pos.kitchen.exitKitchenMode") : t("pos.kitchen.kitchenMode")}
              </span>
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              {isFullscreen ? (
                <LuMinimize2 className="h-4 w-4" />
              ) : (
                <LuMaximize2 className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isFullscreen ? t("pos.kitchen.exitFullScreen") : t("pos.kitchen.fullScreen")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800"
            >
              <LuRefreshCcw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              {t("pos.kitchen.refresh")}
            </button>
          </div>
        </div>
      </header>

      {updateNotificationCount > 0 ? (
        <div
          className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-blue-200 bg-blue-600 px-4 py-3 text-sm font-bold text-white sm:px-6"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <LuBell className="h-5 w-5 animate-bounce" />
            <span>
              {isAr
                ? `${updateNotificationCount} طلب معدّل — اضغط التذكرة ثم ✕`
                : `${updateNotificationCount} order(s) changed — open ticket, then dismiss with ✕`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setUpdatesOnly(true)}
            className="min-h-[40px] rounded-xl bg-white/20 px-4 text-sm font-bold hover:bg-white/30"
          >
            {t("pos.kitchen.filterUpdates")}
          </button>
        </div>
      ) : null}

      {printError ? (
        <div
          className="shrink-0 border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-900 sm:px-6"
          role="alert"
        >
          {printError}
        </div>
      ) : null}

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="relative min-w-[200px] flex-1 max-w-md">
          <LuSearch className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ltr:left-3 rtl:right-3" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("pos.kitchen.searchPlaceholder")}
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 text-base font-medium text-slate-900 ltr:pl-10 ltr:pr-4 rtl:pl-4 rtl:pr-10 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setRushOnly(false);
            setUpdatesOnly(false);
          }}
          className={cn(
            "min-h-[44px] rounded-xl px-4 text-sm font-bold transition",
            !rushOnly && !updatesOnly
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200",
          )}
        >
          {isAr ? "الكل" : "All"}
        </button>
        <button
          type="button"
          onClick={() => setUpdatesOnly((v) => !v)}
          className={cn(
            "inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-bold transition",
            updatesOnly ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600",
          )}
        >
          <LuBell className="h-4 w-4" />
          {t("pos.kitchen.filterUpdates")}
          {updateNotificationCount > 0 ? (
            <span className="rounded-full bg-white/25 px-2 tabular-nums">{updateNotificationCount}</span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setRushOnly((v) => !v)}
          className={cn(
            "min-h-[44px] rounded-xl px-4 text-sm font-bold transition",
            rushOnly ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600",
          )}
        >
          {t("pos.kitchen.rushFilter")}
        </button>
        <button
          type="button"
          onClick={() => setShowDone((v) => !v)}
          className={cn(
            "min-h-[44px] rounded-xl px-4 text-sm font-bold transition",
            showDone ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-600",
          )}
        >
          {t("pos.kitchen.showDone")}
        </button>
        <span className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-semibold text-slate-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {t("pos.kitchen.autoRefresh")}
        </span>
      </div>

      {/* Desktop: 3+ column grid */}
      <div
        className={cn(
          "hidden min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:grid",
          showDone ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        {boardColumns.map((col) => (
          <section
            key={col.status}
            className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-slate-50/80"
          >
            <header
              className={cn(
                "flex shrink-0 items-center justify-between rounded-t-2xl px-4 py-3.5 text-white",
                col.headerClass,
              )}
            >
              <h2 className="text-lg font-black">{t(col.labelKey)}</h2>
              <span className="rounded-xl bg-black/15 px-3 py-1 text-lg font-black tabular-nums">
                {ordersByStatus[col.status].length}
              </span>
            </header>
            {renderColumnCards(col.status, ordersByStatus[col.status])}
          </section>
        ))}
      </div>

      {/* Tablet: horizontal scroll columns */}
      <div className="hidden min-h-0 flex-1 overflow-x-auto overscroll-x-contain p-4 md:flex lg:hidden">
        <div className="flex min-h-full gap-4">
          {boardColumns.map((col) => (
            <section
              key={col.status}
              className="flex w-[min(100%,22rem)] shrink-0 flex-col rounded-2xl border border-slate-200/80 bg-slate-50/80"
            >
              <header
                className={cn(
                  "flex shrink-0 items-center justify-between rounded-t-2xl px-4 py-3.5 text-white",
                  col.headerClass,
                )}
              >
                <h2 className="text-lg font-black">{t(col.labelKey)}</h2>
                <span className="rounded-xl bg-black/15 px-3 py-1 text-lg font-black tabular-nums">
                  {ordersByStatus[col.status].length}
                </span>
              </header>
              <div className="max-h-[calc(100vh-16rem)] min-h-[20rem] flex-1 overflow-y-auto">
                {renderColumnCards(col.status, ordersByStatus[col.status])}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Mobile: status tabs */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-3">
          {boardColumns.map((col) => {
            const count = ordersByStatus[col.status].length;
            const active = mobileTab === col.status;
            return (
              <button
                key={col.status}
                type="button"
                onClick={() => setMobileTab(col.status)}
                className={cn(
                  "flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold transition",
                  active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600",
                )}
              >
                {t(col.labelKey)}
                <span
                  className={cn(
                    "rounded-lg px-2 py-0.5 text-xs tabular-nums",
                    active ? "bg-white/20" : "bg-white",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {renderColumnCards(mobileTab, ordersByStatus[mobileTab])}
        </div>
      </div>

      <KdsOrderDrawer
        order={selectedOrder}
        language={language}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        isUpdating={updateStatusMutation.isPending}
        isPrinting={reprintMutation.isPending}
        onAdvance={handleAdvance}
        onDismissNotification={(orderId) => dismissNotificationMutation.mutate(orderId)}
        onPrint={(orderId) => reprintMutation.mutate(orderId)}
      />
    </div>
  );

  if (embedded) return board;
  return <div className="-mx-0 w-full max-w-none">{board}</div>;
}

export function PosKitchenPage() {
  return <PosKitchenWorkspace />;
}
