"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  LuCalendarDays as CalendarDays,
  LuCirclePlus as CirclePlus,
  LuFileText as FileText,
  LuPackage2 as Package2,
  LuReceiptText as ReceiptText,
  LuSave as Save,
  LuTrash2 as Trash2,
  LuUserRound as UserRound,
  LuX as X,
  LuPlus as Plus,
} from "react-icons/lu";

import { Button } from "@/components/ui";
import { CurrencyAmountInput, Field, Input, Select } from "@/components/ui/forms";
import { getActiveTaxes, getCurrencies, getInventoryItems, getInventoryItemWarehouseStock } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { cn, formatItemServiceLabel } from "@/lib/utils";
import type { Customer, InventoryItem, InventoryItemWarehouseStock, InventoryWarehouse, Tax, Currency } from "@/types/api";
import { useAuth } from "@/providers/auth-provider";
import {
  lineTracksInventory,
  pickBestWarehouseId,
  validateSalesDocumentInventoryStock,
  warehouseOnHandQuantity,
} from "../sales-inventory-stock.utils";
import {
  applyItemToSalesLine,
  calculateQuotationTotals,
  createEmptyLine,
  type SalesLineEditorState,
  withCalculatedLineAmount,
} from "./quotation-editor-modal";

type RevenueAccountOption = { id: string; code: string; name: string; nameAr?: string | null };

type SalesDocumentEditorModalProps = {
  isOpen: boolean;
  presentation?: "modal" | "inline";
  title: string;
  introTitle: string;
  introDescription?: string;
  reference: string;
  dateLabel: string;
  dateValue: string;
  secondaryDateLabel?: string;
  secondaryDateValue?: string;
  currencyCode: string;
  customerId: string;
  description: string;
  lines: SalesLineEditorState[];
  customers: Customer[];
  inventoryItems: InventoryItem[];
  warehouses: InventoryWarehouse[];
  isInventoryItemsLoading: boolean;
  revenueAccounts: RevenueAccountOption[];
  isSubmitting: boolean;
  validationError?: string | null;
  defaultLineTax?: Tax | null;
  allowTaxOverride?: boolean;
  onClose: () => void;
  onReferenceChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onSecondaryDateChange?: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onCustomerChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onLinesChange: (lines: SalesLineEditorState[]) => void;
  onDraftSubmit: () => void;
  draftSubmitLabel: string;
  onPostSubmit?: () => void;
  postSubmitLabel?: string;
  onPostAndCreateReceiptSubmit?: () => void;
  postAndCreateReceiptLabel?: string;
  postAndCreateReceiptTooltip?: string;
  isPostSubmitting?: boolean;
  isPostAndCreateReceiptSubmitting?: boolean;
};

function translateSalesDocumentError(
  message: string | null | undefined,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  if (!message) {
    return null;
  }

  const insufficientStockMatch = message.match(
    /^Item\s+(.+?)\s+does not have enough available stock in the selected warehouse for line\s+(\d+)\.?$/i,
  );
  if (insufficientStockMatch) {
    return t("salesReceivables.validation.insufficientWarehouseStock", {
      code: insufficientStockMatch[1],
      index: Number(insufficientStockMatch[2]),
    });
  }

  const headerAccountMatch = message.match(
    /^Account\s+"?(.+?)"?\s+is\s+a\s+header\s+account\s+and\s+cannot\s+receive\s+journal\s+entries\.?$/i,
  );
  if (headerAccountMatch) {
    return t("salesReceivables.validation.headerAccountCannotPost", {
      account: headerAccountMatch[1],
    });
  }

  const invalidCustomerReceivableAccountMatch = message.match(
    /^Customer receivable account\s+"(.+?)"\s+must be active and posting before posting the invoice\.?$/i,
  );
  if (invalidCustomerReceivableAccountMatch) {
    return t("salesReceivables.validation.invalidCustomerReceivableAccount", {
      account: invalidCustomerReceivableAccountMatch[1],
    });
  }

  const invalidRevenueAccountMatch = message.match(
    /^Revenue account\s+"(.+?)"\s+must be active and posting for line\s+(\d+)\.?$/i,
  );
  if (invalidRevenueAccountMatch) {
    return t("salesReceivables.validation.invalidRevenueAccountForLine", {
      account: invalidRevenueAccountMatch[1],
      index: Number(invalidRevenueAccountMatch[2]),
    });
  }

  const invalidInventoryAccountMatch = message.match(
    /^Item\s+(.+?)\s+has an invalid inventory account\s+"(.+?)"\..*$/i,
  );
  if (invalidInventoryAccountMatch) {
    return t("salesReceivables.validation.invalidInventoryAccountForItem", {
      code: invalidInventoryAccountMatch[1],
      account: invalidInventoryAccountMatch[2],
    });
  }

  const invalidCogsAccountMatch = message.match(
    /^Item\s+(.+?)\s+has an invalid cost of goods sold account\s+"(.+?)"\..*$/i,
  );
  if (invalidCogsAccountMatch) {
    return t("salesReceivables.validation.invalidCogsAccountForItem", {
      code: invalidCogsAccountMatch[1],
      account: invalidCogsAccountMatch[2],
    });
  }

  return message;
}

