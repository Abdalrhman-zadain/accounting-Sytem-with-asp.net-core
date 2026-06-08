"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LuArrowLeft,
  LuChefHat,
  LuMinus,
  LuPlus,
  LuSearch,
  LuTrash2,
} from "react-icons/lu";

import { PageSkeleton } from "@/components/ui";
import { PosProductCard } from "@/features/pos/pos-product-card";
import type { PosItemAddonConfig, PosLineAddonSelection } from "@/features/pos/pos-addon-types";
import {
  buildModifiersPayload,
  formatAddonsForDisplay,
  getAddonsFromModifiers,
  sumAddonPrices,
} from "@/features/pos/pos-addon-utils";
import { PosLineAddonModal } from "@/features/pos/pos-line-addon-modal";
import {
  getActivePosSession,
  getDraftPosSales,
  getInventoryItems,
  getPosAddonCatalog,
  getPosItemAddonConfig,
  getPosTables,
  savePosDraft,
  sendPosSaleToKitchen,
} from "@/lib/api";
import { hasPermission } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { cn, getLocalizedText } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { InventoryItem, PosSale } from "@/types/api";

type WaiterCartLine = {
  salesInvoiceLineId?: string;
  kitchenSentAt?: string | null;
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  trackInventory: boolean;
  warehouseId?: string | null;
  salesAccountId?: string | null;
  onHandQuantity: number;
  modifiers?: import("@/features/pos/pos-addon-types").PosLineModifiersPayload | null;
  lineNote?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return fallback;
}

