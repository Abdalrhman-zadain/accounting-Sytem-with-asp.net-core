"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LuCalendarDays as CalendarDays,
  LuCheck as Check,
  LuCirclePlus as CirclePlus,
  LuFileText as FileText,
  LuInfo as Info,
  LuSave as Save,
  LuTag as Tag,
  LuTrash2 as Trash2,
  LuUserRound as UserRound,
  LuX as X,
} from "react-icons/lu";

import { Button } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import { getActiveTaxes, getCurrencies } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type {
  CreditNoteType,
  Customer,
  InventoryWarehouse,
  SalesInvoice,
  Currency,
} from "@/types/api";
import {
  createEmptyLine,
  type SalesLineEditorState,
  withCalculatedLineAmount,
} from "./quotation-editor-modal";

type RevenueAccountOption = { id: string; code: string; name: string; nameAr?: string | null };

type CreditNoteLineEditorState = SalesLineEditorState & {
  salesInvoiceLineId?: string;
  originalUnitPrice?: string;
  correctedUnitPrice?: string;
  originalTaxAmount?: string;
  correctedTaxAmount?: string;
  returnToStock?: boolean;
  itemCondition?: string;
};

type CreditNoteEditorValue = {
  id?: string;
  reference: string;
  noteDate: string;
  currencyCode: string;
  customerId: string;
  creditNoteTypeId: string;
  salesInvoiceId: string;
  description: string;
  lines: CreditNoteLineEditorState[];
};

type CreditNoteEditorModalProps = {
  isOpen: boolean;
  presentation?: "modal" | "inline";
  title: string;
  editor: CreditNoteEditorValue;
  customers: Customer[];
  invoices: SalesInvoice[];
  creditNoteTypes: CreditNoteType[];
  revenueAccounts: RevenueAccountOption[];
  warehouses: InventoryWarehouse[];
  validationError?: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onChange: (editor: CreditNoteEditorValue) => void;
  onSubmit: () => void;
  onSubmitAndPost: () => void;
};

function createEmptyCreditNoteLine(defaultLabel: string, typeCode?: string, settlementLabel?: string): CreditNoteLineEditorState {
  return {
    ...createEmptyLine(),
    itemName:
      typeCode === "CN-CUSTOMER-SETTLEMENT" ? (settlementLabel ?? defaultLabel) : defaultLabel,
    quantity: "1",
    discountAmount: "",
    originalUnitPrice: "",
    correctedUnitPrice: "",
    originalTaxAmount: "",
    correctedTaxAmount: "",
    returnToStock: typeCode === "CN-SALES-RETURN",
    itemCondition: "",
    salesInvoiceLineId: "",
  };
}

function getReceivableAccountName(invoice?: SalesInvoice, isArabic?: boolean): string | null {
  const acc = invoice?.customer.receivableAccount;
  if (!acc) return null;
  const name = isArabic ? acc.nameAr || acc.name : acc.name;
  return `${acc.code} - ${name}`;
}

function formatAmount(value: number) {
  return value.toFixed(3);
}

