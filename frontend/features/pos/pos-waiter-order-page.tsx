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
import { posProductGridClass } from "@/features/pos/pos-layout-classes";
import { PosProductCard } from "@/features/pos/pos-product-card";
import type { PosItemAddonConfig, PosLineAddonSelection } from "@/features/pos/pos-addon-types";
import {
  buildModifiersPayload,
  buildCustomerReceiptItemName,
  formatAddonsForDisplay,
  getAddonsFromModifiers,
  getCartLineMergeKey,
  getEffectiveSaleQuantity,
  getPortionCountFromModifiers,
  restoreWeightLineQuantities,
  sumAddonPrices,
  withPortionMetadataInModifiers,
} from "@/features/pos/pos-addon-utils";
import { PosLineAddonModal } from "@/features/pos/pos-line-addon-modal";
import {
  formatPosLineQuantityDisplay,
  getMinSalesQuantity,
  getQuantityPrecision,
  isWeightSaleItem,
} from "@/features/pos/pos-weight-utils";
import {
  getActivePosSession,
  getDraftPosSales,
  getInventoryItems,
  getPosAddonCatalog,
  getPosItemAddonConfig,
  getPosTables,
  getPosWaiterOrders,
  reprintKot,
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
  unit?: string;
  sellByWeight?: boolean;
  quantityPrecision?: number;
  quantity: number;
  portionCount?: number;
  unitPrice: number;
  baseUnitPrice?: number;
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

function getCustomWeightPresets(item: Pick<InventoryItem, "code">) {
  if (item.code === "MENU-001") {
    return [
      {
        value: 0.125,
        labelAr: "آبوات عدد واحد",
        labelEn: "Aywat single piece",
      },
    ];
  }
  if (item.code === "MENU-006") {
    return [
      {
        value: 0.125,
        labelAr: "كرشات عدد واحد",
        labelEn: "Karshat single piece",
      },
    ];
  }
  return [];
}

function formatMoney(value: number, currency = "JOD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function computeLineMetrics(line: WaiterCartLine) {
  const addonTotal = sumAddonPrices(getAddonsFromModifiers(line.modifiers));
  const portions = line.sellByWeight
    ? (line.portionCount ?? getPortionCountFromModifiers(line.modifiers))
    : 1;
  const subtotal = line.sellByWeight
    ? (line.quantity * (line.baseUnitPrice ?? line.unitPrice) + addonTotal) * portions
    : line.quantity * line.unitPrice;
  const taxAmount = subtotal * (line.taxRate / 100);
  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    total: Number((subtotal + taxAmount).toFixed(2)),
  };
}

function computeCartMetrics(lines: WaiterCartLine[]) {
  return lines.reduce(
    (acc, line) => {
      const metrics = computeLineMetrics(line);
      acc.subtotal += metrics.subtotal;
      acc.tax += metrics.taxAmount;
      acc.total += metrics.total;
      const portions = line.sellByWeight
        ? (line.portionCount ?? getPortionCountFromModifiers(line.modifiers))
        : line.quantity;
      acc.itemCount += portions;
      return acc;
    },
    { subtotal: 0, tax: 0, total: 0, itemCount: 0 },
  );
}

function getWaiterCartLineKey(line: WaiterCartLine, index: number) {
  if (line.salesInvoiceLineId) {
    return line.salesInvoiceLineId;
  }
  return getCartLineMergeKey(line) || `${line.itemId}:${index}`;
}