function parseAmount(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapSaleToCart(sale: PosSale): WaiterCartLine[] {
  return sale.lines.map((line) => ({
    salesInvoiceLineId: line.id,
    kitchenSentAt: line.kitchenSentAt ?? null,
    itemId: line.itemId ?? line.id,
    name: line.itemName ?? line.description ?? "Item",
    quantity: parseAmount(line.quantity),
    unitPrice: parseAmount(line.unitPrice),
    taxRate:
      parseAmount(line.lineSubtotalAmount) > 0
        ? (parseAmount(line.taxAmount) / parseAmount(line.lineSubtotalAmount)) * 100
        : 0,
    trackInventory: Boolean(line.item?.trackInventory),
    warehouseId: line.warehouse?.id ?? null,
    salesAccountId: line.revenueAccountId,
    onHandQuantity: 0,
    modifiers: (line.modifiers as WaiterCartLine["modifiers"]) ?? null,
    lineNote:
      line.description && line.description !== (line.itemName ?? "")
        ? line.description
        : "",
  }));
}

export function PosWaiterOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableId = searchParams.get("tableId");
  const { token, user } = useAuth();
  const { language, t } = useTranslation();
  const isAr = language === "ar";
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [cartLines, setCartLines] = React.useState<WaiterCartLine[]>([]);
  const [editingInvoiceId, setEditingInvoiceId] = React.useState<string | null>(null);
  const [waiterConfirmedAt, setWaiterConfirmedAt] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [orderNotes, setOrderNotes] = React.useState("");
  const [addonModalItem, setAddonModalItem] = React.useState<InventoryItem | null>(null);
  const [addonModalConfig, setAddonModalConfig] = React.useState<PosItemAddonConfig | null>(null);

  const sessionQuery = useQuery({
    queryKey: ["pos-active-session", token],
    queryFn: () => getActivePosSession(token),
    enabled: Boolean(token),
  });

  const tablesQuery = useQuery({
    queryKey: ["pos-tables", token],
    queryFn: () => getPosTables(token),
    enabled: Boolean(token),
  });

  const itemsQuery = useQuery({
    queryKey: ["waiter-items", token, sessionQuery.data?.warehouse.id],
    queryFn: () =>
      getInventoryItems(
        {
          warehouseId: sessionQuery.data?.warehouse.id,
          isActive: "true",
        },
        token,
      ),
    enabled: Boolean(token && sessionQuery.data?.warehouse.id),
  });

  const visibleItemIds = React.useMemo(
    () => (itemsQuery.data?.data ?? []).map((item) => item.id).filter(Boolean),
    [itemsQuery.data],
  );

  const visibleItemIdsKey = React.useMemo(
    () => [...visibleItemIds].sort().join(","),
    [visibleItemIds],
  );

  const addonCatalogQuery = useQuery({
    queryKey: ["waiter-addon-catalog", token, visibleItemIdsKey],
    queryFn: () => getPosAddonCatalog(visibleItemIds, token),
    enabled: Boolean(token && sessionQuery.data?.warehouse.id && visibleItemIds.length),
    staleTime: 30_000,
  });

  const draftsQuery = useQuery({
    queryKey: ["pos-drafts", token, sessionQuery.data?.id, tableId],
    queryFn: () => getDraftPosSales(sessionQuery.data!.id, token),
    enabled: Boolean(token && sessionQuery.data?.id && tableId),
  });

  const table = tablesQuery.data?.find((row) => row.id === tableId) ?? null;
  const isLocked = Boolean(waiterConfirmedAt);
  const canEdit = !isLocked;

  React.useEffect(() => {
    if (!tableId || !draftsQuery.data) {
      return;
    }
    const existing =
      draftsQuery.data.find((sale) => sale.tableId === tableId) ??
      draftsQuery.data.find((sale) => sale.heldContext?.isActiveTableOrder && sale.tableId === tableId);
    if (!existing) {
      return;
    }
    setEditingInvoiceId(existing.id);
    setWaiterConfirmedAt(existing.waiterConfirmedAt ?? null);
    setOrderNotes(existing.description ?? "");
    setCartLines(mapSaleToCart(existing));
  }, [draftsQuery.data, tableId]);

  const filteredItems = React.useMemo(() => {
    const items = itemsQuery.data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.barcode?.toLowerCase().includes(q) ?? false),
    );
  }, [itemsQuery.data, search]);

  const addonCatalogByItemId = React.useMemo(
    () =>
      new Map(
        (addonCatalogQuery.data?.items ?? []).map((itemConfig) => [
          itemConfig.itemId,
          itemConfig,
        ]),
      ),
    [addonCatalogQuery.data],
  );

  const currencyCode =
    sessionQuery.data?.cashAccount.currencyCode ??
    filteredItems[0]?.currencyCode ??
    "JOD";

  const buildLinesPayload = () =>
    cartLines.map((line) => {
      const subtotal = line.quantity * line.unitPrice;
      const taxAmount = subtotal * (line.taxRate / 100);
      return {
        salesInvoiceLineId: line.salesInvoiceLineId,
        itemId: line.itemId,
        warehouseId: line.trackInventory && line.warehouseId ? line.warehouseId : undefined,
        itemName: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountAmount: 0,
        taxAmount: Number(taxAmount.toFixed(2)),
        lineAmount: Number((subtotal + taxAmount).toFixed(2)),
        description: line.lineNote?.trim() || undefined,
        modifiers: line.modifiers ?? undefined,
        revenueAccountId: line.salesAccountId ?? undefined,
      };
    });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const session = sessionQuery.data;
      if (!session?.id) {
        throw new Error(isAr ? "لا توجد وردية مفتوحة" : "No open POS session.");
      }
      if (!tableId) {
        throw new Error(isAr ? "لم يتم اختيار طاولة" : "No table selected.");
      }
      if (cartLines.length === 0) {
        throw new Error(isAr ? "السلة فارغة" : "Cart is empty.");
      }
      const saved = await savePosDraft(
        {
          sessionId: session.id,
          invoiceId: editingInvoiceId ?? undefined,
          orderType: "DINE_IN",
          tableId,
          waiterId: user?.id,
          lines: buildLinesPayload(),
        },
        token,
      );
      return sendPosSaleToKitchen(saved.id, token);
    },
    onSuccess: async (sale) => {
      setEditingInvoiceId(sale.id);
      setWaiterConfirmedAt(sale.waiterConfirmedAt ?? new Date().toISOString());
      setCartLines(mapSaleToCart(sale));
      setNotice(isAr ? "تم تأكيد الطلب وإرساله للمطبخ" : "Order confirmed and sent to kitchen.");
      await queryClient.invalidateQueries({ queryKey: ["pos-drafts"] });
      await queryClient.invalidateQueries({ queryKey: ["pos-tables"] });
    },
    onError: (error) => {
      setNotice(getErrorMessage(error, isAr ? "فشل الإرسال" : "Send failed"));
    },
  });

  const appendLine = (
    item: InventoryItem,
    addons: PosLineAddonSelection[],
    lineNote: string,
  ) => {
    const unitPrice = parseAmount(item.defaultSalesPrice) + sumAddonPrices(addons);
    const modifiers = buildModifiersPayload(addons);
    setCartLines((current) => {
      const idx = current.findIndex(
        (line) =>
          line.itemId === item.id &&
          !line.kitchenSentAt &&
          JSON.stringify(line.modifiers) === JSON.stringify(modifiers) &&
          (line.lineNote ?? "") === lineNote,
      );
      if (idx >= 0) {
        return current.map((line, i) =>
          i === idx ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...current,
        {
          itemId: item.id,
          name: item.name,
          quantity: 1,
          unitPrice,
          taxRate: parseAmount(item.defaultTax?.rate),
          trackInventory: Boolean(item.trackInventory),
          warehouseId: item.preferredWarehouseId ?? sessionQuery.data?.warehouse.id ?? null,
          salesAccountId: item.salesAccount?.id ?? null,
          onHandQuantity: parseAmount(item.onHandQuantity),
          modifiers,
          lineNote,
        },
      ];
    });
  };

  const addItem = async (item: InventoryItem) => {
    if (!canEdit) {
      return;
    }
    if (!sessionQuery.data?.id) {
      setNotice(isAr ? "لا توجد وردية مفتوحة — اطلب من الكاشير فتح وردية" : "No open session — ask cashier to open shift.");
      return;
    }
    const cachedConfig = addonCatalogByItemId.get(item.id);
    if (cachedConfig) {
      setAddonModalItem(item);
      setAddonModalConfig(cachedConfig);
      return;
    }
    try {
      const config = await getPosItemAddonConfig(item.id, token);
      setAddonModalItem(item);
      setAddonModalConfig(config);
      return;
    } catch (error) {
      setNotice(getErrorMessage(error, isAr ? "تعذر تحميل الإضافات" : "Could not load add-ons."));
      setAddonModalItem(item);
      setAddonModalConfig({ itemId: item.id, groups: [] });
    }
  };

  const updateQty = (itemId: string, delta: number) => {
    if (!canEdit) {
      return;
    }
    setCartLines((current) =>
      current
        .map((line) => {
          if (line.itemId !== itemId || line.kitchenSentAt) {
            return line;
          }
          const next = line.quantity + delta;
          if (next <= 0) {
            return null;
          }
          return { ...line, quantity: next };
        })
        .filter(Boolean) as WaiterCartLine[],
    );
  };

  if (sessionQuery.isLoading || itemsQuery.isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
        <PageSkeleton />
      </div>
    );
  }

  if (!sessionQuery.data) {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm font-semibold text-[#506054]">
          {isAr
            ? "لا توجد وردية POS مفتوحة. اطلب من الكاشير فتح الوردية أولاً."
            : "No open POS session. Ask the cashier to open a shift first."}
        </p>
        <button
          type="button"
          onClick={() => router.push("/pos/waiter/tables")}
          className="rounded-xl bg-[#46644b] px-5 py-2.5 text-sm font-bold text-white"
        >
          {isAr ? "العودة للطاولات" : "Back to tables"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col bg-[#f4f7f5]" dir={isAr ? "rtl" : "ltr"}>
      <header className="border-b border-[#dde5df] bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/pos/waiter/tables")}
            className="flex items-center gap-2 rounded-xl border border-[#d6e1d9] px-3 py-2 text-sm font-bold text-[#233329]"
          >
            <LuArrowLeft className="h-4 w-4" />
            {isAr ? "الطاولات" : "Tables"}
          </button>
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wide text-[#68776f]">
              {isAr ? "طاولة" : "Table"}
            </div>
            <div className="text-xl font-black text-[#1a2a20]">
              {table?.tableNumber ?? "—"}
            </div>
          </div>
          {isLocked ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
              {isAr ? "في المطبخ" : "In kitchen"}
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
              {isAr ? "مسودة" : "Draft"}
            </span>
          )}
        </div>
      </header>

      {notice ? (
        <div className="border-b border-[#dde5df] bg-[#eef3ef] px-4 py-2 text-center text-sm font-semibold text-[#2d4a35]">
          {notice}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex min-h-0 flex-col border-b border-[#dde5df] lg:border-b-0 lg:border-e">
          <div className="border-b border-[#eef2ef] bg-white p-3">
            <div className="relative">
              <LuSearch className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8a80] ltr:left-3 rtl:right-3" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={!canEdit}
                placeholder={t("pos.sales.searchPlaceholder")}
                className="h-11 w-full rounded-2xl border border-[#d6e1d9] bg-[#f8faf9] text-sm font-semibold ltr:pl-10 ltr:pr-4 rtl:pl-4 rtl:pr-10"
              />
            </div>
          </div>
          <div className="grid flex-1 gap-3 overflow-y-auto p-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredItems.map((item) => (
              <PosProductCard
                key={item.id}
                item={item}
                currencyCode={currencyCode}
                disabled={!canEdit}
                allowNegativeStock
                onAdd={() => addItem(item)}
              />
            ))}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col bg-white">
          <div className="border-b border-[#eef2ef] px-4 py-3">
            <h2 className="text-sm font-black text-[#233329]">
              {getLocalizedText("Order / الطلب", language)}
            </h2>
          </div>
          <div className="border-b border-[#eef2ef] px-3 py-2">
            <label className="text-[10px] font-black uppercase text-[#7a8780]">
              {isAr ? "ملاحظة للمطبخ" : "Kitchen note"}
            </label>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              disabled={!canEdit}
              rows={2}
              className="mt-1 w-full rounded-lg border border-[#d6e1d9] px-2 py-1.5 text-sm disabled:opacity-60"
            />
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {cartLines.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#68776f]">
                {isAr ? "أضف أصنافاً من القائمة" : "Add items from the menu"}
              </p>
            ) : (
              cartLines.map((line) => (
                <div
                  key={`${line.itemId}-${line.salesInvoiceLineId ?? "new"}`}
                  className={cn(
                    "rounded-xl border px-3 py-2",
                    line.kitchenSentAt
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-[#eef2ef] bg-[#fafcfb]",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-[#233329]">{line.name}</div>
                      {formatAddonsForDisplay(line.modifiers, language) ? (
                        <p className="text-[10px] text-[#46644b]">
                          {formatAddonsForDisplay(line.modifiers, language)}
                        </p>
                      ) : null}
                      {line.lineNote ? (
                        <p className="text-[10px] italic text-amber-800">{line.lineNote}</p>
                      ) : null}
                      {line.kitchenSentAt ? (
                        <div className="mt-0.5 text-[10px] font-bold text-emerald-700">
                          {isAr ? "مرسل للمطبخ" : "Sent to kitchen"}
                        </div>
                      ) : null}
                    </div>
                    {!line.kitchenSentAt && canEdit ? (
                      <button
                        type="button"
                        onClick={() => updateQty(line.itemId, -999)}
                        className="text-rose-600"
                        aria-label="Remove"
                      >
                        <LuTrash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  {!line.kitchenSentAt && canEdit ? (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQty(line.itemId, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d6e1d9]"
                      >
                        <LuMinus className="h-4 w-4" />
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-black">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(line.itemId, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d6e1d9]"
                      >
                        <LuPlus className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 text-sm font-black text-[#506054]">× {line.quantity}</div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="border-t border-[#eef2ef] p-4">
            {canEdit && hasPermission(user, "RST_SEND_KOT") ? (
              <button
                type="button"
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending || cartLines.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#46644b] py-4 text-base font-black text-white shadow-md disabled:opacity-50"
              >
                <LuChefHat className="h-5 w-5" />
                {confirmMutation.isPending
                  ? isAr
                    ? "جاري الإرسال…"
                    : "Sending…"
                  : isAr
                    ? "تأكيد وإرسال للمطبخ"
                    : "Confirm & send to kitchen"}
              </button>
            ) : (
              <p className="text-center text-sm font-semibold text-[#68776f]">
                {isAr
                  ? "الطلب في المطبخ — التعديل والدفع من عند الكاشير فقط"
                  : "Order is in the kitchen — only the cashier can edit or take payment"}
              </p>
            )}
          </div>
        </aside>
      </div>

      <PosLineAddonModal
        isOpen={Boolean(addonModalItem)}
        itemName={addonModalItem?.name ?? ""}
        config={addonModalConfig}
        language={language}
        onClose={() => {
          setAddonModalItem(null);
          setAddonModalConfig(null);
        }}
        onConfirm={({ addons, lineNote }) => {
          if (addonModalItem) {
            appendLine(addonModalItem, addons, lineNote);
          }
          setAddonModalItem(null);
          setAddonModalConfig(null);
        }}
      />
    </div>
  );
}
