"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LuCheck as Check,
  LuCalendarDays as CalendarDays,
  LuCirclePlus as CirclePlus,
  LuPackage2 as Package2,
  LuSave as Save,
  LuShoppingCart as ShoppingCart,
  LuTrash2 as Trash2,
  LuUserRound as UserRound,
  LuX as X,
} from "react-icons/lu";

import { Button } from "@/components/ui";
import { CurrencyAmountInput, Field, Input, Select, Textarea } from "@/components/ui/forms";
import { getActiveTaxes, getCurrencies } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { cn, formatCurrency, formatItemServiceLabel } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { Customer, InventoryItem, SalesQuotation, Currency } from "@/types/api";
import {
  applyItemToSalesLine,
  calculateQuotationTotals,
  createEmptyLine,
  type SalesLineEditorState,
  withCalculatedLineAmount,
} from "./quotation-editor-modal";

type SalesOrderEditorValue = {
  id?: string;
  reference: string;
  orderDate: string;
  promisedDate: string;
  currencyCode: string;
  customerId: string;
  sourceQuotationId: string;
  shippingDetails: string;
  description: string;
  lines: SalesLineEditorState[];
};

type SalesOrderEditorModalProps = {
  isOpen: boolean;
  presentation?: "modal" | "inline";
  title: string;
  editor: SalesOrderEditorValue;
  customers: Customer[];
  quotations: SalesQuotation[];
  inventoryItems: InventoryItem[];
  isInventoryItemsLoading: boolean;
  revenueAccounts: { id: string; code: string; name: string }[];
  isSavingDraft: boolean;
  isConfirming: boolean;
  onClose: () => void;
  onChange: (editor: SalesOrderEditorValue) => void;
  onCustomerChange: (value: string) => void;
  onSaveDraft: () => void;
  onConfirm: () => void;
};

