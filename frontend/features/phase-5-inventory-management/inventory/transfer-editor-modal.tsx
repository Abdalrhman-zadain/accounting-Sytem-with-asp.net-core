import { useMemo, useState, useEffect } from "react";
import {
  LuFileText as FileText,
  LuSave as Save,
  LuTrash2 as Trash2,
  LuX as X,
  LuPlus as Plus,
  LuWarehouse as WarehouseIcon,
  LuArrowLeftRight as TransferIcon,
} from "react-icons/lu";

import { Button } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  InventoryItem,
  InventoryWarehouse,
} from "@/types/api";

export type TransferLineEditorState = {
  itemId: string;
  quantity: string;
  unitOfMeasure: string;
  description: string;
};

export type TransferEditorState = {
  id?: string;
  reference: string;
  transferDate: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  description: string;
  lines: TransferLineEditorState[];
};

type TransferEditorModalProps = {
  isOpen: boolean;
  title: string;
  editor: TransferEditorState;
  onClose: () => void;
  onChange: (editor: TransferEditorState | ((current: TransferEditorState) => TransferEditorState)) => void;
  onSave: () => void;
  isSaving: boolean;
  validationError?: string | null;
  items: InventoryItem[];
  warehouses: InventoryWarehouse[];
  presentation?: "modal" | "inline";
};

