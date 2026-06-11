import { useMemo, useState, useEffect } from "react";
import {
  LuFileText as FileText,
  LuSave as Save,
  LuTrash2 as Trash2,
  LuX as X,
  LuPlus as Plus,
  LuClipboardList as ClipboardList,
  LuWarehouse as WarehouseIcon,
  LuReceipt as ReceiptIcon,
} from "react-icons/lu";

import { Button } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  InventoryItem,
  InventoryWarehouse,
} from "@/types/api";

export type ReceiptLineEditorState = {
  itemId: string;
  quantity: string;
  unitCost: string;
  unitOfMeasure: string;
  description: string;
};

export type ReceiptEditorState = {
  id?: string;
  reference: string;
  receiptDate: string;
  warehouseId: string;
  sourcePurchaseOrderRef: string;
  sourcePurchaseInvoiceRef: string;
  description: string;
  lines: ReceiptLineEditorState[];
};

type ReceiptEditorModalProps = {
  isOpen: boolean;
  title: string;
  editor: ReceiptEditorState;
  onClose: () => void;
  onChange: (editor: ReceiptEditorState | ((current: ReceiptEditorState) => ReceiptEditorState)) => void;
  onSave: () => void;
  isSaving: boolean;
  validationError?: string | null;
  items: InventoryItem[];
  warehouses: InventoryWarehouse[];
  presentation?: "modal" | "inline";
};

export interface ReceiptFormErrors {
  receiptDate?: string;
  warehouseId?: string;
  lines?: string;
  [key: string]: string | undefined;
}

const FIELD_TAB_MAP: Partial<Record<keyof ReceiptFormErrors, string>> = {};

function focusField(field: string) {
  if (typeof document === "undefined") {
    return;
  }
  const element = document.getElementById(field);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.focus({ preventScroll: true });
  }
}

export function createEmptyReceiptLine(): ReceiptLineEditorState {
  return {
    itemId: "",
    quantity: "1",
    unitCost: "0",
    unitOfMeasure: "EA",
    description: "",
  };
}

