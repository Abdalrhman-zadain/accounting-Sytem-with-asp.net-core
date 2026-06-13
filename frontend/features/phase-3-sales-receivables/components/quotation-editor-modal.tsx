"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LuCalendarDays as CalendarDays,
  LuCirclePlus as CirclePlus,
  LuFileCheck2 as FileCheck2,
  LuFileText as FileText,
  LuPackage2 as Package2,
  LuSave as Save,
  LuTrash2 as Trash2,
  LuUserRound as UserRound,
  LuX as X,
  LuPlus as Plus,
} from "react-icons/lu";

import { Button } from "@/components/ui";
import { CurrencyAmountInput, Field, Input, Select, Textarea } from "@/components/ui/forms";
import { getActiveTaxes, getCurrencies } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { cn, formatCurrency, formatItemServiceLabel } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { Customer, InventoryItem, Currency } from "@/types/api";

export type SalesLineEditorState = {
  key: string;
  itemId: string;
  warehouseId: string;
  itemName: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  taxId: string;
  taxRate: string;
  taxAmount: string;
  lineAmount: string;
  revenueAccountId: string;
  unitOfMeasureId?: string;
};

export type QuotationEditorState = {
  id?: string;
  reference: string;
  quotationDate: string;
  validityDate: string;
  currencyCode: string;
  customerId: string;
  description: string;
  lines: SalesLineEditorState[];
};

type RevenueAccountOption = { id: string; code: string; name: string; nameAr?: string | null };

type QuotationEditorModalProps = {
  isOpen: boolean;
  presentation?: "modal" | "inline";
  title: string;
  editor: QuotationEditorState;
  validationError?: string | null;
  customers: Customer[];
  inventoryItems: InventoryItem[];
  isInventoryItemsLoading: boolean;
  revenueAccounts: RevenueAccountOption[];
  isSavingDraft: boolean;
  isApproving: boolean;
  onClose: () => void;
  onChange: (editor: QuotationEditorState) => void;
  onCustomerChange: (value: string) => void;
  onSaveDraft: () => void;
  onApprove: () => void;
};

export function createEmptyLine(): SalesLineEditorState {
  return withCalculatedLineAmount({
    key: Math.random().toString(36).slice(2, 10),
    itemId: "",
    warehouseId: "",
    itemName: "",
    description: "",
    quantity: "1",
    unitPrice: "",
    discountAmount: "",
    taxId: "",
    taxRate: "",
    taxAmount: "",
    lineAmount: "",
    revenueAccountId: "",
    unitOfMeasureId: "",
  });
}

export function applyItemToSalesLine(
  line: SalesLineEditorState,
  item: InventoryItem | null,
  customer: Customer | null,
  allTaxes: { id: string; rate: string | number }[],
  shouldUpdatePrice: boolean = true,
): SalesLineEditorState {
  if (!item) {
    return {
      ...line,
      itemId: "",
      warehouseId: "",
      itemName: "",
      description: "",
      unitPrice: shouldUpdatePrice ? "" : line.unitPrice,
      revenueAccountId: "",
      unitOfMeasureId: "",
    };
  }

  // Default tax from customer's Tax Treatment
  let taxId = line.taxId;
  let taxRate = line.taxRate;

  if (customer?.taxTreatment) {
    const treatment = customer.taxTreatment;
    if (treatment.defaultTaxId) {
      const tax = allTaxes.find((t) => t.id === treatment.defaultTaxId);
      if (tax) {
        taxId = tax.id;
        taxRate = String(tax.rate);
      }
    } else if (treatment.code === "OUT_OF_SCOPE" || treatment.englishName?.toUpperCase() === "OUT OF SCOPE") {
      taxId = "";
      taxRate = "";
    }
  }

  return withCalculatedLineAmount({
    ...line,
    itemId: item.id,
    warehouseId:
      item.type !== "SERVICE"
        ? item.preferredWarehouse?.id || item.preferredWarehouseId || ""
        : "",
    itemName: item.name,
    description: item.description || "",
    unitPrice: shouldUpdatePrice ? (item.defaultSalesPrice || "0") : line.unitPrice,
    revenueAccountId: item.salesAccount?.id || line.revenueAccountId,
    unitOfMeasureId: item.unitOfMeasureId || "",
    taxId,
    taxRate,
  });
}