function recalculateCreditNoteLine(
  line: CreditNoteLineEditorState,
  typeCode: string,
  sourceLine?: SalesInvoice["lines"][number],
) {
  if (!sourceLine) {
    return withCalculatedLineAmount(line);
  }

  if (typeCode === "CN-SALES-RETURN") {
    const soldQty = Number(sourceLine.quantity || 0) || 1;
    const quantity = Number(line.quantity || 0) || 0;
    const ratio = soldQty > 0 ? quantity / soldQty : 0;
    const unitPrice = Number(sourceLine.unitPrice || 0);
    const taxAmount = Number((Number(sourceLine.taxAmount || 0) * ratio).toFixed(3));
    return {
      ...withCalculatedLineAmount({
      ...line,
      itemId: sourceLine.itemId ?? "",
      warehouseId: line.warehouseId || sourceLine.warehouseId || "",
      itemName: sourceLine.itemName ?? line.itemName,
      description: line.description || sourceLine.description || "",
      taxId: sourceLine.taxId ?? "",
      unitPrice: formatAmount(unitPrice),
      discountAmount: "0.000",
      taxAmount: formatAmount(taxAmount),
      }),
      originalUnitPrice: formatAmount(unitPrice),
      originalTaxAmount: formatAmount(taxAmount),
    };
  }

  if (typeCode === "CN-PRICE-DIFF") {
    const quantity = Number(sourceLine.quantity || 0);
    const originalUnitPrice = Number(sourceLine.unitPrice || 0);
    const correctedUnitPrice = Number(
      line.correctedUnitPrice === undefined || line.correctedUnitPrice === ""
        ? originalUnitPrice
        : line.correctedUnitPrice,
    );
    const originalTaxAmount = Number(sourceLine.taxAmount || 0);
    const correctedTaxAmount = Number(
      line.correctedTaxAmount === undefined || line.correctedTaxAmount === ""
        ? originalTaxAmount
        : line.correctedTaxAmount,
    );
    const subtotal = Math.max(0, (originalUnitPrice - correctedUnitPrice) * quantity);
    const taxAmount = Math.max(0, originalTaxAmount - correctedTaxAmount);
    return {
      ...withCalculatedLineAmount({
        ...line,
        itemId: sourceLine.itemId ?? "",
        warehouseId: sourceLine.warehouseId ?? "",
        itemName: sourceLine.itemName ?? line.itemName,
        description: line.description || sourceLine.description || "",
        taxId: sourceLine.taxId ?? "",
        quantity: "1",
        unitPrice: formatAmount(subtotal),
        discountAmount: "0.000",
        taxAmount: formatAmount(taxAmount),
      }),
      originalUnitPrice: formatAmount(originalUnitPrice),
      originalTaxAmount: formatAmount(originalTaxAmount),
      correctedUnitPrice: line.correctedUnitPrice ?? formatAmount(originalUnitPrice),
      correctedTaxAmount: line.correctedTaxAmount ?? formatAmount(originalTaxAmount),
    };
  }

  if (typeCode === "CN-TAX-CORRECTION") {
    const originalTaxAmount = Number(sourceLine.taxAmount || 0);
    const correctedTaxAmount = Number(
      line.correctedTaxAmount === undefined || line.correctedTaxAmount === ""
        ? originalTaxAmount
        : line.correctedTaxAmount,
    );
    const taxDifference = Math.max(0, originalTaxAmount - correctedTaxAmount);
    return {
      ...withCalculatedLineAmount({
        ...line,
        itemId: sourceLine.itemId ?? "",
        warehouseId: sourceLine.warehouseId ?? "",
        itemName: sourceLine.itemName ?? line.itemName,
        description: line.description || sourceLine.description || "",
        taxId: sourceLine.taxId ?? "",
        quantity: "1",
        unitPrice: "0.000",
        discountAmount: "0.000",
        taxAmount: formatAmount(taxDifference),
      }),
      originalUnitPrice: formatAmount(Number(sourceLine.unitPrice || 0)),
      correctedUnitPrice: formatAmount(Number(sourceLine.unitPrice || 0)),
      originalTaxAmount: formatAmount(originalTaxAmount),
      correctedTaxAmount:
        line.correctedTaxAmount ?? formatAmount(originalTaxAmount),
    };
  }

  if (typeCode === "CN-CUSTOMER-SETTLEMENT") {
    const amount = Number(line.unitPrice || line.lineAmount || 0);
    return withCalculatedLineAmount({
      ...line,
      quantity: "1",
      unitPrice: formatAmount(amount),
      discountAmount: "0.000",
      taxId: "",
      taxAmount: "0.000",
    });
  }

  return withCalculatedLineAmount(line);
}

function calculateEditorTotals(lines: CreditNoteLineEditorState[]) {
  return lines.reduce(
    (totals, line) => {
      const totalAmount = Number(line.lineAmount || 0);
      const taxAmount = Number(line.taxAmount || 0);
      const subtotalAmount = Math.max(0, totalAmount - taxAmount);
      return {
        subtotalAmount: Number((totals.subtotalAmount + subtotalAmount).toFixed(3)),
        taxAmount: Number((totals.taxAmount + taxAmount).toFixed(3)),
        totalAmount: Number((totals.totalAmount + totalAmount).toFixed(3)),
      };
    },
    { subtotalAmount: 0, taxAmount: 0, totalAmount: 0 },
  );
}

