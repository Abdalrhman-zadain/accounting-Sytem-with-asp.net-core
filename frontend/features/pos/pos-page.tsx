"use client";

import type { ComponentType } from "react";
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LuArrowRightLeft,
  LuBanknote,
  LuChartColumn,
  LuCreditCard,
  LuPackage,
  LuReceipt,
  LuRefreshCcw,
  LuSearch,
  LuSettings2,
  LuShoppingBasket,
  LuStore,
  LuTimerReset,
  LuWallet,
} from "react-icons/lu";

import { Card, PageShell } from "@/components/ui";
import { Field, Input } from "@/components/ui/forms";
import { getBankCashAccounts, getInventoryItems, getInventoryWarehouses } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { BankCashAccount, InventoryItem, InventoryWarehouse } from "@/types/api";
import { POS_THEME } from "./pos-theme";

type PosWorkspace = "sales" | "sessions" | "held" | "review" | "returns" | "reports" | "settings";

type WorkspaceTab = {
  id: PosWorkspace;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
};

type CartLine = {
  itemId: string;
  name: string;
  code: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  trackInventory: boolean;
  warehouseId?: string | null;
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
        <h1 className="text-3xl font-black tracking-tight text-[#233329] arabic-heading">{title}</h1>
        <p className="max-w-2xl text-base leading-8 text-[#596760] arabic-auto">{description}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[24px] border border-dashed border-[#c7d3cc] bg-[#f7faf7] p-5">
            <div className="text-sm font-bold text-[#233329] arabic-auto">UI shell ready</div>
            <div className="mt-2 text-sm leading-7 text-[#66756d] arabic-auto">Navigation entry is wired and this section can be implemented next without changing the sidebar structure.</div>
          </div>
          <div className="rounded-[24px] border border-dashed border-[#c7d3cc] bg-[#f7faf7] p-5">
            <div className="text-sm font-bold text-[#233329] arabic-auto">Route preserved</div>
            <div className="mt-2 text-sm leading-7 text-[#66756d] arabic-auto">The workspace already owns its `tab` route so future screens can land here cleanly.</div>
          </div>
          <div className="rounded-[24px] border border-dashed border-[#c7d3cc] bg-[#f7faf7] p-5">
            <div className="text-sm font-bold text-[#233329] arabic-auto">Backlog placeholder</div>
            <div className="mt-2 text-sm leading-7 text-[#66756d] arabic-auto">This view is intentionally left for the next POS increment.</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function PosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { t } = useTranslation();
  const [workspace, setWorkspace] = useState<PosWorkspace>("sales");
  const [isRouting, startRoutingTransition] = useTransition();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [selectedPaymentAccountId, setSelectedPaymentAccountId] = useState<string>("");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [sessionStatus, setSessionStatus] = useState<"open" | "closed">("open");
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const messageTimeoutRef = useRef<number | null>(null);

  const itemsQuery = useQuery({
    queryKey: queryKeys.inventoryItems(token, { isActive: "true", limit: 120 }),
    queryFn: () => getInventoryItems({ isActive: "true", limit: 120 }, token),
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

  const warehouses = warehousesQuery.data ?? [];
  const paymentAccounts = paymentAccountsQuery.data ?? [];
  const items = itemsQuery.data?.data ?? [];

  useEffect(() => {
    if (!selectedWarehouseId && warehouses.length > 0) {
      setSelectedWarehouseId(warehouses[0].id);
    }
  }, [selectedWarehouseId, warehouses]);

  useEffect(() => {
    if (!selectedPaymentAccountId && paymentAccounts.length > 0) {
      setSelectedPaymentAccountId(paymentAccounts[0].id);
    }
  }, [paymentAccounts, selectedPaymentAccountId]);

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  const categories = useMemo(() => {
    const values = Array.from(new Set(items.map((item) => getItemCategory(item)).filter(Boolean)));
    return ["all", ...values];
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = activeCategory === "all" || getItemCategory(item) === activeCategory;
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

  const selectedWarehouse = warehouses.find((warehouse) => warehouse.id === selectedWarehouseId) ?? null;
  const selectedPaymentAccount = paymentAccounts.find((account) => account.id === selectedPaymentAccountId) ?? null;
  const currencyCode = selectedPaymentAccount?.currencyCode || items[0]?.currencyCode || "JOD";
  const isCashPayment = selectedPaymentAccount?.type?.toUpperCase().includes("CASH") ?? false;

  const cartMetrics = useMemo(() => {
    const subtotal = cartLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const discount = cartLines.reduce((sum, line) => sum + line.discountAmount * line.quantity, 0);
    const taxableBase = cartLines.reduce((sum, line) => sum + Math.max(line.quantity * line.unitPrice - line.discountAmount * line.quantity, 0), 0);
    const tax = cartLines.reduce((sum, line) => {
      const lineNet = Math.max(line.quantity * line.unitPrice - line.discountAmount * line.quantity, 0);
      return sum + lineNet * (line.taxRate / 100);
    }, 0);
    const total = taxableBase + tax;
    const paid = isCashPayment ? parseAmount(cashTendered) : total;
    const change = Math.max(paid - total, 0);
    return { subtotal, discount, tax, total, paid, change };
  }, [cartLines, cashTendered, isCashPayment]);

  const selectWorkspace = (nextWorkspace: PosWorkspace) => {
    if (nextWorkspace === workspace) return;
    setWorkspace(nextWorkspace);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", nextWorkspace);
    startRoutingTransition(() => {
      router.replace(`/pos?${nextParams.toString()}`);
    });
  };

  const pushMessage = (message: string) => {
    setFlashMessage(message);
    if (messageTimeoutRef.current) {
      window.clearTimeout(messageTimeoutRef.current);
    }
    messageTimeoutRef.current = window.setTimeout(() => {
      setFlashMessage(null);
    }, 3200);
  };

  const addItemToCart = (item: InventoryItem) => {
    const taxRate = parseAmount(item.defaultTax?.rate);
    const warehouseId = item.preferredWarehouseId || selectedWarehouseId || null;
    setCartLines((current) => {
      const existingIndex = current.findIndex((line) => line.itemId === item.id);
      if (existingIndex >= 0) {
        return current.map((line, index) =>
          index === existingIndex ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }

      return [
        ...current,
        {
          itemId: item.id,
          name: item.name,
          code: item.code,
          unit: item.unitOfMeasure,
          quantity: 1,
          unitPrice: parseAmount(item.defaultSalesPrice),
          discountAmount: 0,
          taxRate,
          trackInventory: item.trackInventory,
          warehouseId,
        },
      ];
    });
  };

  const updateLine = (itemId: string, updater: (line: CartLine) => CartLine | null) => {
    setCartLines((current) =>
      current
        .map((line) => (line.itemId === itemId ? updater(line) : line))
        .filter(Boolean) as CartLine[],
    );
  };

  const resetSale = () => {
    setCartLines([]);
    setCashTendered("");
  };

  const completeSale = () => {
    if (sessionStatus !== "open") {
      pushMessage(t("pos.sales.alert.sessionClosed"));
      return;
    }
    if (cartLines.length === 0) {
      pushMessage(t("pos.sales.alert.emptyCart"));
      return;
    }
    if (isCashPayment && cartMetrics.paid < cartMetrics.total) {
      pushMessage(t("pos.sales.alert.insufficientPayment"));
      return;
    }
    pushMessage(t("pos.sales.alert.uiOnly"));
  };

  const posThemeReference = POS_THEME;

  const renderSalesWorkspace = () => {
    return (
      <div className="space-y-6" style={{ backgroundColor: posThemeReference.colors.pageSurface }}>
        <section
          className="overflow-hidden rounded-[32px] border border-[#d8dfda] shadow-[0_32px_100px_-55px_rgba(35,51,41,0.45)]"
          style={{
            borderColor: posThemeReference.colors.outline,
            background: posThemeReference.colors.heroGradient,
            boxShadow: posThemeReference.shadows.hero,
          }}
        >
          <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="rounded-full border bg-white/75 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em]"
                  style={{
                    borderColor: posThemeReference.colors.primaryBorderStrong,
                    color: posThemeReference.colors.primaryMuted,
                  }}
                >
                  {t("pos.sales.kicker")}
                </span>
                <span className={cn(
                  "rounded-full px-4 py-2 text-xs font-bold",
                  sessionStatus === "open" ? "bg-[#46644b] text-white" : "bg-[#ead7d5] text-[#7d3f38]",
                )}>
                  {sessionStatus === "open" ? t("pos.sales.sessionOpen") : t("pos.sales.sessionClosed")}
                </span>
              </div>
              <div className="space-y-3">
                <h1
                  className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl arabic-heading"
                  style={{ color: posThemeReference.colors.primaryDark }}
                >
                  {t("pos.sales.title")}
                </h1>
                <p className="max-w-3xl text-base leading-8 arabic-auto" style={{ color: posThemeReference.colors.textMuted }}>
                  {t("pos.sales.description")}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <SoftMetric label={t("pos.sales.metric.catalog")} value={formatCount(items.length)} hint={t("pos.sales.metric.catalogHint")} />
                <SoftMetric label={t("pos.sales.metric.warehouses")} value={formatCount(warehouses.length)} hint={selectedWarehouse?.name ?? t("pos.sales.metric.warehouseNotSelected")} />
                <SoftMetric label={t("pos.sales.metric.paymentMethods")} value={formatCount(paymentAccounts.length)} hint={selectedPaymentAccount?.name ?? t("pos.sales.metric.paymentNotSelected")} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <SessionCard
                sessionStatus={sessionStatus}
                warehouse={selectedWarehouse}
                paymentAccount={selectedPaymentAccount}
                onToggleSession={() => {
                  setSessionStatus((current) => (current === "open" ? "closed" : "open"));
                    pushMessage(
                      sessionStatus === "open"
                        ? t("pos.sales.alert.sessionMarkedClosed")
                        : t("pos.sales.alert.sessionMarkedOpen"),
                    );
                  }}
                t={t}
              />
              <ActionNotice message={flashMessage} t={t} />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <section className="space-y-5">
            <Card className="rounded-[28px] border-[#d7ddd8] bg-[#f9faf8] p-5 shadow-[0_18px_55px_-40px_rgba(40,64,48,0.45)]">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_240px]">
                <Field label={t("pos.sales.searchLabel")} className="mb-0">
                  <div className="relative">
                    <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#76867c] rtl:left-auto rtl:right-4" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
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
                <Field label={t("pos.sales.paymentLabel")} className="mb-0">
                  <select
                    value={selectedPaymentAccountId}
                    onChange={(event) => {
                      setSelectedPaymentAccountId(event.target.value);
                      setCashTendered("");
                    }}
                    className="w-full rounded-[20px] border border-[#d4ddd7] bg-white px-4 py-3 text-sm font-semibold text-[#233329] outline-none transition focus:border-[#46644b] focus:ring-4 focus:ring-[#46644b]/10"
                  >
                    {paymentAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
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

            {itemsQuery.isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-56 animate-pulse rounded-[28px] border border-[#dbe2dd] bg-[#eef3ef]" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <Card className="rounded-[28px] border-[#d7ddd8] bg-white/95 p-8 text-center shadow-[0_18px_55px_-40px_rgba(40,64,48,0.45)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3ef] text-[#46644b]">
                  <LuShoppingBasket className="h-6 w-6" />
                </div>
                <div className="mt-4 text-lg font-bold text-[#233329] arabic-heading">{t("pos.sales.emptyTitle")}</div>
                <p className="mt-2 text-sm leading-7 text-[#6a776f] arabic-auto">{t("pos.sales.emptyDescription")}</p>
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
                    <div className="text-lg font-black text-[#233329] arabic-heading">{t("pos.sales.cartTitle")}</div>
                    <div className="mt-1 text-sm text-[#6c7a72] arabic-auto">{t("pos.sales.cartSubtitle", { count: cartLines.length })}</div>
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

              <div className="max-h-[420px] space-y-3 overflow-y-auto px-5 py-5">
                {cartLines.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[#d0dad3] bg-[#f7faf8] px-5 py-8 text-center">
                    <div className="text-sm font-bold text-[#233329] arabic-auto">{t("pos.sales.cartEmptyTitle")}</div>
                    <p className="mt-2 text-sm leading-7 text-[#6c7a72] arabic-auto">{t("pos.sales.cartEmptyDescription")}</p>
                  </div>
                ) : (
                  cartLines.map((line) => (
                    <CartLineCard
                      key={line.itemId}
                      line={line}
                      currencyCode={currencyCode}
                      warehouse={warehouses.find((warehouse) => warehouse.id === line.warehouseId)}
                      onDecrement={() => updateLine(line.itemId, (current) => current.quantity > 1 ? { ...current, quantity: current.quantity - 1 } : null)}
                      onIncrement={() => updateLine(line.itemId, (current) => ({ ...current, quantity: current.quantity + 1 }))}
                      onRemove={() => updateLine(line.itemId, () => null)}
                      t={t}
                    />
                  ))
                )}
              </div>

              <div className="space-y-4 border-t border-[#e1e7e2] px-5 py-5">
                <div className="grid gap-3 rounded-[24px] bg-[#f4f7f4] p-4">
                  <TotalRow label={t("pos.sales.totalSubtotal")} value={formatCurrency(cartMetrics.subtotal, currencyCode)} />
                  <TotalRow label={t("pos.sales.totalDiscount")} value={formatCurrency(cartMetrics.discount, currencyCode)} />
                  <TotalRow label={t("pos.sales.totalTax")} value={formatCurrency(cartMetrics.tax, currencyCode)} />
                  <TotalRow
                    label={t("pos.sales.totalGrand")}
                    value={formatCurrency(cartMetrics.total, currencyCode)}
                    emphasized
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <PaymentPill
                    label={selectedPaymentAccount?.name ?? t("pos.sales.paymentLabel")}
                    icon={isCashPayment ? LuBanknote : LuCreditCard}
                    tone={isCashPayment ? "sage" : "stone"}
                  />
                  <PaymentPill
                    label={selectedWarehouse?.name ?? t("pos.sales.warehouseLabel")}
                    icon={LuPackage}
                    tone="stone"
                  />
                </div>

                {isCashPayment ? (
                  <Field label={t("pos.sales.cashTenderedLabel")} className="mb-0">
                    <Input
                      value={cashTendered}
                      onChange={(event) => setCashTendered(event.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="rounded-[20px] border-[#d4ddd7] bg-white py-3"
                    />
                  </Field>
                ) : null}

                <div className="grid gap-3 rounded-[24px] border border-[#dbe2dd] bg-white p-4">
                  <TotalRow label={t("pos.sales.totalPaid")} value={formatCurrency(cartMetrics.paid, currencyCode)} />
                  <TotalRow label={t("pos.sales.totalChange")} value={formatCurrency(cartMetrics.change, currencyCode)} emphasized={cartMetrics.change > 0} />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <SoftActionButton icon={LuReceipt} label={t("pos.sales.holdAction")} onClick={() => pushMessage(t("pos.sales.alert.holdPending"))} />
                  <SoftActionButton icon={LuRefreshCcw} label={t("pos.sales.voidAction")} onClick={() => {
                    resetSale();
                    pushMessage(t("pos.sales.alert.voidedDraft"));
                  }} />
                  <button
                    type="button"
                    onClick={completeSale}
                    className="inline-flex items-center justify-center rounded-[22px] bg-[#46644b] px-5 py-4 text-sm font-black text-white shadow-[0_20px_45px_-24px_rgba(70,100,75,0.95)] transition hover:-translate-y-0.5 hover:bg-[#3f5a44]"
                  >
                    {t("pos.sales.completeAction")}
                  </button>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    );
  };

  const renderWorkspace = () => {
    if (workspace === "sales") {
      return renderSalesWorkspace();
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

  return (
    <PageShell>
      {renderWorkspace()}
    </PageShell>
  );
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
      <div className="text-xs font-black uppercase tracking-[0.18em] text-[#718178]">{label}</div>
      <div className="mt-3 text-2xl font-black text-[#223228]">{value}</div>
      <div className="mt-2 text-sm leading-7 text-[#68766e] arabic-auto">{hint}</div>
    </div>
  );
}

function SessionCard({
  sessionStatus,
  warehouse,
  paymentAccount,
  onToggleSession,
  t,
}: {
  sessionStatus: "open" | "closed";
  warehouse: InventoryWarehouse | null;
  paymentAccount: BankCashAccount | null;
  onToggleSession: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div className="rounded-[28px] border border-[#dbe2dd] bg-white/92 p-5 shadow-[0_18px_48px_-36px_rgba(35,51,41,0.55)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#708078]">{t("pos.sales.sessionCard")}</div>
          <div className="mt-2 text-xl font-black text-[#223228] arabic-heading">{t("pos.sales.sessionTerminal")}</div>
        </div>
        <div className="rounded-full bg-[#eef3ef] p-3 text-[#46644b]">
          <LuWallet className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-5 space-y-3 text-sm text-[#55645c]">
        <DetailRow label={t("pos.sales.sessionWarehouse")} value={warehouse?.name ?? "—"} />
        <DetailRow label={t("pos.sales.sessionPayment")} value={paymentAccount?.name ?? "—"} />
        <DetailRow label={t("pos.sales.sessionStatus")} value={sessionStatus === "open" ? t("pos.sales.sessionOpen") : t("pos.sales.sessionClosed")} />
      </div>
      <button
        type="button"
        onClick={onToggleSession}
        className="mt-5 w-full rounded-[18px] border border-[#ccd7cf] bg-[#f7faf8] px-4 py-3 text-sm font-bold text-[#42564a] transition hover:border-[#b7c7bb] hover:bg-white"
      >
        {sessionStatus === "open" ? t("pos.sales.closeSessionAction") : t("pos.sales.openSessionAction")}
      </button>
    </div>
  );
}

function ActionNotice({
  message,
  t,
}: {
  message: string | null;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div className="rounded-[28px] border border-[#dbe2dd] bg-[#243229] p-5 text-white shadow-[0_24px_56px_-36px_rgba(36,50,41,0.9)]">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-[#b8ccb9]">{t("pos.sales.quickNote")}</div>
      <div className="mt-3 text-lg font-black arabic-heading">{message ?? t("pos.sales.quickNoteDefault")}</div>
      <p className="mt-3 text-sm leading-7 text-[#dbe7dd] arabic-auto">{t("pos.sales.quickNoteHint")}</p>
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
          <img src={item.itemImageUrl} alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
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
            <div className="text-lg font-black text-[#223228] arabic-heading">{item.name}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#76867c]">{item.code}</div>
          </div>
          <div className="text-base font-black text-[#46644b]">{formatCurrency(price, currencyCode)}</div>
        </div>
        <div className="flex items-center justify-between text-sm text-[#5f6d66]">
          <span className="arabic-auto">{item.unitOfMeasure}</span>
          <span className={cn(
            "rounded-full px-3 py-1 text-xs font-bold",
            item.trackInventory ? "bg-[#eef3ef] text-[#46644b]" : "bg-[#f2efec] text-[#746860]",
          )}>
            {item.trackInventory ? `${t("pos.sales.onHand")} ${formatCount(availableQty)}` : t("pos.sales.serviceItem")}
          </span>
        </div>
      </div>
    </button>
  );
}

function CartLineCard({
  line,
  warehouse,
  currencyCode,
  onIncrement,
  onDecrement,
  onRemove,
  t,
}: {
  line: CartLine;
  warehouse?: InventoryWarehouse;
  currencyCode: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const netLine = Math.max(line.quantity * line.unitPrice - line.discountAmount * line.quantity, 0);
  const grossLine = netLine + netLine * (line.taxRate / 100);

  return (
    <div className="rounded-[24px] border border-[#dde4df] bg-[#fbfcfb] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-[#223228] arabic-heading">{line.name}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#77867e]">{line.code}</div>
          <div className="mt-2 text-xs leading-6 text-[#617067] arabic-auto">
            {line.trackInventory ? `${warehouse?.name ?? "—"} · ${line.unit}` : t("pos.sales.serviceItem")}
          </div>
        </div>
        <button type="button" onClick={onRemove} className="text-xs font-bold text-[#8f5a55] transition hover:text-[#7d3f38]">
          {t("pos.sales.removeLine")}
        </button>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-3 rounded-full border border-[#d8dfda] bg-white px-3 py-2">
          <button type="button" onClick={onDecrement} className="h-7 w-7 rounded-full bg-[#eef3ef] text-[#46644b]">-</button>
          <span className="min-w-6 text-center text-sm font-black text-[#223228]">{line.quantity}</span>
          <button type="button" onClick={onIncrement} className="h-7 w-7 rounded-full bg-[#46644b] text-white">+</button>
        </div>
        <div className="text-right">
          <div className="text-xs text-[#74837b]">{formatCurrency(line.unitPrice, currencyCode)} / {line.unit}</div>
          <div className="mt-1 text-sm font-black text-[#223228]">{formatCurrency(grossLine, currencyCode)}</div>
        </div>
      </div>
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
    <div className={cn("flex items-center justify-between gap-4", emphasized ? "text-[#223228]" : "text-[#5f6d66]")}>
      <span className={cn("text-sm arabic-auto", emphasized && "font-bold")}>{label}</span>
      <span className={cn("text-sm font-black", emphasized && "text-lg")}>{value}</span>
    </div>
  );
}

function PaymentPill({
  label,
  icon: Icon,
  tone,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  tone: "sage" | "stone";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-[22px] border px-4 py-3",
        tone === "sage"
          ? "border-[#c9dbcd] bg-[#eff5f0] text-[#38513d]"
          : "border-[#ddd8d2] bg-[#f5f2ef] text-[#675d55]",
      )}
    >
      <div className="rounded-full bg-white/80 p-2 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <span className="truncate text-sm font-bold arabic-auto">{label}</span>
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
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#7b8b82]">{label}</span>
      <span className="text-sm font-semibold text-[#223228] arabic-auto">{value}</span>
    </div>
  );
}
