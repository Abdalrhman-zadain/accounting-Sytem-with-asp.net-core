import { useMemo, useState, useEffect } from "react";
import {
  LuFileText as FileText,
  LuSave as Save,
  LuTrash2 as Trash2,
  LuX as X,
  LuPlus as Plus,
  LuWarehouse as WarehouseIcon,
  LuSettings2 as AdjustmentIcon,
} from "react-icons/lu";

import { Button } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  InventoryItem,
  InventoryWarehouse,
} from "@/types/api";

export type AdjustmentLineEditorState = {
  itemId: string;
  systemQuantity: string;
  countedQuantity: string;
  unitOfMeasure: string;
  description: string;
};

export type AdjustmentEditorState = {
  id?: string;
  reference: string;
  adjustmentDate: string;
  warehouseId: string;
  reason: string;
  description: string;
  lines: AdjustmentLineEditorState[];
};

type AdjustmentEditorModalProps = {
  isOpen: boolean;
  title: string;
  editor: AdjustmentEditorState;
  onClose: () => void;
  onChange: (editor: AdjustmentEditorState | ((current: AdjustmentEditorState) => AdjustmentEditorState)) => void;
  onSave: () => void;
  isSaving: boolean;
  validationError?: string | null;
  items: InventoryItem[];
  warehouses: InventoryWarehouse[];
  presentation?: "modal" | "inline";
};

export interface AdjustmentFormErrors {
  adjustmentDate?: string;
  warehouseId?: string;
  lines?: string;
  [key: string]: string | undefined;
}

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

function formatVariance(systemQuantity: string, countedQuantity: string) {
  const system = Number(systemQuantity);
  const counted = Number(countedQuantity);
  if (Number.isNaN(system) || Number.isNaN(counted)) {
    return "";
  }
  return String(counted - system);
}

export function createEmptyAdjustmentLine(): AdjustmentLineEditorState {
  return {
    itemId: "",
    systemQuantity: "0",
    countedQuantity: "0",
    unitOfMeasure: "EA",
    description: "",
  };
}

