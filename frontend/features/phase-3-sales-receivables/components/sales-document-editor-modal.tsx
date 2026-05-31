"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "react-icons/lu";

import { Button } from "@/components/ui";
import { CurrencyAmountInput, Field, Input, Select } from "@/components/ui/forms";
import { getActiveTaxes, getCurrencies } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { cn, formatItemServiceLabel } from "@/lib/utils";
import type { Customer, InventoryItem, InventoryWarehouse, Tax, Currency } from "@/types/api";
import { useAuth } from "@/providers/auth-provider";
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
  const sectionBorderClass = "border-slate-200";
  const controlClassName = cn(
    "h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/10",
    isArabic && "arabic-ui text-right",
  );
  const labelClassName = cn("text-[12px] font-bold tracking-normal text-slate-700", isArabic && "arabic-ui");
  const tabs = [
    { key: "lines" as const, label: "بنود الفاتورة" },
    { key: "journal" as const, label: "عناصر اليومية" },
    { key: "other" as const, label: "معلومات أخرى" },
  ];
  void allowTaxOverride;
  void description;
  void title;
  void onReferenceChange;
  void onDescriptionChange;

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

  if (!isOpen) {
    return null;
  }

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
            {validationError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {validationError}
              </div>
            ) : null}

            <section className="flex min-h-0 flex-1 flex-col rounded-md border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-4">
              <div className={cn("mb-3 flex items-center gap-2.5 border-b pb-3", sectionBorderClass, isArabic ? "flex-row-reverse text-right" : "text-left")}>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className={cn("text-base text-slate-900", isArabic ? "arabic-ui-heading" : "font-extrabold")}>
                    {introTitle}
                  </div>
                  {introDescription ? <div className="text-xs text-slate-500">{introDescription}</div> : null}
                </div>
              </div>

              {/* Header: 4-column grid that fills the full width */}
              <div className="grid gap-x-4 gap-y-3 border-b pb-4 sm:grid-cols-2 xl:grid-cols-4" style={{ borderColor: "#e2e8f0" }}>
                {/* Customer — spans 2 columns on xl */}
                <div className="sm:col-span-2">
                  <Field label={t("salesReceivables.field.customer")} required labelClassName={labelClassName}>
                    <div className="relative">
                      <Select
                        value={customerId}
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
                      اختر العميل لعرض المعاملة الضريبية
                    </div>
                  </Field>
                </div>

                {/* Invoice Date */}
                <Field label={dateLabel} required labelClassName={labelClassName}>
                  <div className="relative">
                    <Input
                      type="date"
                      value={dateValue}
                      onChange={(event) => onDateChange(event.target.value)}
                      className={cn(controlClassName, isArabic ? "pe-10" : "ps-10")}
                    />
                    <CalendarDays className={cn("pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400", isArabic ? "left-3" : "right-3")} />
                  </div>
                </Field>

                {/* Secondary Date (Due Date) or Currency */}
                {secondaryDateLabel && onSecondaryDateChange ? (
                  <Field label={secondaryDateLabel} labelClassName={labelClassName}>
                    <div className="relative">
                      <Input
                        type="date"
                        value={secondaryDateValue ?? ""}
                        onChange={(event) => onSecondaryDateChange(event.target.value)}
                        className={cn(controlClassName, isArabic ? "pe-10" : "ps-10")}
                      />
                      <CalendarDays className={cn("pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400", isArabic ? "left-3" : "right-3")} />
                    </div>
                  </Field>
                ) : (
                  <Field label={t("salesReceivables.field.currency")} required labelClassName={labelClassName}>
                    <Select
                      value={currencyCode}
                      onChange={(event) => onCurrencyChange(event.target.value)}
                      className={cn(controlClassName)}
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
                )}

                {/* If secondary date exists, show currency as 4th column */}
                {secondaryDateLabel && onSecondaryDateChange ? (
                  <Field label={t("salesReceivables.field.currency")} required labelClassName={labelClassName}>
                    <Select
                      value={currencyCode}
                      onChange={(event) => onCurrencyChange(event.target.value)}
                      className={cn(controlClassName)}
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
                ) : null}
              </div>

              <div className={cn("flex flex-wrap items-end gap-1.5 border-b py-2", sectionBorderClass)}>
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "rounded-sm border border-transparent bg-transparent px-3 py-2 text-sm font-bold text-slate-500 transition",
                      activeTab === tab.key
                        ? "border-slate-200 bg-white text-slate-900 shadow-[inset_0_-2px_0_0_#059669]"
                        : "hover:bg-slate-50 hover:text-slate-900",
                      isArabic && "arabic-ui",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex min-h-0 flex-1 flex-col pt-3">
                {activeTab === "lines" ? (
                  <>
                    <div className="mb-2 flex items-center gap-2 text-slate-600">
                      <Package2 className="h-4 w-4" />
                      <div className={cn("text-sm font-bold", isArabic && "arabic-ui")}>{t("salesReceivables.section.documentLines")}</div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-slate-200 bg-slate-50/40">
                      <div className="h-full overflow-auto">
                        <table className="min-w-[1360px] table-fixed border-separate border-spacing-0">
                          <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_rgba(148,163,184,0.9)]">
                            <tr>
                              {[
                                t("salesReceivables.field.itemOrService"),
                                t("inventory.warehouse.title"),
                                t("salesReceivables.field.revenueAccount"),
                                t("salesReceivables.field.quantity"),
                                t("salesReceivables.field.unitPrice"),
                                t("salesReceivables.field.discountAmount"),
                                t("salesReceivables.field.tax"),
                                t("salesReceivables.field.lineAmount"),
                                t("salesReceivables.action.remove"),
                                "#",
                              ].map((label, labelIndex) => (
                                <th
                                  key={`line-table-header-${labelIndex}`}
                                  className={cn(
                                    "border-b border-slate-200 px-3 py-2.5 text-xs font-extrabold text-slate-900",
                                    isArabic ? "arabic-ui text-right" : "text-left",
                                    labelIndex === 0 && "w-[260px]",
                                    labelIndex === 1 && "w-[190px]",
                                    labelIndex === 2 && "w-[220px]",
                                    labelIndex === 3 && "w-[110px]",
                                    labelIndex === 4 && "w-[130px]",
                                    labelIndex === 5 && "w-[130px]",
                                    labelIndex === 6 && "w-[200px]",
                                    labelIndex === 7 && "w-[150px]",
                                    labelIndex === 8 && "w-[88px]",
                                    labelIndex === 9 && "w-[72px]",
                                  )}
                                >
                                  <span className="inline-flex items-center gap-1">
                                    {label}
                                    {labelIndex <= 4 ? <span className="text-red-500">*</span> : null}
                                  </span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {lines.map((line, index) => {
                              const selectedItem = inventoryItems.find((row) => row.id === line.itemId) ?? null;

                              return (
                                <tr key={line.key} className="align-top">
                                  <td className="border-b border-slate-200 px-2.5 py-2">
                                    <Select
                                      value={line.itemId}
                                      onChange={(event) => {
                                        const item = inventoryItems.find((row) => row.id === event.target.value) ?? null;
                                        const customer = customers.find((c) => c.id === customerId) ?? null;

                                        let shouldUpdatePrice = true;
                                        if (line.unitPrice && line.unitPrice !== "0" && line.itemId) {
                                          const prevItem = inventoryItems.find((i) => i.id === line.itemId);
                                          if (prevItem && line.unitPrice !== prevItem.defaultSalesPrice) {
                                            if (!confirm(t("salesReceivables.message.confirmPriceUpdate"))) {
                                              shouldUpdatePrice = false;
                                            }
                                          }
                                        }

                                        updateLine(line.key, (current) => applyItemToSalesLine(current, item, customer, taxes, shouldUpdatePrice));
                                      }}
                                      className={controlClassName}
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
                                  <td className="border-b border-slate-200 px-2.5 py-2">
                                    <Select
                                      value={line.warehouseId}
                                      disabled={!selectedItem || selectedItem.type === "SERVICE"}
                                      onChange={(event) =>
                                        updateLine(line.key, (current) => ({
                                          ...current,
                                          warehouseId: event.target.value,
                                        }))
                                      }
                                      className={controlClassName}
                                    >
                                      <option value="">
                                        {selectedItem?.type === "SERVICE" ? t("inventory.common.notApplicable") : t("inventory.placeholder.selectWarehouse")}
                                      </option>
                                      {warehouses
                                        .filter((warehouse) => warehouse.isActive)
                                        .map((warehouse) => (
                                          <option key={warehouse.id} value={warehouse.id}>
                                            {warehouse.code} · {warehouse.name}
                                          </option>
                                        ))}
                                    </Select>
                                  </td>
                                  <td className="border-b border-slate-200 px-2.5 py-2">
                                    <Select
                                      value={line.revenueAccountId}
                                      onChange={(event) =>
                                        updateLine(line.key, (current) => ({
                                          ...current,
                                          revenueAccountId: event.target.value,
                                        }))
                                      }
                                      className={controlClassName}
                                    >
                                      <option value="">{t("salesReceivables.empty.selectRevenueAccount")}</option>
                                      {revenueAccounts.map((account) => (
                                        <option key={account.id} value={account.id}>
                                          {account.code} · {isArabic ? account.nameAr || account.name : account.name}
                                        </option>
                                      ))}
                                    </Select>
                                  </td>
                                  <td className="border-b border-slate-200 px-2.5 py-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={line.quantity}
                                      onChange={(event) =>
                                        updateLine(line.key, (current) => ({ ...current, quantity: event.target.value }))
                                      }
                                      className={cn(controlClassName, "text-center")}
                                    />
                                  </td>
                                  <td className="border-b border-slate-200 px-2.5 py-2">
                                    <CurrencyAmountInput
                                      currencyCode={currencyCode || "JOD"}
                                      isRtl={isArabic}
                                      min="0"
                                      step="0.01"
                                      value={line.unitPrice}
                                      onChange={(event) =>
                                        updateLine(line.key, (current) => ({ ...current, unitPrice: event.target.value }))
                                      }
                                    />
                                  </td>
                                  <td className="border-b border-slate-200 px-2.5 py-2">
                                    <CurrencyAmountInput
                                      currencyCode={currencyCode || "JOD"}
                                      isRtl={isArabic}
                                      min="0"
                                      step="0.01"
                                      value={line.discountAmount}
                                      onChange={(event) =>
                                        updateLine(line.key, (current) => ({ ...current, discountAmount: event.target.value }))
                                      }
                                    />
                                  </td>
                                  <td className="border-b border-slate-200 px-2.5 py-2">
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
                                      className={controlClassName}
                                    >
                                      <option value="">{t("salesReceivables.field.tax")}</option>
                                      {taxes.map((tax) => (
                                        <option key={tax.id} value={tax.id}>
                                          {tax.taxName} {Number(tax.rate).toFixed(2)}%
                                        </option>
                                      ))}
                                    </Select>
                                  </td>
                                  <td className="border-b border-slate-200 px-2.5 py-2">
                                    <CurrencyAmountInput
                                      currencyCode={currencyCode || "JOD"}
                                      isRtl={isArabic}
                                      min="0"
                                      step="0.01"
                                      value={line.lineAmount}
                                      readOnly
                                      disabled
                                      className="bg-slate-100 text-emerald-700 font-bold disabled:opacity-100"
                                    />
                                  </td>
                                  <td className="border-b border-slate-200 px-2.5 py-2">
                                    <button
                                      type="button"
                                      onClick={() => removeLine(line.key)}
                                      disabled={lines.length === 1}
                                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                                      title={t("salesReceivables.action.remove")}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </td>
                                  <td className="border-b border-slate-200 px-2.5 py-2">
                                    <div className="flex h-10 items-center justify-center rounded-md bg-slate-100 text-sm font-extrabold text-slate-900">
                                      {index + 1}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className={cn("mt-2 flex shrink-0", isArabic ? "justify-end" : "justify-start")}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={addLine}
                        className="rounded-md border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50"
                      >
                        <CirclePlus className="h-4 w-4" />
                        إضافة سطر
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[180px] items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500">
                    {activeTab === "journal" ? "سيظهر هنا عرض عناصر اليومية المرتبطة بالفاتورة." : "سيظهر هنا أي معلومات إضافية للفواتير في المستقبل."}
                  </div>
                )}

                <div className="mt-3 shrink-0 border-t border-slate-200 pt-3">
                  <div className="grid gap-3 lg:grid-cols-[1fr_minmax(0,340px)] lg:items-end">
                    <div
                      className={cn(
                        "flex flex-wrap items-center gap-2",
                        isArabic ? "justify-end" : "justify-start",
                      )}
                    >
                      <Button
                        onClick={onDraftSubmit}
                        disabled={isSubmitting || isPostSubmitting || isPostAndCreateReceiptSubmitting}
                        className="rounded-md bg-[#2E6245] px-4 hover:bg-[#27533B]"
                      >
                        <Save className="h-4 w-4" />
                        {draftSubmitLabel}
                      </Button>
                      {onPostSubmit && postSubmitLabel ? (
                        <Button
                          variant="secondary"
                          onClick={onPostSubmit}
                          disabled={isSubmitting || isPostSubmitting || isPostAndCreateReceiptSubmitting}
                          className="rounded-md border-slate-200 bg-white px-4 text-emerald-700 hover:bg-emerald-50"
                        >
                          <FileText className="h-4 w-4" />
                          {postSubmitLabel}
                        </Button>
                      ) : null}
                      {onPostAndCreateReceiptSubmit && postAndCreateReceiptLabel ? (
                        <Button
                          variant="secondary"
                          onClick={onPostAndCreateReceiptSubmit}
                          disabled={isSubmitting || isPostSubmitting || isPostAndCreateReceiptSubmitting}
                          title={postAndCreateReceiptTooltip}
                          className="rounded-md border-slate-200 bg-white px-4 text-sky-700 hover:bg-sky-50"
                        >
                          <ReceiptText className="h-4 w-4" />
                          {postAndCreateReceiptLabel}
                        </Button>
                      ) : null}
                      <Button variant="secondary" onClick={onClose} className="rounded-md border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-50">
                        {t("salesReceivables.action.cancel")}
                      </Button>
                    </div>

                    <div className="w-full bg-transparent px-1 py-1">
                      <div className={cn("mb-2 text-xs font-bold tracking-wide text-slate-500", isArabic ? "text-left arabic-ui" : "text-right")}>
                        {t("salesReceivables.metric.invoiceTotal")}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                          <span className={cn(isArabic && "arabic-ui")}>المبلغ قبل الضريبة</span>
                          <span className="font-mono font-bold text-slate-900">
                            {currencyCode || "JOD"} {totals.subtotalAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                          <span className={cn(isArabic && "arabic-ui")}>{t("salesReceivables.metric.tax")}</span>
                          <span className="font-mono font-bold text-slate-900">
                            {currencyCode || "JOD"} {totals.taxAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="border-t border-slate-200 pt-2.5">
                          <div className="flex items-center justify-between gap-4">
                            <span className={cn("text-base font-black text-slate-900", isArabic && "arabic-ui")}>{t("salesReceivables.metric.total")}</span>
                            <span className="font-mono text-xl font-black text-emerald-700">
                              {currencyCode || "JOD"} {totals.totalAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
