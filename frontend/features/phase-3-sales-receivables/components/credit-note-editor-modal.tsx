"use client";

import { useEffect, useMemo, useRef } from "react";
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
import {
  getActiveCreditNoteTypes,
  getActiveTaxes,
  getCreditNotes,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type {
  CreditNote,
  CreditNoteType,
  Customer,
  InventoryWarehouse,
  SalesInvoice,
  Tax,
} from "@/types/api";
import {
  calculateQuotationTotals,
  createEmptyLine,
  type SalesLineEditorState,
  withCalculatedLineAmount,
} from "./quotation-editor-modal";

type RevenueAccountOption = { id: string; code: string; name: string };

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
  title: string;
  editor: CreditNoteEditorValue;
  customers: Customer[];
  invoices: SalesInvoice[];
  revenueAccounts: RevenueAccountOption[];
  warehouses: InventoryWarehouse[];
  isSubmitting: boolean;
  onClose: () => void;
  onChange: (editor: CreditNoteEditorValue) => void;
  onSubmit: () => void;
  onSubmitAndPost: () => void;
};

function createEmptyDiscountLine(defaultLabel: string): CreditNoteLineEditorState {
  return {
    ...createEmptyLine(),
    itemName: defaultLabel,
    quantity: "1",
    discountAmount: "",
    salesInvoiceLineId: "",
    originalUnitPrice: "",
    correctedUnitPrice: "",
    originalTaxAmount: "",
    correctedTaxAmount: "",
    returnToStock: false,
    itemCondition: "",
  };
}

function createSettlementLine(): CreditNoteLineEditorState {
  return {
    ...createEmptyLine(),
    itemName: "تسوية عميل",
    quantity: "1",
    discountAmount: "",
    salesInvoiceLineId: "",
    originalUnitPrice: "",
    correctedUnitPrice: "",
    originalTaxAmount: "",
    correctedTaxAmount: "",
    returnToStock: false,
    itemCondition: "",
  };
}

function getReceivableAccountName(invoice?: SalesInvoice) {
  return invoice?.customer.receivableAccount
    ? `${invoice.customer.receivableAccount.code} - ${invoice.customer.receivableAccount.name}`
    : "حساب العميل / الذمم المدينة";
}

function findTax(taxes: Tax[], taxId?: string | null) {
  return taxes.find((tax) => tax.id === taxId) ?? null;
}

function getTaxRatePercent(invoiceLine: SalesInvoice["lines"][number], taxes: Tax[]) {
  const tax = findTax(taxes, invoiceLine.taxId);
  if (tax) {
    return Number(tax.rate);
  }
  const subtotal = Number(invoiceLine.lineSubtotalAmount);
  return subtotal > 0
    ? Number(((Number(invoiceLine.taxAmount) / subtotal) * 100).toFixed(4))
    : 0;
}

function buildTypeLines(
  selectedType: CreditNoteType | undefined,
  selectedInvoice: SalesInvoice | undefined,
  taxes: Tax[],
): CreditNoteLineEditorState[] {
  const defaultDiscountLabel = "خصم بعد البيع";
  if (!selectedType) {
    return [createEmptyDiscountLine(defaultDiscountLabel)];
  }

  if (selectedType.code === "CN-CUSTOMER-SETTLEMENT") {
    return [createSettlementLine()];
  }

  if (!selectedInvoice) {
    return [createEmptyDiscountLine(defaultDiscountLabel)];
  }

  if (selectedType.code === "CN-DISCOUNT") {
    return [createEmptyDiscountLine(defaultDiscountLabel)];
  }

  if (selectedType.code === "CN-SALES-RETURN") {
    return selectedInvoice.lines.map((line) => ({
      ...withCalculatedLineAmount(createEmptyLine()),
      key: line.id,
      salesInvoiceLineId: line.id,
      itemId: line.itemId ?? "",
      warehouseId: line.warehouseId ?? "",
      itemName: line.itemName ?? "",
      description: line.description ?? "",
      quantity: "",
      unitPrice: line.unitPrice,
      discountAmount: "0",
      taxId: line.taxId ?? "",
      taxRate: String(getTaxRatePercent(line, taxes)),
      taxAmount: "0",
      lineAmount: "0",
      revenueAccountId: selectedType.defaultAccount.id,
      originalUnitPrice: line.unitPrice,
      correctedUnitPrice: "",
      originalTaxAmount: line.taxAmount,
      correctedTaxAmount: "",
      returnToStock: Boolean(line.item?.trackInventory),
      itemCondition: "",
    }));
  }

  if (selectedType.code === "CN-PRICE-DIFF") {
    return selectedInvoice.lines.map((line) => ({
      ...withCalculatedLineAmount(createEmptyLine()),
      key: line.id,
      salesInvoiceLineId: line.id,
      itemId: line.itemId ?? "",
      warehouseId: line.warehouseId ?? "",
      itemName: line.itemName ?? "",
      description: line.description ?? "",
      quantity: line.quantity,
      unitPrice: "0",
      discountAmount: "0",
      taxId: line.taxId ?? "",
      taxRate: String(getTaxRatePercent(line, taxes)),
      taxAmount: "0",
      lineAmount: "0",
      revenueAccountId: selectedType.defaultAccount.id,
      originalUnitPrice: line.unitPrice,
      correctedUnitPrice: line.unitPrice,
      originalTaxAmount: line.taxAmount,
      correctedTaxAmount: line.taxAmount,
      returnToStock: false,
      itemCondition: "",
    }));
  }

  if (selectedType.code === "CN-TAX-CORRECTION") {
    return selectedInvoice.lines.map((line) => ({
      ...withCalculatedLineAmount(createEmptyLine()),
      key: line.id,
      salesInvoiceLineId: line.id,
      itemId: line.itemId ?? "",
      warehouseId: line.warehouseId ?? "",
      itemName: line.itemName ?? "",
      description: line.description ?? "",
      quantity: "1",
      unitPrice: "0",
      discountAmount: "0",
      taxId: line.taxId ?? "",
      taxRate: "",
      taxAmount: "0",
      lineAmount: "0",
      revenueAccountId: selectedType.defaultAccount.id,
      originalUnitPrice: line.unitPrice,
      correctedUnitPrice: line.unitPrice,
      originalTaxAmount: line.taxAmount,
      correctedTaxAmount: line.taxAmount,
      returnToStock: false,
      itemCondition: "",
    }));
  }

  return [createEmptyDiscountLine(defaultDiscountLabel)];
}