export function AdjustmentEditorModal({
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
}: AdjustmentEditorModalProps) {
  const { t, language } = useTranslation();
  const isArabic = language === "ar";

  const [localErrors, setLocalErrors] = useState<AdjustmentFormErrors>({});
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

  useEffect(() => {
    if (pendingFocusField) {
      focusField(pendingFocusField);
      setPendingFocusField(null);
    }
  }, [pendingFocusField]);

  if (!isOpen) return null;

  const updateEditor = (updater: (current: AdjustmentEditorState) => AdjustmentEditorState) => {
    onChange(updater);
  };

  const addLine = () => {
    clearFieldError("lines");
    updateEditor((current) => ({
      ...current,
      lines: [...current.lines, createEmptyAdjustmentLine()],
    }));
  };

  const removeLine = (index: number) => {
    clearFieldError("lines");
    updateEditor((current) => ({
      ...current,
      lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
    }));
  };

  const updateLine = (index: number, patch: Partial<AdjustmentLineEditorState>) => {
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
    if (patch.systemQuantity) clearFieldError(`line_${index}_systemQuantity`);
    if (patch.countedQuantity) clearFieldError(`line_${index}_countedQuantity`);
  };

  const handleSaveClick = () => {
    const errors: AdjustmentFormErrors = {};
    let firstErrorField: string | null = null;

    if (!editor.adjustmentDate) {
      errors.adjustmentDate = isArabic ? "تاريخ التسوية مطلوب" : "Adjustment date is required";
      if (!firstErrorField) firstErrorField = "adjustment-date";
    }

    if (!editor.warehouseId) {
      errors.warehouseId = isArabic ? "المستودع مطلوب" : "Warehouse is required";
      if (!firstErrorField) firstErrorField = "adjustment-warehouseId";
    }

    if (editor.lines.length === 0) {
      errors.lines = isArabic
        ? "يجب إضافة مادة واحدة على الأثل للتسوية"
        : "At least one item must be added for adjustment";
    } else {
      editor.lines.forEach((line, index) => {
        if (!line.itemId) {
          errors[`line_${index}_itemId`] = isArabic ? "الصنف مطلوب" : "Item is required";
          if (!firstErrorField) firstErrorField = `line_${index}_itemId`;
        }
        if (!line.unitOfMeasure) {
          errors[`line_${index}_unitOfMeasure`] = isArabic ? "الوحدة مطلوبة" : "Unit of measure is required";
          if (!firstErrorField) firstErrorField = `line_${index}_unitOfMeasure`;
        }

        const sysQtyVal = parseFloat(line.systemQuantity);
        if (!line.systemQuantity || isNaN(sysQtyVal) || sysQtyVal < 0) {
          errors[`line_${index}_systemQuantity`] = isArabic ? "الكمية الدفترية غير صالحة" : "Invalid system quantity";
          if (!firstErrorField) firstErrorField = `line_${index}_systemQuantity`;
        }

        const countedQtyVal = parseFloat(line.countedQuantity);
        if (!line.countedQuantity || isNaN(countedQtyVal) || countedQtyVal < 0) {
          errors[`line_${index}_countedQuantity`] = isArabic ? "الكمية الفعلية غير صالحة" : "Invalid counted quantity";
          if (!firstErrorField) firstErrorField = `line_${index}_countedQuantity`;
        }
      });
    }

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      if (firstErrorField) {
        setPendingFocusField(firstErrorField);
      }
      return;
    }

    setLocalErrors({});
    onSave();
  };

  const totalSystemQuantity = editor.lines.reduce((sum, line) => sum + (parseFloat(line.systemQuantity) || 0), 0);
  const totalCountedQuantity = editor.lines.reduce((sum, line) => sum + (parseFloat(line.countedQuantity) || 0), 0);
  const totalVarianceQuantity = totalCountedQuantity - totalSystemQuantity;

  const isInline = presentation === "inline";

  const controlClassName = cn(
    "h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-base shadow-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/10",
    isArabic ? "text-right" : "text-left",
  );

  const labelClassName = cn("text-sm font-bold tracking-normal text-slate-700", isArabic && "arabic-ui");

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
                  {isArabic ? "إدارة وتوثيق مستندات تسوية المخزون والفروقات" : "Manage and log stock adjustment and variance documents"}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <AdjustmentIcon className="h-6 w-6" />
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
                  <AdjustmentIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-slate-900 arabic-ui-heading">{title}</h1>
                  <p className="truncate text-sm text-slate-500">
                    {isArabic ? "إدارة وتوثيق مستندات تسوية المخزون والفروقات" : "Manage and log stock adjustment and variance documents"}
                  </p>
                </div>
              </div>
            ) : null}

            {validationError || localErrors.lines ? (
              <div className={cn("rounded-md border border-red-200 bg-red-50 px-5 py-4 text-base font-semibold text-red-700 shadow-sm", isArabic ? "text-right" : "text-left")}>
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
                  <div className="text-lg font-bold text-slate-950 arabic-ui-heading">
                    {isArabic ? "البيانات الأساسية" : "Basic Information"}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <Field id="adjustment-reference" label={isArabic ? "الرقم المرجعي" : "Reference"} labelAlign={isArabic ? "end" : "start"} labelClassName={labelClassName}>
                    <Input
                      id="adjustment-reference"
                      value={editor.reference}
                      onChange={(e) => updateEditor((current) => ({ ...current, reference: e.target.value }))}
                      className={controlClassName}
                      placeholder={isArabic ? "مثال: AD-0001" : "e.g. AD-0001"}
                    />
                  </Field>
                </div>

                <div>
                  <Field
                    id="adjustment-date"
                    label={isArabic ? "تاريخ التسوية" : "Adjustment Date"}
                    required
                    error={localErrors.adjustmentDate}
                    labelAlign={isArabic ? "end" : "start"}
                    labelClassName={labelClassName}
                  >
                    <Input
                      id="adjustment-date"
                      type="date"
                      min="1900-01-01"
                      value={editor.adjustmentDate}
                      onChange={(e) => {
                        updateEditor((current) => ({ ...current, adjustmentDate: e.target.value }));
                        clearFieldError("adjustmentDate");
                      }}
                      className={cn(
                        controlClassName,
                        localErrors.adjustmentDate ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200"
                      )}
                    />
                  </Field>
                </div>

                <div>
                  <Field
                    id="adjustment-warehouseId"
                    label={isArabic ? "المستودع" : "Warehouse"}
                    required
                    error={localErrors.warehouseId}
                    labelAlign={isArabic ? "end" : "start"}
                    labelClassName={labelClassName}
                  >
                    <Select
                      id="adjustment-warehouseId"
                      value={editor.warehouseId}
                      onChange={(e) => {
                        updateEditor((current) => ({ ...current, warehouseId: e.target.value }));
                        clearFieldError("warehouseId");
                      }}
                      className={cn(
                        controlClassName,
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
                  <Field id="adjustment-reason" label={isArabic ? "سبب التسوية" : "Reason"} labelAlign={isArabic ? "end" : "start"} labelClassName={labelClassName}>
                    <Input
                      id="adjustment-reason"
                      value={editor.reason}
                      onChange={(e) => updateEditor((current) => ({ ...current, reason: e.target.value }))}
                      className={controlClassName}
                      placeholder={isArabic ? "مثال: جرد سنوي، بضاعة تالفة" : "e.g. Annual audit, damaged goods"}
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-4">
                <Field id="adjustment-description" label={isArabic ? "الوصف العام" : "General Description"} labelAlign={isArabic ? "end" : "start"} labelClassName={labelClassName}>
                  <Textarea
                    id="adjustment-description"
                    value={editor.description}
                    rows={2}
                    onChange={(e) => updateEditor((current) => ({ ...current, description: e.target.value }))}
                    className={cn(controlClassName, "h-auto")}
                    placeholder={isArabic ? "أدخل تفاصيل عامة حول هذه التسوية..." : "Enter general details about this adjustment..."}
                  />
                </Field>
              </div>
            </section>

            {/* Adjustment Lines Card Table */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 transition-all duration-200 hover:shadow-md">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <WarehouseIcon className="h-4.5 w-4.5" />
                  </div>
                  <div className={isArabic ? "text-right" : "text-left"}>
                    <div className="text-lg font-bold text-slate-950 arabic-ui-heading">
                      {isArabic ? "المواد المعدلة" : "Adjusted Items"}
                    </div>
                  </div>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={addLine} className="rounded-xl text-sm flex items-center gap-1.5 py-1.5 px-3">
                  <Plus className="h-4 w-4" />
                  <span>{isArabic ? "إضافة مادة" : "Add Item"}</span>
                </Button>
              </div>

              {editor.lines.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  {isArabic
                    ? "لا توجد مواد مضافة لهذه التسوية بعد. اضغط على 'إضافة مادة' للبدء."
                    : "No items added to this adjustment yet. Click 'Add Item' to start."}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50/75">
                      <tr>
                        <th scope="col" className="w-[50px] px-3 py-3.5 text-center text-sm font-bold text-slate-500 uppercase">#</th>
                        <th scope="col" className={cn("px-4 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider min-w-[280px]", isArabic ? "text-right" : "text-left")}>{isArabic ? "الصنف" : "Item"}</th>
                        <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[100px]", isArabic ? "text-right" : "text-left")}>{isArabic ? "الوحدة" : "Unit"}</th>
                        <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[120px]", isArabic ? "text-right" : "text-left")}>{isArabic ? "الكمية الدفترية" : "System Qty"}</th>
                        <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[120px]", isArabic ? "text-right" : "text-left")}>{isArabic ? "الكمية الفعلية" : "Counted Qty"}</th>
                        <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[100px]", isArabic ? "text-right" : "text-left")}>{isArabic ? "الفارق" : "Variance"}</th>
                        <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider min-w-[180px]", isArabic ? "text-right" : "text-left")}>{isArabic ? "البيان / الوصف" : "Line Description"}</th>
                        <th scope="col" className="px-3 py-3.5 text-center text-sm font-bold text-slate-500 uppercase tracking-wider w-[80px]">{isArabic ? "إجراء" : "Action"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {editor.lines.map((line, index) => {
                        const hasItemError = !!localErrors[`line_${index}_itemId`];
                        const hasUnitError = !!localErrors[`line_${index}_unitOfMeasure`];
                        const hasSysQtyError = !!localErrors[`line_${index}_systemQuantity`];
                        const hasCountedQtyError = !!localErrors[`line_${index}_countedQuantity`];

                        const variance = formatVariance(line.systemQuantity, line.countedQuantity);
                        const varianceNum = Number(variance);
                        const isVarianceNegative = !isNaN(varianceNum) && varianceNum < 0;
                        const isVariancePositive = !isNaN(varianceNum) && varianceNum > 0;

                        return (
                          <tr key={`adjustment-row-${index}`} className="hover:bg-slate-50/50 transition">
                            <td className="whitespace-nowrap px-3 py-4 text-center font-bold text-slate-400 text-sm">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3.5">
                              <Select
                                id={`line_${index}_itemId`}
                                value={line.itemId}
                                onChange={(e) => updateLine(index, { itemId: e.target.value })}
                                className={cn(
                                  "h-10 rounded-lg text-sm bg-white",
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
                            <td className="px-3 py-3.5">
                              <Input
                                id={`line_${index}_unitOfMeasure`}
                                value={line.unitOfMeasure}
                                onChange={(e) => updateLine(index, { unitOfMeasure: e.target.value })}
                                className={cn(
                                  "h-10 rounded-lg text-sm font-semibold bg-white",
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
                            <td className="px-3 py-3.5">
                              <Input
                                id={`line_${index}_systemQuantity`}
                                value={line.systemQuantity}
                                onChange={(e) => updateLine(index, { systemQuantity: e.target.value })}
                                className={cn(
                                  "h-10 rounded-lg text-sm font-mono bg-white",
                                  hasSysQtyError ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200",
                                  isArabic ? "text-right" : "text-left"
                                )}
                                inputMode="decimal"
                              />
                              {hasSysQtyError && (
                                <p className="text-[10px] text-red-500 mt-1 font-semibold">
                                  {localErrors[`line_${index}_systemQuantity`]}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-3.5">
                              <Input
                                id={`line_${index}_countedQuantity`}
                                value={line.countedQuantity}
                                onChange={(e) => updateLine(index, { countedQuantity: e.target.value })}
                                className={cn(
                                  "h-10 rounded-lg text-sm font-mono bg-white",
                                  hasCountedQtyError ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200",
                                  isArabic ? "text-right" : "text-left"
                                )}
                                inputMode="decimal"
                              />
                              {hasCountedQtyError && (
                                <p className="text-[10px] text-red-500 mt-1 font-semibold">
                                  {localErrors[`line_${index}_countedQuantity`]}
                                </p>
                              )}
                            </td>
                            <td className={cn(
                              "px-3 py-3.5 font-mono text-sm font-bold text-center",
                              isVarianceNegative && "text-red-600",
                              isVariancePositive && "text-emerald-600"
                            )}>
                              {varianceNum > 0 ? `+${variance}` : variance}
                            </td>
                            <td className="px-3 py-3.5">
                              <Input
                                value={line.description}
                                onChange={(e) => updateLine(index, { description: e.target.value })}
                                className="h-10 rounded-lg border-slate-200 text-sm bg-white"
                                placeholder={isArabic ? "بيان اختياري لهذا السطر" : "Optional line note"}
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-center">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => removeLine(index)}
                                className="h-9 w-9 rounded-lg border-red-200 p-0 text-red-500 hover:bg-red-50 transition"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Table Footer with Summary totals */}
                    <tfoot className="bg-slate-50/50 border-t border-slate-200 font-bold text-slate-800">
                      <tr>
                        <td colSpan={3} className={cn("px-4 py-4 text-sm uppercase text-slate-500", isArabic ? "text-left" : "text-right")}>
                          {isArabic ? "المجاميع الكلية للكميات وفروقاتها:" : "Totals & Variances:"}
                        </td>
                        <td className="px-3 py-4 font-mono text-base text-slate-900">
                          {totalSystemQuantity.toFixed(2)}
                        </td>
                        <td className="px-3 py-4 font-mono text-base text-slate-900">
                          {totalCountedQuantity.toFixed(2)}
                        </td>
                        <td className={cn(
                          "px-3 py-4 font-mono text-base text-center",
                          totalVarianceQuantity < 0 && "text-red-600",
                          totalVarianceQuantity > 0 && "text-emerald-600"
                        )}>
                          {totalVarianceQuantity > 0 ? `+${totalVarianceQuantity.toFixed(2)}` : totalVarianceQuantity.toFixed(2)}
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
          <Button variant="secondary" onClick={onClose} className="rounded-xl px-6 py-3 font-bold text-base">
            {t("inventory.button.cancel")}
          </Button>

          <Button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center gap-1.5 px-6 py-3"
          >
            <Save className="h-5 w-5" />
            <span>
              {editor.id ? t("inventory.button.save") : t("inventory.button.createAdjustment")}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
