"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { LuScanLine, LuSearch } from "react-icons/lu";

import { Card, Modal } from "@/components/ui";
import { Field, Input } from "@/components/ui/forms";
import {
  applyAmendEffectiveStockToCartLines,
  applyAmendEffectiveStockToCatalogItems,
  buildAmendReleasedQtyByItemIdRecord,
  buildSaleLinesPayload,
  consumeStashedAmendSale,
  consumeStashedHeldSale,
  formatCurrency,
  getCartLineKey,
  getErrorMessage,
  mapPosReceiptToPrintData,
  parseAmount,
  type PosMarketAmendSale,
} from "@/features/pos-market/pos-market-cart-utils";
import { PosMarketCartPanel } from "@/features/pos-market/pos-market-cart-panel";
import { PosMarketCheckoutModal } from "@/features/pos-market/pos-market-checkout-modal";
import { PosMarketDestinationPicker } from "@/features/pos-market/pos-market-destination-picker";
import { PosMarketOpenShiftPanel } from "@/features/pos-market/pos-market-open-shift-panel";
import {
  printMarketCustomerReceipt,
  reprintMarketCustomerReceipt,
  shouldAutoPrintReceiptOnPay,
} from "@/features/pos-market/pos-market-print-service";
import { PosMarketProductCard, type PosMarketSaleEntry } from "@/features/pos-market/pos-market-product-card";
import { PosMarketRegisterLayout } from "@/features/pos-market/pos-market-register-layout";
import { PosMarketSessionBar } from "@/features/pos-market/pos-market-session-bar";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { posProductGridClass } from "@/features/pos-shared";
import { usePosMarketCatalog } from "@/features/pos-market/use-pos-market-catalog";
import { usePosMarketCart } from "@/features/pos-market/use-pos-market-cart";
import { usePosMarketSession } from "@/features/pos-market/use-pos-market-session";
import { PosMarketWeightEntryModal } from "@/features/pos-market/pos-market-weight-entry-modal";
import { isWeightSaleItem } from "@/features/pos-market/pos-market-weight-utils";
import {
  amendPosMarketSale,
  completePosMarketSale,
  getBankCashAccounts,
  getDraftPosMarketSales,
  getHeldPosMarketSales,
  getPosMarketDestinationMarkets,
  getPosMarketSalesReps,
  getPosMarketSettings,
  getInventoryWarehouses,
  holdPosMarketSale,
  voidPosMarketSale,
} from "@/lib/api";
import { hasPermission, isMarketRepUser } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { getLocalizedText } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { InventoryItem } from "@/types/api";

const POS_MARKET_LAST_CUSTOMER_KEY = "pos-market-last-customer-id";

