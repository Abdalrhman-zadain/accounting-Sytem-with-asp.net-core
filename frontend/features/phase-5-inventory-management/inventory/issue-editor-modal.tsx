import { useMemo, useState, useEffect } from "react";
import {
  LuFileText as FileText,
  LuSave as Save,
  LuTrash2 as Trash2,
  LuX as X,
  LuPlus as Plus,
  LuWarehouse as WarehouseIcon,
  LuPackage as PackageIcon,
} from "react-icons/lu";

import { Button } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  InventoryItem,
  InventoryWarehouse,
} from "@/types/api";

export type IssueLineEditorState = {
  itemId: string;
  quantity: string;
  unitOfMeasure: string;
  description: string;
};

export type IssueEditorState = {
  id?: string;
  reference: string;
  issueDate: string;
  warehouseId: string;
  sourceSalesOrderRef: string;
  sourceSalesInvoiceRef: string;
  sourceProductionRequestRef: string;
  sourceInternalRequestRef: string;
  description: string;
  lines: IssueLineEditorState[];
};

type IssueEditorModalProps = {
  isOpen: boolean;
  title: string;
  editor: IssueEditorState;
  onClose: () => void;
  onChange: (editor: IssueEditorState | ((current: IssueEditorState) => IssueEditorState)) => void;
  onSave: () => void;
  isSaving: boolean;
  validationError?: string | null;
  items: InventoryItem[];
  warehouses: InventoryWarehouse[];
  presentation?: "modal" | "inline";
};

