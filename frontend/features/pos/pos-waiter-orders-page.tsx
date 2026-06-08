"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LuCheck, LuClock, LuRefreshCcw, LuSearch, LuUtensils } from "react-icons/lu";

import { PageSkeleton } from "@/components/ui";
import { formatAddonsForDisplay } from "@/features/pos/pos-addon-utils";
import { getPosWaiterOrders, updateWaiterOrderStatus } from "@/lib/api";
import { hasPermission } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { KitchenOrder, WaiterFoodStatus } from "@/types/api";

const COLUMNS: Array<{
  status: WaiterFoodStatus;
  labelKey: string;
  headerClass: string;
}> = [
  {
    status: "WAITING",
    labelKey: "pos.waiterOrders.column.waiting",
    headerClass: "bg-amber-500",
  },
  {
    status: "RECEIVED",
    labelKey: "pos.waiterOrders.column.received",
    headerClass: "bg-blue-600",
  },
  {
    status: "DEPARTED",
    labelKey: "pos.waiterOrders.column.departed",
    headerClass: "bg-slate-600",
  },
];

function elapsedMinutes(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function formatClockTime(iso: string, language: string) {
  return new Date(iso).toLocaleTimeString(language === "ar" ? "ar-JO" : undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function nextWaiterStatus(current: WaiterFoodStatus): WaiterFoodStatus | null {
  if (current === "WAITING") return "RECEIVED";
  if (current === "RECEIVED") return "DEPARTED";
  return null;
}

function WaiterOrderCard({
  order,
  language,
  canUpdate,
  isUpdating,
  onAdvance,
}: {
  order: KitchenOrder;
  language: string;
  canUpdate: boolean;
  isUpdating: boolean;
  onAdvance: (orderId: string, status: WaiterFoodStatus) => void;
}) {
  const isAr = language === "ar";
  const mins = elapsedMinutes(order.createdAt);
  const next = nextWaiterStatus(order.waiterStatus ?? "WAITING");
  const previewItems = order.items.slice(0, 4);
  const hiddenCount = Math.max(0, order.items.length - previewItems.length);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {order.tableName ? (
              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                {isAr ? "طاولة" : "Table"} {order.tableName}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
              <LuClock className="h-3.5 w-3.5" />
              {mins} {isAr ? "د" : "m"}
            </span>
          </div>
          <p className="truncate text-lg font-black text-slate-900">#{order.orderNumber}</p>
          {order.waiterName ? (
            <p className="truncate text-sm text-slate-500">
              {isAr ? "ويتر:" : "Waiter:"} {order.waiterName}
            </p>
          ) : null}
        </div>
        <div className="text-end text-xs font-semibold text-slate-500">
          {formatClockTime(order.createdAt, language)}
        </div>
      </div>

      <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
        {previewItems.map((item) => (
          <li key={item.id} className="text-sm text-slate-700">
            <span className="font-bold tabular-nums">{Number(item.quantity)}×</span> {item.itemName}
            {formatAddonsForDisplay(item.modifiers, language) ? (
              <span className="block text-xs text-slate-500">
                {formatAddonsForDisplay(item.modifiers, language)}
              </span>
            ) : null}
          </li>
        ))}
        {hiddenCount > 0 ? (
          <li className="text-xs font-semibold text-slate-400">
            +{hiddenCount} {isAr ? "أصناف" : "more items"}
          </li>
        ) : null}
      </ul>

      {canUpdate && next ? (
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onAdvance(order.id, next)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#46644b] py-3 text-sm font-black text-white disabled:opacity-50"
        >
          <LuCheck className="h-4 w-4" />
          {next === "RECEIVED"
            ? isAr
              ? "تم الاستلام"
              : "Mark received"
            : isAr
              ? "مغادرة"
              : "Mark departed"}
        </button>
      ) : null}
    </article>
  );
}

export function PosWaiterOrdersPage() {
  const { token, user } = useAuth();
  const { language, t } = useTranslation();
  const isAr = language === "ar";
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [mobileTab, setMobileTab] = React.useState<WaiterFoodStatus>("WAITING");
  const canUpdate = hasPermission(user, "RST_UPDATE_WAITER_ORDER_STATUS");

  const { data: orders = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: queryKeys.posWaiterOrders(token),
    queryFn: () => getPosWaiterOrders(token),
    enabled: Boolean(token),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { orderId: string; status: WaiterFoodStatus }) =>
      updateWaiterOrderStatus(payload.orderId, payload.status, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posWaiterOrders(token) });
      queryClient.invalidateQueries({ queryKey: ["pos-tables"] });
    },
  });

  const filteredOrders = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (!q) return true;
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        (order.tableName?.toLowerCase().includes(q) ?? false) ||
        (order.waiterName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [orders, searchQuery]);

  const ordersByStatus = React.useMemo(() => {
    const map: Record<WaiterFoodStatus, KitchenOrder[]> = {
      WAITING: [],
      RECEIVED: [],
      DEPARTED: [],
    };
    for (const order of filteredOrders) {
      const status = order.waiterStatus ?? "WAITING";
      map[status].push(order);
    }
    (Object.keys(map) as WaiterFoodStatus[]).forEach((status) => {
      map[status] = [...map[status]].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    });
    return map;
  }, [filteredOrders]);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center bg-slate-100">
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#46644b]/10 text-[#46644b]">
              <LuUtensils className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">
                {t("pos.waiterOrders.title")}
              </h1>
              <p className="text-sm text-slate-500">{t("pos.waiterOrders.subtitle")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <LuSearch className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("pos.waiterOrders.searchPlaceholder")}
                className="w-full rounded-xl border border-slate-200 py-2.5 ps-9 pe-3 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
            >
              <LuRefreshCcw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              {isAr ? "تحديث" : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      <div className="hidden flex-1 gap-4 overflow-hidden p-4 lg:grid lg:grid-cols-3">
        {COLUMNS.map((column) => (
          <section
            key={column.status}
            className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80"
          >
            <div
              className={cn(
                "flex items-center justify-between px-4 py-3 text-sm font-black text-white",
                column.headerClass,
              )}
            >
              <span>{t(column.labelKey)}</span>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 tabular-nums">
                {ordersByStatus[column.status].length}
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              {ordersByStatus[column.status].length === 0 ? (
                <div className="flex min-h-[8rem] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/80 px-4 text-center text-sm text-slate-500">
                  {t("pos.waiterOrders.emptyColumn")}
                </div>
              ) : (
                ordersByStatus[column.status].map((order) => (
                  <WaiterOrderCard
                    key={order.id}
                    order={order}
                    language={language}
                    canUpdate={canUpdate}
                    isUpdating={updateStatusMutation.isPending}
                    onAdvance={(orderId, status) =>
                      updateStatusMutation.mutate({ orderId, status })
                    }
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {COLUMNS.map((column) => (
            <button
              key={column.status}
              type="button"
              onClick={() => setMobileTab(column.status)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-bold",
                mobileTab === column.status
                  ? "bg-[#46644b] text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200",
              )}
            >
              {t(column.labelKey)} ({ordersByStatus[column.status].length})
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {ordersByStatus[mobileTab].map((order) => (
            <WaiterOrderCard
              key={order.id}
              order={order}
              language={language}
              canUpdate={canUpdate}
              isUpdating={updateStatusMutation.isPending}
              onAdvance={(orderId, status) =>
                updateStatusMutation.mutate({ orderId, status })
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