export function ReceiptEditorModal({
  isOpen,
  title,
  editor,
  onClose,
  onChange,
  onSave,
  isSaving,
  validationError,
  items,
  warehouses,
  presentation = "modal",
}: ReceiptEditorModalProps) {
  const { t, language } = useTranslation();
  const isArabic = language === "ar";

  const [localErrors, setLocalErrors] = useState<ReceiptFormErrors>({});
  const [pendingFocusField, setPendingFocusField] = useState<string | null>(null);

  const clearFieldError = (field: string) => {
    if (localErrors[field]) {
      setLocalErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (editorState: ReceiptEditorState): ReceiptFormErrors => {
    const errors: ReceiptFormErrors = {};

    // Date
    if (!editorState.receiptDate) {
      errors.receiptDate = isArabic ? "تاريخ الاستلام مطلوب" : "Receipt date is required";
    } else {
      const receiptYear = new Date(editorState.receiptDate).getFullYear();
      if (Number.isNaN(receiptYear) || receiptYear < 1900) {
        errors.receiptDate = isArabic
          ? "يجب أن يكون تاريخ الاستلام في عام 1900 أو بعده"
          : "Receipt date must be at least year 1900";
      }
    }

    // Warehouse
    if (!editorState.warehouseId) {
      errors.warehouseId = isArabic ? "المستودع مطلوب" : "Warehouse is required";
    }

    // Lines count
    if (editorState.lines.length === 0) {
      errors.lines = isArabic
        ? "يجب إدخال سطر استلام واحد على الأقل"
        : "At least one receipt line is required";
    }

    // Line fields validation
    editorState.lines.forEach((line, index) => {
      if (!line.itemId) {
        errors[`line_${index}_itemId`] = isArabic ? "مطلوب" : "Required";
      }
      if (!line.unitOfMeasure.trim()) {
        errors[`line_${index}_unitOfMeasure`] = isArabic ? "مطلوب" : "Required";
      }
      const qty = parseFloat(line.quantity);
      if (!line.quantity.trim() || Number.isNaN(qty) || qty <= 0) {
        errors[`line_${index}_quantity`] = isArabic ? "يجب أن تكون كمية موجبة" : "Must be > 0";
      }
      const cost = parseFloat(line.unitCost);
      if (!line.unitCost.trim() || Number.isNaN(cost) || cost < 0) {
        errors[`line_${index}_unitCost`] = isArabic ? "يجب أن تكون تكلفة صحيحة" : "Must be >= 0";
      }
    });

    return errors;
  };

  const revealFirstError = (errors: ReceiptFormErrors) => {
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      setPendingFocusField(firstErrorField);
      focusField(firstErrorField);
    }
  };

  const handleSaveClick = () => {
    const errors = validateForm(editor);

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      revealFirstError(errors);
      return;
    }

    setLocalErrors({});
    onSave();
  };

  useEffect(() => {
    if (pendingFocusField) {
      const frame = window.requestAnimationFrame(() => {
        focusField(pendingFocusField);
        setPendingFocusField(null);
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [pendingFocusField]);

  if (!isOpen) return null;

  const updateEditor = (updater: (current: ReceiptEditorState) => ReceiptEditorState) => {
    onChange(updater);
  };

  const addLine = () => {
    clearFieldError("lines");
    updateEditor((current) => ({
      ...current,
      lines: [...current.lines, createEmptyReceiptLine()],
    }));
  };

  const removeLine = (index: number) => {
    clearFieldError("lines");
    updateEditor((current) => ({
      ...current,
      lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
    }));
  };

  const updateLine = (index: number, patch: Partial<ReceiptLineEditorState>) => {
    updateEditor((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => {
        if (lineIndex === index) {
          const updatedLine = { ...line, ...patch };
          // Auto-fill Unit of measure when item changes
          if (patch.itemId) {
            const selectedItem = items.find((it) => it.id === patch.itemId);
            if (selectedItem) {
              updatedLine.unitOfMeasure = selectedItem.unitOfMeasure || "EA";
            }
          }
          return updatedLine;
        }
        return line;
      }),
    }));

    if (patch.itemId) clearFieldError(`line_${index}_itemId`);
    if (patch.unitOfMeasure) clearFieldError(`line_${index}_unitOfMeasure`);
    if (patch.quantity) clearFieldError(`line_${index}_quantity`);
    if (patch.unitCost) clearFieldError(`line_${index}_unitCost`);
  };

  // Calculations for totals
  const totalQuantity = editor.lines.reduce((sum, line) => sum + (parseFloat(line.quantity) || 0), 0);
  const totalCost = editor.lines.reduce((sum, line) => {
    const qty = parseFloat(line.quantity) || 0;
    const cost = parseFloat(line.unitCost) || 0;
    return sum + qty * cost;
  }, 0);

  const isInline = presentation === "inline";

  return (
    <div className={cn(isInline ? "relative w-full" : "fixed inset-0 z-50 p-3 sm:p-6 flex items-center justify-center")}>
      {!isInline ? <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} /> : null}
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className={cn(
          "relative mx-auto flex flex-col overflow-hidden w-full",
          isInline
            ? "min-h-[calc(100vh-220px)] w-full bg-transparent"
            : "h-full max-h-full max-w-[1480px] rounded-lg border border-slate-200 bg-[#fcfcfb] shadow-[0_18px_42px_rgba(15,23,42,0.12)]",
          isArabic && "arabic-ui",
        )}
      >
        {isInline && (
          <button
            type="button"
            onClick={onClose}
            className="absolute end-3 top-3 z-30 rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="sr-only">{t("inventory.button.cancel")}</span>
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Header */}
        {!isInline ? (
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-5 py-5 backdrop-blur sm:px-8">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <span className="sr-only">{t("inventory.button.cancel")}</span>
              <X className="h-6 w-6" />
            </button>
            <div className="flex min-w-0 items-center gap-3">
              <div className={cn("min-w-0 space-y-1", isArabic ? "text-right" : "text-left")}>
                <div className="text-3xl font-black tracking-tight text-slate-900 arabic-ui-heading">
                  {title}
                </div>
                <div className="truncate text-sm text-slate-500">
                  {isArabic ? "إدارة وتوثيق مستندات استلام المخزون الواردة" : "Manage and log incoming stock receipt documents"}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <ReceiptIcon className="h-6 w-6" />
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
                  <ReceiptIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-slate-900 arabic-ui-heading">{title}</h1>
                  <p className="truncate text-xs text-slate-500">
                    {isArabic ? "إدارة وتوثيق مستندات استلام المخزون الواردة" : "Manage and log incoming stock receipt documents"}
                  </p>
                </div>
              </div>
            ) : null}

            {validationError || localErrors.lines ? (
              <div className={cn("rounded-md border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 shadow-sm", isArabic ? "text-right" : "text-left")}>
                {validationError || localErrors.lines}
              </div>
            ) : null}

            {/* Pinned Section: البيانات الأساسية */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 transition-all duration-200 hover:shadow-md">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div className={isArabic ? "text-right" : "text-left"}>
                  <div className="text-base font-bold text-slate-950 arabic-ui-heading">
                    {isArabic ? "البيانات الأساسية" : "Basic Information"}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                <div>
                  <Field id="receipt-reference" label={isArabic ? "الرقم المرجعي" : "Reference"} labelAlign={isArabic ? "end" : "start"}>
                    <Input
                      id="receipt-reference"
                      value={editor.reference}
                      onChange={(e) => updateEditor((current) => ({ ...current, reference: e.target.value }))}
                      className={cn("bg-slate-50/50 border-slate-200", isArabic ? "text-right" : "text-left")}
                      placeholder={isArabic ? "مثال: GR-0001" : "e.g. GR-0001"}
                    />
                  </Field>
                </div>

                <div>
                  <Field
                    id="receipt-date"
                    label={isArabic ? "تاريخ الاستلام" : "Receipt Date"}
                    required
                    error={localErrors.receiptDate}
                    labelAlign={isArabic ? "end" : "start"}
                  >
                    <Input
                      id="receipt-date"
                      type="date"
                      min="1900-01-01"
                      value={editor.receiptDate}
                      onChange={(e) => {
                        updateEditor((current) => ({ ...current, receiptDate: e.target.value }));
                        clearFieldError("receiptDate");
                      }}
                      className={cn(
                        "bg-slate-50/50",
                        isArabic ? "text-right" : "text-left",
                        localErrors.receiptDate ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200"
                      )}
                    />
                  </Field>
                </div>

                <div>
                  <Field
                    id="receipt-warehouseId"
                    label={isArabic ? "المستودع" : "Warehouse"}
                    required
                    error={localErrors.warehouseId}
                    labelAlign={isArabic ? "end" : "start"}
                  >
                    <Select
                      id="receipt-warehouseId"
                      value={editor.warehouseId}
                      onChange={(e) => {
                        updateEditor((current) => ({ ...current, warehouseId: e.target.value }));
                        clearFieldError("warehouseId");
                      }}
                      className={cn(
                        "bg-slate-50/50",
                        isArabic ? "text-right" : "text-left",
                        localErrors.warehouseId ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200"
                      )}
                    >
                      <option value="">
                        {isArabic ? "اختر مستودعاً..." : "Select warehouse..."}
                      </option>
                      {warehouses
                        .filter((w) => w.isActive)
                        .map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.code} · {w.name}
                          </option>
                        ))}
                    </Select>
                  </Field>
                </div>

                <div>
                  <Field id="receipt-po-ref" label={isArabic ? "أمر شراء المصدر" : "Source Purchase Order"} labelAlign={isArabic ? "end" : "start"}>
                    <Input
                      id="receipt-po-ref"
                      value={editor.sourcePurchaseOrderRef}
                      onChange={(e) => updateEditor((current) => ({ ...current, sourcePurchaseOrderRef: e.target.value }))}
                      className={cn("bg-slate-50/50 border-slate-200", isArabic ? "text-right" : "text-left")}
                      placeholder={isArabic ? "اختياري" : "Optional"}
                    />
                  </Field>
                </div>

                <div>
                  <Field id="receipt-invoice-ref" label={isArabic ? "فاتورة شراء المصدر" : "Source Purchase Invoice"} labelAlign={isArabic ? "end" : "start"}>
                    <Input
                      id="receipt-invoice-ref"
                      value={editor.sourcePurchaseInvoiceRef}
                      onChange={(e) => updateEditor((current) => ({ ...current, sourcePurchaseInvoiceRef: e.target.value }))}
                      className={cn("bg-slate-50/50 border-slate-200", isArabic ? "text-right" : "text-left")}
                      placeholder={isArabic ? "اختياري" : "Optional"}
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-4">
                <Field id="receipt-description" label={isArabic ? "الوصف العام" : "General Description"} labelAlign={isArabic ? "end" : "start"}>
                  <Textarea
                    id="receipt-description"
                    value={editor.description}
                    rows={2}
                    onChange={(e) => updateEditor((current) => ({ ...current, description: e.target.value }))}
                    className={cn("bg-slate-50/50 border-slate-200", isArabic ? "text-right" : "text-left")}
                    placeholder={isArabic ? "أدخل تفاصيل عامة حول هذا الاستلام..." : "Enter general details about this receipt..."}
                  />
                </Field>
              </div>
            </section>

            {/* Receipt Lines Card Table */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 transition-all duration-200 hover:shadow-md">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <WarehouseIcon className="h-4.5 w-4.5" />
                  </div>
                  <div className={isArabic ? "text-right" : "text-left"}>
                    <div className="text-base font-bold text-slate-950 arabic-ui-heading">
                      {isArabic ? "المواد المستلمة" : "Received Items"}
                    </div>
                  </div>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={addLine} className="rounded-xl text-xs flex items-center gap-1.5 py-2 px-3">
                  <Plus className="h-4 w-4" />
                  <span>{isArabic ? "إضافة مادة" : "Add Item"}</span>
                </Button>
              </div>

              {editor.lines.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  {isArabic
                    ? "لا توجد مواد مضافة لهذا الاستلام بعد. اضغط على 'إضافة مادة' للبدء."
                    : "No items added to this receipt yet. Click 'Add Item' to start."}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50/75">
                      <tr>
                        <th scope="col" className="w-[50px] px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase">#</th>
                        <th scope="col" className={cn("px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[280px]", isArabic ? "text-right" : "text-left")}>{isArabic ? "الصنف" : "Item"}</th>
                        <th scope="col" className={cn("px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[120px]", isArabic ? "text-right" : "text-left")}>{isArabic ? "الوحدة" : "Unit"}</th>
                        <th scope="col" className={cn("px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[120px]", isArabic ? "text-right" : "text-left")}>{isArabic ? "الكمية" : "Quantity"}</th>
                        <th scope="col" className={cn("px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[140px]", isArabic ? "text-right" : "text-left")}>{isArabic ? "تكلفة الوحدة" : "Unit Cost"}</th>
                        <th scope="col" className={cn("px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[140px]", isArabic ? "text-right" : "text-left")}>{isArabic ? "الإجمالي" : "Total"}</th>
                        <th scope="col" className={cn("px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[200px]", isArabic ? "text-right" : "text-left")}>{isArabic ? "البيان / الوصف" : "Line Description"}</th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-[80px]">{isArabic ? "إجراء" : "Action"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {editor.lines.map((line, index) => {
                        const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitCost) || 0);
                        const hasItemError = !!localErrors[`line_${index}_itemId`];
                        const hasUnitError = !!localErrors[`line_${index}_unitOfMeasure`];
                        const hasQtyError = !!localErrors[`line_${index}_quantity`];
                        const hasCostError = !!localErrors[`line_${index}_unitCost`];

                        return (
                          <tr key={`receipt-row-${index}`} className="hover:bg-slate-50/50 transition">
                            <td className="whitespace-nowrap px-3 py-3 text-center font-bold text-slate-400">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3">
                              <Select
                                id={`line_${index}_itemId`}
                                value={line.itemId}
                                onChange={(e) => updateLine(index, { itemId: e.target.value })}
                                className={cn(
                                  "h-9 rounded-lg py-1 text-xs bg-white",
                                  hasItemError ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200"
                                )}
                              >
                                <option value="">
                                  {isArabic ? "اختر صنفاً..." : "Select item..."}
                                </option>
                                {items
                                  .filter((it) => it.isActive)
                                  .map((it) => (
                                    <option key={it.id} value={it.id}>
                                      {it.code} · {it.name}
                                    </option>
                                  ))}
                              </Select>
                              {hasItemError && (
                                <p className="text-[10px] text-red-500 mt-1 font-semibold">
                                  {localErrors[`line_${index}_itemId`]}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                id={`line_${index}_unitOfMeasure`}
                                value={line.unitOfMeasure}
                                onChange={(e) => updateLine(index, { unitOfMeasure: e.target.value })}
                                className={cn(
                                  "h-9 rounded-lg py-1 text-xs font-semibold bg-white",
                                  hasUnitError ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200",
                                  isArabic ? "text-right" : "text-left"
                                )}
                              />
                              {hasUnitError && (
                                <p className="text-[10px] text-red-500 mt-1 font-semibold">
                                  {localErrors[`line_${index}_unitOfMeasure`]}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                id={`line_${index}_quantity`}
                                value={line.quantity}
                                onChange={(e) => updateLine(index, { quantity: e.target.value })}
                                className={cn(
                                  "h-9 rounded-lg py-1 text-xs font-mono bg-white",
                                  hasQtyError ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200",
                                  isArabic ? "text-right" : "text-left"
                                )}
                                inputMode="decimal"
                              />
                              {hasQtyError && (
                                <p className="text-[10px] text-red-500 mt-1 font-semibold">
                                  {localErrors[`line_${index}_quantity`]}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                id={`line_${index}_unitCost`}
                                value={line.unitCost}
                                onChange={(e) => updateLine(index, { unitCost: e.target.value })}
                                className={cn(
                                  "h-9 rounded-lg py-1 text-xs font-mono bg-white",
                                  hasCostError ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200",
                                  isArabic ? "text-right" : "text-left"
                                )}
                                inputMode="decimal"
                              />
                              {hasCostError && (
                                <p className="text-[10px] text-red-500 mt-1 font-semibold">
                                  {localErrors[`line_${index}_unitCost`]}
                                </p>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 font-mono font-bold text-slate-700 bg-slate-50/25">
                              {lineTotal.toFixed(3)}
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                value={line.description}
                                onChange={(e) => updateLine(index, { description: e.target.value })}
                                className="h-9 rounded-lg border-slate-200 py-1 text-xs bg-white"
                                placeholder={isArabic ? "بيان اختياري لهذا السطر" : "Optional line note"}
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-center">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => removeLine(index)}
                                className="h-8 w-8 rounded-lg border-red-200 p-0 text-red-500 hover:bg-red-50 transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Table Footer with Summary totals */}
                    <tfoot className="bg-slate-50/50 border-t border-slate-200 font-bold text-slate-800">
                      <tr>
                        <td colSpan={3} className={cn("px-4 py-3 text-xs uppercase text-slate-500", isArabic ? "text-left" : "text-right")}>
                          {isArabic ? "المجموع الكلي:" : "Total Summary:"}
                        </td>
                        <td className="px-3 py-3 font-mono text-sm">
                          {totalQuantity.toFixed(2)}
                        </td>
                        <td className="px-3 py-3"></td>
                        <td className="px-3 py-3 font-mono text-sm text-emerald-700">
                          {totalCost.toFixed(3)}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={cn("flex items-center justify-between gap-4 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-8", isInline && "rounded-b-lg shadow-md")}>
          <Button variant="secondary" onClick={onClose} className="rounded-xl px-5 py-2.5 font-semibold text-sm">
            {t("inventory.button.cancel")}
          </Button>

          <Button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center gap-1.5 px-6 py-2.5"
          >
            <Save className="h-4 w-4" />
            <span>
              {editor.id ? t("inventory.button.save") : t("inventory.button.createReceipt")}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