export interface IssueFormErrors {
  issueDate?: string;
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

export function createEmptyIssueLine(): IssueLineEditorState {
  return {
    itemId: "",
    quantity: "1",
    unitOfMeasure: "EA",
    description: "",
  };
}

export function IssueEditorModal({
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
}: IssueEditorModalProps) {
  const { t, language } = useTranslation();
  const isArabic = language === "ar";

  const [localErrors, setLocalErrors] = useState<IssueFormErrors>({});
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

  const updateEditor = (updater: (current: IssueEditorState) => IssueEditorState) => {
    onChange(updater);
  };

  const addLine = () => {
    clearFieldError("lines");
    updateEditor((current) => ({
      ...current,
      lines: [...current.lines, createEmptyIssueLine()],
    }));
  };

  const removeLine = (index: number) => {
    clearFieldError("lines");
    updateEditor((current) => ({
      ...current,
      lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
    }));
  };

  const updateLine = (index: number, patch: Partial<IssueLineEditorState>) => {
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
    const errors: IssueFormErrors = {};
    let firstErrorField: string | null = null;

    if (!editor.issueDate) {
      errors.issueDate = isArabic ? "تاريخ الصرف مطلوب" : "Issue date is required";
      if (!firstErrorField) firstErrorField = "issue-date";
    }

    if (!editor.warehouseId) {
      errors.warehouseId = isArabic ? "المستودع مطلوب" : "Warehouse is required";
      if (!firstErrorField) firstErrorField = "issue-warehouseId";
    }

    if (editor.lines.length === 0) {
      errors.lines = isArabic
        ? "يجب إضافة مادة واحدة على الأقل للصرف"
        : "At least one item must be added for issue";
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
                  {isArabic ? "إدارة وتوثيق مستندات صرف المخزون الصادرة" : "Manage and log outgoing stock issue documents"}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <PackageIcon className="h-6 w-6" />
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
                  <PackageIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-slate-900 arabic-ui-heading">{title}</h1>
                  <p className="truncate text-sm text-slate-500">
                    {isArabic ? "إدارة وتوثيق مستندات صرف المخزون الصادرة" : "Manage and log outgoing stock issue documents"}
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

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <div>
                  <Field id="issue-reference" label={isArabic ? "الرقم المرجعي" : "Reference"} labelAlign={isArabic ? "end" : "start"} labelClassName={labelClassName}>
                    <Input
                      id="issue-reference"
                      value={editor.reference}
                      onChange={(e) => updateEditor((current) => ({ ...current, reference: e.target.value }))}
                      className={controlClassName}
                      placeholder={isArabic ? "مثال: GI-0001" : "e.g. GI-0001"}
                    />
                  </Field>
                </div>

                <div>
                  <Field
                    id="issue-date"
                    label={isArabic ? "تاريخ الصرف" : "Issue Date"}
                    required
                    error={localErrors.issueDate}
                    labelAlign={isArabic ? "end" : "start"}
                    labelClassName={labelClassName}
                  >
                    <Input
                      id="issue-date"
                      type="date"
                      min="1900-01-01"
                      value={editor.issueDate}
                      onChange={(e) => {
                        updateEditor((current) => ({ ...current, issueDate: e.target.value }));
                        clearFieldError("issueDate");
                      }}
                      className={cn(
                        controlClassName,
                        localErrors.issueDate ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200"
                      )}
                    />
                  </Field>
                </div>

                <div>
                  <Field
                    id="issue-warehouseId"
                    label={isArabic ? "المستودع" : "Warehouse"}
                    required
                    error={localErrors.warehouseId}
                    labelAlign={isArabic ? "end" : "start"}
                    labelClassName={labelClassName}
                  >
                    <Select
                      id="issue-warehouseId"
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
                  <Field id="issue-so-ref" label={isArabic ? "أمر بيع المصدر" : "Source Sales Order"} labelAlign={isArabic ? "end" : "start"} labelClassName={labelClassName}>
                    <Input
                      id="issue-so-ref"
                      value={editor.sourceSalesOrderRef}
                      onChange={(e) => updateEditor((current) => ({ ...current, sourceSalesOrderRef: e.target.value }))}
                      className={controlClassName}
                      placeholder={isArabic ? "اختياري" : "Optional"}
                    />
                  </Field>
                </div>

                <div>
                  <Field id="issue-invoice-ref" label={isArabic ? "فاتورة بيع المصدر" : "Source Sales Invoice"} labelAlign={isArabic ? "end" : "start"} labelClassName={labelClassName}>
                    <Input
                      id="issue-invoice-ref"
                      value={editor.sourceSalesInvoiceRef}
                      onChange={(e) => updateEditor((current) => ({ ...current, sourceSalesInvoiceRef: e.target.value }))}
                      className={controlClassName}
                      placeholder={isArabic ? "اختياري" : "Optional"}
                    />
                  </Field>
                </div>

                <div>
                  <Field id="issue-prod-ref" label={isArabic ? "طلب الإنتاج المصدر" : "Source Production Request"} labelAlign={isArabic ? "end" : "start"} labelClassName={labelClassName}>
                    <Input
                      id="issue-prod-ref"
                      value={editor.sourceProductionRequestRef}
                      onChange={(e) => updateEditor((current) => ({ ...current, sourceProductionRequestRef: e.target.value }))}
                      className={controlClassName}
                      placeholder={isArabic ? "اختياري" : "Optional"}
                    />
                  </Field>
                </div>

                <div>
                  <Field id="issue-internal-ref" label={isArabic ? "الطلب الداخلي المصدر" : "Source Internal Request"} labelAlign={isArabic ? "end" : "start"} labelClassName={labelClassName}>
                    <Input
                      id="issue-internal-ref"
                      value={editor.sourceInternalRequestRef}
                      onChange={(e) => updateEditor((current) => ({ ...current, sourceInternalRequestRef: e.target.value }))}
                      className={controlClassName}
                      placeholder={isArabic ? "اختياري" : "Optional"}
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-4">
                <Field id="issue-description" label={isArabic ? "الوصف العام" : "General Description"} labelAlign={isArabic ? "end" : "start"} labelClassName={labelClassName}>
                  <Textarea
                    id="issue-description"
                    value={editor.description}
                    rows={2}
                    onChange={(e) => updateEditor((current) => ({ ...current, description: e.target.value }))}
                    className={cn(controlClassName, "h-auto")}
                    placeholder={isArabic ? "أدخل تفاصيل عامة حول هذا الصرف..." : "Enter general details about this issue..."}
                  />
                </Field>
              </div>
            </section>

            {/* Issue Lines Card Table */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 transition-all duration-200 hover:shadow-md">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <WarehouseIcon className="h-4.5 w-4.5" />
                  </div>
                  <div className={isArabic ? "text-right" : "text-left"}>
                    <div className="text-lg font-bold text-slate-950 arabic-ui-heading">
                      {isArabic ? "المواد المصروفة" : "Issued Items"}
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
                    ? "لا توجد مواد مضافة لهذا الصرف بعد. اضغط على 'إضافة مادة' للبدء."
                    : "No items added to this issue yet. Click 'Add Item' to start."}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50/75">
                      <tr>
                        <th scope="col" className="w-[50px] px-3 py-3.5 text-center text-sm font-bold text-slate-500 uppercase">#</th>
                        <th scope="col" className={cn("px-4 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider min-w-[280px]", isArabic ? "text-right" : "text-left")}>{isArabic ? "الصنف" : "Item"}</th>
                        <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[120px]", isArabic ? "text-right" : "text-left")}>{isArabic ? "الوحدة" : "Unit"}</th>
                        <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider w-[120px]", isArabic ? "text-right" : "text-left")}>{isArabic ? "الكمية" : "Quantity"}</th>
                        <th scope="col" className={cn("px-3 py-3.5 text-sm font-bold text-slate-500 uppercase tracking-wider min-w-[200px]", isArabic ? "text-right" : "text-left")}>{isArabic ? "البيان / الوصف" : "Line Description"}</th>
                        <th scope="col" className="px-3 py-3.5 text-center text-sm font-bold text-slate-500 uppercase tracking-wider w-[80px]">{isArabic ? "إجراء" : "Action"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {editor.lines.map((line, index) => {
                        const hasItemError = !!localErrors[`line_${index}_itemId`];
                        const hasUnitError = !!localErrors[`line_${index}_unitOfMeasure`];
                        const hasQtyError = !!localErrors[`line_${index}_quantity`];

                        return (
                          <tr key={`issue-row-${index}`} className="hover:bg-slate-50/50 transition">
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
                                id={`line_${index}_quantity`}
                                value={line.quantity}
                                onChange={(e) => updateLine(index, { quantity: e.target.value })}
                                className={cn(
                                  "h-10 rounded-lg text-sm font-mono bg-white",
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
                          {isArabic ? "المجموع الكلي للكميات:" : "Total Quantity:"}
                        </td>
                        <td className="px-3 py-4 font-mono text-base text-slate-900">
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
              {editor.id ? t("inventory.button.save") : t("inventory.button.createIssue")}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