export function CreditNoteEditorModal({
  isOpen,
  presentation = "modal",
  title,
  editor,
  customers,
  invoices,
  creditNoteTypes,
  revenueAccounts,
  warehouses,
  validationError,
  isSubmitting,
  onClose,
  onChange,
  onSubmit,
  onSubmitAndPost,
}: CreditNoteEditorModalProps) {
  const { t, language } = useTranslation();
  const { token } = useAuth();
  const { data: taxes = [] } = useQuery({
    queryKey: ["taxes", "active", token],
    queryFn: () => getActiveTaxes(token),
  });
  const { data: currencies = [] } = useQuery({
    queryKey: ["currencies", token],
    queryFn: () => getCurrencies(token),
  });
  const isArabic = language === "ar";
  const isInline = presentation === "inline";
  const selectedType =
    creditNoteTypes.find((type) => type.id === editor.creditNoteTypeId) ?? null;
  const typeCode = selectedType?.code ?? "";
  const selectedInvoice = invoices.find((invoice) => invoice.id === editor.salesInvoiceId);
  const selectedCustomer =
    customers.find((customer) => customer.id === editor.customerId) ?? selectedInvoice?.customer;
  const currencyCode = editor.currencyCode || selectedInvoice?.currencyCode || "JOD";
  const totals = useMemo(() => calculateEditorTotals(editor.lines), [editor.lines]);
  const availableCredit = selectedInvoice ? Number(selectedInvoice.outstandingAmount) : null;
  const exceedsOutstanding =
    availableCredit !== null && totals.totalAmount > availableCredit + 0.001;
  const defaultDiscountLabel = t("salesReceivables.creditNote.defaultDiscountLabel");
  const settlementLabel = t("salesReceivables.creditNote.settlementLabel");
  const invoiceLineOptions = selectedInvoice?.lines ?? [];

  const updateEditorLines = (lines: CreditNoteLineEditorState[]) => {
    onChange({
      ...editor,
      lines,
    });
  };

  const updateLine = (
    lineKey: string,
    updater: (line: CreditNoteLineEditorState) => CreditNoteLineEditorState,
  ) => {
    updateEditorLines(
      editor.lines.map((line) => {
        if (line.key !== lineKey) {
          return line;
        }
        const next = updater(line);
        const sourceLine = invoiceLineOptions.find(
          (candidate) => candidate.id === next.salesInvoiceLineId,
        );
        return recalculateCreditNoteLine(next, typeCode, sourceLine);
      }),
    );
  };

  const removeLine = (lineKey: string) => {
    if (editor.lines.length === 1) {
      return;
    }
    updateEditorLines(editor.lines.filter((line) => line.key !== lineKey));
  };

  const addLine = () => {
    updateEditorLines([
      ...editor.lines,
      createEmptyCreditNoteLine(defaultDiscountLabel, typeCode, settlementLabel),
    ]);
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
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <span className="sr-only">{t("salesReceivables.action.cancel")}</span>
              <X className="h-6 w-6" />
            </button>
            <div className={cn("flex items-center gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
              <div>
                <div className={cn("text-2xl text-slate-950 sm:text-3xl", isArabic ? "arabic-ui-heading" : "font-black tracking-tight")}>
                  {title}
                </div>
                {editor.reference ? <div className="text-sm font-semibold text-slate-500">{editor.reference}</div> : null}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                <FileText className="h-6 w-6" />
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
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-slate-900 arabic-ui-heading">{title}</h1>
                  <p className="truncate text-sm text-slate-500">
                    {editor.reference || (isArabic ? "إنشاء وتعديل الإشعارات الدائنة للعملاء" : "Create and manage customer credit notes")}
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
              <div className={cn("mb-4 text-lg text-slate-950", isArabic ? "arabic-ui-heading text-right" : "font-black")}>
                {t("salesReceivables.creditNote.section.noticeData")}
              </div>
              <div className="grid gap-4 lg:grid-cols-4">
                <Field label={t("salesReceivables.field.creditNoteDate")} required labelAlign={isArabic ? "end" : "start"}>
                  <div className="relative">
                    <Input
                      type="date"
                      value={editor.noteDate}
                      onChange={(event) => onChange({ ...editor, noteDate: event.target.value })}
                      className={cn("h-12 border-slate-200 bg-white", isArabic ? "pe-12 ps-12 text-right" : "ps-12")}
                    />
                    <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>

                <Field label={t("salesReceivables.field.customer")} required labelAlign={isArabic ? "end" : "start"}>
                  <div className="relative">
                    <Select
                      value={editor.customerId}
                      onChange={(event) =>
                        onChange({
                          ...editor,
                          customerId: event.target.value,
                          salesInvoiceId: "",
                          lines: [createEmptyCreditNoteLine(defaultDiscountLabel, typeCode)],
                        })
                      }
                      className={cn("h-12 border-slate-200 bg-white", isArabic ? "pe-12 ps-12 text-right" : "ps-12")}
                    >
                      <option value="">{t("salesReceivables.empty.selectActiveCustomer")}</option>
                      {customers.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.code} - {row.name}
                        </option>
                      ))}
                    </Select>
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>

                <Field label={t("salesReceivables.creditNote.type")} required labelAlign={isArabic ? "end" : "start"}>
                  <Select
                    value={editor.creditNoteTypeId}
                    onChange={(event) => {
                      const nextType =
                        creditNoteTypes.find((type) => type.id === event.target.value) ?? null;
onChange({
                          ...editor,
                          creditNoteTypeId: event.target.value,
                          salesInvoiceId:
                            nextType?.linkedInvoiceRequirement === "OPTIONAL"
                              ? editor.salesInvoiceId
                              : "",
                          lines: [
                            createEmptyCreditNoteLine(
                              defaultDiscountLabel,
                              nextType?.code,
                              settlementLabel,
                            ),
                          ],
                        });
                    }}
                    className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
                  >
                    <option value="">{t("salesReceivables.creditNote.selectTypePlaceholder")}</option>
                    {creditNoteTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label={t("salesReceivables.field.currency")} required labelAlign={isArabic ? "end" : "start"}>
                  <Select
                    value={currencyCode}
                    onChange={(event) => onChange({ ...editor, currencyCode: event.target.value.toUpperCase() })}
                    className={cn("h-12 border-slate-200 bg-white uppercase", isArabic && "text-right")}
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

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                <Field
                  label={t("salesReceivables.field.linkedInvoice")}
                  required={selectedType?.linkedInvoiceRequirement === "REQUIRED"}
                  labelAlign={isArabic ? "end" : "start"}
                >
                  <Select
                    value={editor.salesInvoiceId}
                    onChange={(event) => {
                      const invoice = invoices.find((row) => row.id === event.target.value);
                      onChange({
                        ...editor,
                        salesInvoiceId: event.target.value,
                        currencyCode: invoice?.currencyCode ?? editor.currencyCode,
                        lines: [
                          createEmptyCreditNoteLine(defaultDiscountLabel, typeCode, settlementLabel),
                        ],
                      });
                    }}
                    className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
                  >
                    <option value="">
                      {selectedType?.linkedInvoiceRequirement === "OPTIONAL"
                        ? t("salesReceivables.empty.noLinkedInvoice")
                        : t("salesReceivables.creditNote.selectLinkedInvoice")}
                    </option>
                    {invoices.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.reference}
                      </option>
                    ))}
                  </Select>
                  {availableCredit !== null ? (
                    <span
                      className={cn(
                        "mt-2 flex items-center justify-end gap-2 text-xs font-bold",
                        exceedsOutstanding ? "text-red-700" : "text-emerald-700",
                      )}
                    >
                      <Check className="h-4 w-4" />
                      {t("salesReceivables.creditNote.availableDiscount", {
                        amount: `${currencyCode} ${availableCredit.toFixed(3)}`,
                      })}
                    </span>
                  ) : null}
                </Field>

                <Field label={t("salesReceivables.creditNote.reason")} required labelAlign={isArabic ? "end" : "start"}>
                  <Textarea
                    rows={3}
                    value={editor.description}
                    onChange={(event) => onChange({ ...editor, description: event.target.value })}
                    placeholder={selectedType?.helperText || t("salesReceivables.creditNote.reasonPlaceholder", {
                      invoice: selectedInvoice?.reference ?? "INV-2026-0154",
                    })}
                    className={cn("min-h-[86px] resize-none border-slate-200 bg-white", isArabic && "text-right")}
                  />
                </Field>
              </div>

              <div className="mt-4 flex min-h-[86px] items-center justify-between gap-4 rounded-xl border border-emerald-400 bg-emerald-50/40 px-5 py-4">
                <div className={cn("space-y-1", isArabic ? "text-right" : "text-left")}>
                  <div className="text-base font-bold text-slate-950">
                    {selectedType?.name || t("salesReceivables.creditNote.postSaleDiscount")}
                  </div>
                  <div className="text-sm font-medium text-slate-500">
                    {selectedType?.helperText || t("salesReceivables.creditNote.postSaleDiscountHint")}
                  </div>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Tag className="h-5 w-5" />
                </div>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className={cn("mb-5 text-lg text-slate-950", isArabic ? "arabic-ui-heading text-right" : "font-black")}>
                {t("salesReceivables.creditNote.section.lines")}
              </div>

              <div className="space-y-3">
                {editor.lines.map((line, index) => {
                  const sourceLine = invoiceLineOptions.find(
                    (candidate) => candidate.id === line.salesInvoiceLineId,
                  );
                  return (
                    <div key={line.key} className="rounded-xl border border-slate-100 bg-slate-50/45 p-3">
                      <div className="mb-2.5 flex items-center justify-between">
                        <div className="text-sm font-bold text-slate-900">#{index + 1}</div>
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          disabled={editor.lines.length === 1}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-white text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300"
                        >
                          <span className="sr-only">{t("salesReceivables.action.remove")}</span>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {typeCode === "CN-SALES-RETURN" && (
                        <div className="grid gap-4 lg:grid-cols-6">
                          <Field label={t("salesReceivables.creditNote.invoiceLine")}>
                            <Select
                              value={line.salesInvoiceLineId || ""}
                              onChange={(event) =>
                                updateLine(line.key, (current) => ({
                                  ...current,
                                  salesInvoiceLineId: event.target.value,
                                }))
                              }
                              className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
                            >
                              <option value="">{t("salesReceivables.creditNote.selectInvoiceLine")}</option>
                              {invoiceLineOptions.map((invoiceLine) => (
                                <option key={invoiceLine.id} value={invoiceLine.id}>
                                  {invoiceLine.lineNumber} - {invoiceLine.itemName || invoiceLine.description || "Line"}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label={t("salesReceivables.creditNote.returnedQuantity")}>
                            <Input
                              type="number"
                              min="0"
                              step="0.001"
                              value={line.quantity}
                              onChange={(event) =>
                                updateLine(line.key, (current) => ({
                                  ...current,
                                  quantity: event.target.value,
                                }))
                              }
                              className="h-12 border-slate-200 bg-white text-center"
                            />
                          </Field>
                          <Field label={t("salesReceivables.creditNote.returnToStock")}>
                            <Select
                              value={line.returnToStock ? "true" : "false"}
                              onChange={(event) =>
                                updateLine(line.key, (current) => ({
                                  ...current,
                                  returnToStock: event.target.value === "true",
                                }))
                              }
                              className="h-12 border-slate-200 bg-white"
                            >
                              <option value="true">{t("inventory.boolean.yes")}</option>
                              <option value="false">{t("inventory.boolean.no")}</option>
                            </Select>
                          </Field>
                          <Field label={t("salesReceivables.creditNote.warehouse")}>
                            <Select
                              value={line.warehouseId || ""}
                              onChange={(event) =>
                                updateLine(line.key, (current) => ({
                                  ...current,
                                  warehouseId: event.target.value,
                                }))
                              }
                              className="h-12 border-slate-200 bg-white"
                            >
                              <option value="">{t("salesReceivables.creditNote.selectWarehouse")}</option>
                              {warehouses.map((warehouse) => (
                                <option key={warehouse.id} value={warehouse.id}>
                                  {warehouse.code} - {warehouse.name}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label={t("salesReceivables.creditNote.itemCondition")}>
                            <Input
                              value={line.itemCondition || ""}
                              onChange={(event) =>
                                updateLine(line.key, (current) => ({
                                  ...current,
                                  itemCondition: event.target.value,
                                }))
                              }
                              className="h-12 border-slate-200 bg-white"
                            />
                          </Field>
                          <Field label={t("salesReceivables.metric.total")}>
                            <CurrencyInput currencyCode={currencyCode} value={line.lineAmount} readOnly isArabic={isArabic} />
                          </Field>
                        </div>
                      )}

                      {typeCode === "CN-PRICE-DIFF" && (
                        <div className="grid gap-4 lg:grid-cols-5">
                          <Field label={t("salesReceivables.creditNote.invoiceLine")}>
                            <Select
                              value={line.salesInvoiceLineId || ""}
                              onChange={(event) =>
                                updateLine(line.key, (current) => ({
                                  ...current,
                                  salesInvoiceLineId: event.target.value,
                                }))
                              }
                              className="h-12 border-slate-200 bg-white"
                            >
                              <option value="">{t("salesReceivables.creditNote.selectInvoiceLine")}</option>
                              {invoiceLineOptions.map((invoiceLine) => (
                                <option key={invoiceLine.id} value={invoiceLine.id}>
                                  {invoiceLine.lineNumber} - {invoiceLine.itemName || invoiceLine.description || "Line"}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label={t("salesReceivables.creditNote.originalPrice")}>
                            <CurrencyInput currencyCode={currencyCode} value={line.originalUnitPrice || ""} readOnly isArabic={isArabic} />
                          </Field>
                          <Field label={t("salesReceivables.creditNote.correctedPrice")}>
                            <CurrencyInput
                              currencyCode={currencyCode}
                              value={line.correctedUnitPrice || ""}
                              onChange={(value) =>
                                updateLine(line.key, (current) => ({
                                  ...current,
                                  correctedUnitPrice: value,
                                }))
                              }
                              isArabic={isArabic}
                            />
                          </Field>
                          <Field label={t("salesReceivables.creditNote.correctedTax")}>
                            <CurrencyInput
                              currencyCode={currencyCode}
                              value={line.correctedTaxAmount || ""}
                              onChange={(value) =>
                                updateLine(line.key, (current) => ({
                                  ...current,
                                  correctedTaxAmount: value,
                                }))
                              }
                              isArabic={isArabic}
                            />
                          </Field>
                          <Field label={t("salesReceivables.metric.total")}>
                            <CurrencyInput currencyCode={currencyCode} value={line.lineAmount} readOnly isArabic={isArabic} />
                          </Field>
                        </div>
                      )}

                      {typeCode === "CN-TAX-CORRECTION" && (
                        <div className="grid gap-4 lg:grid-cols-4">
                          <Field label={t("salesReceivables.creditNote.invoiceLine")}>
                            <Select
                              value={line.salesInvoiceLineId || ""}
                              onChange={(event) =>
                                updateLine(line.key, (current) => ({
                                  ...current,
                                  salesInvoiceLineId: event.target.value,
                                }))
                              }
                              className="h-12 border-slate-200 bg-white"
                            >
                              <option value="">{t("salesReceivables.creditNote.selectInvoiceLine")}</option>
                              {invoiceLineOptions.map((invoiceLine) => (
                                <option key={invoiceLine.id} value={invoiceLine.id}>
                                  {invoiceLine.lineNumber} - {invoiceLine.itemName || invoiceLine.description || "Line"}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label={t("salesReceivables.creditNote.originalTax")}>
                            <CurrencyInput currencyCode={currencyCode} value={line.originalTaxAmount || ""} readOnly isArabic={isArabic} />
                          </Field>
                          <Field label={t("salesReceivables.creditNote.correctedTax")}>
                            <CurrencyInput
                              currencyCode={currencyCode}
                              value={line.correctedTaxAmount || ""}
                              onChange={(value) =>
                                updateLine(line.key, (current) => ({
                                  ...current,
                                  correctedTaxAmount: value,
                                }))
                              }
                              isArabic={isArabic}
                            />
                          </Field>
                          <Field label={t("salesReceivables.metric.total")}>
                            <CurrencyInput currencyCode={currencyCode} value={line.lineAmount} readOnly isArabic={isArabic} />
                          </Field>
                        </div>
                      )}

                      {(typeCode === "CN-CUSTOMER-SETTLEMENT" || !typeCode || typeCode === "CN-DISCOUNT") && (
                        <div className="grid gap-4 lg:grid-cols-5">
                          <Field label={typeCode === "CN-CUSTOMER-SETTLEMENT" ? t("salesReceivables.creditNote.settlementReason") : t("salesReceivables.creditNote.discountType")}>
                            <Input
                              value={line.itemName || defaultDiscountLabel}
                              onChange={(event) =>
                                updateLine(line.key, (current) => ({
                                  ...current,
                                  itemName: event.target.value,
                                }))
                              }
                              className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
                            />
                          </Field>
                          <Field label={t("salesReceivables.field.revenueAccount")}>
                            <Select
                              value={line.revenueAccountId}
                              onChange={(event) =>
                                updateLine(line.key, (current) => ({
                                  ...current,
                                  revenueAccountId: event.target.value,
                                }))
                              }
                              className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
                            >
                              <option value="">{t("salesReceivables.empty.selectRevenueAccount")}</option>
                              {revenueAccounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.code} - {isArabic ? account.nameAr || account.name : account.name}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label={t("salesReceivables.creditNote.amountBeforeTax")}>
                            <CurrencyInput
                              currencyCode={currencyCode}
                              value={line.unitPrice}
                              onChange={(value) =>
                                updateLine(line.key, (current) => ({
                                  ...current,
                                  quantity: "1",
                                  unitPrice: value,
                                  discountAmount: "",
                                }))
                              }
                              isArabic={isArabic}
                            />
                          </Field>
                          <Field label={t("salesReceivables.field.taxAmount")}>
                            <Select
                              value={line.taxId}
                              onChange={(event) => {
                                const selectedTax = taxes.find((tax) => tax.id === event.target.value);
                                updateLine(line.key, (current) => ({
                                  ...current,
                                  taxId: selectedTax?.id ?? "",
                                  taxRate: selectedTax ? String(selectedTax.rate) : "",
                                  taxAmount:
                                    selectedTax && Number(current.unitPrice || 0) > 0
                                      ? formatAmount(
                                          Number(current.unitPrice || 0) *
                                            (Number(selectedTax.rate) / 100),
                                        )
                                      : "0.000",
                                }));
                              }}
                              className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
                            >
                              <option value="">{t("salesReceivables.field.taxAmount")}</option>
                              {taxes.map((tax) => (
                                <option key={tax.id} value={tax.id}>
                                  {tax.taxName} {Number(tax.rate).toFixed(2)}%
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label={t("salesReceivables.metric.total")}>
                            <CurrencyInput currencyCode={currencyCode} value={line.lineAmount} readOnly isArabic={isArabic} />
                          </Field>
                        </div>
                      )}
                      {sourceLine ? (
                        <div className="mt-3 text-xs font-medium text-slate-500">
                          {t("salesReceivables.creditNote.selectedLine")}: {sourceLine.lineNumber} - {sourceLine.itemName || sourceLine.description || "Line"}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
                  <div></div>
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className={cn("mb-4 text-sm font-bold text-slate-950", isArabic && "text-right")}>
                      {t("salesReceivables.creditNote.summary")}
                    </div>
                    <SummaryRow label={t("salesReceivables.summary.subtotalBeforeTax")} value={`${currencyCode} ${totals.subtotalAmount.toFixed(3)}`} isArabic={isArabic} />
                    <SummaryRow label={t("salesReceivables.field.taxAmount")} value={`${currencyCode} ${totals.taxAmount.toFixed(3)}`} isArabic={isArabic} />
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <SummaryRow
                        label={t("salesReceivables.creditNote.totalDiscount")}
                        value={`${currencyCode} ${totals.totalAmount.toFixed(3)}`}
                        isArabic={isArabic}
                        strong
                        highlight={exceedsOutstanding}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex min-w-[260px] items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-500 bg-white px-5 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                >
                  <CirclePlus className="h-4 w-4" />
                  {typeCode === "CN-CUSTOMER-SETTLEMENT" ? t("salesReceivables.creditNote.addSettlementLine") : t("salesReceivables.creditNote.addDiscountLine")}
                </button>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <MetricCard label={t("salesReceivables.field.taxAmount")} value={`${currencyCode} ${totals.taxAmount.toFixed(2)}`} />
              <MetricCard label={t("salesReceivables.summary.subtotalBeforeTax")} value={`${currencyCode} ${totals.subtotalAmount.toFixed(2)}`} />
              <MetricCard
                label={t("salesReceivables.creditNote.totalDiscount")}
                value={`${currencyCode} ${totals.totalAmount.toFixed(2)}`}
                highlight
              />
            </section>
          </div>
        </div>

        <div className={cn("border-t border-slate-200 bg-white px-5 py-4 sm:px-8", isInline && "rounded-b-2xl shadow-md")}>
          <div className={cn("flex flex-col gap-3 sm:flex-row", isArabic ? "sm:flex-row-reverse" : "")}>
            <Button variant="secondary" onClick={onClose} className="rounded-xl px-7">
              {t("salesReceivables.action.cancel")}
            </Button>
            <Button variant="secondary" onClick={onSubmit} disabled={isSubmitting} className="rounded-xl border-emerald-300 px-7 text-emerald-800 hover:bg-emerald-50">
              <Save className="h-4 w-4" />
              {t("salesReceivables.action.saveDraft")}
            </Button>
            <Button
              onClick={onSubmitAndPost}
              disabled={isSubmitting || exceedsOutstanding}
              className="rounded-xl bg-emerald-700 px-7 hover:bg-emerald-800"
            >
              <Check className="h-4 w-4" />
              {t("salesReceivables.creditNote.approveAndIssue")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CurrencyInput({
  currencyCode,
  value,
  onChange,
  readOnly,
  isArabic,
  className,
}: {
  currencyCode: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  isArabic: boolean;
  className?: string;
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        min="0"
        step="0.001"
        value={value}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        className={cn(
          "h-12 border-slate-200 bg-white disabled:opacity-100",
          isArabic ? "pe-4 ps-16 text-right" : "ps-16",
          className,
        )}
      />
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
        {currencyCode}
      </span>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  isArabic,
  strong,
  highlight,
}: {
  label: string;
  value: string;
  isArabic: boolean;
  strong?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-1 text-sm", isArabic && "flex-row-reverse text-right")}>
      <span className="text-slate-500">{label}</span>
      <span
        className={cn(
          "font-bold text-slate-950",
          strong && !highlight && "text-base text-emerald-700",
          highlight && "text-base text-red-700",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function PostingRow({ label, value, isArabic }: { label: string; value: string; isArabic: boolean }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-[1fr_130px]", isArabic && "sm:grid-cols-[130px_1fr]")}>
      <div className={cn("text-slate-600", isArabic && "sm:order-2")}>{label}</div>
      <div className={cn("font-semibold text-slate-700", isArabic && "sm:order-1")}>{value}</div>
    </div>
  );
}

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl border bg-white p-5 shadow-sm", highlight ? "border-emerald-300 bg-emerald-50/60 text-emerald-800" : "border-slate-200")}>
      <div className="text-sm font-bold text-slate-600">{label}</div>
      <div className={cn("mt-3 text-2xl font-black", highlight ? "text-emerald-700" : "text-slate-950")}>{value}</div>
    </div>
  );
}