export function PosMarketRegisterWorkspace() {
  const { token, user, isHydrated } = useAuth();
  const { t, language } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [sessionForm, setSessionForm] = useState({
    terminalName: "Market-1",
    branchName: "Main Market",
    openingCash: "0",
  });
  const [search, setSearch] = useState("");
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [flashTone, setFlashTone] = useState<"success" | "error">("success");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [actualCashCount, setActualCashCount] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [weightModalItem, setWeightModalItem] = useState<InventoryItem | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [amendingSaleId, setAmendingSaleId] = useState<string | null>(null);
  const [amendingSaleLabel, setAmendingSaleLabel] = useState<string | null>(null);
  const [amendReleasedQtyByItemId, setAmendReleasedQtyByItemId] = useState<Record<string, number>>(
    {},
  );
  const [pendingAmendSale, setPendingAmendSale] = useState<PosMarketAmendSale | null>(null);
  const amendLoadHandledRef = useRef<string | null>(null);
  const [lastCompletedSale, setLastCompletedSale] = useState<{
    id: string;
    reference: string;
    customerName: string | null;
  } | null>(null);

  const session = usePosMarketSession(token);
  const activeSession = session.activeSession;
  const catalog = usePosMarketCatalog(token, activeSession?.salesRep?.id);

  const warehousesQuery = useQuery({
    queryKey: queryKeys.inventoryWarehouses(token ?? null, { isActive: "true" }),
    queryFn: () => getInventoryWarehouses({ isActive: "true" }, token),
    enabled: Boolean(token),
  });

  const paymentAccountsQuery = useQuery({
    queryKey: queryKeys.bankCashAccounts(token ?? null, { isActive: "true" }),
    queryFn: () => getBankCashAccounts({ isActive: "true" }, token),
    enabled: Boolean(token),
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.posMarketSettings(token ?? null),
    queryFn: () => getPosMarketSettings(token),
    enabled: Boolean(token),
  });

  const destinationMarketsQuery = useQuery({
    queryKey: queryKeys.posMarketDestinationMarkets(token ?? null),
    queryFn: () => getPosMarketDestinationMarkets(token),
    enabled: Boolean(token),
  });

  const salesRepsQuery = useQuery({
    queryKey: queryKeys.posMarketSalesReps(token ?? null),
    queryFn: () => getPosMarketSalesReps(token),
    enabled: Boolean(token) && isHydrated && !isMarketRepUser(user),
  });

  const paymentAccounts = paymentAccountsQuery.data ?? [];
  const destinationMarkets = destinationMarketsQuery.data ?? [];
  const selectedCustomer =
    destinationMarkets.find((customer) => customer.id === selectedCustomerId) ?? null;
  const hasDestinationMarket = Boolean(selectedCustomerId);
  const posSettings = settingsQuery.data ?? null;

  const cart = usePosMarketCart({
    sessionWarehouseId: activeSession?.warehouse?.id,
    paymentAccounts,
    posSettings,
    defaultCashAccountId: activeSession?.cashAccount?.id,
    amendReleasedQtyByItemId,
  });

  const catalogItemsForRegister = useMemo(
    () => applyAmendEffectiveStockToCatalogItems(catalog.items, amendReleasedQtyByItemId),
    [amendReleasedQtyByItemId, catalog.items],
  );

  const currencyCode = activeSession?.cashAccount?.currencyCode ?? "JOD";

  const pushMessage = useCallback((message: string, tone: "success" | "error" = "success") => {
    setFlashMessage(message);
    setFlashTone(tone);
    if (tone === "success") {
      window.setTimeout(() => setFlashMessage(null), 3600);
    }
  }, []);

  const persistSelectedCustomer = useCallback((customerId: string | null) => {
    setSelectedCustomerId(customerId);
    try {
      if (customerId) {
        sessionStorage.setItem(POS_MARKET_LAST_CUSTOMER_KEY, customerId);
      } else {
        sessionStorage.removeItem(POS_MARKET_LAST_CUSTOMER_KEY);
      }
    } catch {
      // ignore storage failures
    }
  }, []);

  useEffect(() => {
    if (!activeSession || destinationMarkets.length === 0 || selectedCustomerId) return;
    try {
      const savedId = sessionStorage.getItem(POS_MARKET_LAST_CUSTOMER_KEY);
      if (savedId && destinationMarkets.some((customer) => customer.id === savedId)) {
        setSelectedCustomerId(savedId);
      }
    } catch {
      // ignore storage failures
    }
  }, [activeSession, destinationMarkets, selectedCustomerId]);

  const allowCreditSale = Boolean(posSettings?.runtime.allowCreditSale);

  const completeSaleMutation = useMutation({
    mutationFn: (payLater: boolean) => {
      if (!activeSession) throw new Error("No active session");
      if (!selectedCustomerId) {
        throw new Error(t("posMarket.destination.requiredHint"));
      }
      const paymentPayload = payLater
        ? []
        : cart.paymentEntries
            .filter((entry) => entry.bankCashAccountId && parseAmount(entry.amount) > 0)
            .map((entry) => ({
              bankCashAccountId: entry.bankCashAccountId,
              amount: Number(parseAmount(entry.amount).toFixed(2)),
            }));

      if (!payLater && paymentPayload.length === 0) {
        throw new Error(t("posMarket.checkout.noPaymentAccount"));
      }

      if (
        !payLater &&
        cart.cartMetrics.amountDue > 0.009 &&
        !allowCreditSale
      ) {
        throw new Error(t("posMarket.checkout.insufficientPayment"));
      }

      const payload = {
        sessionId: activeSession.id,
        invoiceId: amendingSaleId ? undefined : cart.editingInvoiceId ?? undefined,
        customerId: selectedCustomerId,
        lines: buildSaleLinesPayload({
          cartLines: cart.cartLines,
          cartMetrics: cart.cartMetrics,
          taxPolicy: posSettings?.runtime.invoiceDiscountTaxPolicy,
          taxFreeEnabled: posSettings?.runtime.taxFreeEnabled,
        }),
        payments: paymentPayload,
      };

      if (amendingSaleId) {
        return amendPosMarketSale(amendingSaleId, payload, token);
      }

      return completePosMarketSale(payload, token);
    },
    onSuccess: async (response) => {
      const wasAmending = Boolean(amendingSaleId);
      if (shouldAutoPrintReceiptOnPay()) {
        try {
          await printMarketCustomerReceipt(
            mapPosReceiptToPrintData(response.receipt, {
              destinationMarketName: selectedCustomer?.name ?? response.sale.customer?.name ?? null,
              saleReference: response.sale.reference,
            }),
          );
        } catch {
          // printing failure should not block sale completion
        }
      }
      cart.clearCart();
      setAmendingSaleId(null);
      setAmendingSaleLabel(null);
      setAmendReleasedQtyByItemId({});
      setPendingAmendSale(null);
      setLastCompletedSale({
        id: response.sale.id,
        reference: response.sale.reference,
        customerName: selectedCustomer?.name ?? response.sale.customer?.name ?? null,
      });
      setIsCheckoutOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketActiveSession(token ?? null) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketCompletedSales(token ?? null) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketHeldSales(token ?? null, activeSession?.id ?? null) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketDraftSales(token ?? null, activeSession?.id ?? null) });
      void queryClient.invalidateQueries({
        queryKey: ["inventory-items", token],
      });
      if (activeSession?.salesRep?.id) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.posMarketCatalog(token ?? null, activeSession.salesRep.id),
        });
      }
      pushMessage(
        wasAmending ? t("posMarket.amend.success") : t("posMarket.checkout.success"),
      );
    },
    onError: (error) => {
      pushMessage(getErrorMessage(error, t("posMarket.checkout.error")), "error");
    },
  });

  const holdSaleMutation = useMutation({
    mutationFn: () => {
      if (!activeSession) throw new Error("No active session");
      if (!selectedCustomerId) {
        throw new Error(t("posMarket.destination.requiredHint"));
      }
      return holdPosMarketSale(
        {
          sessionId: activeSession.id,
          invoiceId: cart.editingInvoiceId ?? undefined,
          customerId: selectedCustomerId,
          lines: buildSaleLinesPayload({
            cartLines: cart.cartLines,
            cartMetrics: cart.cartMetrics,
            taxPolicy: posSettings?.runtime.invoiceDiscountTaxPolicy,
            taxFreeEnabled: posSettings?.runtime.taxFreeEnabled,
          }),
          payments: cart.paymentEntries
            .filter((entry) => entry.bankCashAccountId && parseAmount(entry.amount) > 0)
            .map((entry) => ({
              bankCashAccountId: entry.bankCashAccountId,
              amount: Number(parseAmount(entry.amount).toFixed(2)),
            })),
        },
        token,
      );
    },
    onSuccess: () => {
      cart.clearCart();
      void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketHeldSales(token ?? null, activeSession?.id ?? null) });
      pushMessage(t("posMarket.cart.holdSuccess"));
    },
    onError: (error) => {
      pushMessage(getErrorMessage(error, t("posMarket.cart.holdError")), "error");
    },
  });

  const voidSaleMutation = useMutation({
    mutationFn: (saleId: string) => voidPosMarketSale(saleId, {}, token),
    onSuccess: () => {
      cart.clearCart();
      pushMessage(t("pos.sales.voidSuccess"));
    },
    onError: (error) => {
      pushMessage(getErrorMessage(error, t("pos.sales.voidError")), "error");
    },
  });

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return catalogItemsForRegister;
    return catalogItemsForRegister.filter(
      (item) =>
        item.code.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term) ||
        item.barcode?.toLowerCase().includes(term),
    );
  }, [catalogItemsForRegister, search]);

  const addItemToCart = useCallback(
    (item: InventoryItem, entry?: PosMarketSaleEntry) => {
      if (!hasPermission(user, "POS_ADD_ITEM_TO_CART")) return;
      if (!activeSession) {
        pushMessage(t("pos.sales.alert.sessionClosed"), "error");
        return;
      }
      const result = entry
        ? cart.addItem(item, {
            quantity: entry.quantity,
            unitPrice: entry.unitPrice,
            discountType: entry.discountType,
            discountValue: entry.discountValue,
          })
        : cart.addItem(item);
      if (result === "STOCK_EXCEEDED") {
        pushMessage(t("pos.sales.alert.stockExceeded", { item: item.name }), "error");
      }
    },
    [activeSession, cart, pushMessage, t, user],
  );

  const handleSelectItem = useCallback(
    (item: InventoryItem) => {
      if (!hasPermission(user, "POS_ADD_ITEM_TO_CART")) return;
      if (!activeSession) {
        pushMessage(t("pos.sales.alert.sessionClosed"), "error");
        return;
      }
      if (isWeightSaleItem(item)) {
        setWeightModalItem(item);
        return;
      }
      addItemToCart(item);
    },
    [activeSession, addItemToCart, pushMessage, t, user],
  );

  const handleBarcodeSubmit = useCallback(() => {
    const term = search.trim();
    if (!term) return;
    const exact =
      catalogItemsForRegister.find((item) => item.barcode === term) ??
      catalogItemsForRegister.find((item) => item.code.toLowerCase() === term.toLowerCase());
    if (exact) {
      handleSelectItem(exact);
      setSearch("");
    }
  }, [catalogItemsForRegister, handleSelectItem, search]);

  useEffect(() => {
    const resumeId = searchParams.get("resume");
    if (!resumeId || !activeSession) return;
    const stashed = consumeStashedHeldSale(resumeId);
    if (stashed) {
      cart.loadHeldSale(stashed);
      if (stashed.customerId) {
        persistSelectedCustomer(stashed.customerId);
      }
      router.replace("/pos-market/register");
    }
  }, [activeSession, cart, persistSelectedCustomer, router, searchParams]);

  useEffect(() => {
    const amendId = searchParams.get("amend");
    if (!amendId || !activeSession) return;
    if (amendLoadHandledRef.current === amendId) return;

    const stashed = consumeStashedAmendSale(amendId);
    if (!stashed) return;

    amendLoadHandledRef.current = amendId;
    setPendingAmendSale(stashed);
    setAmendReleasedQtyByItemId(buildAmendReleasedQtyByItemIdRecord(stashed.cartLines));
    setAmendingSaleId(stashed.id);
    setAmendingSaleLabel(stashed.receiptNumber ?? stashed.reference);
    if (stashed.customerId) {
      persistSelectedCustomer(stashed.customerId);
    }
    router.replace("/pos-market/register");
  }, [activeSession, persistSelectedCustomer, router, searchParams]);

  useEffect(() => {
    if (!pendingAmendSale || catalog.isLoading) return;

    const releasedQty = buildAmendReleasedQtyByItemIdRecord(pendingAmendSale.cartLines);
    const cartLines = applyAmendEffectiveStockToCartLines(
      pendingAmendSale.cartLines,
      catalog.items,
      releasedQty,
    );
    cart.loadAmendSale({
      cartLines,
      invoiceDiscountType: pendingAmendSale.invoiceDiscountType,
      invoiceDiscountValue: pendingAmendSale.invoiceDiscountValue,
    });
    setPendingAmendSale(null);
  }, [cart.loadAmendSale, catalog.isLoading, catalog.items, pendingAmendSale]);

  const heldQuery = useQuery({
    queryKey: queryKeys.posMarketHeldSales(token ?? null, activeSession?.id ?? null),
    queryFn: () => getHeldPosMarketSales(activeSession!.id, token),
    enabled: Boolean(token && activeSession?.id),
  });

  const draftQuery = useQuery({
    queryKey: queryKeys.posMarketDraftSales(token ?? null, activeSession?.id ?? null),
    queryFn: () => getDraftPosMarketSales(activeSession!.id, token),
    enabled: Boolean(token && activeSession?.id),
  });

  const weightModalCatalogItem = useMemo(() => {
    if (!weightModalItem) return null;
    return catalogItemsForRegister.find((item) => item.id === weightModalItem.id) ?? weightModalItem;
  }, [catalogItemsForRegister, weightModalItem]);

  const cashierLabel = user?.name?.trim() || user?.email || "Cashier";

  if (session.isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center" style={{ backgroundColor: POS_MARKET_THEME.colors.pageSurface }}>
        <p className="text-sm font-semibold" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {t("posMarket.session.loading")}
        </p>
      </div>
    );
  }

  if (session.staleSession) {
    const stale = session.staleSession;
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4">
        <Card className="rounded-[32px] border border-[#d5deea] p-6 sm:p-8">
          <div className="mx-auto max-w-3xl space-y-6 text-center">
            <h1 className="text-2xl font-black arabic-heading" style={{ color: POS_MARKET_THEME.colors.text }}>
              {t("posMarket.session.staleTitle")}
            </h1>
            <p className="text-sm leading-7 arabic-auto" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
              {t("posMarket.session.staleDescription", { number: stale.sessionNumber })}
            </p>
            <button
              type="button"
              disabled={session.closeSessionMutation.isPending}
              onClick={() =>
                session.closeSessionMutation.mutate(
                  {
                    sessionId: stale.id,
                    actualCash: parseAmount(stale.expectedCash || stale.openingCash),
                    notes: "Closed legacy session before rep-car stock",
                  },
                  {
                    onSuccess: () => pushMessage(t("posMarket.session.closeSuccess")),
                    onError: (error) =>
                      pushMessage(getErrorMessage(error, t("posMarket.session.closeError")), "error"),
                  },
                )
              }
              className="rounded-xl px-6 py-3 text-sm font-black text-white disabled:opacity-50"
              style={{ backgroundColor: POS_MARKET_THEME.colors.primary }}
            >
              {t("posMarket.session.staleCloseAction")}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (!session.isOpen || !activeSession) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4">
        <Card className="rounded-[32px] border border-[#d5deea] p-6 sm:p-8">
          <div className="mx-auto max-w-3xl space-y-8">
            <div className="space-y-3 text-center">
              <div
                className="inline-flex items-center rounded-full border px-4 py-2 text-xs font-black tracking-[0.18em]"
                style={{
                  borderColor: POS_MARKET_THEME.colors.outline,
                  backgroundColor: POS_MARKET_THEME.colors.primarySoft,
                  color: POS_MARKET_THEME.colors.primary,
                }}
              >
                {t("posMarket.session.openTitle")}
              </div>
              <h1 className="text-3xl font-black tracking-tight arabic-heading" style={{ color: POS_MARKET_THEME.colors.text }}>
                {t("pos.sessions.openShiftAction")}
              </h1>
              <p className="text-sm leading-7 arabic-auto" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                {t("posMarket.session.openDescription")}
              </p>
            </div>
            <PosMarketOpenShiftPanel
              sessionState={sessionForm}
              cashierLabel={cashierLabel}
              warehouses={warehousesQuery.data ?? []}
              paymentAccounts={paymentAccounts}
              salesReps={salesRepsQuery.data ?? []}
              showSalesRepPicker={isHydrated && !isMarketRepUser(user)}
              lockedSalesRepId={isHydrated ? (user?.salesRepId ?? null) : null}
              canOpenShift={isHydrated && hasPermission(user, "POS_OPEN_SESSION")}
              onSessionStateChange={(patch) => setSessionForm((current) => ({ ...current, ...patch }))}
              onOpenSession={(openingCash, warehouseId, cashAccountId, salesRepId) => {
                session.openSessionMutation.mutate(
                  {
                    openingCash: parseAmount(openingCash),
                    warehouseId,
                    cashAccountId,
                    salesRepId,
                    terminalName: sessionForm.terminalName,
                    branchName: sessionForm.branchName || undefined,
                  },
                  {
                    onError: (error) =>
                      pushMessage(getErrorMessage(error, t("posMarket.session.openError")), "error"),
                  },
                );
              }}
              isPending={session.openSessionMutation.isPending}
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden" style={{ backgroundColor: POS_MARKET_THEME.colors.pageSurface }}>
      <PosMarketSessionBar
        session={activeSession}
        canCloseSession={hasPermission(user, "POS_CLOSE_OWN_SESSION")}
        isPending={session.closeSessionMutation.isPending}
        onCloseSession={() => {
          const blockDrafts =
            ((draftQuery.data?.length ?? 0) > 0 || (heldQuery.data?.length ?? 0) > 0) &&
            !posSettings?.runtime.allowCloseWithDrafts;
          if (blockDrafts) {
            pushMessage(t("posMarket.session.closeBlocked"), "error");
            return;
          }
          setActualCashCount("");
          setClosingNotes("");
          setIsCloseModalOpen(true);
        }}
      />

      {flashMessage ? (
        <div
          className={`mx-3 mt-2 rounded-xl border px-4 py-2 text-sm font-semibold ${
            flashTone === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{flashMessage}</span>
            {flashTone === "success" && lastCompletedSale && hasPermission(user, "POS_PRINT_RECEIPT") ? (
              <button
                type="button"
                onClick={() =>
                  void reprintMarketCustomerReceipt(lastCompletedSale.id, token, {
                    destinationMarketName: lastCompletedSale.customerName,
                    saleReference: lastCompletedSale.reference,
                  })
                }
                className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-800"
              >
                {t("posMarket.reprint.action")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {amendingSaleId ? (
        <div
          className="mx-3 mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm"
        >
          <span className="font-semibold text-amber-900">
            {t("posMarket.amend.banner", { invoice: amendingSaleLabel ?? amendingSaleId })}
          </span>
          <button
            type="button"
            onClick={() => {
              setAmendingSaleId(null);
              setAmendingSaleLabel(null);
              setAmendReleasedQtyByItemId({});
              setPendingAmendSale(null);
              amendLoadHandledRef.current = null;
              cart.clearCart();
            }}
            className="rounded-full border border-amber-300 px-3 py-1 text-xs font-bold text-amber-900"
          >
            {t("posMarket.amend.cancel")}
          </button>
        </div>
      ) : null}

      <div className="mx-3 mt-2 shrink-0 sm:mx-4">
        <PosMarketDestinationPicker
          customers={destinationMarkets}
          selectedCustomerId={selectedCustomerId}
          onSelect={persistSelectedCustomer}
          onClear={() => persistSelectedCustomer(null)}
          isLoading={destinationMarketsQuery.isLoading}
          isError={destinationMarketsQuery.isError}
          compact
        />
      </div>

      <PosMarketRegisterLayout
        catalog={
          <section className="flex h-full flex-col gap-3">
            <Card className="rounded-xl border border-[#d5deea] p-3 shadow-none">
              <Field label={t("pos.sales.barcodeSearch")} className="mb-0">
                <div className="relative">
                  <LuScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3" />
                  <Input
                    ref={searchInputRef}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleBarcodeSubmit();
                      }
                    }}
                    placeholder={t("pos.sales.barcodePlaceholder")}
                    className="h-10 rounded-lg py-2 pl-9 pr-3 text-sm rtl:pl-3 rtl:pr-9"
                    style={{ borderColor: POS_MARKET_THEME.colors.outline }}
                  />
                </div>
              </Field>
            </Card>

            <div className="min-h-0 flex-1 overflow-y-auto pb-3">
              {catalog.isLoading ? (
                <Card className="p-6 text-sm text-slate-500">{t("common.loading")}</Card>
              ) : catalog.isError ? (
                <Card className="p-6 text-sm text-red-600">{t("posMarket.catalogError")}</Card>
              ) : filteredItems.length === 0 ? (
                <Card className="flex flex-col items-center gap-2 p-8 text-sm text-slate-500">
                  <LuSearch className="h-8 w-8 opacity-40" />
                  {t("posMarket.catalogEmpty")}
                </Card>
              ) : (
                <div className={posProductGridClass}>
                  {filteredItems.map((item) => (
                    <PosMarketProductCard
                      key={item.id}
                      item={item}
                      currencyCode={currencyCode}
                      onSelectWeight={(selectedItem) => {
                        if (!hasPermission(user, "POS_ADD_ITEM_TO_CART")) return;
                        if (!activeSession) {
                          pushMessage(t("pos.sales.alert.sessionClosed"), "error");
                          return;
                        }
                        setWeightModalItem(selectedItem);
                      }}
                      onAdd={addItemToCart}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        }
        cart={
          <PosMarketCartPanel
            lines={cart.cartLines}
            metrics={cart.cartMetrics}
            currencyCode={currencyCode}
            canHold={hasPermission(user, "POS_HOLD_SALE")}
            canVoid={Boolean(cart.editingInvoiceId) && hasPermission(user, "POS_VOID_DRAFT_SALE")}
            canEditDiscount={hasPermission(user, "POS_COMPLETE_SALE")}
            invoiceDiscountType={cart.invoiceDiscountType}
            invoiceDiscountValue={cart.invoiceDiscountValue}
            setInvoiceDiscountType={cart.setInvoiceDiscountType}
            setInvoiceDiscountValue={cart.setInvoiceDiscountValue}
            onUpdateQuantity={cart.updateLineQuantity}
            onUpdateLineDiscount={cart.updateLineDiscount}
            onUpdateLineWeight={(lineKey, weight) => {
              const result = cart.updateLineWeight(lineKey, weight);
              if (result === "STOCK_EXCEEDED") {
                const line = cart.cartLines.find((row) => getCartLineKey(row) === lineKey);
                pushMessage(
                  t("pos.sales.alert.stockExceeded", { item: line?.name ?? "" }),
                  "error",
                );
              }
              return result;
            }}
            onRemoveLine={cart.removeLine}
            onHold={() => holdSaleMutation.mutate()}
            onVoid={() => cart.editingInvoiceId && voidSaleMutation.mutate(cart.editingInvoiceId)}
            onClear={cart.clearCart}
            onCheckout={() => {
              if (!hasDestinationMarket) {
                pushMessage(t("posMarket.destination.requiredHint"), "error");
                return;
              }
              cart.syncPaymentTotal();
              cart.ensureDefaultPayment(cart.cartMetrics.total);
              setIsCheckoutOpen(true);
            }}
            isCheckoutDisabled={!hasPermission(user, "POS_COMPLETE_SALE") || !hasDestinationMarket}
            isHoldDisabled={!hasDestinationMarket}
          />
        }
        mobileCartBar={{
          itemCount: cart.cartLines.length,
          totalLabel: formatCurrency(cart.cartMetrics.total, currencyCode),
          itemsLabel:
            cart.cartLines.length === 0
              ? getLocalizedText("No items / لا أصناف", language)
              : cart.cartLines.length === 1
                ? getLocalizedText("1 item / صنف واحد", language)
                : getLocalizedText(`${cart.cartLines.length} items / ${cart.cartLines.length} أصناف`, language),
          viewOrderLabel: getLocalizedText("View order / عرض الطلب", language),
          orderTitle: t("pos.sales.orderSummary"),
        }}
      />

      <PosMarketCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        metrics={cart.cartMetrics}
        paymentEntry={cart.paymentEntries[0] ?? null}
        currencyCode={currencyCode}
        isPending={completeSaleMutation.isPending}
        allowCreditSale={allowCreditSale}
        hasDestinationMarket={hasDestinationMarket}
        onPaymentMethodChange={cart.setSinglePaymentMethod}
        onAmountChange={cart.updatePaymentAmount}
        onComplete={() => completeSaleMutation.mutate(false)}
        onPayLater={() => completeSaleMutation.mutate(true)}
      />

      <PosMarketWeightEntryModal
        isOpen={Boolean(weightModalCatalogItem)}
        item={weightModalCatalogItem}
        language={language}
        currencyCode={currencyCode}
        onClose={() => setWeightModalItem(null)}
        onConfirm={(payload) => {
          if (!weightModalCatalogItem) return;
          const result = cart.addItem(weightModalCatalogItem, {
            weight: payload.weight,
            discountType: payload.discountType,
            discountValue: payload.discountValue,
          });
          if (result === "STOCK_EXCEEDED") {
            pushMessage(
              t("pos.sales.alert.stockExceeded", { item: weightModalCatalogItem.name }),
              "error",
            );
          }
          setWeightModalItem(null);
        }}
      />

      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => {
          setIsCloseModalOpen(false);
          setActualCashCount("");
          setClosingNotes("");
        }}
        title={getLocalizedText("Close shift / إغلاق الوردية", language)}
      >
        <div className="space-y-4">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={actualCashCount}
            onChange={(event) => setActualCashCount(event.target.value)}
            placeholder={t("posMarket.session.actualCashPlaceholder")}
            className="rounded-xl py-3"
          />
          <Input
            value={closingNotes}
            onChange={(event) => setClosingNotes(event.target.value)}
            placeholder={t("posMarket.session.closingNotesPlaceholder")}
            className="rounded-xl py-3"
          />
          <button
            type="button"
            disabled={
              !activeSession?.id ||
              session.closeSessionMutation.isPending ||
              actualCashCount.trim() === ""
            }
            onClick={() =>
              activeSession
                ? session.closeSessionMutation.mutate(
                    {
                      sessionId: activeSession.id,
                      actualCash: parseAmount(actualCashCount),
                      notes: closingNotes.trim() || undefined,
                    },
                    {
                      onSuccess: () => {
                        setIsCloseModalOpen(false);
                        pushMessage(t("posMarket.session.closeSuccess"));
                      },
                      onError: (error) => {
                        pushMessage(getErrorMessage(error, t("posMarket.session.closeError")), "error");
                      },
                    },
                  )
                : undefined
            }
            className="w-full rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            style={{ backgroundColor: POS_MARKET_THEME.colors.primary }}
          >
            {t("posMarket.session.confirmClose")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