function mapSaleToCart(sale: PosSale): WaiterCartLine[] {
  return sale.lines.map((line) => {
    const sellByWeight = Boolean(line.item?.allowFractionalQuantity);
    const quantityPrecision = line.item?.unitOfMeasureRef?.decimalPrecision ?? 3;
    const restored = sellByWeight
      ? restoreWeightLineQuantities(
          parseAmount(line.quantity),
          line.modifiers,
          quantityPrecision,
        )
      : { quantity: parseAmount(line.quantity), portionCount: 1 };

    return {
      salesInvoiceLineId: line.id,
      kitchenSentAt: line.kitchenSentAt ?? null,
      itemId: line.itemId ?? line.id,
      name: line.itemName ?? line.description ?? "Item",
      unit: line.item?.unitOfMeasure ?? "",
      sellByWeight,
      quantityPrecision,
      quantity: restored.quantity,
      portionCount: restored.portionCount,
      unitPrice: parseAmount(line.unitPrice),
      baseUnitPrice: sellByWeight
        ? parseAmount(line.unitPrice)
        : parseAmount(line.unitPrice) -
          sumAddonPrices(getAddonsFromModifiers(line.modifiers)),
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
    };
  });
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
  const canAddAfterConfirm = hasPermission(user, "POS_ADD_ITEM_AFTER_WAITER_CONFIRM");
  const canEdit = !isLocked;
  const canAddItems = canEdit || (isLocked && canAddAfterConfirm);
  const hasUnsentLines = cartLines.some((line) => !line.kitchenSentAt);
  const canSendToKitchen =
    (canEdit || (isLocked && canAddAfterConfirm && hasUnsentLines)) &&
    hasPermission(user, "RST_SEND_KOT");

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

  const cartMetrics = React.useMemo(() => computeCartMetrics(cartLines), [cartLines]);

  const buildLinesPayload = () =>
    cartLines.map((line) => {
      const metrics = computeLineMetrics(line);
      return {
        salesInvoiceLineId: line.salesInvoiceLineId,
        itemId: line.itemId,
        warehouseId: line.trackInventory && line.warehouseId ? line.warehouseId : undefined,
        itemName: line.name,
        quantity: getEffectiveSaleQuantity(line),
        unitPrice: line.sellByWeight ? (line.baseUnitPrice ?? line.unitPrice) : line.unitPrice,
        discountAmount: 0,
        taxAmount: metrics.taxAmount,
        lineAmount: metrics.total,
        description: line.lineNote?.trim() || undefined,
        modifiers: line.sellByWeight
          ? withPortionMetadataInModifiers(
              line.modifiers ?? null,
              line.portionCount ?? getPortionCountFromModifiers(line.modifiers),
              line.quantity,
            ) ?? undefined
          : line.modifiers ?? undefined,
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
      const sale = await sendPosSaleToKitchen(saved.id, token);
      return { sale };
    },
    onSuccess: async ({ sale }) => {
      setEditingInvoiceId(sale.id);
      setWaiterConfirmedAt(sale.waiterConfirmedAt ?? new Date().toISOString());
      setCartLines(mapSaleToCart(sale));
      setNotice(isAr ? "تم تأكيد الطلب وإرساله للمطبخ" : "Order confirmed and sent to kitchen.");
      try {
        const waiterOrders = await getPosWaiterOrders(token);
        const kitchenOrder = waiterOrders.find((row) => row.salesInvoiceId === sale.id);
        if (kitchenOrder) {
          await reprintKot(kitchenOrder.id, "WAITER_SEND", token);
        }
      } catch {
        // Audit reprint is best-effort; physical print is handled on the cashier PC hub
      }
      await queryClient.invalidateQueries({ queryKey: ["pos-drafts"] });
      await queryClient.invalidateQueries({ queryKey: ["pos-tables"] });
      await queryClient.invalidateQueries({ queryKey: ["pos-waiter-orders"] });
    },
    onError: (error) => {
      setNotice(getErrorMessage(error, isAr ? "فشل الإرسال" : "Send failed"));
    },
  });

  const appendLine = (
    item: InventoryItem,
    addons: PosLineAddonSelection[],
    lineNote: string,
    selectedWeight?: number | null,
  ) => {
    const sellByWeight = isWeightSaleItem(item);
    const quantity = sellByWeight ? (selectedWeight ?? 0) : 1;
    if (sellByWeight && quantity <= 0) {
      return;
    }
    const baseUnitPrice = parseAmount(item.defaultSalesPrice);
    const unitPrice = sellByWeight ? baseUnitPrice : baseUnitPrice + sumAddonPrices(addons);
    const modifiers = sellByWeight
      ? withPortionMetadataInModifiers(buildModifiersPayload(addons), 1, quantity)
      : buildModifiersPayload(addons);
    setCartLines((current) => {
      const draftLine: WaiterCartLine = {
        itemId: item.id,
        name: item.name,
        unit: item.unitOfMeasure,
        sellByWeight,
        quantityPrecision: getQuantityPrecision(item),
        quantity,
        portionCount: sellByWeight ? 1 : undefined,
        unitPrice,
        baseUnitPrice,
        taxRate: parseAmount(item.defaultTax?.rate),
        trackInventory: Boolean(item.trackInventory),
        warehouseId: item.preferredWarehouseId ?? sessionQuery.data?.warehouse.id ?? null,
        salesAccountId: item.salesAccount?.id ?? null,
        onHandQuantity: parseAmount(item.onHandQuantity),
        modifiers,
        lineNote,
      };

      if (sellByWeight) {
        const existingIndex = current.findIndex(
          (line) =>
            getCartLineMergeKey(line) === getCartLineMergeKey(draftLine) &&
            !line.kitchenSentAt,
        );
        if (existingIndex >= 0) {
          const line = current[existingIndex];
          const nextPortions = (line.portionCount ?? 1) + 1;
          return current.map((entry, index) =>
            index === existingIndex
              ? {
                  ...entry,
                  portionCount: nextPortions,
                  modifiers: withPortionMetadataInModifiers(
                    entry.modifiers ?? null,
                    nextPortions,
                    entry.quantity,
                  ),
                }
              : entry,
          );
        }
        return [...current, draftLine];
      }

      const idx = current.findIndex(
        (line) =>
          getCartLineMergeKey(line) === getCartLineMergeKey(draftLine) && !line.kitchenSentAt,
      );
      if (idx >= 0) {
        return current.map((line, i) =>
          i === idx ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, draftLine];
    });
  };

  const addItem = async (item: InventoryItem) => {
    if (!canAddItems) {
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

  const updateQty = (lineKey: string, delta: number) => {
    if (!canEdit && !(isLocked && canAddAfterConfirm)) {
      return;
    }
    setCartLines((current) =>
      current
        .map((line, index) => {
          if (line.kitchenSentAt) {
            return line;
          }
          if (getWaiterCartLineKey(line, index) !== lineKey) {
            return line;
          }
          if (line.sellByWeight) {
            const nextPortions = (line.portionCount ?? 1) + delta;
            if (nextPortions <= 0) {
              return null;
            }
            return {
              ...line,
              portionCount: nextPortions,
              modifiers: withPortionMetadataInModifiers(
                line.modifiers ?? null,
                nextPortions,
                line.quantity,
              ),
            };
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

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-0 waiter-wide:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] waiter-wide:grid-rows-none">
        <aside className="order-2 flex min-h-0 flex-col border-t border-[#dde5df] bg-white waiter-wide:order-2 waiter-wide:border-t-0 waiter-wide:border-s">
          <div className="shrink-0 border-b border-[#eef2ef] px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black text-[#233329]">
                {getLocalizedText("Order / الطلب", language)}
              </h2>
              <span className="rounded-full bg-[#eef3ef] px-2.5 py-0.5 text-xs font-black text-[#46644b]">
                {cartMetrics.itemCount}{" "}
                {isAr ? "صنف" : cartMetrics.itemCount === 1 ? "item" : "items"}
              </span>
            </div>
          </div>
          <div className="shrink-0 border-b border-[#eef2ef] px-3 py-2">
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
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {cartLines.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#68776f]">
                {isAr ? "أضف أصنافاً من القائمة" : "Add items from the menu"}
              </p>
            ) : (
              cartLines.map((line, index) => {
                const lineMetrics = computeLineMetrics(line);
                const lineKey = getWaiterCartLineKey(line, index);
                const portionCount =
                  line.portionCount ?? getPortionCountFromModifiers(line.modifiers);
                const canEditLine =
                  !line.kitchenSentAt && (canEdit || (isLocked && canAddAfterConfirm));
                return (
                  <div
                    key={`${line.itemId}-${line.salesInvoiceLineId ?? "new"}-${index}`}
                    className={cn(
                      "rounded-xl border px-3 py-2",
                      line.kitchenSentAt
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-[#eef2ef] bg-[#fafcfb]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-[#233329]">
                          {buildCustomerReceiptItemName(
                            line.name,
                            line.modifiers,
                            language,
                            line.unit ?? "",
                            line.sellByWeight ? line.quantity : null,
                          )}
                        </div>
                        {formatAddonsForDisplay(line.modifiers, language) ? (
                          <p className="text-[10px] text-[#46644b]">
                            {formatAddonsForDisplay(line.modifiers, language)}
                          </p>
                        ) : null}
                        {line.lineNote ? (
                          <p className="text-[10px] italic text-amber-800">{line.lineNote}</p>
                        ) : null}
                        <p className="mt-1 text-xs font-semibold text-[#506054]">
                          {portionCount} ×{" "}
                          {formatMoney(
                            line.sellByWeight ? (line.baseUnitPrice ?? line.unitPrice) : line.unitPrice,
                            currencyCode,
                          )}
                        </p>
                        {line.kitchenSentAt ? (
                          <div className="mt-0.5 text-[10px] font-bold text-emerald-700">
                            {isAr ? "مرسل للمطبخ" : "Sent to kitchen"}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-end">
                        <div className="text-sm font-black text-[#1a2a20]">
                          {formatMoney(lineMetrics.total, currencyCode)}
                        </div>
                        {!line.kitchenSentAt && canEditLine ? (
                          <button
                            type="button"
                            onClick={() => updateQty(lineKey, -999)}
                            className="mt-1 text-rose-600"
                            aria-label="Remove"
                          >
                            <LuTrash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {canEditLine ? (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQty(lineKey, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d6e1d9]"
                        >
                          <LuMinus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[2rem] text-center text-sm font-black">
                          {line.sellByWeight ? portionCount : line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(lineKey, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d6e1d9]"
                        >
                          <LuPlus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1 text-sm font-black text-[#506054]">
                        × {line.sellByWeight ? portionCount : line.quantity}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="shrink-0 border-t border-[#dde5df] bg-[#f8faf9] px-4 py-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-[#596760]">
                <span>{isAr ? "المجموع الفرعي" : "Subtotal"}</span>
                <span className="font-semibold">
                  {formatMoney(cartMetrics.subtotal, currencyCode)}
                </span>
              </div>
              {cartMetrics.tax > 0 ? (
                <div className="flex items-center justify-between text-[#596760]">
                  <span>{isAr ? "الضريبة" : "Tax"}</span>
                  <span className="font-semibold">
                    {formatMoney(cartMetrics.tax, currencyCode)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-[#dde5df] pt-2 text-base font-black text-[#1a2a20]">
                <span>{isAr ? "الإجمالي" : "Total"}</span>
                <span>{formatMoney(cartMetrics.total, currencyCode)}</span>
              </div>
            </div>
          </div>
          <div className="shrink-0 border-t border-[#eef2ef] p-4">
            {canSendToKitchen ? (
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
                  : isLocked
                    ? isAr
                      ? "إرسال الإضافات للمطبخ"
                      : "Send additions to kitchen"
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

        <section className="order-1 flex min-h-0 flex-col border-[#dde5df] waiter-wide:order-1 waiter-wide:border-e">
          <div className="border-b border-[#eef2ef] bg-white p-3">
            <div className="relative">
              <LuSearch className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8a80] ltr:left-3 rtl:right-3" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={!canAddItems}
                placeholder={t("pos.sales.searchPlaceholder")}
                className="h-11 w-full rounded-2xl border border-[#d6e1d9] bg-[#f8faf9] text-sm font-semibold ltr:pl-10 ltr:pr-4 rtl:pl-4 rtl:pr-10"
              />
            </div>
          </div>
          <div className={cn(posProductGridClass, "flex-1 overflow-y-auto p-3")}>
            {filteredItems.map((item) => (
              <PosProductCard
                key={item.id}
                item={item}
                variant="tablet"
                currencyCode={currencyCode}
                disabled={!canAddItems}
                allowNegativeStock
                onAdd={() => addItem(item)}
              />
            ))}
          </div>
        </section>
      </div>

      <PosLineAddonModal
        isOpen={Boolean(addonModalItem)}
        itemName={addonModalItem?.name ?? ""}
        config={addonModalConfig}
        language={language}
        weightSelection={
          addonModalItem && isWeightSaleItem(addonModalItem)
            ? {
                enabled: true,
                unitCode: addonModalItem.unitOfMeasure,
                precision: getQuantityPrecision(addonModalItem),
                minWeight:
                  addonModalItem.code === "MENU-001" || addonModalItem.code === "MENU-006"
                    ? 0.125
                    : getMinSalesQuantity(addonModalItem),
                pricePerUnit: parseAmount(addonModalItem.defaultSalesPrice),
                presets: getCustomWeightPresets(addonModalItem),
              }
            : undefined
        }
        onClose={() => {
          setAddonModalItem(null);
          setAddonModalConfig(null);
        }}
        onConfirm={({ addons, lineNote, selectedWeight }) => {
          if (addonModalItem) {
            appendLine(addonModalItem, addons, lineNote, selectedWeight);
          }
          setAddonModalItem(null);
          setAddonModalConfig(null);
        }}
      />
    </div>
  );
}
