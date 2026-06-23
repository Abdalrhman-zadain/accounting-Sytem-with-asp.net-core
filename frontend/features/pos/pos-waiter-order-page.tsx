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
import { PosRegisterMainGrid } from "@/features/pos-shared";
import {
  waiterProductGridClass,
  waiterOrderGridClass,
  waiterOrderCatalogClass,
  waiterOrderCartPanelClass,
  WAITER_REGISTER_THEME,
  posTouchButtonClass,
} from "@/features/pos-shared/pos-layout-classes";
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
  getHeldPosSales,
  getInventoryItemGroups,
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
import { useWaiterWideLayout } from "@/lib/hooks/use-viewport-breakpoints";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
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

function findOpenWaiterSale(
  drafts: PosSale[] | undefined,
  held: PosSale[] | undefined,
  tableId: string,
  resumeSaleId: string | null,
  activeInvoiceId?: string | null,
) {
  const openSales = [...(drafts ?? []), ...(held ?? [])];
  if (resumeSaleId) {
    const byResume = openSales.find((sale) => sale.id === resumeSaleId);
    if (byResume) {
      return byResume;
    }
  }
  const byTable = openSales.find((sale) => sale.tableId === tableId);
  if (byTable) {
    return byTable;
  }
  if (activeInvoiceId) {
    return openSales.find((sale) => sale.id === activeInvoiceId);
  }
  return undefined;
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
  const resumeSaleId = searchParams.get("resume");
  const { token, user } = useAuth();
  const { language, t } = useTranslation();
  const isAr = language === "ar";
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState("all");
  const [cartLines, setCartLines] = React.useState<WaiterCartLine[]>([]);
  const [editingInvoiceId, setEditingInvoiceId] = React.useState<string | null>(null);
  const [waiterConfirmedAt, setWaiterConfirmedAt] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [orderNotes, setOrderNotes] = React.useState("");
  const [addonModalItem, setAddonModalItem] = React.useState<InventoryItem | null>(null);
  const [addonModalConfig, setAddonModalConfig] = React.useState<PosItemAddonConfig | null>(null);
  const resumedOrderRef = React.useRef<string | null>(null);

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

  const itemGroupsQuery = useQuery({
    queryKey: queryKeys.inventoryItemGroups(token, { isActive: "true" }),
    queryFn: () => getInventoryItemGroups({ isActive: "true" }, token),
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

  const sessionId = sessionQuery.data?.id ?? null;

  const draftsQuery = useQuery({
    queryKey: queryKeys.posDraftSales(token, sessionId),
    queryFn: () => getDraftPosSales(sessionId!, token),
    enabled: Boolean(token && sessionId && tableId),
  });

  const heldQuery = useQuery({
    queryKey: queryKeys.posHeldSales(token, sessionId),
    queryFn: () => getHeldPosSales(sessionId!, token),
    enabled: Boolean(token && sessionId && tableId),
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
    if (!tableId || !draftsQuery.isSuccess || !heldQuery.isSuccess) {
      return;
    }
    const existing = findOpenWaiterSale(
      draftsQuery.data,
      heldQuery.data,
      tableId,
      resumeSaleId,
      table?.activeInvoice?.id,
    );
    const resumeKey = existing?.id ?? `new:${tableId}`;
    if (resumedOrderRef.current === resumeKey) {
      return;
    }
    resumedOrderRef.current = resumeKey;

    if (!existing) {
      setEditingInvoiceId(null);
      setWaiterConfirmedAt(null);
      setOrderNotes("");
      setCartLines([]);
      return;
    }

    setEditingInvoiceId(existing.id);
    setWaiterConfirmedAt(existing.waiterConfirmedAt ?? null);
    setOrderNotes(existing.description ?? "");
    setCartLines(mapSaleToCart(existing));
  }, [
    tableId,
    resumeSaleId,
    table?.activeInvoice?.id,
    draftsQuery.data,
    draftsQuery.isSuccess,
    heldQuery.data,
    heldQuery.isSuccess,
  ]);

  const filteredItems = React.useMemo(() => {
    const items = itemsQuery.data?.data ?? [];
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (activeCategory !== "all" && item.itemGroupId !== activeCategory) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.barcode?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [itemsQuery.data, search, activeCategory]);

  const catalogChips = React.useMemo(() => {
    const groups = itemGroupsQuery.data ?? [];
    return [
      { id: "all", name: isAr ? "الكل" : "All" },
      ...groups.map((group) => ({ id: group.id, name: group.name })),
    ];
  }, [itemGroupsQuery.data, isAr]);

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
  const unsentCartLines = React.useMemo(
    () => cartLines.filter((line) => !line.kitchenSentAt),
    [cartLines],
  );
  const sentCartLines = React.useMemo(
    () => cartLines.filter((line) => line.kitchenSentAt),
    [cartLines],
  );

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
      if (!hasUnsentLines) {
        throw new Error(isAr ? "لا توجد أصناف جديدة للإرسال" : "No new items to send.");
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.posDraftSales(token, sessionId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.posHeldSales(token, sessionId) });
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
    <div
      className="flex min-h-[calc(100dvh-env(safe-area-inset-bottom,0px))] flex-col bg-[#f4f7f5]"
      dir={isAr ? "rtl" : "ltr"}
    >
      <header className="border-b border-[#dde5df] bg-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-sm ltr:ps-14 rtl:pe-14">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/pos/waiter/tables")}
            className={cn(
              "flex items-center gap-2 rounded-xl border border-[#d6e1d9] px-3 py-2 text-sm font-bold text-[#233329]",
              posTouchButtonClass,
            )}
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

      <div className="flex min-h-0 flex-1 flex-col">
      <PosRegisterMainGrid
        gridClassName={waiterOrderGridClass}
        catalogClassName={waiterOrderCatalogClass}
        cartPanelClassName={cn(waiterOrderCartPanelClass, "border-t border-[#dde5df] bg-white waiter-wide:border-t-0")}
        useWideLayout={useWaiterWideLayout}
        narrowOnlyClassName="waiter-wide:hidden"
        salePanelShell={(children) => <>{children}</>}
        mobileCartBar={{
          itemCount: cartLines.length,
          totalLabel: formatMoney(cartMetrics.total, currencyCode),
          itemsLabel:
            cartLines.length === 0
              ? getLocalizedText("No items / لا أصناف", language)
              : cartLines.length === 1
                ? getLocalizedText("1 item / صنف واحد", language)
                : getLocalizedText(
                    `${cartLines.length} items / ${cartLines.length} أصناف`,
                    language,
                  ),
          viewOrderLabel: getLocalizedText("View order / عرض الطلب", language),
          orderTitle: getLocalizedText("Order / الطلب", language),
          theme: WAITER_REGISTER_THEME,
        }}
        catalog={
          <>
            <div className="shrink-0 border-b border-[#eef2ef] bg-white p-3">
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
              {catalogChips.length > 1 ? (
                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {catalogChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setActiveCategory(chip.id)}
                      className={cn(
                        "min-h-[32px] shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold transition",
                        activeCategory === chip.id
                          ? "border-[#46644b] bg-[#46644b] text-white"
                          : "border-[#d6e1d9] bg-[#f9fcfa] text-[#5b6e61] hover:border-[#bdd0c0] hover:bg-white",
                      )}
                    >
                      {chip.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className={cn(waiterProductGridClass, "min-h-0 flex-1 overflow-y-auto bg-[#f4f7f5] p-3")}>
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
          </>
        }
        salePanel={
          <>
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
                <>
                  {unsentCartLines.length > 0 ? (
                    <div className="space-y-2">
                      {isLocked ? (
                        <p className="text-[10px] font-black uppercase tracking-wide text-[#46644b]">
                          {isAr ? "إضافات جديدة" : "New additions"}
                        </p>
                      ) : null}
                      {unsentCartLines.map((line) => {
                        const lineIndex = cartLines.indexOf(line);
                        const lineMetrics = computeLineMetrics(line);
                        const lineKey = getWaiterCartLineKey(line, lineIndex);
                        const portionCount =
                          line.portionCount ?? getPortionCountFromModifiers(line.modifiers);
                        const canEditLine =
                          canEdit || (isLocked && canAddAfterConfirm);
                        return (
                          <div
                            key={`new-${line.itemId}-${line.salesInvoiceLineId ?? "new"}-${lineIndex}`}
                            className="rounded-xl border border-[#eef2ef] bg-[#fafcfb] px-3 py-2"
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
                                    line.sellByWeight
                                      ? (line.baseUnitPrice ?? line.unitPrice)
                                      : line.unitPrice,
                                    currencyCode,
                                  )}
                                </p>
                              </div>
                              <div className="shrink-0 text-end">
                                <div className="text-sm font-black text-[#1a2a20]">
                                  {formatMoney(lineMetrics.total, currencyCode)}
                                </div>
                                {canEditLine ? (
                                  <button
                                    type="button"
                                    onClick={() => updateQty(lineKey, -999)}
                                    className={cn(
                                      "mt-1 flex min-h-[44px] min-w-[44px] items-center justify-center text-rose-600",
                                      posTouchButtonClass,
                                    )}
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
                                  className={cn(
                                    "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#d6e1d9]",
                                    posTouchButtonClass,
                                  )}
                                >
                                  <LuMinus className="h-4 w-4" />
                                </button>
                                <span className="min-w-[2rem] text-center text-sm font-black">
                                  {line.sellByWeight ? portionCount : line.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQty(lineKey, 1)}
                                  className={cn(
                                    "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#d6e1d9]",
                                    posTouchButtonClass,
                                  )}
                                >
                                  <LuPlus className="h-4 w-4" />
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : isLocked && sentCartLines.length > 0 ? (
                    <p className="rounded-xl border border-dashed border-[#d6e1d9] bg-[#fafcfb] px-3 py-4 text-center text-sm text-[#68776f]">
                      {isAr
                        ? "أضف أصنافاً جديدة من القائمة أعلاه"
                        : "Add new items from the menu above"}
                    </p>
                  ) : null}
                  {sentCartLines.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wide text-emerald-800">
                        {isAr ? "مرسل للمطبخ — للعرض فقط" : "Sent to kitchen — view only"}
                      </p>
                      {sentCartLines.map((line) => {
                        const lineIndex = cartLines.indexOf(line);
                        const lineMetrics = computeLineMetrics(line);
                        const portionCount =
                          line.portionCount ?? getPortionCountFromModifiers(line.modifiers);
                        return (
                          <div
                            key={`sent-${line.itemId}-${line.salesInvoiceLineId ?? "sent"}-${lineIndex}`}
                            className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-2"
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
                                    line.sellByWeight
                                      ? (line.baseUnitPrice ?? line.unitPrice)
                                      : line.unitPrice,
                                    currencyCode,
                                  )}
                                </p>
                              </div>
                              <div className="shrink-0 text-end">
                                <div className="text-sm font-black text-[#1a2a20]">
                                  {formatMoney(lineMetrics.total, currencyCode)}
                                </div>
                              </div>
                            </div>
                            <div className="mt-1 text-sm font-black text-[#506054]">
                              × {line.sellByWeight ? portionCount : line.quantity}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </>
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
            <div className="shrink-0 border-t border-[#eef2ef] p-4 pb-[env(safe-area-inset-bottom,0px)]">
              {canSendToKitchen ? (
                <button
                  type="button"
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending || !hasUnsentLines}
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
              ) : canAddItems && isLocked && !hasUnsentLines ? (
                <p className="text-center text-sm font-semibold text-[#68776f]">
                  {isAr
                    ? "أضف أصنافاً جديدة من القائمة ثم أرسل للمطبخ"
                    : "Add new items from the menu, then send to kitchen"}
                </p>
              ) : (
                <p className="text-center text-sm font-semibold text-[#68776f]">
                  {isAr
                    ? "الطلب في المطبخ — التعديل والدفع من عند الكاشير فقط"
                    : "Order is in the kitchen — only the cashier can edit or take payment"}
                </p>
              )}
            </div>
          </>
        }
      />
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