function toFiniteNumber(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function SalesDocumentEditorModal({
  isOpen,
  presentation = "modal",
  title,
  introTitle,
  introDescription,
  reference,
  dateLabel,
  dateValue,
  secondaryDateLabel,
  secondaryDateValue,
  currencyCode,
  customerId,
  description,
  lines,
  customers,
  inventoryItems,
  warehouses,
  isInventoryItemsLoading,
  revenueAccounts,
  isSubmitting,
  validationError,
  defaultLineTax,
  allowTaxOverride = true,
  onClose,
  onReferenceChange,
  onDateChange,
  onSecondaryDateChange,
  onCurrencyChange,
  onCustomerChange,
  onDescriptionChange,
  onLinesChange,
  onDraftSubmit,
  draftSubmitLabel,
  onPostSubmit,
  postSubmitLabel,
  onPostAndCreateReceiptSubmit,
  postAndCreateReceiptLabel,
  postAndCreateReceiptTooltip,
  isPostSubmitting = false,
  isPostAndCreateReceiptSubmitting = false,
}: SalesDocumentEditorModalProps) {
  const { t, language } = useTranslation();
  const { token } = useAuth();
  const { data: taxes = [] } = useQuery({ queryKey: ["taxes", "active", token], queryFn: () => getActiveTaxes(token) });
  const { data: currencies = [] } = useQuery({ queryKey: ["currencies", token], queryFn: () => getCurrencies(token) });
  const isArabic = language === "ar";
  const totals = useMemo(() => calculateQuotationTotals(lines), [lines]);
  const isInline = presentation === "inline";
  const [activeTab, setActiveTab] = useState<"lines" | "journal" | "other">("lines");
  const [stockValidationError, setStockValidationError] = useState<string | null>(null);

  const inventoryLineItemIds = useMemo(
    () =>
      [
        ...new Set(
          lines
            .map((line) => line.itemId)
            .filter((itemId): itemId is string => Boolean(itemId)),
        ),
      ],
    [lines],
  );

  const warehouseStockQueries = useQueries({
    queries: inventoryLineItemIds.map((itemId) => ({
      queryKey: ["inventory-item-warehouse-stock", token, itemId],
      queryFn: () => getInventoryItemWarehouseStock(itemId, token),
      enabled: Boolean(isOpen && itemId),
      staleTime: 30_000,
    })),
  });

  const stockByItemId = useMemo(() => {
    const map = new Map<string, InventoryItemWarehouseStock>();
    inventoryLineItemIds.forEach((itemId, index) => {
      const stock = warehouseStockQueries[index]?.data;
      if (stock) {
        map.set(itemId, stock);
      }
    });
    return map;
  }, [inventoryLineItemIds, warehouseStockQueries]);

  const combinedValidationError = validationError ?? stockValidationError;

  const controlClassName = cn(
    "h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-base shadow-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/10",
    isArabic ? "text-right" : "text-left",
  );

  const translatedValidationError = useMemo(
    () => translateSalesDocumentError(combinedValidationError, t),
    [combinedValidationError, t],
  );
  const [visibleValidationError, setVisibleValidationError] = useState<string | null>(
    translatedValidationError,
  );
  const inventoryTrackedLines = useMemo(
    () =>
      lines
        .map((line, index) => {
          const item = inventoryItems.find((row) => row.id === line.itemId) ?? null;
          if (!item || item.type === "SERVICE" || !item.trackInventory || !line.warehouseId) {
            return null;
          }

          return {
            key: `${item.id}:${line.warehouseId}`,
            lineIndex: index,
            item,
            warehouseId: line.warehouseId,
            quantity: toFiniteNumber(line.quantity) ?? 0,
          };
        })
        .filter((value): value is NonNullable<typeof value> => Boolean(value)),
    [inventoryItems, lines],
  );
  const inventoryAvailabilityQueries = useQueries({
    queries: inventoryTrackedLines.map((entry) => ({
      queryKey: ["sales-invoice-line-stock", token, entry.item.id, entry.warehouseId],
      queryFn: async () => {
        const response = await getInventoryItems(
          {
            isActive: "true",
            warehouseId: entry.warehouseId,
            search: entry.item.code,
            page: 1,
            limit: 100,
          },
          token,
        );

        return response.data.find((row) => row.id === entry.item.id) ?? null;
      },
      enabled: Boolean(token && entry.item.id && entry.warehouseId),
      staleTime: 30_000,
    })),
  });
  const stockAvailabilityByKey = useMemo(() => {
    const map = new Map<string, InventoryItem | null>();
    inventoryTrackedLines.forEach((entry, index) => {
      map.set(entry.key, inventoryAvailabilityQueries[index]?.data ?? null);
    });
    return map;
  }, [inventoryAvailabilityQueries, inventoryTrackedLines]);
  const hasPendingStockCheck = inventoryAvailabilityQueries.some((query) => query.isLoading);
  const hasFailedStockCheck = inventoryAvailabilityQueries.some((query) => query.isError);

  useEffect(() => {
    setVisibleValidationError(translatedValidationError);

    if (!translatedValidationError) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleValidationError(null);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [translatedValidationError]);

  const controlBaseClass =
    "w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 text-base shadow-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/10";

  const labelClassName = cn("text-sm font-bold tracking-normal text-slate-700", isArabic && "arabic-ui");

  const tabs = [
    { key: "lines" as const, label: isArabic ? "بنود الفاتورة" : "Invoice Items" },
    { key: "journal" as const, label: isArabic ? "عناصر اليومية" : "Journal Entries" },
    { key: "other" as const, label: isArabic ? "معلومات أخرى" : "Other Info" },
  ];

  void allowTaxOverride;
  void description;
  void title;
  void onReferenceChange;
  void onDescriptionChange;

  const postActionBlockedReason = useMemo(() => {
    if (!customerId) {
      return t("salesReceivables.validation.customerRequired");
    }

    if (!lines.length) {
      return t("salesReceivables.validation.lineRequired");
    }

    for (const [index, line] of lines.entries()) {
      const lineAmount = toFiniteNumber(line.lineAmount) ?? 0;
      if (lineAmount < 0.01) {
        return t("salesReceivables.validation.lineAmountPositive", { index: index + 1 });
      }

      if (!line.revenueAccountId) {
        return t("salesReceivables.validation.revenueAccountRequired", { index: index + 1 });
      }

      const item = inventoryItems.find((row) => row.id === line.itemId) ?? null;
      if (item && item.type !== "SERVICE" && !line.warehouseId) {
        return t("salesReceivables.validation.warehouseRequiredForInventory", { index: index + 1 });
      }

      if (item && item.type !== "SERVICE" && item.trackInventory) {
        if (!item.inventoryAccount || !item.inventoryAccount.isActive || !item.inventoryAccount.isPosting) {
          return t("salesReceivables.validation.invalidInventoryAccountForItem", {
            code: item.code,
            account: item.inventoryAccount?.name ?? item.inventoryAccount?.code ?? "",
          });
        }
        if (!item.cogsAccount || !item.cogsAccount.isActive || !item.cogsAccount.isPosting) {
          return t("salesReceivables.validation.invalidCogsAccountForItem", {
            code: item.code,
            account: item.cogsAccount?.name ?? item.cogsAccount?.code ?? "",
          });
        }
      }
    }

    if (hasFailedStockCheck) {
      return t("salesReceivables.validation.stockCheckFailed");
    }

    if (hasPendingStockCheck) {
      return t("salesReceivables.validation.checkingWarehouseStock");
    }

    for (const [index, line] of lines.entries()) {
      const item = inventoryItems.find((row) => row.id === line.itemId) ?? null;
      if (!item || item.type === "SERVICE" || !item.trackInventory || !line.warehouseId) {
        continue;
      }

      const availableItem = stockAvailabilityByKey.get(`${item.id}:${line.warehouseId}`);
      const availableQuantity = toFiniteNumber(availableItem?.onHandQuantity) ?? 0;
      const requiredQuantity = toFiniteNumber(line.quantity) ?? 0;

      if (requiredQuantity > availableQuantity) {
        return t("salesReceivables.validation.insufficientWarehouseStock", {
          code: item.code,
          index: index + 1,
        });
      }
    }

    return null;
  }, [
    customerId,
    hasFailedStockCheck,
    hasPendingStockCheck,
    inventoryItems,
    lines,
    stockAvailabilityByKey,
    t,
  ]);
  const disablePostActions = Boolean(postActionBlockedReason);

  const updateLine = (
    lineKey: string,
    updater: (line: SalesLineEditorState) => SalesLineEditorState,
  ) => {
    onLinesChange(
      lines.map((line) =>
        line.key === lineKey ? withCalculatedLineAmount(updater(line)) : line,
      ),
    );
  };

  const removeLine = (lineKey: string) => {
    if (lines.length === 1) {
      return;
    }
    onLinesChange(lines.filter((line) => line.key !== lineKey));
  };

  const addLine = () => {
    onLinesChange([
      ...lines,
      withCalculatedLineAmount({
        ...createEmptyLine(),
        taxId: defaultLineTax?.id ?? "",
        taxRate: defaultLineTax ? String(defaultLineTax.rate) : "",
        taxAmount: "",
      }),
    ]);
  };

  const handleInventoryItemChange = async (
    lineKey: string,
    item: InventoryItem | null,
    currentLine: SalesLineEditorState,
  ) => {
    const customer = customers.find((row) => row.id === customerId) ?? null;
    let shouldUpdatePrice = true;
    if (currentLine.unitPrice && currentLine.unitPrice !== "0" && currentLine.itemId) {
      const prevItem = inventoryItems.find((row) => row.id === currentLine.itemId);
      if (prevItem && currentLine.unitPrice !== prevItem.defaultSalesPrice) {
        if (!confirm(t("salesReceivables.message.confirmPriceUpdate"))) {
          shouldUpdatePrice = false;
        }
      }
    }

    let nextLine = applyItemToSalesLine(currentLine, item, customer, taxes, shouldUpdatePrice);
    if (item && lineTracksInventory(item)) {
      try {
        const stock = await getInventoryItemWarehouseStock(item.id, token);
        nextLine = {
          ...nextLine,
          warehouseId: pickBestWarehouseId(item, stock),
        };
      } catch {
        // Keep preferred warehouse when stock lookup fails.
      }
    }

    updateLine(lineKey, () => nextLine);
    setStockValidationError(null);
  };

  const ensureStockBeforePost = () => {
    const stockError = validateSalesDocumentInventoryStock({
      lines,
      inventoryItems,
      stockByItemId,
      warehouses,
      t,
    });
    if (stockError) {
      setStockValidationError(stockError);
      return false;
    }
    setStockValidationError(null);
    return true;
  };

  const handlePostSubmit = () => {
    if (!ensureStockBeforePost()) {
      return;
    }
    onPostSubmit?.();
  };

  const handlePostAndCreateReceiptSubmit = () => {
    if (!ensureStockBeforePost()) {
      return;
    }
    onPostAndCreateReceiptSubmit?.();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={cn(isInline ? "relative w-full" : "fixed inset-0 z-50 p-3 sm:p-6 flex items-center justify-center")}>
      {!isInline ? <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} /> : null}
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className={cn(
          "relative mx-auto flex flex-col overflow-hidden w-full",
          isInline
            ? "min-h-[calc(100vh-220px)] w-full bg-transparent"
            : "h-full max-h-full max-w-[1580px] rounded-lg border border-slate-200 bg-[#fcfcfb] shadow-[0_18px_42px_rgba(15,23,42,0.12)]",
          isArabic && "arabic-ui",
        )}
      >
        {isInline && (
          <button
            type="button"
            onClick={onClose}
            className="absolute end-3 top-3 z-30 rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="sr-only">{t("salesReceivables.action.cancel")}</span>
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Modal Header */}
        {!isInline ? (
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-5 py-5 backdrop-blur sm:px-8">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <span className="sr-only">{t("salesReceivables.action.cancel")}</span>
              <X className="h-6 w-6" />
            </button>
            <div className="flex min-w-0 items-center gap-3">
              <div className={cn("min-w-0 space-y-1", isArabic ? "text-right" : "text-left")}>
                <div className="text-3xl font-black tracking-tight text-slate-900 arabic-ui-heading">
                  {introTitle}
                </div>
                <div className="truncate text-sm text-slate-500">
                  {introDescription || (isArabic ? "إنشاء وتحرير مستندات المبيعات والفواتير الصادرة" : "Create and manage sales document entries and outgoing invoices")}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <ReceiptText className="h-6 w-6" />
              </div>
            </div>
          </div>
        ) : null}

        {/* Content Container */}
        <div className={cn(
          "flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.06),_transparent_30%),linear-gradient(180deg,_#fcfcfb_0%,_#f7f8f7_100%)]",
          isInline ? "px-0 py-4" : "px-4 py-4 sm:px-8 sm:py-6"
        )}>
          <div className="space-y-5">
            {isInline ? (
              <div className={cn("mb-5 flex items-center gap-3 border-b border-slate-200 pb-4", isArabic ? "justify-end text-right" : "justify-start text-left")}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-slate-900 arabic-ui-heading">{introTitle}</h1>
                  <p className="truncate text-sm text-slate-500">
                    {introDescription || (isArabic ? "إنشاء وتحرير مستندات المبيعات والفواتير الصادرة" : "Create and manage sales document entries and outgoing invoices")}
                  </p>
                </div>
              </div>
            ) : null}

            {visibleValidationError ? (
              <div className={cn("rounded-md border border-red-200 bg-red-50 px-5 py-4 text-base font-semibold text-red-700 shadow-sm", isArabic ? "text-right" : "text-left")}>
                {visibleValidationError}
              </div>
            ) : null}

            {/* Pinned Card: البيانات الأساسية */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 transition-all duration-200 hover:shadow-md">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div className={isArabic ? "text-right" : "text-left"}>
                  <div className="text-lg font-bold text-slate-950 arabic-ui-heading">
                    {isArabic ? "البيانات الأساسية" : "Basic Information"}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Customer */}
                <div className="sm:col-span-2">
                  <Field label={t("salesReceivables.field.customer")} required labelClassName={labelClassName} labelAlign={isArabic ? "end" : "start"}>
                    <div className="relative">
                      <Select
                        value={customerId}
                        onChange={(event) => onCustomerChange(event.target.value)}
                        className={cn(controlBaseClass, isArabic ? "pl-3.5 pr-10 text-right" : "pr-3.5 pl-10 text-left")}
                      >
                        <option value="">{t("salesReceivables.empty.selectActiveCustomer")}</option>
                        {customers.map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.code} · {row.name}
                          </option>
                        ))}
                      </Select>
                      <UserRound className={cn("pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400", isArabic ? "right-3.5" : "left-3.5")} />
                    </div>
                  </Field>
                </div>

                {/* Date */}
                <div>
                  <Field label={dateLabel} required labelClassName={labelClassName} labelAlign={isArabic ? "end" : "start"}>
                    <div className="relative">
                      <Input
                        type="date"
                        value={dateValue}
                        onChange={(event) => onDateChange(event.target.value)}
                        className={cn(controlBaseClass, isArabic ? "pl-3.5 pr-10 text-right" : "pr-3.5 pl-10 text-left")}
                      />
                      <CalendarDays className={cn("pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400", isArabic ? "right-3.5" : "left-3.5")} />
                    </div>
                  </Field>
                </div>

                {/* Secondary Date (Due Date) or Currency */}
                {secondaryDateLabel && onSecondaryDateChange ? (
                  <div>
                    <Field label={secondaryDateLabel} labelClassName={labelClassName} labelAlign={isArabic ? "end" : "start"}>
                      <div className="relative">
                        <Input
                          type="date"
                          value={secondaryDateValue ?? ""}
                          onChange={(event) => onSecondaryDateChange(event.target.value)}
                          className={cn(controlBaseClass, isArabic ? "pl-3.5 pr-10 text-right" : "pr-3.5 pl-10 text-left")}
                        />
                        <CalendarDays className={cn("pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400", isArabic ? "right-3.5" : "left-3.5")} />
                      </div>
                    </Field>
                  </div>
                ) : (
                  <div>
                    <Field label={t("salesReceivables.field.currency")} required labelClassName={labelClassName} labelAlign={isArabic ? "end" : "start"}>
                      <Select
                        value={currencyCode}
                        onChange={(event) => onCurrencyChange(event.target.value)}
                        className={cn(controlBaseClass, "px-3.5", isArabic ? "text-right" : "text-left")}
                      >
                        {currencies.length === 0 ? (
                          <>
                            <option value="JOD">JOD — دينار أردني</option>
                            <option value="USD">USD — Dollar</option>
                          </>
                        ) : (
                          currencies
                            .filter((c) => c.isActive)
                            .map((curr) => (
                              <option key={curr.id} value={curr.code}>
                                {curr.code} — {isArabic ? curr.nameAr || curr.name : curr.name || curr.code}
                              </option>
                            ))
                        )}
                      </Select>
                    </Field>
                  </div>
                )}

                {/* If secondary date exists, show currency as 5th field */}
                {secondaryDateLabel && onSecondaryDateChange ? (
                  <div>
                    <Field label={t("salesReceivables.field.currency")} required labelClassName={labelClassName} labelAlign={isArabic ? "end" : "start"}>
                      <Select
                        value={currencyCode}
                        onChange={(event) => onCurrencyChange(event.target.value)}
                        className={cn(controlBaseClass, "px-3.5", isArabic ? "text-right" : "text-left")}
                      >
                        {currencies.length === 0 ? (
                          <>
                            <option value="JOD">JOD — دينار أردني</option>
                            <option value="USD">USD — Dollar</option>
                          </>
                        ) : (
                          currencies
                            .filter((c) => c.isActive)
                            .map((curr) => (
                              <option key={curr.id} value={curr.code}>
                                {curr.code} — {isArabic ? curr.nameAr || curr.name : curr.name || curr.code}
                              </option>
                            ))
                        )}
                      </Select>
                    </Field>
                  </div>
                ) : null}
              </div>
            </section>

            {/* Tabs & Details Card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 transition-all duration-200 hover:shadow-md">
              {/* Tab Pills */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        "rounded-xl px-4 py-2 text-sm font-bold transition-all duration-200 border",
                        isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/50 shadow-sm"
                          : "text-slate-600 hover:bg-slate-50 border-transparent",
                        isArabic ? "arabic-ui" : ""
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === "lines" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Package2 className="h-5 w-5 text-slate-500" />
                      <span className="text-base font-bold">{isArabic ? "تفاصيل بنود الفاتورة" : "Invoice Line Items"}</span>
                    </div>
                    <Button type="button" variant="secondary" size="sm" onClick={addLine} className="rounded-xl text-sm flex items-center gap-1.5 py-1.5 px-3">
                      <Plus className="h-4 w-4" />
                      <span>{isArabic ? "إضافة سطر" : "Add Line"}</span>
                    </Button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-[1730px] table-fixed border-collapse text-sm">
                      <thead className="bg-slate-50/75">
                        <tr>
                          <th scope="col" className="w-[60px] px-3 py-3.5 text-center text-sm font-bold text-slate-500 uppercase">#</th>
                          <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[320px]", isArabic ? "text-right" : "text-left")}>{t("salesReceivables.field.itemOrService")} *</th>
                          <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[220px]", isArabic ? "text-right" : "text-left")}>{t("inventory.warehouse.title")} *</th>
                          <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[260px]", isArabic ? "text-right" : "text-left")}>{t("salesReceivables.field.revenueAccount")} *</th>
                          <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[110px]", isArabic ? "text-right" : "text-left")}>{t("salesReceivables.field.quantity")} *</th>
                          <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[150px]", isArabic ? "text-right" : "text-left")}>{t("salesReceivables.field.unitPrice")} *</th>
                          <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[150px]", isArabic ? "text-right" : "text-left")}>{t("salesReceivables.field.discountAmount")}</th>
                          <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[220px]", isArabic ? "text-right" : "text-left")}>{t("salesReceivables.field.tax")}</th>
                          <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[160px]", isArabic ? "text-right" : "text-left")}>{t("salesReceivables.field.lineAmount")}</th>
                          <th scope="col" className="px-3 py-3.5 text-center text-sm font-bold text-slate-500 uppercase tracking-wider w-[80px]">{isArabic ? "إجراء" : "Action"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {lines.map((line, index) => {
                          const selectedItem = inventoryItems.find((row) => row.id === line.itemId) ?? null;
                          const lineStock = line.itemId ? stockByItemId.get(line.itemId) : undefined;
                          const tracksInventory = lineTracksInventory(selectedItem);
                          const availableQty = tracksInventory
                            ? warehouseOnHandQuantity(lineStock, line.warehouseId)
                            : null;
                          const requestedQty = Number(line.quantity);
                          const insufficientStock =
                            tracksInventory &&
                            line.warehouseId &&
                            Number.isFinite(requestedQty) &&
                            requestedQty > 0 &&
                            availableQty !== null &&
                            availableQty + 1e-9 < requestedQty;

                          const selectedWarehouseAvailable = availableQty ?? 0;
                          const totalAvailable = toFiniteNumber(lineStock?.totalOnHand) ?? 0;
                          const hasInsufficientSelectedWarehouseStock = insufficientStock;
                          const shouldShowWarehouseStockHint = Boolean(
                            tracksInventory && line.warehouseId
                          );

                          return (
                            <tr
                              key={line.key}
                              className={cn(
                                "transition align-top",
                                insufficientStock ? "bg-red-50/70" : "hover:bg-slate-50/50",
                              )}
                            >
                              <td className="whitespace-nowrap px-3 py-4 text-center font-bold text-slate-400 text-sm">
                                {index + 1}
                              </td>
                              <td className="px-2.5 py-3.5">
                                <Select
                                  value={line.itemId}
                                  onChange={(event) => {
                                    const item =
                                      inventoryItems.find((row) => row.id === event.target.value) ?? null;
                                    void handleInventoryItemChange(line.key, item, line);
                                  }}
                                  className="w-full rounded-lg text-sm bg-white border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
                                  style={{ padding: "0 10px", height: "40px" }}
                                >
                                  <option value="">
                                    {isInventoryItemsLoading ? t("salesReceivables.state.loadingItems") : t("salesReceivables.empty.selectItemOrService")}
                                  </option>
                                  {inventoryItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {formatItemServiceLabel(item.code, item.name)}
                                    </option>
                                  ))}
                                </Select>
                              </td>
                              <td className="px-2.5 py-3.5">
                                <div className="space-y-1.5">
                                  <Select
                                    value={line.warehouseId}
                                    disabled={!selectedItem || selectedItem.type === "SERVICE"}
                                    onChange={(event) => {
                                      updateLine(line.key, (current) => ({
                                        ...current,
                                        warehouseId: event.target.value,
                                      }));
                                      setStockValidationError(null);
                                    }}
                                    className="w-full rounded-lg text-sm bg-white border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 disabled:bg-slate-50 disabled:text-slate-400"
                                    style={{ padding: "0 10px", height: "40px" }}
                                  >
                                    <option value="">
                                      {selectedItem?.type === "SERVICE" ? t("inventory.common.notApplicable") : t("inventory.placeholder.selectWarehouse")}
                                    </option>
                                    {warehouses
                                      .filter((warehouse) => warehouse.isActive)
                                      .map((warehouse) => {
                                        const qty = warehouseOnHandQuantity(lineStock, warehouse.id);
                                        const qtyLabel =
                                          tracksInventory && lineStock
                                            ? ` · ${isArabic ? "متوفر" : "Avail"} ${qty}`
                                            : "";
                                        return (
                                          <option key={warehouse.id} value={warehouse.id}>
                                            {warehouse.code} · {warehouse.name}
                                            {qtyLabel}
                                          </option>
                                        );
                                      })}
                                  </Select>
                                  {shouldShowWarehouseStockHint ? (
                                    <div className={cn("space-y-1 text-xs font-medium", isArabic ? "text-right" : "text-left")}>
                                      <div
                                        className={cn(
                                          hasInsufficientSelectedWarehouseStock ? "text-red-600" : "text-slate-500",
                                        )}
                                      >
                                        {t("salesReceivables.hint.selectedWarehouseStock", {
                                          quantity: selectedWarehouseAvailable,
                                          unit: selectedItem?.unitOfMeasure ?? "",
                                        })}
                                      </div>
                                      {totalAvailable !== selectedWarehouseAvailable ? (
                                        <div className="text-slate-400">
                                          {t("salesReceivables.hint.totalItemStock", {
                                            quantity: totalAvailable,
                                            unit: selectedItem?.unitOfMeasure ?? "",
                                          })}
                                        </div>
                                      ) : null}
                                      {tracksInventory && lineStock?.balances.length === 0 ? (
                                        <div className="text-amber-700 font-semibold">
                                          {t("salesReceivables.stock.noWarehouseStock")}
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-2.5 py-3.5">
                                <Select
                                  value={line.revenueAccountId}
                                  onChange={(event) =>
                                    updateLine(line.key, (current) => ({
                                      ...current,
                                      revenueAccountId: event.target.value,
                                    }))
                                  }
                                  className="w-full rounded-lg text-sm bg-white border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
                                  style={{ padding: "0 10px", height: "40px" }}
                                >
                                  <option value="">{t("salesReceivables.empty.selectRevenueAccount")}</option>
                                  {revenueAccounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                      {account.code} · {isArabic ? account.nameAr || account.name : account.name}
                                    </option>
                                  ))}
                                </Select>
                              </td>
                              <td className="px-2.5 py-3.5">
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={line.quantity}
                                  onChange={(event) => {
                                    updateLine(line.key, (current) => ({ ...current, quantity: event.target.value }));
                                    setStockValidationError(null);
                                  }}
                                  className="w-full rounded-lg text-sm font-mono text-center bg-white border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
                                  style={{ padding: "0 10px", height: "40px" }}
                                />
                              </td>
                              <td className="px-2.5 py-3.5">
                                <CurrencyAmountInput
                                  currencyCode={currencyCode || "JOD"}
                                  isRtl={isArabic}
                                  min="0"
                                  step="0.01"
                                  value={line.unitPrice}
                                  onChange={(event) =>
                                    updateLine(line.key, (current) => ({ ...current, unitPrice: event.target.value }))
                                  }
                                  className="h-full bg-transparent text-sm"
                                  style={{ padding: "0 10px", height: "38px" }}
                                  wrapperClassName="w-full h-10 rounded-lg border-slate-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/10"
                                />
                              </td>
                              <td className="px-2.5 py-3.5">
                                <CurrencyAmountInput
                                  currencyCode={currencyCode || "JOD"}
                                  isRtl={isArabic}
                                  min="0"
                                  step="0.01"
                                  value={line.discountAmount}
                                  onChange={(event) =>
                                    updateLine(line.key, (current) => ({ ...current, discountAmount: event.target.value }))
                                  }
                                  className="h-full bg-transparent text-sm"
                                  style={{ padding: "0 10px", height: "38px" }}
                                  wrapperClassName="w-full h-10 rounded-lg border-slate-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/10"
                                />
                              </td>
                              <td className="px-2.5 py-3.5">
                                <Select
                                  value={line.taxId}
                                  onChange={(event) => {
                                    const selectedTax = taxes.find((tax) => tax.id === event.target.value);
                                    updateLine(line.key, (current) => ({
                                      ...current,
                                      taxId: selectedTax?.id ?? "",
                                      taxRate: selectedTax ? String(selectedTax.rate) : "",
                                      taxAmount: selectedTax ? current.taxAmount : "",
                                    }));
                                  }}
                                  className="w-full rounded-lg text-sm bg-white border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
                                  style={{ padding: "0 10px", height: "40px" }}
                                >
                                  <option value="">{t("salesReceivables.field.tax")}</option>
                                  {taxes.map((tax) => (
                                    <option key={tax.id} value={tax.id}>
                                      {tax.taxName} {Number(tax.rate).toFixed(2)}%
                                    </option>
                                  ))}
                                </Select>
                              </td>
                              <td className="px-2.5 py-3.5">
                                <CurrencyAmountInput
                                  currencyCode={currencyCode || "JOD"}
                                  isRtl={isArabic}
                                  min="0"
                                  step="0.01"
                                  value={line.lineAmount}
                                  readOnly
                                  disabled
                                  className="h-full bg-transparent text-sm"
                                  style={{ padding: "0 10px", height: "38px" }}
                                  wrapperClassName="w-full h-10 rounded-lg bg-slate-100 border-transparent text-emerald-700 font-bold opacity-100"
                                />
                              </td>
                              <td className="px-2.5 py-3.5 text-center">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => removeLine(line.key)}
                                  disabled={lines.length === 1}
                                  className="h-9 w-9 rounded-lg border-red-200 p-0 text-red-500 hover:bg-red-50 transition"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 text-center text-base text-slate-500 font-semibold">
                  {activeTab === "journal" 
                    ? (isArabic ? "سيظهر هنا عرض عناصر اليومية المرتبطة بالفاتورة." : "Associated journal items view will appear here.") 
                    : (isArabic ? "سيظهر هنا أي معلومات إضافية للفواتير في المستقبل." : "Additional invoice details will appear here in the future.")}
                </div>
              )}

              {/* Totals Section */}
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
                  <div></div>
                  <div className="rounded-2xl bg-slate-50/70 p-5 border border-slate-100 space-y-3">
                    <div className={cn("text-sm font-bold tracking-wide text-slate-500 mb-1", isArabic ? "text-right" : "text-left")}>
                      {t("salesReceivables.metric.invoiceTotal")}
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm font-semibold text-slate-600">
                      <span>{isArabic ? "المبلغ قبل الضريبة" : "Amount before Tax"}</span>
                      <span className="font-mono text-slate-900 font-bold">
                        {currencyCode || "JOD"} {totals.subtotalAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm font-semibold text-slate-600">
                      <span>{t("salesReceivables.metric.tax")}</span>
                      <span className="font-mono text-slate-900 font-bold">
                        {currencyCode || "JOD"} {totals.taxAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 pt-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-base font-black text-slate-950">{t("salesReceivables.metric.total")}</span>
                        <span className="font-mono text-xl font-black text-emerald-700">
                          {currencyCode || "JOD"} {totals.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={cn("flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-8", isInline && "rounded-b-lg shadow-md")}>
          <Button variant="secondary" onClick={onClose} className="rounded-xl px-6 py-3 font-bold text-base">
            {t("salesReceivables.action.cancel")}
          </Button>

          <div className="flex flex-wrap items-center gap-3.5">
            <Button
              onClick={onDraftSubmit}
              disabled={isSubmitting || isPostSubmitting || isPostAndCreateReceiptSubmitting}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center gap-1.5 px-6 py-3"
            >
              <Save className="h-5 w-5" />
              <span>{draftSubmitLabel}</span>
            </Button>

            {onPostSubmit && postSubmitLabel ? (
              <Button
                variant="secondary"
                onClick={handlePostSubmit}
                disabled={isSubmitting || isPostSubmitting || isPostAndCreateReceiptSubmitting}
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-emerald-700 hover:bg-emerald-50 font-bold text-base flex items-center gap-1.5"
              >
                <FileText className="h-5 w-5" />
                <span>{postSubmitLabel}</span>
              </Button>
            ) : null}

            {onPostAndCreateReceiptSubmit && postAndCreateReceiptLabel ? (
              <Button
                variant="secondary"
                onClick={handlePostAndCreateReceiptSubmit}
                disabled={isSubmitting || isPostSubmitting || isPostAndCreateReceiptSubmitting}
                title={postAndCreateReceiptTooltip}
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sky-700 hover:bg-sky-50 font-bold text-base flex items-center gap-1.5"
              >
                <ReceiptText className="h-5 w-5" />
                <span>{postAndCreateReceiptLabel}</span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