export function SalesOrderEditorModal({
  isOpen,
  presentation = "modal",
  title,
  editor,
  customers,
  quotations,
  inventoryItems,
  isInventoryItemsLoading,
  revenueAccounts,
  isSavingDraft,
  isConfirming,
  onClose,
  onChange,
  onCustomerChange,
  onSaveDraft,
  onConfirm,
}: SalesOrderEditorModalProps) {
  const { t, language } = useTranslation();
  const { token } = useAuth();
  const { data: taxes = [] } = useQuery({ queryKey: ["taxes", "active", token], queryFn: () => getActiveTaxes(token) });
  const { data: currencies = [] } = useQuery({ queryKey: ["currencies", token], queryFn: () => getCurrencies(token) });
  const isArabic = language === "ar";
  const isInline = presentation === "inline";
  const totals = useMemo(() => calculateQuotationTotals(editor.lines), [editor.lines]);

  const controlClassName = cn(
    "h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/10",
    isArabic && "arabic-ui text-right",
  );
  const labelClassName = cn("text-[12px] font-bold tracking-normal text-slate-700", isArabic && "arabic-ui");

  const updateEditor = (updater: (current: SalesOrderEditorValue) => SalesOrderEditorValue) => {
    onChange(updater(editor));
  };

  const updateLine = (lineKey: string, updater: (line: SalesLineEditorState) => SalesLineEditorState) => {
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

  const selectedCustomer = customers.find((row) => row.id === editor.customerId);

  return (
    <div className={cn(isInline ? "relative" : "fixed inset-0 z-50 p-3 sm:p-6")}>
      {!isInline ? <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} /> : null}
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className={cn(
          "relative mx-auto flex flex-col overflow-hidden",
          isInline
            ? "min-h-[calc(100vh-220px)] w-full bg-transparent"
            : "h-full max-h-full max-w-[1720px] rounded-lg border border-slate-200 bg-[#f8fafc] shadow-[0_18px_42px_rgba(15,23,42,0.12)]",
          isArabic && "arabic-ui",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute end-3 top-3 z-30 rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
        >
          <span className="sr-only">{t("salesReceivables.action.cancel")}</span>
          <X className="h-5 w-5" />
        </button>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.05),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)]",
            isInline ? "px-0 pb-2 pt-1" : "px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4",
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <section className="rounded-md border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-4">
              <div className={cn("mb-3 flex items-center gap-2.5 border-b border-slate-200 pb-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <div className={cn("text-base text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                    {title}
                  </div>
                  {editor.reference ? <div className="text-xs text-slate-500">{editor.reference}</div> : null}
                </div>
              </div>

              <div className="grid gap-x-4 gap-y-3 border-b border-slate-200 pb-4 sm:grid-cols-2 xl:grid-cols-4">
                <Field label={t("salesReceivables.field.customer")} required labelClassName={labelClassName}>
                  <div className="relative">
                    <Select
                      value={editor.customerId}
                      onChange={(event) => onCustomerChange(event.target.value)}
                      className={cn(controlClassName, isArabic ? "pe-10" : "ps-10")}
                    >
                      <option value="">{t("salesReceivables.empty.selectActiveCustomer")}</option>
                      {customers.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.code} · {row.name}
                        </option>
                      ))}
                    </Select>
                    <UserRound className={cn("pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400", isArabic ? "left-3" : "right-3")} />
                  </div>
                  <div className={cn("mt-1 text-[11px] text-slate-500", isArabic ? "text-right" : "text-left")}>
                    {selectedCustomer ? (
                      <>
                        {t("salesReceivables.field.customerTaxTreatment")}:{" "}
                        {selectedCustomer.taxTreatment
                          ? isArabic
                            ? selectedCustomer.taxTreatment.arabicName
                            : selectedCustomer.taxTreatment.englishName
                          : t("salesReceivables.empty.notSet")}
                      </>
                    ) : (
                      t("salesReceivables.empty.selectCustomerToViewTaxTreatment")
                    )}
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.orderDate")} required labelClassName={labelClassName}>
                  <div className="relative">
                    <Input
                      type="date"
                      value={editor.orderDate}
                      onChange={(event) =>
                        updateEditor((current) => ({ ...current, orderDate: event.target.value }))
                      }
                      className={cn(controlClassName, isArabic ? "pe-10" : "ps-10")}
                    />
                    <CalendarDays className={cn("pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400", isArabic ? "left-3" : "right-3")} />
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.promisedDate")} required labelClassName={labelClassName}>
                  <div className="relative">
                    <Input
                      type="date"
                      value={editor.promisedDate}
                      onChange={(event) =>
                        updateEditor((current) => ({ ...current, promisedDate: event.target.value }))
                      }
                      className={cn(controlClassName, isArabic ? "pe-10" : "ps-10")}
                    />
                    <CalendarDays className={cn("pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400", isArabic ? "left-3" : "right-3")} />
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.currency")} required labelClassName={labelClassName}>
                  <Select
                    value={editor.currencyCode}
                    onChange={(event) =>
                      updateEditor((current) => ({
                        ...current,
                        currencyCode: event.target.value,
                      }))
                    }
                    className={controlClassName}
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

              <div className="grid gap-x-4 gap-y-3 pt-4 sm:grid-cols-2">
                <Field label={t("salesReceivables.field.sourceQuotation")} labelClassName={labelClassName}>
                  <Select
                    value={editor.sourceQuotationId}
                    onChange={(event) =>
                      updateEditor((current) => ({ ...current, sourceQuotationId: event.target.value }))
                    }
                    className={controlClassName}
                  >
                    <option value="">{t("salesReceivables.empty.manualOrder")}</option>
                    {quotations.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.reference}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label={t("salesReceivables.field.description")} labelClassName={labelClassName}>
                  <Textarea
                    rows={3}
                    value={editor.description}
                    onChange={(event) =>
                      updateEditor((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder={t("salesReceivables.field.description")}
                    className={cn("min-h-[88px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/10", isArabic && "arabic-ui text-right")}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-md border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                    <Package2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className={cn("text-base text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                      {t("salesReceivables.section.documentLines")}
                    </div>
                    <div className="text-xs text-slate-500">{t("salesReceivables.section.documentLinesDescription")}</div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={addLine}
                  className="px-4"
                >
                  <CirclePlus className="h-4 w-4" />
                  {t("salesReceivables.action.addLine")}
                </Button>
              </div>

              <div className="space-y-4">
                {editor.lines.map((line, index) => (
                  <div key={line.key} className="rounded-md border border-slate-200 bg-slate-50/45 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-slate-700 shadow-sm">
                          <span className="text-sm font-extrabold">{index + 1}</span>
                        </div>
                        <div>
                          <div className={cn("text-sm text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                            {t("salesReceivables.line.label", { index: index + 1 })}
                          </div>
                          <div className="text-xs text-slate-500">{formatCurrency(Number(line.lineAmount || 0))}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        disabled={editor.lines.length === 1}
                        className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("salesReceivables.action.remove")}
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <div className="min-w-[1400px]">
                        <div className="mb-3 grid grid-cols-[0.4fr_2.4fr_2.1fr_2.1fr_0.7fr_0.9fr_0.9fr_2fr] gap-3">
                          {[
                            "#",
                            t("salesReceivables.field.itemOrService"),
                            t("salesReceivables.field.itemSnapshot"),
                            t("salesReceivables.field.revenueAccount"),
                            t("salesReceivables.field.quantity"),
                            t("salesReceivables.field.unitPrice"),
                            t("salesReceivables.field.discountAmount"),
                            t("salesReceivables.field.tax"),
                          ].map((label, labelIndex) => (
                            <div
                              key={`${line.key}-label-${labelIndex}`}
                              className={cn(
                                "px-1 text-sm font-bold text-slate-900",
                                isArabic ? "arabic-ui text-right" : "text-left",
                              )}
                            >
                              {label}
                              {labelIndex > 0 &&
                              labelIndex !== 2 &&
                              labelIndex !== 6 &&
                              labelIndex !== 7 ? (
                                <span className="ms-1 text-red-500">*</span>
                              ) : null}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-[0.4fr_2.4fr_2.1fr_2.1fr_0.7fr_0.9fr_0.9fr_2fr] gap-3">
                          <div className="flex h-full items-center justify-center rounded-md bg-white text-base font-extrabold text-slate-900 shadow-sm">
                            {index + 1}
                          </div>

                          <Select
                            value={line.itemId}
                            onChange={(event) => {
                              const item = inventoryItems.find((row) => row.id === event.target.value) ?? null;
                              const customer = customers.find((row) => row.id === editor.customerId) ?? null;

                              let shouldUpdatePrice = true;
                              if (line.unitPrice && line.unitPrice !== "0" && line.itemId) {
                                const previousItem = inventoryItems.find((row) => row.id === line.itemId);
                                if (previousItem && line.unitPrice !== previousItem.defaultSalesPrice) {
                                  if (!confirm(t("salesReceivables.message.confirmPriceUpdate"))) {
                                    shouldUpdatePrice = false;
                                  }
                                }
                              }

                              updateLine(line.key, (current) =>
                                applyItemToSalesLine(current, item, customer, taxes, shouldUpdatePrice),
                              );
                            }}
                            className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
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

                          <Input
                            value={line.itemName}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({ ...current, itemName: event.target.value }))
                            }
                            placeholder={t("salesReceivables.field.itemSnapshotPlaceholder")}
                            className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                          />

                          <Select
                            value={line.revenueAccountId}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({
                                ...current,
                                revenueAccountId: event.target.value,
                              }))
                            }
                            className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                          >
                            <option value="">{t("salesReceivables.empty.selectRevenueAccount")}</option>
                            {revenueAccounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.code} · {account.name}
                              </option>
                            ))}
                          </Select>

                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={line.quantity}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({ ...current, quantity: event.target.value }))
                            }
                            className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                          />

                          <CurrencyAmountInput
                            currencyCode={editor.currencyCode || "JOD"}
                            isRtl={isArabic}
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({ ...current, unitPrice: event.target.value }))
                            }
                            className={cn(isArabic && "arabic-ui")}
                          />

                          <CurrencyAmountInput
                            currencyCode={editor.currencyCode || "JOD"}
                            isRtl={isArabic}
                            min="0"
                            step="0.01"
                            value={line.discountAmount}
                            onChange={(event) =>
                              updateLine(line.key, (current) => ({ ...current, discountAmount: event.target.value }))
                            }
                            className={cn(isArabic && "arabic-ui")}
                          />

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
                            className={cn("border-slate-200 bg-white", isArabic && "arabic-ui text-right")}
                          >
                            <option value="">{t("salesReceivables.field.tax")}</option>
                            {taxes.map((tax) => (
                              <option key={tax.id} value={tax.id}>
                                {tax.taxName} {Number(tax.rate).toFixed(2)}%
                              </option>
                            ))}
                          </Select>
                        </div>

                        <div className="mt-3 grid grid-cols-[1fr_1fr_1.15fr] gap-3">
                          <div />
                          <div />
                          <div>
                            <div className={cn("mb-2 px-1 text-sm font-bold text-slate-900", isArabic ? "arabic-ui text-right" : "text-left")}>
                              {t("salesReceivables.field.lineAmount")}
                            </div>
                            <CurrencyAmountInput
                              currencyCode={editor.currencyCode || "JOD"}
                              isRtl={isArabic}
                              min="0"
                              step="0.01"
                              value={line.lineAmount}
                              readOnly
                              disabled
                              className={cn("bg-slate-100 text-emerald-700 disabled:opacity-100", isArabic && "arabic-ui")}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.25fr_1fr_1fr]">
              <div className="rounded-md border border-emerald-200 bg-emerald-50/80 p-5 shadow-[0_10px_24px_rgba(16,185,129,0.08)]">
                <div className="text-sm font-bold text-emerald-700">{t("salesReceivables.metric.total")}</div>
                <div className="mt-2 text-3xl font-black text-emerald-700">
                  {editor.currencyCode || "JOD"} {totals.totalAmount.toFixed(2)}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-5">
                <div className="text-sm font-bold text-slate-500">{t("salesReceivables.metric.subtotal")}</div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {editor.currencyCode || "JOD"} {totals.subtotalAmount.toFixed(2)}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-5">
                <div className="text-sm font-bold text-slate-500">{t("salesReceivables.metric.tax")}</div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {editor.currencyCode || "JOD"} {totals.taxAmount.toFixed(2)}
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-4">
          <div className={cn("flex flex-col gap-3 sm:flex-row", isArabic ? "sm:flex-row-reverse" : "")}>
            <Button variant="secondary" onClick={onClose} className="px-6">
              {t("salesReceivables.action.cancel")}
            </Button>
            <Button variant="secondary" onClick={onSaveDraft} disabled={isSavingDraft || isConfirming} className="px-6">
              <Save className="h-4 w-4" />
              {editor.id ? t("salesReceivables.action.saveChanges") : t("salesReceivables.action.saveDraft")}
            </Button>
            <Button onClick={onConfirm} disabled={isSavingDraft || isConfirming} className="bg-emerald-600 px-6 hover:bg-emerald-700">
              <Check className="h-4 w-4" />
              تاكيد أمر البيع
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