function computeDynamicLine(
  line: CreditNoteLineEditorState,
  selectedType: CreditNoteType | undefined,
  invoiceLine: SalesInvoice["lines"][number] | undefined,
  previousReturned: number,
) {
  if (!selectedType) {
    return withCalculatedLineAmount(line);
  }

  if (selectedType.code === "CN-SALES-RETURN" && invoiceLine) {
    const soldQty = Number(invoiceLine.quantity);
    const returnQty = Number(line.quantity || 0);
    const availableQty = Math.max(0, Number((soldQty - previousReturned).toFixed(4)));
    const safeQty = Math.min(Math.max(returnQty, 0), availableQty);
    const ratio = soldQty > 0 ? safeQty / soldQty : 0;
    const subtotal = Number((Number(invoiceLine.lineSubtotalAmount) * ratio).toFixed(2));
    const originalTax = Number((Number(invoiceLine.taxAmount) * ratio).toFixed(2));
    const taxAmount = selectedType.allowsTaxAdjustment
      ? Number(line.taxAmount || originalTax)
      : originalTax;
    return {
      ...line,
      quantity: safeQty > 0 ? String(safeQty) : "",
      unitPrice: invoiceLine.unitPrice,
      originalUnitPrice: invoiceLine.unitPrice,
      originalTaxAmount: String(originalTax),
      taxAmount: taxAmount ? String(taxAmount) : "0",
      lineAmount: String(Number((subtotal + taxAmount).toFixed(2))),
    };
  }

  if (selectedType.code === "CN-PRICE-DIFF" && invoiceLine) {
    const quantity = Number(invoiceLine.quantity);
    const originalUnitPrice = Number(line.originalUnitPrice || invoiceLine.unitPrice || 0);
    const correctedUnitPrice = Number(line.correctedUnitPrice || originalUnitPrice);
    const diff = Math.max(0, Number(((originalUnitPrice - correctedUnitPrice) * quantity).toFixed(2)));
    const originalTaxAmount = Number(line.originalTaxAmount || invoiceLine.taxAmount || 0);
    const correctedTaxAmount = Number(line.correctedTaxAmount || originalTaxAmount);
    const taxDiff = Math.max(0, Number((originalTaxAmount - correctedTaxAmount).toFixed(2)));
    return {
      ...line,
      quantity: String(quantity),
      unitPrice: String(diff),
      taxAmount: String(taxDiff),
      lineAmount: String(Number((diff + taxDiff).toFixed(2))),
    };
  }

  if (selectedType.code === "CN-TAX-CORRECTION" && invoiceLine) {
    const originalTaxAmount = Number(line.originalTaxAmount || invoiceLine.taxAmount || 0);
    const correctedTaxAmount = Number(line.correctedTaxAmount || originalTaxAmount);
    const taxDiff = Math.max(0, Number((originalTaxAmount - correctedTaxAmount).toFixed(2)));
    return {
      ...line,
      quantity: "1",
      unitPrice: "0",
      taxAmount: String(taxDiff),
      lineAmount: String(taxDiff),
    };
  }

  if (selectedType.code === "CN-CUSTOMER-SETTLEMENT") {
    const amount = Number(line.unitPrice || line.lineAmount || 0);
    return {
      ...line,
      quantity: "1",
      unitPrice: amount ? String(amount) : "",
      discountAmount: "0",
      taxAmount: "0",
      lineAmount: amount ? String(amount) : "0",
    };
  }

  return withCalculatedLineAmount(line);
}