export function createEmptyQuotationEditor(): QuotationEditorState {
  return {
    reference: "",
    quotationDate: new Date().toISOString().slice(0, 10),
    validityDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    currencyCode: "JOD",
    customerId: "",
    description: "",
    lines: [createEmptyLine()],
  };
}

export function withCalculatedLineAmount(line: SalesLineEditorState): SalesLineEditorState {
  const quantity = toFiniteNumber(line.quantity);
  const unitPrice = toFiniteNumber(line.unitPrice);
  const discountAmount = toFiniteNumber(line.discountAmount) ?? 0;
  const taxRate = toFiniteNumber(line.taxRate);
  const computedTaxAmount =
    quantity !== null && unitPrice !== null && taxRate !== null
      ? Math.max(quantity * unitPrice - discountAmount, 0) * taxRate / 100
      : null;
  return {
    ...line,
    taxAmount: computedTaxAmount !== null ? computedTaxAmount.toFixed(2) : line.taxAmount,
    lineAmount: calculateLineAmount(line),
  };
}

export function calculateLineAmount(
  line: Pick<SalesLineEditorState, "quantity" | "unitPrice" | "discountAmount" | "taxAmount" | "taxRate">,
) {
  const quantity = toFiniteNumber(line.quantity);
  const unitPrice = toFiniteNumber(line.unitPrice);
  const discountAmount = toFiniteNumber(line.discountAmount) ?? 0;

  if (quantity === null || unitPrice === null) {
    return "";
  }

  const discountedAmount = quantity * unitPrice - discountAmount;
  const taxRate = toFiniteNumber(line.taxRate);
  const taxAmount = taxRate !== null ? discountedAmount * taxRate / 100 : toFiniteNumber(line.taxAmount) ?? 0;

  return (discountedAmount + taxAmount).toFixed(2);
}

export function calculateQuotationTotals(lines: SalesLineEditorState[]) {
  return lines.reduce(
    (totals, line) => {
      const quantity = toFiniteNumber(line.quantity) ?? 0;
      const unitPrice = toFiniteNumber(line.unitPrice) ?? 0;
      const discountAmount = toFiniteNumber(line.discountAmount) ?? 0;
      const subtotal = quantity * unitPrice - discountAmount;
      const taxRate = toFiniteNumber(line.taxRate);
      const taxAmount = taxRate !== null ? subtotal * taxRate / 100 : toFiniteNumber(line.taxAmount) ?? 0;
      const lineAmount = toFiniteNumber(line.lineAmount) ?? subtotal + taxAmount;

      return {
        subtotalAmount: totals.subtotalAmount + Math.max(subtotal, 0),
        taxAmount: totals.taxAmount + taxAmount,
        totalAmount: totals.totalAmount + Math.max(lineAmount, 0),
      };
    },
    { subtotalAmount: 0, taxAmount: 0, totalAmount: 0 },
  );
}