export interface TransferFormErrors {
  transferDate?: string;
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;
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

export function createEmptyTransferLine(): TransferLineEditorState {
  return {
    itemId: "",
    quantity: "1",
    unitOfMeasure: "EA",
    description: "",
  };
}

export function TransferEditorModal({
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
}: TransferEditorModalProps) {
  const { t, language } = useTranslation();
  const isArabic = language === "ar";

  const [localErrors, setLocalErrors] = useState<TransferFormErrors>({});
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

  const updateEditor = (updater: (current: TransferEditorState) => TransferEditorState) => {
    onChange(updater);
  };

  const addLine = () => {
    clearFieldError("lines");
    updateEditor((current) => ({
      ...current,
      lines: [...current.lines, createEmptyTransferLine()],
    }));
  };

  const removeLine = (index: number) => {
    clearFieldError("lines");
    updateEditor((current) => ({
      ...current,
      lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
    }));
  };

  const updateLine = (index: number, patch: Partial<TransferLineEditorState>) => {
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
  };

  const handleSaveClick = () => {
    const errors: TransferFormErrors = {};
    let firstErrorField: string | null = null;

    if (!editor.transferDate) {
      errors.transferDate = isArabic ? "تاريخ التحويل مطلوب" : "Transfer date is required";
      if (!firstErrorField) firstErrorField = "transfer-date";
    }

    if (!editor.sourceWarehouseId) {
      errors.sourceWarehouseId = isArabic ? "مستودع المصدر مطلوب" : "Source warehouse is required";
      if (!firstErrorField) firstErrorField = "transfer-sourceWarehouseId";
    }

    if (!editor.destinationWarehouseId) {
      errors.destinationWarehouseId = isArabic ? "مستودع الوجهة مطلوب" : "Destination warehouse is required";
      if (!firstErrorField) firstErrorField = "transfer-destinationWarehouseId";
    }

    if (editor.sourceWarehouseId && editor.destinationWarehouseId && editor.sourceWarehouseId === editor.destinationWarehouseId) {
      errors.destinationWarehouseId = isArabic ? "مستودع الوجهة يجب أن يختلف عن مستودع المصدر" : "Destination warehouse must be different from source warehouse";
      if (!firstErrorField) firstErrorField = "transfer-destinationWarehouseId";
    }

    if (editor.lines.length === 0) {
      errors.lines = isArabic
        ? "يجب إضافة مادة واحدة على الأقل للتحويل"
        : "At least one item must be added for transfer";
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
        const qtyVal = parseFloat(line.quantity);
        if (!line.quantity || isNaN(qtyVal) || qtyVal <= 0) {
          errors[`line_${index}_quantity`] = isArabic ? "الكمية يجب أن تكون أكبر من 0" : "Quantity must be greater than 0";
          if (!firstErrorField) firstErrorField = `line_${index}_quantity`;
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

  const totalQuantity = editor.lines.reduce((sum, line) => sum + (parseFloat(line.quantity) || 0), 0);
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
                  {isArabic ? "إدارة وتوثيق مستندات تحويل المخزون بين المستودعات" : "Manage and log stock transfer documents between warehouses"}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <TransferIcon className="h-6 w-6" />
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
                  <TransferIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-slate-900 arabic-ui-heading">{title}</h1>
                  <p className="truncate text-xs text-slate-500">
                    {isArabic ? "إدارة وتوثيق مستندات تحويل المخزون بين المستودعات" : "Manage and log stock transfer documents between warehouses"}
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

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <Field id="transfer-reference" label={isArabic ? "الرقم المرجعي" : "Reference"} labelAlign={isArabic ? "end" : "start"}>
                    <Input
                      id="transfer-reference"
                      value={editor.reference}
                      onChange={(e) => updateEditor((current) => ({ ...current, reference: e.target.value }))}
                      className={cn("bg-slate-50/50 border-slate-200", isArabic ? "text-right" : "text-left")}
                      placeholder={isArabic ? "مثال: TR-0001" : "e.g. TR-0001"}
                    />
                  </Field>
                </div>

                <div>
                  <Field
                    id="transfer-date"
                    label={isArabic ? "تاريخ التحويل" : "Transfer Date"}
                    required
                    error={localErrors.transferDate}
                    labelAlign={isArabic ? "end" : "start"}
                  >
                    <Input
                      id="transfer-date"
                      type="date"
                      min="1900-01-01"
                      value={editor.transferDate}
                      onChange={(e) => {
                        updateEditor((current) => ({ ...current, transferDate: e.target.value }));
                        clearFieldError("transferDate");
                      }}
                      className={cn(
                        "bg-slate-50/50",
                        isArabic ? "text-right" : "text-left",
                        localErrors.transferDate ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200"
                      )}
                    />
                  </Field>
                </div>

                <div>
                  <Field
                    id="transfer-sourceWarehouseId"
                    label={isArabic ? "مستودع المصدر" : "Source Warehouse"}
                    required
                    error={localErrors.sourceWarehouseId}
                    labelAlign={isArabic ? "end" : "start"}
                  >
                    <Select
                      id="transfer-sourceWarehouseId"
                      value={editor.sourceWarehouseId}
                      onChange={(e) => {
                        updateEditor((current) => ({ ...current, sourceWarehouseId: e.target.value }));
                        clearFieldError("sourceWarehouseId");
                      }}
                      className={cn(
                        "bg-slate-50/50",
                        isArabic ? "text-right" : "text-left",
                        localErrors.sourceWarehouseId ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200"
                      )}
                    >
                      <option value="">
                        {isArabic ? "اختر مستودع المصدر..." : "Select source warehouse..."}
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
                  <Field
                    id="transfer-destinationWarehouseId"
                    label={isArabic ? "مستودع الوجهة" : "Destination Warehouse"}
                    required
                    error={localErrors.destinationWarehouseId}
                    labelAlign={isArabic ? "end" : "start"}
                  >
                    <Select
                      id="transfer-destinationWarehouseId"
                      value={editor.destinationWarehouseId}
                      onChange={(e) => {
                        updateEditor((current) => ({ ...current, destinationWarehouseId: e.target.value }));
                        clearFieldError("destinationWarehouseId");
                      }}
                      className={cn(
                        "bg-slate-50/50",
                        isArabic ? "text-right" : "text-left",
                        localErrors.destinationWarehouseId ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200"
                      )}
                    >
                      <option value="">
                        {isArabic ? "اختر مستودع الوجهة..." : "Select destination warehouse..."}
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
              </div>

              <div className="mt-4">
                <Field id="transfer-description" label={isArabic ? "الوصف العام" : "General Description"} labelAlign={isArabic ? "end" : "start"}>
                  <Textarea
                    id="transfer-description"
                    value={editor.description}
                    rows={2}
                    onChange={(e) => updateEditor((current) => ({ ...current, description: e.target.value }))}
                    className={cn("bg-slate-50/50 border-slate-200", isArabic ? "text-right" : "text-left")}
                    placeholder={isArabic ? "أدخل تفاصيل عامة حول هذا التحويل..." : "Enter general details about this transfer..."}
                  />
                </Field>
              </div>
            </section>

            {/* Transfer Lines Card Table */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 transition-all duration-200 hover:shadow-md">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <WarehouseIcon className="h-4.5 w-4.5" />
                  </div>
                  <div className={isArabic ? "text-right" : "text-left"}>
                    <div className="text-base font-bold text-slate-950 arabic-ui-heading">
                      {isArabic ? "المواد المحولة" : "Transferred Items"}
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
                    ? "لا توجد مواد مضافة لهذا التحويل بعد. اضغط على 'إضافة مادة' للبدء."
                    : "No items added to this transfer yet. Click 'Add Item' to start."}
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
                        <th scope="col" className={cn("px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[200px]", isArabic ? "text-right" : "text-left")}>{isArabic ? "البيان / الوصف" : "Line Description"}</th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-[80px]">{isArabic ? "إجراء" : "Action"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {editor.lines.map((line, index) => {
                        const hasItemError = !!localErrors[`line_${index}_itemId`];
                        const hasUnitError = !!localErrors[`line_${index}_unitOfMeasure`];
                        const hasQtyError = !!localErrors[`line_${index}_quantity`];

                        return (
                          <tr key={`transfer-row-${index}`} className="hover:bg-slate-50/50 transition">
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
                          {isArabic ? "المجموع الكلي للكميات:" : "Total Quantity:"}
                        </td>
                        <td className="px-3 py-3 font-mono text-sm">
                          {totalQuantity.toFixed(2)}
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
              {editor.id ? t("inventory.button.save") : t("inventory.button.createTransfer")}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