export function CreditNoteEditorModal({
  isOpen,
  title,
  editor,
  customers,
  invoices,
  revenueAccounts,
  warehouses,
  isSubmitting,
  onClose,
  onChange,
  onSubmit,
  onSubmitAndPost,
}: CreditNoteEditorModalProps) {
  const { t, language } = useTranslation();
  const { token } = useAuth();
  const isArabic = language === "ar";
  const setupSignatureRef = useRef("");

  const { data: taxes = [] } = useQuery({
    queryKey: ["taxes", "active", token],
    queryFn: () => getActiveTaxes(token),
  });
  const { data: creditNoteTypes = [] } = useQuery({
    queryKey: ["credit-note-types", "active", token],
    queryFn: () => getActiveCreditNoteTypes(token),
    enabled: isOpen,
  });
  const { data: customerCreditNotes = [] } = useQuery({
    queryKey: ["credit-notes", "for-editor", editor.customerId, token],
    queryFn: () => getCreditNotes({ customerId: editor.customerId }, token),
    enabled: isOpen && Boolean(editor.customerId),
  });

  const selectedType = creditNoteTypes.find((row) => row.id === editor.creditNoteTypeId);
  const selectedInvoice = invoices.find((invoice) => invoice.id === editor.salesInvoiceId);
  const selectedCustomer =
    customers.find((customer) => customer.id === editor.customerId) ??
    selectedInvoice?.customer;
  const currencyCode = editor.currencyCode || selectedInvoice?.currencyCode || "JOD";
  const availableCredit = selectedInvoice ? Number(selectedInvoice.outstandingAmount) : null;
  const defaultDiscountLabel = "خصم بعد البيع";
  const creditNoteTypeAccountOptions = useMemo(() => {
    const selectedDefault = selectedType?.defaultAccount;
    if (!selectedDefault) return revenueAccounts;
    return revenueAccounts.some((account) => account.id === selectedDefault.id)
      ? revenueAccounts
      : [...revenueAccounts, { id: selectedDefault.id, code: selectedDefault.code, name: selectedDefault.name }];
  }, [revenueAccounts, selectedType]);

  useEffect(() => {
    if (!isOpen) {
      setupSignatureRef.current = "";
      return;
    }
    const signature = `${editor.creditNoteTypeId}:${editor.salesInvoiceId}`;
    if (signature === setupSignatureRef.current) {
      return;
    }
    if (!selectedType) {
      return;
    }
    setupSignatureRef.current = signature;
    onChange({
      ...editor,
      lines: buildTypeLines(selectedType, selectedInvoice, taxes),
    });
  }, [
    editor,
    isOpen,
    onChange,
    selectedInvoice,
    selectedType,
    taxes,
  ]);

  const previousReturnedByLine = useMemo(() => {
    const map = new Map<string, number>();
    if (!selectedInvoice) return map;
    for (const note of customerCreditNotes) {
      if (note.id === editor.id) continue;
      if (note.linkedInvoice?.id !== selectedInvoice.id) continue;
      if (note.creditNoteType?.code !== "CN-SALES-RETURN") continue;
      if (note.status === "CANCELLED") continue;
      for (const line of note.lines) {
        if (!line.salesInvoiceLineId) continue;
        map.set(
          line.salesInvoiceLineId,
          (map.get(line.salesInvoiceLineId) ?? 0) + Number(line.quantity),
        );
      }
    }
    return map;
  }, [customerCreditNotes, editor.id, selectedInvoice]);

  const displayedLines = useMemo(() => {
    return editor.lines.map((line) => {
      const invoiceLine = selectedInvoice?.lines.find(
        (invoiceItem) => invoiceItem.id === line.salesInvoiceLineId,
      );
      return computeDynamicLine(
        line,
        selectedType,
        invoiceLine,
        previousReturnedByLine.get(line.salesInvoiceLineId || "") ?? 0,
      );
    });
  }, [editor.lines, previousReturnedByLine, selectedInvoice, selectedType]);

  const totals = useMemo(() => {
    if (!selectedType) {
      return calculateQuotationTotals(displayedLines);
    }
    return displayedLines.reduce(
      (acc, line) => {
        if (selectedType.code === "CN-TAX-CORRECTION") {
          acc.taxAmount += Number(line.lineAmount || 0);
          acc.totalAmount += Number(line.lineAmount || 0);
          return acc;
        }
        acc.subtotalAmount +=
          selectedType.code === "CN-SALES-RETURN"
            ? Number((Number(line.lineAmount || 0) - Number(line.taxAmount || 0)).toFixed(2))
            : Number(line.unitPrice || 0);
        acc.taxAmount += Number(line.taxAmount || 0);
        acc.totalAmount += Number(line.lineAmount || 0);
        return acc;
      },
      { subtotalAmount: 0, discountAmount: 0, taxAmount: 0, totalAmount: 0 },
    );
  }, [displayedLines, selectedType]);

  const updateLine = (
    lineKey: string,
    updater: (line: CreditNoteLineEditorState) => CreditNoteLineEditorState,
  ) => {
    onChange({
      ...editor,
      lines: editor.lines.map((line) =>
        line.key === lineKey ? updater(line) : line,
      ),
    });
  };

  const removeLine = (lineKey: string) => {
    if (editor.lines.length === 1) {
      return;
    }
    onChange({
      ...editor,
      lines: editor.lines.filter((line) => line.key !== lineKey),
    });
  };

  const addLine = () => {
    const nextLine =
      selectedType?.code === "CN-CUSTOMER-SETTLEMENT"
        ? createSettlementLine()
        : createEmptyDiscountLine(defaultDiscountLabel);
    onChange({
      ...editor,
      lines: [...editor.lines, nextLine],
    });
  };

  const helperText = selectedType?.helperText || "";
  const linkedInvoiceRequired =
    selectedType?.linkedInvoiceRequirement === "REQUIRED";

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} />
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className={cn(
          "relative mx-auto flex h-full max-w-[1480px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fcfcfb] shadow-[0_30px_80px_rgba(15,23,42,0.18)]",
          isArabic && "arabic-ui",
        )}
      >
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

        <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.06),_transparent_30%),linear-gradient(180deg,_#fcfcfb_0%,_#f7f8f7_100%)] px-4 py-4 sm:px-8 sm:py-6">
          <div className="space-y-5">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className={cn("mb-4 text-lg text-slate-950", isArabic ? "arabic-ui-heading text-right" : "font-black")}>
                بيانات الإشعار
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

                <Field label={t("salesReceivables.field.currency")} required labelAlign={isArabic ? "end" : "start"}>
                  <Input
                    value={currencyCode}
                    onChange={(event) => onChange({ ...editor, currencyCode: event.target.value.toUpperCase() })}
                    maxLength={3}
                    className={cn("h-12 border-slate-200 bg-white uppercase", isArabic && "text-right")}
                  />
                </Field>

                <Field label="نوع إشعار الدائن" required labelAlign={isArabic ? "end" : "start"}>
                  <Select
                    value={editor.creditNoteTypeId}
                    onChange={(event) =>
                      onChange({
                        ...editor,
                        creditNoteTypeId: event.target.value,
                      })
                    }
                    className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
                  >
                    <option value="">اختر نوع إشعار الدائن</option>
                    {creditNoteTypes.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.code} - {row.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
                <Field label={linkedInvoiceRequired ? "الفاتورة المرتبطة" : "الفاتورة المرتبطة (اختياري)"} required={linkedInvoiceRequired} labelAlign={isArabic ? "end" : "start"}>
                  <Select
                    value={editor.salesInvoiceId}
                    onChange={(event) => {
                      const invoice = invoices.find((row) => row.id === event.target.value);
                      onChange({
                        ...editor,
                        salesInvoiceId: event.target.value,
                        currencyCode: invoice?.currencyCode ?? editor.currencyCode,
                      });
                    }}
                    className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
                  >
                    <option value="">{linkedInvoiceRequired ? "اختر الفاتورة المرتبطة" : "بدون فاتورة مرتبطة"}</option>
                    {invoices.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.reference}
                      </option>
                    ))}
                  </Select>
                  {availableCredit !== null ? (
                    <span className="mt-2 flex items-center justify-end gap-2 text-xs font-bold text-emerald-700">
                      <Check className="h-4 w-4" />
                      {`الرصيد المتاح على الفاتورة: ${currencyCode} ${availableCredit.toFixed(3)}`}
                    </span>
                  ) : null}
                </Field>

                <Field label="السبب / الوصف" labelAlign={isArabic ? "end" : "start"}>
                  <Textarea
                    rows={3}
                    value={editor.description}
                    onChange={(event) => onChange({ ...editor, description: event.target.value })}
                    placeholder="أضف وصفًا مختصرًا للإشعار"
                    className={cn("min-h-[86px] resize-none border-slate-200 bg-white", isArabic && "text-right")}
                  />
                </Field>
              </div>

              {selectedType ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 px-5 py-4">
                  <div className={cn("flex items-start gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Tag className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-950">{selectedType.name}</div>
                      <div className="mt-1 text-sm text-slate-600">{helperText}</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className={cn("mb-5 text-lg text-slate-950", isArabic ? "arabic-ui-heading text-right" : "font-black")}>
                {selectedType?.code === "CN-SALES-RETURN"
                  ? "تفاصيل الأصناف المرتجعة"
                  : selectedType?.code === "CN-PRICE-DIFF"
                    ? "تفاصيل فرق السعر"
                    : selectedType?.code === "CN-TAX-CORRECTION"
                      ? "تفاصيل تصحيح الضريبة"
                      : selectedType?.code === "CN-CUSTOMER-SETTLEMENT"
                        ? "تفاصيل التسوية"
                        : "تفاصيل الخصم بعد البيع"}
              </div>

              {selectedType?.code === "CN-DISCOUNT" || !selectedType ? (
                <DiscountTable
                  editor={editor}
                  lines={displayedLines}
                  revenueAccounts={creditNoteTypeAccountOptions}
                  taxes={taxes}
                  currencyCode={currencyCode}
                  isArabic={isArabic}
                  updateLine={updateLine}
                  removeLine={removeLine}
                />
              ) : null}

              {selectedType?.code === "CN-SALES-RETURN" ? (
                <SalesReturnTable
                  editor={editor}
                  lines={displayedLines}
                  invoice={selectedInvoice}
                  previousReturnedByLine={previousReturnedByLine}
                  warehouses={warehouses}
                  taxes={taxes}
                  isArabic={isArabic}
                  updateLine={updateLine}
                />
              ) : null}

              {selectedType?.code === "CN-PRICE-DIFF" ? (
                <PriceDifferenceTable
                  lines={displayedLines}
                  invoice={selectedInvoice}
                  isArabic={isArabic}
                  updateLine={updateLine}
                />
              ) : null}

              {selectedType?.code === "CN-TAX-CORRECTION" ? (
                <TaxCorrectionTable
                  lines={displayedLines}
                  invoice={selectedInvoice}
                  isArabic={isArabic}
                  updateLine={updateLine}
                />
              ) : null}

              {selectedType?.code === "CN-CUSTOMER-SETTLEMENT" ? (
                <SettlementTable
                  lines={displayedLines}
                  accounts={creditNoteTypeAccountOptions}
                  currencyCode={currencyCode}
                  isArabic={isArabic}
                  updateLine={updateLine}
                  removeLine={removeLine}
                />
              ) : null}

              {(selectedType?.code === "CN-DISCOUNT" || selectedType?.code === "CN-CUSTOMER-SETTLEMENT" || !selectedType) ? (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={addLine}
                    className="inline-flex min-w-[260px] items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-500 bg-white px-5 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    <CirclePlus className="h-4 w-4" />
                    {selectedType?.code === "CN-CUSTOMER-SETTLEMENT" ? "إضافة بند تسوية" : "إضافة بند"}
                  </button>
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.35fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className={cn("mb-4 text-sm font-bold text-slate-950", isArabic && "text-right")}>الملخص</div>
                  <SummaryRow label="الإجمالي قبل الضريبة" value={`${currencyCode} ${totals.subtotalAmount.toFixed(3)}`} isArabic={isArabic} />
                  <SummaryRow label={t("salesReceivables.field.taxAmount")} value={`${currencyCode} ${totals.taxAmount.toFixed(3)}`} isArabic={isArabic} />
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <SummaryRow label="إجمالي إشعار الدائن" value={`${currencyCode} ${totals.totalAmount.toFixed(3)}`} isArabic={isArabic} strong />
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/45 p-5">
                  <div className={cn("mb-4 flex items-center gap-2 text-sm font-bold text-slate-700", isArabic ? "justify-end text-right" : "text-left")}>
                    <Info className="h-5 w-5 text-blue-500" />
                    المعاينة المحاسبية
                  </div>
                  <div className={cn("space-y-2 text-sm text-slate-700", isArabic ? "text-right" : "text-left")}>
                    <div className="font-bold text-slate-950">سيتم إنشاء القيد عند الاعتماد / الترحيل</div>
                    <PostingPreview
                      selectedType={selectedType}
                      displayedLines={displayedLines}
                      selectedCustomer={selectedCustomer ? getReceivableAccountName(selectedInvoice) : "حساب العميل"}
                      currencyCode={currencyCode}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-8">
          <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", isArabic ? "sm:flex-row-reverse" : "")}>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Info className="h-4 w-4 text-amber-500" />
              {selectedType?.code === "CN-SALES-RETURN"
                ? "تأكد من الكميات والمستودعات قبل ترحيل المرتجع."
                : "يمكن الحفظ كمسودة ثم الاعتماد لاحقًا."}
            </div>
            <div className={cn("flex flex-col gap-2 sm:flex-row", isArabic ? "sm:flex-row-reverse" : "")}>
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                <X className="h-4 w-4" />
                {t("salesReceivables.action.cancel")}
              </Button>
              <Button variant="secondary" onClick={onSubmit} disabled={isSubmitting}>
                <Save className="h-4 w-4" />
                {editor.id ? t("salesReceivables.action.saveChanges") : t("salesReceivables.action.saveDraft")}
              </Button>
              <Button onClick={onSubmitAndPost} disabled={isSubmitting}>
                <Check className="h-4 w-4" />
                اعتماد وترحيل
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiscountTable({
  editor,
  lines,
  revenueAccounts,
  taxes,
  currencyCode,
  isArabic,
  updateLine,
  removeLine,
}: {
  editor: CreditNoteEditorValue;
  lines: CreditNoteLineEditorState[];
  revenueAccounts: RevenueAccountOption[];
  taxes: Tax[];
  currencyCode: string;
  isArabic: boolean;
  updateLine: (lineKey: string, updater: (line: CreditNoteLineEditorState) => CreditNoteLineEditorState) => void;
  removeLine: (lineKey: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[74px_1.8fr_1.35fr_1.05fr_1.05fr_1.15fr_54px] gap-4 px-1 text-sm font-bold text-slate-900 xl:grid">
        <div className="text-center">#</div>
        <div className={cn(isArabic && "text-right")}>وصف الخصم</div>
        <div className={cn(isArabic && "text-right")}>حساب الخصم / مردودات وتخفيضات المبيعات</div>
        <div className={cn(isArabic && "text-right")}>مبلغ الخصم قبل الضريبة</div>
        <div className={cn(isArabic && "text-right")}>الضريبة</div>
        <div className={cn(isArabic && "text-right")}>الإجمالي</div>
        <div />
      </div>
      {lines.map((line, index) => (
        <div key={line.key} className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/45 p-3 xl:grid-cols-[74px_1.8fr_1.35fr_1.05fr_1.05fr_1.15fr_54px] xl:gap-4 xl:bg-transparent xl:p-0">
          <Input value={`${index + 1}`} readOnly className="h-12 border-slate-200 bg-white text-center font-bold" />
          <Input
            value={line.itemName || "خصم بعد البيع"}
            onChange={(event) => updateLine(line.key, (current) => ({ ...current, itemName: event.target.value }))}
            className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
          />
          <Select
            value={line.revenueAccountId}
            onChange={(event) => updateLine(line.key, (current) => ({ ...current, revenueAccountId: event.target.value }))}
            className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
          >
            <option value="">اختر الحساب</option>
            {revenueAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} - {account.name}
              </option>
            ))}
          </Select>
          <CurrencyInput
            currencyCode={currencyCode}
            value={line.unitPrice}
            onChange={(value) => updateLine(line.key, (current) => withCalculatedLineAmount({ ...current, quantity: "1", unitPrice: value, discountAmount: "" }))}
            isArabic={isArabic}
          />
          <Select
            value={line.taxId}
            onChange={(event) => {
              const selectedTax = taxes.find((tax) => tax.id === event.target.value);
              updateLine(line.key, (current) => ({
                ...current,
                taxId: selectedTax?.id ?? "",
                taxRate: selectedTax ? String(selectedTax.rate) : "",
                taxAmount: current.taxAmount,
              }));
            }}
            className={cn("border-slate-200 bg-white", isArabic && "text-right")}
          >
            <option value="">بدون ضريبة</option>
            {taxes.map((tax) => (
              <option key={tax.id} value={tax.id}>{tax.taxName} {Number(tax.rate).toFixed(2)}%</option>
            ))}
          </Select>
          <CurrencyInput currencyCode={currencyCode} value={line.lineAmount} readOnly isArabic={isArabic} className="font-bold text-slate-950" />
          <button
            type="button"
            onClick={() => removeLine(line.key)}
            disabled={editor.lines.length === 1}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-red-100 bg-white text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function SalesReturnTable({
  editor,
  lines,
  invoice,
  previousReturnedByLine,
  warehouses,
  taxes,
  isArabic,
  updateLine,
}: {
  editor: CreditNoteEditorValue;
  lines: CreditNoteLineEditorState[];
  invoice?: SalesInvoice;
  previousReturnedByLine: Map<string, number>;
  warehouses: InventoryWarehouse[];
  taxes: Tax[];
  isArabic: boolean;
  updateLine: (lineKey: string, updater: (line: CreditNoteLineEditorState) => CreditNoteLineEditorState) => void;
}) {
  return (
    <div className="space-y-3 overflow-x-auto">
      <div className="hidden min-w-[1440px] grid-cols-[60px_1.5fr_repeat(4,0.9fr)_1fr_1fr_1fr_1fr_0.9fr_1fr] gap-3 px-1 text-sm font-bold text-slate-900 xl:grid">
        <div>#</div>
        <div>الصنف</div>
        <div>الكمية المباعة</div>
        <div>المرتجع سابقًا</div>
        <div>الكمية المتاحة للإرجاع</div>
        <div>الكمية المرتجعة الآن</div>
        <div>سعر الوحدة</div>
        <div>المستودع</div>
        <div>حالة البضاعة</div>
        <div>ترجع للمخزون؟</div>
        <div>الضريبة</div>
        <div>الإجمالي</div>
      </div>
      {lines.map((line, index) => {
        const invoiceLine = invoice?.lines.find((item) => item.id === line.salesInvoiceLineId);
        const soldQty = Number(invoiceLine?.quantity ?? 0);
        const previousReturned = previousReturnedByLine.get(line.salesInvoiceLineId || "") ?? 0;
        const availableQty = Math.max(0, Number((soldQty - previousReturned).toFixed(4)));
        return (
          <div key={line.key} className="min-w-[1440px] grid gap-3 rounded-xl border border-slate-100 bg-slate-50/45 p-3 xl:grid-cols-[60px_1.5fr_repeat(4,0.9fr)_1fr_1fr_1fr_1fr_0.9fr_1fr]">
            <Input value={`${index + 1}`} readOnly className="h-12 border-slate-200 bg-white text-center font-bold" />
            <Input value={line.itemName || ""} readOnly className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")} />
            <Input value={soldQty ? String(soldQty) : "0"} readOnly className="h-12 border-slate-200 bg-white" />
            <Input value={String(previousReturned)} readOnly className="h-12 border-slate-200 bg-white" />
            <Input value={String(availableQty)} readOnly className="h-12 border-slate-200 bg-white" />
            <Input
              value={line.quantity || ""}
              type="number"
              min={0}
              max={availableQty}
              onChange={(event) => updateLine(line.key, (current) => ({ ...current, quantity: event.target.value }))}
              className="h-12 border-slate-200 bg-white"
            />
            <Input value={line.originalUnitPrice || line.unitPrice || ""} readOnly className="h-12 border-slate-200 bg-white" />
            <Select
              value={line.warehouseId || ""}
              onChange={(event) => updateLine(line.key, (current) => ({ ...current, warehouseId: event.target.value }))}
              className="h-12 border-slate-200 bg-white"
            >
              <option value="">اختر المستودع</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} - {warehouse.name}
                </option>
              ))}
            </Select>
            <Input
              value={line.itemCondition || ""}
              onChange={(event) => updateLine(line.key, (current) => ({ ...current, itemCondition: event.target.value }))}
              placeholder="صالحة / تالفة"
              className="h-12 border-slate-200 bg-white"
            />
            <Select
              value={line.returnToStock ? "yes" : "no"}
              onChange={(event) => updateLine(line.key, (current) => ({ ...current, returnToStock: event.target.value === "yes" }))}
              className="h-12 border-slate-200 bg-white"
            >
              <option value="yes">نعم</option>
              <option value="no">لا</option>
            </Select>
            <Select
              value={line.taxId || ""}
              onChange={(event) => {
                const selectedTax = taxes.find((tax) => tax.id === event.target.value);
                updateLine(line.key, (current) => ({
                  ...current,
                  taxId: selectedTax?.id ?? "",
                  taxRate: selectedTax ? String(selectedTax.rate) : current.taxRate,
                }));
              }}
              className="h-12 border-slate-200 bg-white"
            >
              <option value="">بدون ضريبة</option>
              {taxes.map((tax) => (
                <option key={tax.id} value={tax.id}>{tax.taxName}</option>
              ))}
            </Select>
            <Input value={line.lineAmount || "0"} readOnly className="h-12 border-slate-200 bg-white font-bold" />
          </div>
        );
      })}
      {!invoice ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
          اربط الفاتورة أولًا لتحميل بنود المرتجع منها.
        </div>
      ) : null}
    </div>
  );
}

function PriceDifferenceTable({
  lines,
  invoice,
  isArabic,
  updateLine,
}: {
  lines: CreditNoteLineEditorState[];
  invoice?: SalesInvoice;
  isArabic: boolean;
  updateLine: (lineKey: string, updater: (line: CreditNoteLineEditorState) => CreditNoteLineEditorState) => void;
}) {
  return (
    <div className="space-y-3 overflow-x-auto">
      <div className="hidden min-w-[1120px] grid-cols-[60px_1.7fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-1 text-sm font-bold text-slate-900 xl:grid">
        <div>#</div>
        <div>السطر / الصنف</div>
        <div>السعر الأصلي</div>
        <div>السعر الصحيح</div>
        <div>الفرق</div>
        <div>الضريبة</div>
        <div>الإجمالي</div>
      </div>
      {lines.map((line, index) => (
        <div key={line.key} className="min-w-[1120px] grid gap-3 rounded-xl border border-slate-100 bg-slate-50/45 p-3 xl:grid-cols-[60px_1.7fr_1fr_1fr_1fr_1fr_1fr]">
          <Input value={`${index + 1}`} readOnly className="h-12 border-slate-200 bg-white text-center font-bold" />
          <Input value={line.itemName || ""} readOnly className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")} />
          <Input value={line.originalUnitPrice || ""} readOnly className="h-12 border-slate-200 bg-white" />
          <Input
            value={line.correctedUnitPrice || ""}
            type="number"
            min={0}
            onChange={(event) => updateLine(line.key, (current) => ({ ...current, correctedUnitPrice: event.target.value }))}
            className="h-12 border-slate-200 bg-white"
          />
          <Input
            value={(() => {
              const invoiceLine = invoice?.lines.find((item) => item.id === line.salesInvoiceLineId);
              const qty = Number(invoiceLine?.quantity ?? 0);
              return String(Math.max(0, Number((((Number(line.originalUnitPrice || 0) - Number(line.correctedUnitPrice || line.originalUnitPrice || 0)) * qty)).toFixed(2))));
            })()}
            readOnly
            className="h-12 border-slate-200 bg-white"
          />
          <Input
            value={line.correctedTaxAmount || ""}
            type="number"
            min={0}
            onChange={(event) => updateLine(line.key, (current) => ({ ...current, correctedTaxAmount: event.target.value }))}
            className="h-12 border-slate-200 bg-white"
          />
          <Input value={line.lineAmount || "0"} readOnly className="h-12 border-slate-200 bg-white font-bold" />
        </div>
      ))}
    </div>
  );
}

function TaxCorrectionTable({
  lines,
  invoice,
  isArabic,
  updateLine,
}: {
  lines: CreditNoteLineEditorState[];
  invoice?: SalesInvoice;
  isArabic: boolean;
  updateLine: (lineKey: string, updater: (line: CreditNoteLineEditorState) => CreditNoteLineEditorState) => void;
}) {
  return (
    <div className="space-y-3 overflow-x-auto">
      <div className="hidden min-w-[1020px] grid-cols-[60px_1.8fr_1fr_1fr_1fr] gap-3 px-1 text-sm font-bold text-slate-900 xl:grid">
        <div>#</div>
        <div>السطر</div>
        <div>الضريبة الأصلية</div>
        <div>الضريبة الصحيحة</div>
        <div>فرق الضريبة</div>
      </div>
      {lines.map((line, index) => (
        <div key={line.key} className="min-w-[1020px] grid gap-3 rounded-xl border border-slate-100 bg-slate-50/45 p-3 xl:grid-cols-[60px_1.8fr_1fr_1fr_1fr]">
          <Input value={`${index + 1}`} readOnly className="h-12 border-slate-200 bg-white text-center font-bold" />
          <Input value={line.itemName || invoice?.lines.find((item) => item.id === line.salesInvoiceLineId)?.itemName || ""} readOnly className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")} />
          <Input value={line.originalTaxAmount || "0"} readOnly className="h-12 border-slate-200 bg-white" />
          <Input
            value={line.correctedTaxAmount || ""}
            type="number"
            min={0}
            onChange={(event) => updateLine(line.key, (current) => ({ ...current, correctedTaxAmount: event.target.value }))}
            className="h-12 border-slate-200 bg-white"
          />
          <Input value={line.lineAmount || "0"} readOnly className="h-12 border-slate-200 bg-white font-bold" />
        </div>
      ))}
    </div>
  );
}

function SettlementTable({
  lines,
  accounts,
  currencyCode,
  isArabic,
  updateLine,
  removeLine,
}: {
  lines: CreditNoteLineEditorState[];
  accounts: RevenueAccountOption[];
  currencyCode: string;
  isArabic: boolean;
  updateLine: (lineKey: string, updater: (line: CreditNoteLineEditorState) => CreditNoteLineEditorState) => void;
  removeLine: (lineKey: string) => void;
}) {
  return (
    <div className="space-y-3">
      {lines.map((line, index) => (
        <div key={line.key} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 lg:grid-cols-[70px_1.1fr_1fr_0.7fr_1fr_auto]">
          <Input value={`${index + 1}`} readOnly className="h-12 border-slate-200 bg-white text-center font-bold" />
          <Input
            value={line.itemName || ""}
            onChange={(event) => updateLine(line.key, (current) => ({ ...current, itemName: event.target.value }))}
            placeholder="سبب التسوية"
            className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
          />
          <Select
            value={line.revenueAccountId}
            onChange={(event) => updateLine(line.key, (current) => ({ ...current, revenueAccountId: event.target.value }))}
            className="h-12 border-slate-200 bg-white"
          >
            <option value="">الحساب المحاسبي</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} - {account.name}
              </option>
            ))}
          </Select>
          <CurrencyInput
            currencyCode={currencyCode}
            value={line.unitPrice}
            onChange={(value) => updateLine(line.key, (current) => ({ ...current, unitPrice: value }))}
            isArabic={isArabic}
          />
          <Input
            value={line.description || ""}
            onChange={(event) => updateLine(line.key, (current) => ({ ...current, description: event.target.value }))}
            placeholder="ملاحظات"
            className={cn("h-12 border-slate-200 bg-white", isArabic && "text-right")}
          />
          <button
            type="button"
            onClick={() => removeLine(line.key)}
            disabled={lines.length === 1}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-red-100 bg-white px-3 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function PostingPreview({
  selectedType,
  displayedLines,
  selectedCustomer,
  currencyCode,
}: {
  selectedType?: CreditNoteType;
  displayedLines: CreditNoteLineEditorState[];
  selectedCustomer: string;
  currencyCode: string;
}) {
  const total = displayedLines.reduce((sum, line) => sum + Number(line.lineAmount || 0), 0);
  if (!selectedType) {
    return null;
  }

  if (selectedType.code === "CN-SALES-RETURN") {
    return (
      <>
        <PostingRow label="مدين: مردودات المبيعات" value={`${total.toFixed(3)} ${currencyCode}`} isArabic />
        <PostingRow label="مدين: ضريبة المبيعات إن وجدت" value={`${displayedLines.reduce((sum, line) => sum + Number(line.taxAmount || 0), 0).toFixed(3)} ${currencyCode}`} isArabic />
        <PostingRow label={`دائن: ${selectedCustomer}`} value={`${total.toFixed(3)} ${currencyCode}`} isArabic />
        <PostingRow label="وعند الإرجاع للمخزون: مدين مخزون / دائن تكلفة مبيعات" value="حسب تكلفة الصنف" isArabic />
      </>
    );
  }

  if (selectedType.code === "CN-TAX-CORRECTION") {
    return (
      <>
        <PostingRow label="مدين: ضريبة المبيعات" value={`${total.toFixed(3)} ${currencyCode}`} isArabic />
        <PostingRow label={`دائن: ${selectedCustomer}`} value={`${total.toFixed(3)} ${currencyCode}`} isArabic />
      </>
    );
  }

  return (
    <>
      <PostingRow label={`مدين: ${selectedType.defaultAccount.name}`} value={`${total.toFixed(3)} ${currencyCode}`} isArabic />
      <PostingRow label="مدين: ضريبة المبيعات إن وجدت" value={`${displayedLines.reduce((sum, line) => sum + Number(line.taxAmount || 0), 0).toFixed(3)} ${currencyCode}`} isArabic />
      <PostingRow label={`دائن: ${selectedCustomer}`} value={`${total.toFixed(3)} ${currencyCode}`} isArabic />
    </>
  );
}

function SummaryRow({
  label,
  value,
  isArabic,
  strong,
}: {
  label: string;
  value: string;
  isArabic: boolean;
  strong?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 text-sm", isArabic && "flex-row-reverse")}>
      <div className={cn("text-slate-500", strong && "font-bold text-slate-900")}>{label}</div>
      <div className={cn("font-semibold text-slate-700", strong && "text-base font-black text-slate-950")}>{value}</div>
    </div>
  );
}

function PostingRow({
  label,
  value,
  isArabic,
}: {
  label: string;
  value: string;
  isArabic: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-xl border border-white/60 bg-white/70 px-4 py-3", isArabic && "flex-row-reverse")}>
      <div className="font-medium text-slate-700">{label}</div>
      <div className="font-bold text-slate-950">{value}</div>
    </div>
  );
}

function CurrencyInput({
  value,
  onChange,
  currencyCode,
  isArabic,
  readOnly,
  className,
}: {
  value: string;
  onChange?: (value: string) => void;
  currencyCode: string;
  isArabic: boolean;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <div className="relative">
      <Input
        value={value}
        type="number"
        min={0}
        step="0.01"
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        className={cn("h-12 border-slate-200 bg-white", isArabic ? "pe-20 text-right" : "pe-20", className)}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">
        {currencyCode}
      </span>
    </div>
  );
}