function toFiniteNumber(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function QuotationEditorModal({
  isOpen,
  presentation = "modal",
  title,
  editor,
  validationError,
  customers,
  inventoryItems,
  isInventoryItemsLoading,
  revenueAccounts,
  isSavingDraft,
  isApproving,
  onClose,
  onChange,
  onCustomerChange,
  onSaveDraft,
  onApprove,
}: QuotationEditorModalProps) {
  const { t, language } = useTranslation();
  const { token } = useAuth();
  const { data: taxes = [] } = useQuery({ queryKey: ["taxes", "active", token], queryFn: () => getActiveTaxes(token) });
  const { data: currencies = [] } = useQuery({ queryKey: ["currencies", token], queryFn: () => getCurrencies(token) });
  const isArabic = language === "ar";
  const isInline = presentation === "inline";

  const totals = useMemo(() => calculateQuotationTotals(editor.lines), [editor.lines]);

  const updateEditor = (updater: (current: QuotationEditorState) => QuotationEditorState) => {
    onChange(updater(editor));
  };

  const updateLine = (
    lineKey: string,
    updater: (line: SalesLineEditorState) => SalesLineEditorState,
  ) => {
    updateEditor((current) => ({
      ...current,
      lines: current.lines.map((line) =>
        line.key === lineKey ? withCalculatedLineAmount(updater(line)) : line,
      ),
    }));
  };

  const removeLine = (lineKey: string) => {
    if (editor.lines.length === 1) {
      return;
    }

    updateEditor((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.key !== lineKey),
    }));
  };

  const addLine = () => {
    updateEditor((current) => ({
      ...current,
      lines: [...current.lines, createEmptyLine()],
    }));
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
            ? "min-h-[calc(100vh-220px)] bg-transparent"
            : "h-full max-h-full max-w-[1480px] rounded-[2rem] border border-slate-200 bg-[#fcfcfb] shadow-[0_30px_80px_rgba(15,23,42,0.18)]",
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

        {!isInline ? (
          <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-5 backdrop-blur sm:px-8">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <span className="sr-only">{t("salesReceivables.action.cancel")}</span>
              <X className="h-6 w-6" />
            </button>
            <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className={cn("text-3xl text-slate-900", isArabic ? "arabic-ui-heading" : "font-black tracking-tight")}>
                  {title}
                </div>
                {editor.reference ? <div className="text-sm text-slate-500">{editor.reference}</div> : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className={cn(
          "flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.06),_transparent_30%),linear-gradient(180deg,_#fcfcfb_0%,_#f7f8f7_100%)]",
          isInline ? "px-0 py-4" : "px-4 py-4 sm:px-8 sm:py-6"
        )}>
          <div className="space-y-5">
            {isInline ? (
              <div className={cn("mb-5 flex items-center gap-3 border-b border-slate-200 pb-4", isArabic ? "justify-end text-right" : "justify-start text-left")}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-slate-900 arabic-ui-heading">{title}</h1>
                  <p className="truncate text-sm text-slate-500">
                    {editor.reference || (isArabic ? "إنشاء وتعديل عروض الأسعار للعملاء" : "Create and manage customer quotations")}
                  </p>
                </div>
              </div>
            ) : null}

            {validationError ? (
              <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 shadow-[0_10px_24px_rgba(239,68,68,0.08)]">
                {validationError}
              </div>
            ) : null}

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className={cn("mb-5 flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className={cn("text-lg text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                    {t("salesReceivables.dialog.newQuotation")}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.4fr_1fr]">
                <Field label={t("salesReceivables.field.quotationDate")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <div className="relative">
                    <Input
                      type="date"
                      value={editor.quotationDate}
                      onChange={(event) =>
                        updateEditor((current) => ({ ...current, quotationDate: event.target.value }))
                      }
                      className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                    />
                    <CalendarDays
                      className={cn(
                        "pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400",
                        isArabic ? "left-4" : "right-4",
                      )}
                    />
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.validUntil")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <div className="relative">
                    <Input
                      type="date"
                      value={editor.validityDate}
                      onChange={(event) =>
                        updateEditor((current) => ({ ...current, validityDate: event.target.value }))
                      }
                      className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                    />
                    <CalendarDays
                      className={cn(
                        "pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400",
                        isArabic ? "left-4" : "right-4",
                      )}
                    />
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.customer")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <div className="relative">
                    <Select
                      value={editor.customerId}
                      onChange={(event) => onCustomerChange(event.target.value)}
                      className={cn("border-slate-200 bg-slate-50/70", isArabic ? "arabic-ui pe-12 text-right" : "ps-12")}
                    >
                      <option value="">{t("salesReceivables.empty.selectActiveCustomer")}</option>
                      {customers.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.code} · {row.name}
                        </option>
                      ))}
                    </Select>
                    <UserRound
                      className={cn(
                        "pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400",
                        isArabic ? "left-4" : "right-4",
                      )}
                    />
                  </div>
                  <div className="mt-2">
                    <div className={cn(
                      "inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm ring-1 ring-inset",
                      editor.customerId 
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200" 
                        : "bg-slate-50 text-slate-500 ring-slate-200"
                    )}>
                      <span className={cn(isArabic && "arabic-ui")}>
                        {t("salesReceivables.field.customerTaxTreatment")}: {" "}
                        {editor.customerId ? (
                          customers.find(c => c.id === editor.customerId)?.taxTreatment ? (
                            isArabic 
                              ? customers.find(c => c.id === editor.customerId)?.taxTreatment?.arabicName 
                              : customers.find(c => c.id === editor.customerId)?.taxTreatment?.englishName
                          ) : t("salesReceivables.empty.notSet")
                        ) : t("salesReceivables.empty.selectCustomerToViewTaxTreatment")}
                      </span>
                    </div>
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.currency")} required labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <Select
                    value={editor.currencyCode}
                    onChange={(event) =>
                      updateEditor((current) => ({
                        ...current,
                        currencyCode: event.target.value,
                      }))
                    }
                    className={cn("border-slate-200 bg-slate-50/70", isArabic && "arabic-ui text-right")}
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

              <div className="mt-4">
                <Field label={t("salesReceivables.field.description")} labelClassName={isArabic ? "arabic-ui" : undefined}>
                  <Textarea
                    rows={3}
                    value={editor.description}
                    onChange={(event) =>
                      updateEditor((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder={t("salesReceivables.field.description")}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic && "arabic-ui text-right")}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 transition-all duration-200 hover:shadow-md">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <Package2 className="h-5 w-5 text-slate-500" />
                  <span className="text-base font-bold">{isArabic ? "تفاصيل بنود عرض السعر" : "Quotation Line Items"}</span>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={addLine} className="rounded-xl text-sm flex items-center gap-1.5 py-1.5 px-3">
                  <Plus className="h-4 w-4" />
                  <span>{isArabic ? "إضافة سطر" : "Add Line"}</span>
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-[1450px] table-fixed border-collapse text-sm">
                  <thead className="bg-slate-50/75">
                    <tr>
                      <th scope="col" className="w-[50px] px-3 py-3.5 text-center text-sm font-bold text-slate-500 uppercase">#</th>
                      <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[240px]", isArabic ? "text-right" : "text-left")}>{t("salesReceivables.field.itemOrService")} *</th>
                      <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[200px]", isArabic ? "text-right" : "text-left")}>{t("salesReceivables.field.itemSnapshot")}</th>
                      <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[200px]", isArabic ? "text-right" : "text-left")}>{t("salesReceivables.field.revenueAccount")} *</th>
                      <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[100px]", isArabic ? "text-right" : "text-left")}>{t("salesReceivables.field.quantity")} *</th>
                      <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[130px]", isArabic ? "text-right" : "text-left")}>{t("salesReceivables.field.unitPrice")} *</th>
                      <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[130px]", isArabic ? "text-right" : "text-left")}>{t("salesReceivables.field.discountAmount")}</th>
                      <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[180px]", isArabic ? "text-right" : "text-left")}>{t("salesReceivables.field.tax")}</th>
                      <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[140px]", isArabic ? "text-right" : "text-left")}>{t("salesReceivables.field.lineAmount")}</th>
                      <th scope="col" className="px-3 py-3.5 text-center text-sm font-bold text-slate-500 uppercase tracking-wider w-[80px]">{isArabic ? "إجراء" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {editor.lines.map((line, index) => {
                      return (
                        <tr key={line.key} className="hover:bg-slate-50/50 transition align-top">
                          <td className="whitespace-nowrap px-3 py-4 text-center font-bold text-slate-400 text-sm">
                            {index + 1}
                          </td>
                          <td className="px-2.5 py-3.5">
                            <Select
                              value={line.itemId}
                              onChange={(event) => {
                                const item = inventoryItems.find((row) => row.id === event.target.value) ?? null;
                                const customer = customers.find((c) => c.id === editor.customerId) ?? null;

                                let shouldUpdatePrice = true;
                                if (line.unitPrice && line.unitPrice !== "0" && line.itemId) {
                                  const prevItem = inventoryItems.find((i) => i.id === line.itemId);
                                  if (prevItem && line.unitPrice !== prevItem.defaultSalesPrice) {
                                    if (!confirm(t("salesReceivables.message.confirmPriceUpdate"))) {
                                      shouldUpdatePrice = false;
                                    }
                                  }
                                }

                                updateLine(line.key, (current) =>
                                  applyItemToSalesLine(current, item, customer, taxes, shouldUpdatePrice),
                                );
                              }}
                              className="h-10 rounded-lg text-sm bg-white border-slate-200"
                            >
                              <option value="">
                                {isInventoryItemsLoading
                                  ? t("salesReceivables.state.loadingItems")
                                  : t("salesReceivables.empty.selectItemOrService")}
                              </option>
                              {inventoryItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {formatItemServiceLabel(item.code, item.name)}
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-2.5 py-3.5">
                            <Input
                              value={line.itemName}
                              onChange={(event) =>
                                updateLine(line.key, (current) => ({ ...current, itemName: event.target.value }))
                              }
                              placeholder={t("salesReceivables.field.itemSnapshotPlaceholder")}
                              className="h-10 rounded-lg text-sm bg-white border-slate-200"
                            />
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
                              className="h-10 rounded-lg text-sm bg-white border-slate-200"
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
                              onChange={(event) =>
                                updateLine(line.key, (current) => ({ ...current, quantity: event.target.value }))
                              }
                              className="h-10 rounded-lg text-sm font-mono text-center bg-white border-slate-200"
                            />
                          </td>
                          <td className="px-2.5 py-3.5">
                            <CurrencyAmountInput
                              currencyCode={editor.currencyCode || "JOD"}
                              isRtl={isArabic}
                              min="0"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(event) =>
                                updateLine(line.key, (current) => ({ ...current, unitPrice: event.target.value }))
                              }
                              className="h-10 rounded-lg text-sm"
                            />
                          </td>
                          <td className="px-2.5 py-3.5">
                            <CurrencyAmountInput
                              currencyCode={editor.currencyCode || "JOD"}
                              isRtl={isArabic}
                              min="0"
                              step="0.01"
                              value={line.discountAmount}
                              onChange={(event) =>
                                updateLine(line.key, (current) => ({ ...current, discountAmount: event.target.value }))
                              }
                              className="h-10 rounded-lg text-sm"
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
                              className="h-10 rounded-lg text-sm bg-white border-slate-200"
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
                              currencyCode={editor.currencyCode || "JOD"}
                              isRtl={isArabic}
                              min="0"
                              step="0.01"
                              value={line.lineAmount}
                              readOnly
                              disabled
                              className="h-10 rounded-lg text-sm bg-slate-100 text-emerald-700 font-bold disabled:opacity-100 border-transparent"
                            />
                          </td>
                          <td className="px-2.5 py-3.5 text-center">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => removeLine(line.key)}
                              disabled={editor.lines.length === 1}
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

              {/* Totals Section */}
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
                  <div></div>
                  <div className="rounded-2xl bg-slate-50/70 p-5 border border-slate-100 space-y-3">
                    <div className={cn("text-sm font-bold tracking-wide text-slate-500 mb-1", isArabic ? "text-right" : "text-left")}>
                      {t("salesReceivables.metric.quotationTotal")}
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm font-semibold text-slate-600">
                      <span>{isArabic ? "المبلغ قبل الضريبة" : "Amount before Tax"}</span>
                      <span className="font-mono text-slate-900 font-bold">
                        {editor.currencyCode || "JOD"} {totals.subtotalAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm font-semibold text-slate-600">
                      <span>{t("salesReceivables.metric.tax")}</span>
                      <span className="font-mono text-slate-900 font-bold">
                        {editor.currencyCode || "JOD"} {totals.taxAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 pt-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-base font-black text-slate-950">{t("salesReceivables.metric.total")}</span>
                        <span className="font-mono text-xl font-black text-emerald-700">
                          {editor.currencyCode || "JOD"} {totals.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className={cn("border-t border-slate-200 bg-white px-5 py-4 sm:px-8", isInline && "rounded-b-2xl shadow-md")}>
          <div className={cn("flex flex-col gap-3 sm:flex-row", isArabic ? "sm:flex-row-reverse" : "")}>
            <Button variant="secondary" onClick={onClose} className="rounded-2xl px-6">
              {t("salesReceivables.action.cancel")}
            </Button>
            <Button
              variant="secondary"
              onClick={onApprove}
              disabled={isSavingDraft || isApproving}
              className="rounded-2xl border-emerald-200 px-6 text-emerald-700 hover:bg-emerald-50"
            >
              <FileCheck2 className="h-4 w-4" />
              {t("salesReceivables.action.approveQuotation")}
            </Button>
            <Button
              onClick={onSaveDraft}
              disabled={isSavingDraft || isApproving}
              className="rounded-2xl bg-emerald-600 px-6 hover:bg-emerald-700"
            >
              <Save className="h-4 w-4" />
              {t("salesReceivables.action.saveDraft")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
