"use client";

import { useCallback, useMemo, useState } from "react";

import {
  computeCartMetrics,
  createLocalId,
  getCartLineKey,
  mapInventoryItemToCartLine,
  normalizePaymentAccountMethod,
  parseAmount,
  type PosMarketCartLine,
  type PosMarketPaymentEntry,
  type DiscountType,
} from "@/features/pos-market/pos-market-cart-utils";
import type { BankCashAccount, InventoryItem, PosSettings } from "@/types/api";

type UsePosMarketCartOptions = {
  sessionWarehouseId?: string | null;
  paymentAccounts: BankCashAccount[];
  posSettings?: PosSettings | null;
  defaultCashAccountId?: string | null;
};

export function usePosMarketCart({
  sessionWarehouseId,
  paymentAccounts,
  posSettings,
  defaultCashAccountId,
}: UsePosMarketCartOptions) {
  const [cartLines, setCartLines] = useState<PosMarketCartLine[]>([]);
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<DiscountType>("FIXED");
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState(0);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [paymentEntries, setPaymentEntries] = useState<PosMarketPaymentEntry[]>([]);

  const taxPolicy = posSettings?.runtime.invoiceDiscountTaxPolicy ?? "BEFORE_TAX";
  const taxFreeEnabled = Boolean(posSettings?.runtime.taxFreeEnabled);
  const negativeStockAllowed = Boolean(posSettings?.runtime.negativeStockAllowed);

  const resolveMappedBankCashAccountId = useCallback(
    (method: PosMarketPaymentEntry["paymentMethod"]) => {
      const mappedId =
        method === "CASH"
          ? posSettings?.accounts.cashAccountId
          : method === "CARD"
            ? posSettings?.accounts.cardAccountId
            : method === "CLIQ"
              ? posSettings?.accounts.cliqAccountId
              : method === "WALLET"
                ? posSettings?.accounts.walletAccountId
                : posSettings?.accounts.bankTransferAccountId;

      if (mappedId) {
        const account = paymentAccounts.find((row) => row.id === mappedId);
        if (account) return account.id;
      }

      const fallback =
        paymentAccounts.find(
          (account) => normalizePaymentAccountMethod(account) === method,
        ) ?? paymentAccounts[0];
      return fallback?.id ?? "";
    },
    [paymentAccounts, posSettings],
  );

  const ensureDefaultPayment = useCallback(
    (total = 0) => {
      const cashAccountId =
        defaultCashAccountId ??
        resolveMappedBankCashAccountId("CASH") ??
        paymentAccounts[0]?.id ??
        "";

      setPaymentEntries((current) => {
        if (current.length > 0) return current;
        return [
          {
            id: createLocalId(),
            paymentMethod: "CASH",
            bankCashAccountId: cashAccountId,
            amount: total > 0 ? total.toFixed(2) : "",
            reference: "",
          },
        ];
      });
    },
    [defaultCashAccountId, paymentAccounts, resolveMappedBankCashAccountId],
  );

  const paymentAmounts = useMemo(
    () => paymentEntries.map((entry) => parseAmount(entry.amount)),
    [paymentEntries],
  );

  const cartMetrics = useMemo(
    () =>
      computeCartMetrics({
        cartLines,
        invoiceDiscountType,
        invoiceDiscountValue,
        paymentAmounts,
        taxPolicy,
        taxFreeEnabled,
      }),
    [cartLines, invoiceDiscountType, invoiceDiscountValue, paymentAmounts, taxPolicy, taxFreeEnabled],
  );

  const addItem = useCallback(
    (
      item: InventoryItem,
      options?: {
        weight?: number;
        quantity?: number;
        unitPrice?: number;
        discountType?: DiscountType;
        discountValue?: number;
      },
    ): string | null => {
      const warehouseId = sessionWarehouseId ?? item.preferredWarehouseId ?? null;
      const sellByWeight = Boolean(item.allowFractionalQuantity);
      const onHand = parseAmount(item.onHandQuantity);
      const weight = options?.weight;
      const hasExplicitEntry =
        !sellByWeight && options?.quantity != null && options?.unitPrice != null;

      if (sellByWeight && (!weight || weight <= 0)) {
        return "WEIGHT_REQUIRED";
      }

      if (sellByWeight && item.trackInventory && !negativeStockAllowed && (weight ?? 0) > onHand) {
        return "STOCK_EXCEEDED";
      }

      const draftLine = mapInventoryItemToCartLine(item, warehouseId, weight);

      if (hasExplicitEntry) {
        const quantity = Math.max(1, Math.floor(options!.quantity!));
        const unitPrice = parseAmount(options!.unitPrice);
        draftLine.quantity = quantity;
        draftLine.unitPrice = unitPrice;
        draftLine.baseUnitPrice = unitPrice;
      }

      if (options?.discountType && parseAmount(options.discountValue) > 0) {
        draftLine.discountType = options.discountType;
        draftLine.discountValue = Math.max(0, parseAmount(options.discountValue));
        draftLine.clientLineId = createLocalId();
      }

      const hasLineDiscount = draftLine.discountValue > 0;

      if (!sellByWeight) {
        let stockExceeded = false;

        setCartLines((current) => {
          const existingIndex =
            hasExplicitEntry && !hasLineDiscount
              ? current.findIndex(
                  (line) =>
                    line.itemId === draftLine.itemId &&
                    !line.sellByWeight &&
                    line.unitPrice === draftLine.unitPrice &&
                    line.discountValue === 0,
                )
              : hasExplicitEntry || hasLineDiscount
                ? -1
                : current.findIndex(
                    (line) => getCartLineKey(line) === getCartLineKey(draftLine),
                  );

          const addQty = hasExplicitEntry ? draftLine.quantity : 1;

          if (existingIndex >= 0) {
            const line = current[existingIndex];
            const nextQty = line.quantity + addQty;
            if (item.trackInventory && !negativeStockAllowed && nextQty > line.onHandQuantity) {
              stockExceeded = true;
              return current;
            }
            return current.map((row, index) =>
              index === existingIndex ? { ...row, quantity: nextQty } : row,
            );
          }

          if (item.trackInventory && !negativeStockAllowed) {
            if (addQty > onHand || (!hasExplicitEntry && onHand <= 0)) {
              stockExceeded = true;
              return current;
            }
          }

          return [...current, draftLine];
        });

        if (stockExceeded) {
          return "STOCK_EXCEEDED";
        }
      } else {
        setCartLines((current) => [...current, draftLine]);
      }

      ensureDefaultPayment();
      return null;
    },
    [ensureDefaultPayment, negativeStockAllowed, sessionWarehouseId],
  );

  const updateLineQuantity = useCallback(
    (lineKey: string, quantity: number) => {
      if (quantity <= 0) {
        setCartLines((current) => current.filter((line) => getCartLineKey(line) !== lineKey));
        return;
      }
      setCartLines((current) =>
        current.map((line) => {
          if (getCartLineKey(line) !== lineKey) return line;
          if (line.trackInventory && !negativeStockAllowed && quantity > line.onHandQuantity) {
            return line;
          }
          return { ...line, quantity };
        }),
      );
    },
    [negativeStockAllowed],
  );

  const removeLine = useCallback((lineKey: string) => {
    setCartLines((current) => current.filter((line) => getCartLineKey(line) !== lineKey));
  }, []);

  const updateLineDiscount = useCallback(
    (lineKey: string, discountType: DiscountType, discountValue: number) => {
      setCartLines((current) =>
        current.map((line) => {
          if (getCartLineKey(line) !== lineKey) return line;
          return {
            ...line,
            discountType,
            discountValue: Math.max(0, discountValue),
          };
        }),
      );
    },
    [],
  );

  const updateLineWeight = useCallback(
    (lineKey: string, weight: number): string | null => {
      if (weight <= 0) {
        setCartLines((current) => current.filter((line) => getCartLineKey(line) !== lineKey));
        return null;
      }

      let stockExceeded = false;
      setCartLines((current) =>
        current.map((line) => {
          if (getCartLineKey(line) !== lineKey) return line;
          if (!line.sellByWeight) return line;
          if (line.trackInventory && !negativeStockAllowed && weight > line.onHandQuantity) {
            stockExceeded = true;
            return line;
          }
          return { ...line, quantity: weight };
        }),
      );

      return stockExceeded ? "STOCK_EXCEEDED" : null;
    },
    [negativeStockAllowed],
  );

  const clearCart = useCallback(() => {
    setCartLines([]);
    setInvoiceDiscountType("FIXED");
    setInvoiceDiscountValue(0);
    setEditingInvoiceId(null);
    setPaymentEntries([]);
  }, []);

  const loadHeldSale = useCallback(
    (sale: {
      id: string;
      cartLines: PosMarketCartLine[];
      paymentEntries: PosMarketPaymentEntry[];
      invoiceDiscountType: DiscountType;
      invoiceDiscountValue: number;
    }) => {
      setEditingInvoiceId(sale.id);
      setCartLines(sale.cartLines);
      setPaymentEntries(sale.paymentEntries);
      setInvoiceDiscountType(sale.invoiceDiscountType);
      setInvoiceDiscountValue(sale.invoiceDiscountValue);
    },
    [],
  );

  const setSinglePaymentMethod = useCallback(
    (method: PosMarketPaymentEntry["paymentMethod"]) => {
      setPaymentEntries((current) => {
        const firstEntry = current[0];
        return [
          {
            id: firstEntry?.id ?? createLocalId(),
            paymentMethod: method,
            bankCashAccountId: resolveMappedBankCashAccountId(method),
            amount: firstEntry?.amount?.trim() || cartMetrics.total.toFixed(2),
            reference: "",
          },
        ];
      });
    },
    [cartMetrics.total, resolveMappedBankCashAccountId],
  );

  const updatePaymentAmount = useCallback((amount: string) => {
    setPaymentEntries((current) => {
      const first = current[0];
      if (!first) {
        return current;
      }
      return [{ ...first, amount }];
    });
  }, []);

  const syncPaymentTotal = useCallback(() => {
    setPaymentEntries((current) => {
      const first = current[0];
      if (!first) return current;
      return [{ ...first, amount: cartMetrics.total.toFixed(2) }];
    });
  }, [cartMetrics.total]);

  return {
    cartLines,
    cartMetrics,
    paymentEntries,
    invoiceDiscountType,
    invoiceDiscountValue,
    editingInvoiceId,
    setInvoiceDiscountType,
    setInvoiceDiscountValue,
    addItem,
    updateLineQuantity,
    updateLineDiscount,
    updateLineWeight,
    removeLine,
    clearCart,
    loadHeldSale,
    setSinglePaymentMethod,
    updatePaymentAmount,
    syncPaymentTotal,
    ensureDefaultPayment,
    resolveMappedBankCashAccountId,
    setPaymentEntries,
  };
}
