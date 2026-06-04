"use client";

import { useMemo } from "react";
import {
  LuFileText as FileText,
  LuPackage2 as Package2,
  LuSave as Save,
  LuTrash2 as Trash2,
  LuX as X,
  LuBarcode as Barcode,
  LuQrCode as QrCode,
  LuImage as ImageIcon,
  LuPaperclip as Paperclip,
  LuSettings as Settings,
  LuCalculator as Calculator,
} from "react-icons/lu";

import { Button } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  InventoryItem,
  InventoryItemCategory,
  InventoryItemGroup,
  InventoryItemUnitConversion,
  InventoryItemType,
  InventoryUnitOfMeasure,
  InventoryWarehouse,
  AccountOption,
  Tax,
} from "@/types/api";

export type ItemUnitConversionEditorState = {
  key: string;
  unitId: string;
  conversionFactorToBaseUnit: string;
  barcode: string;
  defaultSalesPrice: string;
  defaultPurchasePrice: string;
  isBaseUnit: boolean;
};

export type ItemEditorState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  internalNotes: string;
  itemImageUrl: string;
  attachmentsText: string;
  barcode: string;
  qrCodeValue: string;
  unitOfMeasure: string;
  unitOfMeasureId: string;
  category: string;
  itemGroupId: string;
  itemCategoryId: string;
  type: InventoryItemType;
  defaultSalesPrice: string;
  defaultPurchasePrice: string;
  currencyCode: string;
  taxable: boolean;
  defaultTaxId: string;
  trackInventory: boolean;
  inventoryAccountId: string;
  expenseAccountId: string;
  cogsAccountId: string;
  salesAccountId: string;
  salesReturnAccountId: string;
  adjustmentAccountId: string;
  reorderLevel: string;
  reorderQuantity: string;
  preferredWarehouseId: string;
  unitConversions: ItemUnitConversionEditorState[];
};

type ItemEditorModalProps = {
  isOpen: boolean;
  title: string;
  editor: ItemEditorState;
  onClose: () => void;
  onChange: (editor: ItemEditorState | ((current: ItemEditorState) => ItemEditorState)) => void;
  onSave: (mode: "save" | "saveAndClose") => void;
  isSaving: boolean;
  validationError?: string | null;
  activeItemGroups: InventoryItemGroup[];
  activeItemCategories: InventoryItemCategory[];
  activeUnitsOfMeasure: InventoryUnitOfMeasure[];
  activeTaxes: Tax[];
  warehouses: InventoryWarehouse[];
  inventoryAccounts: AccountOption[];
  expenseAccounts: AccountOption[];
  salesAccounts: AccountOption[];
  cogsAccounts: AccountOption[];
  adjustmentAccounts: AccountOption[];
  generateBarcode: () => void;
  isGeneratingBarcode: boolean;
  generateQr: () => void;
  previewCodes: () => void;
  printLabel: () => void;
  showCodePreview: boolean;
  getBarcodePreviewSvg: (value: string) => string;
  getQrPreviewSvg: (value: string) => string;
};

const ITEM_TYPE_OPTIONS: { value: InventoryItemType; labelAr: string; labelEn: string }[] = [
  { value: "RAW_MATERIAL", labelAr: "مادة خام", labelEn: "Raw Material" },
  { value: "FINISHED_GOOD", labelAr: "مادة جاهزة للبيع", labelEn: "Finished Good" },
  { value: "SERVICE", labelAr: "خدمة", labelEn: "Service" },
  { value: "MANUFACTURED_ITEM", labelAr: "مادة مصنّعة", labelEn: "Manufactured Item" },
];

function formatCodeName(code: string, name: string, isArabic: boolean) {
  return isArabic ? `${name} · ${code}` : `${code} · ${name}`;
}

function formatAccountOptionLabel(
  account: Pick<AccountOption, "code" | "name" | "nameAr">,
  isArabic: boolean,
) {
  const localizedName = isArabic
    ? account.nameAr?.trim() || account.name
    : account.name?.trim() || account.nameAr?.trim() || "";
  return formatCodeName(account.code, localizedName, isArabic);
}

export function createEmptyItemEditor(): ItemEditorState {
  return {
    code: "",
    name: "",
    description: "",
    internalNotes: "",
    itemImageUrl: "",
    attachmentsText: "",
    barcode: "",
    qrCodeValue: "",
    unitOfMeasure: "",
    unitOfMeasureId: "",
    category: "",
    itemGroupId: "",
    itemCategoryId: "",
    type: "FINISHED_GOOD",
    defaultSalesPrice: "",
    defaultPurchasePrice: "",
    currencyCode: "JOD",
    taxable: false,
    defaultTaxId: "",
    trackInventory: true,
    inventoryAccountId: "",
    expenseAccountId: "",
    cogsAccountId: "",
    salesAccountId: "",
    salesReturnAccountId: "",
    adjustmentAccountId: "",
    reorderLevel: "0",
    reorderQuantity: "0",
    preferredWarehouseId: "",
    unitConversions: [],
  };
}

export function createUnitConversionEditor(
  partial: Partial<ItemUnitConversionEditorState> = {},
): ItemUnitConversionEditorState {
  return {
    key: Math.random().toString(36).slice(2, 10),
    unitId: "",
    conversionFactorToBaseUnit: "",
    barcode: "",
    defaultSalesPrice: "",
    defaultPurchasePrice: "",
    isBaseUnit: false,
    ...partial,
  };
}

export function ItemEditorModal({
  isOpen,
  title,
  editor,
  onClose,
  onChange,
  onSave,
  isSaving,
  validationError,
  activeItemGroups,
  activeItemCategories,
  activeUnitsOfMeasure,
  activeTaxes,
  warehouses,
  inventoryAccounts,
  expenseAccounts,
  salesAccounts,
  cogsAccounts,
  adjustmentAccounts,
  generateBarcode,
  isGeneratingBarcode,
  generateQr,
  previewCodes,
  printLabel,
  showCodePreview,
  getBarcodePreviewSvg,
  getQrPreviewSvg,
}: ItemEditorModalProps) {
  const { t, language } = useTranslation();
  const isArabic = language === "ar";

  if (!isOpen) return null;

  const updateEditor = (updater: (current: ItemEditorState) => ItemEditorState) => {
    onChange(updater);
  };

  const itemEditorCategories = activeItemCategories.filter((row) => row.itemGroupId === editor.itemGroupId);
  const inventorySettingsDisabled = editor.type === "SERVICE" || !editor.trackInventory;

  const addUnitConversionRow = () => {
    updateEditor((current) => ({
      ...current,
      unitConversions: [...current.unitConversions, createUnitConversionEditor()],
    }));
  };

  const removeUnitConversionRow = (key: string) => {
    updateEditor((current) => ({
      ...current,
      unitConversions: current.unitConversions.filter((row) => row.key !== key),
    }));
  };

  const updateUnitConversionRow = (
    key: string,
    updater: (row: ItemUnitConversionEditorState) => ItemUnitConversionEditorState,
  ) => {
    updateEditor((current) => ({
      ...current,
      unitConversions: current.unitConversions.map((row) => (row.key === key ? updater(row) : row)),
    }));
  };

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
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-5 backdrop-blur sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="sr-only">{t("inventory.button.cancel")}</span>
            <X className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className={cn("space-y-1", isArabic ? "text-right" : "text-left")}>
              <div className="text-3xl font-black tracking-tight text-slate-900 arabic-ui-heading">
                {title}
              </div>
              <div className="text-sm text-slate-500">{t("inventory.description.items")}</div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Package2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.06),_transparent_30%),linear-gradient(180deg,_#fcfcfb_0%,_#f7f8f7_100%)] px-4 py-4 sm:px-8 sm:py-6">
          <div className="space-y-5">
            {validationError ? (
              <div className={cn("rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 shadow-[0_10px_24px_rgba(239,68,68,0.08)]", isArabic ? "text-right" : "text-left")}>
                {validationError}
              </div>
            ) : null}

            {/* Section 1: البيانات الأساسية */}
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className={cn("mb-5 flex items-center gap-3", isArabic ? "justify-end" : "justify-start")}>
                <div className={isArabic ? "text-right" : "text-left"}>
                  <div className="text-lg font-extrabold text-slate-900 arabic-ui-heading">
                    {isArabic ? "1. البيانات الأساسية" : "1. Basic Information"}
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <FileText className="h-5 w-5" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={isArabic ? "اسم المادة" : "Item Name"} required labelAlign={isArabic ? "end" : "start"}>
                  <Input
                    value={editor.name}
                    onChange={(e) => updateEditor((current) => ({ ...current, name: e.target.value }))}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                  />
                </Field>
                <Field label={isArabic ? "مجموعة المواد" : "Item Group"} required labelAlign={isArabic ? "end" : "start"}>
                  <Select
                    value={editor.itemGroupId}
                    onChange={(e) => updateEditor((current) => ({ ...current, itemGroupId: e.target.value, itemCategoryId: "" }))}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                  >
                    <option value="">{t("inventory.placeholder.selectItemGroup")}</option>
                    {activeItemGroups.map((g) => (
                      <option key={g.id} value={g.id}>{formatCodeName(g.code, g.name, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={isArabic ? "فئة المادة" : "Item Category"} required labelAlign={isArabic ? "end" : "start"}>
                  <Select
                    value={editor.itemCategoryId}
                    onChange={(e) => {
                      const category = activeItemCategories.find((row) => row.id === e.target.value);
                      updateEditor((current) => ({
                        ...current,
                        itemCategoryId: e.target.value,
                        category: category?.name ?? current.category,
                      }));
                    }}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                  >
                    <option value="">{t("inventory.placeholder.selectItemCategory")}</option>
                    {itemEditorCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{formatCodeName(cat.code, cat.name, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={isArabic ? "نوع المادة" : "Item Type"} required labelAlign={isArabic ? "end" : "start"}>
                  <Select
                    value={editor.type}
                    onChange={(e) => {
                      const newType = e.target.value as InventoryItemType;
                      updateEditor((current) => {
                        let nextUnitOfMeasureId = current.unitOfMeasureId;
                        let nextUnitOfMeasure = current.unitOfMeasure;

                        if (newType === "SERVICE" && !nextUnitOfMeasureId) {
                          const serviceUnit = activeUnitsOfMeasure.find((u) => u.name === "خدمة" || u.name === "Service");
                          if (serviceUnit) {
                            nextUnitOfMeasureId = serviceUnit.id;
                            nextUnitOfMeasure = serviceUnit.code;
                          }
                        }

                        return {
                          ...current,
                          type: newType,
                          trackInventory: newType === "SERVICE" ? false : true,
                          unitOfMeasureId: nextUnitOfMeasureId,
                          unitOfMeasure: nextUnitOfMeasure,
                        };
                      });
                    }}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                  >
                    {ITEM_TYPE_OPTIONS.map((type) => (
                      <option key={type.value} value={type.value}>{isArabic ? type.labelAr : type.labelEn}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={isArabic ? "وحدة القياس الأساسية" : "Base Unit of Measure"} required labelAlign={isArabic ? "end" : "start"}>
                  <Select
                    value={editor.unitOfMeasureId}
                    onChange={(e) => {
                      const unit = activeUnitsOfMeasure.find((row) => row.id === e.target.value);
                      updateEditor((current) => ({
                        ...current,
                        unitOfMeasureId: e.target.value,
                        unitOfMeasure: unit?.code ?? current.unitOfMeasure,
                      }));
                    }}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                  >
                    <option value="">{t("inventory.placeholder.selectUnit")}</option>
                    {activeUnitsOfMeasure.map((u) => (
                      <option key={u.id} value={u.id}>{formatCodeName(u.code, u.name, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            </section>

            {/* Section 2: الوحدات والأسعار */}
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className={cn("mb-5 flex items-center gap-3", isArabic ? "justify-end" : "justify-start")}>
                <div className={isArabic ? "text-right" : "text-left"}>
                  <div className="text-lg font-extrabold text-slate-900 arabic-ui-heading">
                    {isArabic ? "2. الوحدات والأسعار" : "2. Units & Prices"}
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Calculator className="h-5 w-5" />
                </div>
              </div>

              <div className="mb-8 rounded-[1.5rem] border border-slate-100 bg-slate-50/45 p-5">
                <div className={cn("mb-4 text-sm font-bold text-slate-900", isArabic ? "text-right" : "text-left")}>
                  {isArabic ? "الأسعار الافتراضية" : "Default Prices"}
                </div>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                  <Field label={isArabic ? "سعر البيع الافتراضي" : "Default Sales Price"} labelAlign={isArabic ? "end" : "start"}>
                    <Input value={editor.defaultSalesPrice} onChange={(e) => updateEditor((current) => ({ ...current, defaultSalesPrice: e.target.value }))} className={cn("bg-white", isArabic ? "text-right" : "text-left")} inputMode="decimal" />
                  </Field>
                  <Field label={isArabic ? "سعر الشراء الافتراضي" : "Default Purchase Price"} labelAlign={isArabic ? "end" : "start"}>
                    <Input value={editor.defaultPurchasePrice} onChange={(e) => updateEditor((current) => ({ ...current, defaultPurchasePrice: e.target.value }))} className={cn("bg-white", isArabic ? "text-right" : "text-left")} inputMode="decimal" />
                  </Field>
                  <Field label={isArabic ? "العملة" : "Currency"} labelAlign={isArabic ? "end" : "start"}>
                    <Input value={editor.currencyCode} onChange={(e) => updateEditor((current) => ({ ...current, currencyCode: e.target.value.toUpperCase() }))} className={cn("bg-white uppercase", isArabic ? "text-right" : "text-left")} maxLength={3} />
                  </Field>
                  <Field label={isArabic ? "خاضع للضريبة" : "Taxable"} labelAlign={isArabic ? "end" : "start"}>
                    <label className={cn("flex h-[42px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800", isArabic ? "justify-end text-right" : "justify-start text-left")}>
                      <span>{isArabic ? "نعم" : "Yes"}</span>
                      <input
                        type="checkbox"
                        checked={editor.taxable}
                        onChange={(e) => updateEditor((current) => ({ ...current, taxable: e.target.checked, defaultTaxId: e.target.checked ? current.defaultTaxId : "" }))}
                        className="h-4 w-4 accent-emerald-600"
                      />
                    </label>
                  </Field>
                  <Field label={isArabic ? "فئة الضريبة" : "Default Tax Category"} labelAlign={isArabic ? "end" : "start"}>
                    <Select
                      value={editor.defaultTaxId}
                      onChange={(e) => updateEditor((current) => ({ ...current, defaultTaxId: e.target.value }))}
                      disabled={!editor.taxable}
                      className={cn("bg-white", isArabic ? "text-right" : "text-left")}
                    >
                      <option value="">{isArabic ? "اختر" : "Select"}</option>
                      {activeTaxes.map((tax) => (
                        <option key={tax.id} value={tax.id}>{tax.taxCode} · {tax.taxName}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className={cn("mt-3 text-sm font-medium text-slate-500", isArabic ? "text-right" : "text-left")}>
                  {isArabic 
                    ? "هذه الأسعار افتراضية فقط وتظهر كمقترح في الفواتير، ولا تمثل تكلفة المخزون الفعلية."
                    : "These prices are defaults for invoice suggestions and do not represent actual inventory cost."}
                </div>
              </div>

              <div className="space-y-4">
                <div className={cn("flex items-center justify-between gap-3", !isArabic && "flex-row-reverse")}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={addUnitConversionRow}
                    className="rounded-2xl border-emerald-200 px-4 text-emerald-700 hover:bg-emerald-50"
                  >
                    {isArabic ? "+ إضافة وحدة" : "+ Add Unit"}
                  </Button>
                  <div className={isArabic ? "text-right" : "text-left"}>
                    <div className="text-sm font-extrabold text-slate-900">{isArabic ? "الوحدات والتحويلات" : "Units and Conversions"}</div>
                    <div className="text-xs text-slate-500">
                      {isArabic
                        ? "حدد الوحدات الإضافية للمادة ومعامل تحويل كل وحدة إلى وحدة القياس الأساسية."
                        : "Define additional units for this item and their conversion factors to the base unit of measure."}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50/30 p-1">
                  <table className="min-w-[1000px] w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className={cn("text-slate-900", isArabic ? "text-right" : "text-left")}>
                        <th className="px-4 py-3 font-bold">{isArabic ? "الوحدة" : "Unit"}</th>
                        <th className="px-4 py-3 font-bold">
                          {isArabic ? "معامل التحويل" : "Conversion Factor"}
                          <span className="ms-1 text-slate-400 group relative inline-block">
                            ⓘ
                            <span className="invisible group-hover:visible absolute bottom-full right-0 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg mb-2 z-10 font-normal">
                              {isArabic
                                ? "كم تساوي هذه الوحدة من وحدة القياس الأساسية؟ مثال: إذا كانت الوحدة الأساسية حبة والكرتونة تحتوي 24 حبة، أدخل 24."
                                : "How many base units does this unit contain? Example: if base unit is Piece and Carton contains 24 pieces, enter 24."}
                            </span>
                          </span>
                        </th>
                        <th className="px-4 py-3 font-bold">{isArabic ? "باركود الوحدة" : "Unit Barcode"}</th>
                        <th className="px-4 py-3 font-bold">{isArabic ? "سعر البيع" : "Sales Price"}</th>
                        <th className="px-4 py-3 font-bold">{isArabic ? "سعر الشراء" : "Purchase Price"}</th>
                        <th className="px-4 py-3 font-bold text-center">{isArabic ? "الإجراءات" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editor.unitConversions.map((row) => (
                        <tr key={row.key} className="group">
                          <td className="px-2 py-2">
                            <Select
                              value={row.unitId}
                              onChange={(e) => updateUnitConversionRow(row.key, (r) => ({
                                ...r,
                                unitId: e.target.value,
                                isBaseUnit: e.target.value === editor.unitOfMeasureId,
                                conversionFactorToBaseUnit: e.target.value === editor.unitOfMeasureId ? "1" : r.conversionFactorToBaseUnit,
                              }))}
                              className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                            >
                              <option value="">{isArabic ? "اختر وحدة" : "Select unit"}</option>
                              {activeUnitsOfMeasure.map((u) => (
                                <option key={u.id} value={u.id}>{formatCodeName(u.code, u.name, isArabic)}</option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              value={row.conversionFactorToBaseUnit}
                              onChange={(e) => updateUnitConversionRow(row.key, (r) => ({ ...r, conversionFactorToBaseUnit: e.target.value }))}
                              disabled={row.isBaseUnit}
                              className={cn("bg-white border-slate-200 disabled:bg-slate-50", isArabic ? "text-right" : "text-left")}
                              inputMode="decimal"
                              placeholder="1"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              value={row.barcode}
                              onChange={(e) => updateUnitConversionRow(row.key, (r) => ({ ...r, barcode: e.target.value }))}
                              className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                              placeholder={isArabic ? "باركود الوحدة" : "Unit barcode"}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              value={row.defaultSalesPrice}
                              onChange={(e) => updateUnitConversionRow(row.key, (r) => ({ ...r, defaultSalesPrice: e.target.value }))}
                              className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                              inputMode="decimal"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              value={row.defaultPurchasePrice}
                              onChange={(e) => updateUnitConversionRow(row.key, (r) => ({ ...r, defaultPurchasePrice: e.target.value }))}
                              className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                              inputMode="decimal"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeUnitConversionRow(row.key)}
                              disabled={row.isBaseUnit}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition disabled:opacity-20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className={cn("rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900", isArabic ? "text-right" : "text-left")}>
                  <strong>{isArabic ? "مثال:" : "Example:"}</strong>{" "}
                  {isArabic 
                    ? "إذا كانت وحدة القياس الأساسية حبة، والكرتونة تحتوي 24 حبة، يكون معامل التحويل للكرتونة = 24."
                    : "If the base unit of measure is Piece, and a Carton contains 24 pieces, the Carton conversion factor is 24."}
                </div>
              </div>
            </section>

            {/* Section 3: الرموز والملصقات */}
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className={cn("mb-5 flex items-center gap-3", isArabic ? "justify-end" : "justify-start")}>
                <div className={isArabic ? "text-right" : "text-left"}>
                  <div className="text-lg font-extrabold text-slate-900 arabic-ui-heading">
                    {isArabic ? "3. الرموز والملصقات" : "3. Barcodes & Labels"}
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Barcode className="h-5 w-5" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <Field label={isArabic ? "الباركود" : "Barcode"} labelAlign={isArabic ? "end" : "start"}>
                    <div className="relative">
                      <Input
                        value={editor.barcode}
                        onChange={(e) => updateEditor((current) => ({ ...current, barcode: e.target.value }))}
                        className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                        placeholder={isArabic ? "أدخل الباركود أو امسحه" : "Enter or scan barcode"}
                      />
                    </div>
                  </Field>
                  <div className={cn("flex flex-wrap gap-2", isArabic ? "justify-end" : "justify-start")}>
                    <Button variant="secondary" size="sm" className="rounded-xl" onClick={previewCodes}>{isArabic ? "معاينة الباركود" : "Preview Barcode"}</Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-xl"
                      onClick={generateBarcode}
                      disabled={isGeneratingBarcode}
                    >
                      {isArabic ? "توليد باركود" : "Generate Barcode"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <Field label={isArabic ? "رمز QR" : "QR Code"} labelAlign={isArabic ? "end" : "start"}>
                    <Input
                      value={editor.qrCodeValue}
                      readOnly
                      className={cn("border-slate-200 bg-slate-100", isArabic ? "text-right" : "text-left")}
                    />
                  </Field>
                  <div className={cn("flex flex-wrap gap-2", isArabic ? "justify-end" : "justify-start")}>
                    <Button variant="secondary" size="sm" className="rounded-xl" onClick={printLabel}>{isArabic ? "طباعة الملصق" : "Print Label"}</Button>
                    <Button variant="secondary" size="sm" className="rounded-xl" onClick={previewCodes}>{isArabic ? "معاينة QR" : "Preview QR"}</Button>
                    <Button variant="secondary" size="sm" className="rounded-xl" onClick={generateQr}>{isArabic ? "توليد QR" : "Generate QR"}</Button>
                  </div>
                </div>
              </div>

              {showCodePreview && (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-4 text-center">
                    <div className="mb-3 text-sm font-bold text-slate-700">{isArabic ? "معاينة الباركود" : "Barcode Preview"}</div>
                    {editor.barcode.trim() ? (
                      <div className="mx-auto max-w-[300px] overflow-hidden rounded-xl border border-white bg-white p-4 shadow-sm" dangerouslySetInnerHTML={{ __html: getBarcodePreviewSvg(editor.barcode.trim()) }} />
                    ) : (
                      <div className="py-8 text-sm text-slate-400">{isArabic ? "أدخل باركود للمعاينة" : "Enter barcode to preview"}</div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-4 text-center">
                    <div className="mb-3 text-sm font-bold text-slate-700">{isArabic ? "معاينة QR" : "QR Preview"}</div>
                    {editor.qrCodeValue.trim() ? (
                      <div className="mx-auto h-[160px] w-[160px] overflow-hidden rounded-xl border border-white bg-white p-4 shadow-sm" dangerouslySetInnerHTML={{ __html: getQrPreviewSvg(editor.qrCodeValue.trim()) }} />
                    ) : (
                      <div className="py-8 text-sm text-slate-400">{isArabic ? "توليد QR للمعاينة" : "Generate QR to preview"}</div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Section 4: إعدادات المخزون */}
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className={cn("mb-5 flex items-center gap-3", isArabic ? "justify-end" : "justify-start")}>
                <div className={isArabic ? "text-right" : "text-left"}>
                  <div className="text-lg font-extrabold text-slate-900 arabic-ui-heading">
                    {isArabic ? "4. إعدادات المخزون" : "4. Inventory Settings"}
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Settings className="h-5 w-5" />
                </div>
              </div>

              {editor.type === "SERVICE" && (
                <div className={cn("mb-5 rounded-2xl bg-slate-50 px-5 py-4 text-sm text-slate-500", isArabic ? "text-right" : "text-left")}>
                  {isArabic ? "سيتم تعطيل إعدادات المخزون لأن نوع المادة خدمة." : "Inventory settings are disabled because the item is a Service."}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={isArabic ? "تتبع المخزون" : "Track Inventory"} labelAlign={isArabic ? "end" : "start"}>
                  <label className={cn("flex h-[42px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 disabled:opacity-50", isArabic ? "justify-end text-right" : "justify-start text-left")}>
                    <span>{isArabic ? "تتبع" : "Track"}</span>
                    <input
                      type="checkbox"
                      checked={editor.trackInventory}
                      onChange={(e) => updateEditor((current) => ({ ...current, trackInventory: e.target.checked }))}
                      disabled={editor.type === "SERVICE"}
                      className="h-4 w-4 accent-emerald-600"
                    />
                  </label>
                </Field>
                <Field label={isArabic ? "المستودع المفضل" : "Preferred Warehouse"} labelAlign={isArabic ? "end" : "start"}>
                  <Select
                    value={editor.preferredWarehouseId}
                    onChange={(e) => updateEditor((current) => ({ ...current, preferredWarehouseId: e.target.value }))}
                    disabled={inventorySettingsDisabled}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                  >
                    <option value="">{t("inventory.placeholder.selectWarehouse")}</option>
                    {warehouses.filter(w => w.isActive).map((w) => (
                      <option key={w.id} value={w.id}>{formatCodeName(w.code, w.name, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={isArabic ? "حد إعادة الطلب" : "Reorder Level"} labelAlign={isArabic ? "end" : "start"}>
                  <Input
                    value={editor.reorderLevel}
                    onChange={(e) => updateEditor((current) => ({ ...current, reorderLevel: e.target.value }))}
                    disabled={inventorySettingsDisabled}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                    inputMode="decimal"
                  />
                </Field>
                <Field label={isArabic ? "كمية إعادة الطلب" : "Reorder Quantity"} labelAlign={isArabic ? "end" : "start"}>
                  <Input
                    value={editor.reorderQuantity}
                    onChange={(e) => updateEditor((current) => ({ ...current, reorderQuantity: e.target.value }))}
                    disabled={inventorySettingsDisabled}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                    inputMode="decimal"
                  />
                </Field>
              </div>
            </section>

            {/* Section 5: الحسابات المحاسبية */}
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className={cn("mb-5 flex items-center gap-3", isArabic ? "justify-end" : "justify-start")}>
                <div className={isArabic ? "text-right" : "text-left"}>
                  <div className="text-lg font-extrabold text-slate-900 arabic-ui-heading">
                    {isArabic ? "5. الحسابات المحاسبية" : "5. Accounting Accounts"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {isArabic
                      ? "إذا لم يتم اختيار حسابات هنا، سيتم استخدام الحسابات المحددة في مجموعة المواد."
                      : "If accounts are not selected here, the accounts specified in the item group will be used."}
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={isArabic ? "حساب المخزون" : "Inventory Account"} labelAlign={isArabic ? "end" : "start"}>
                  <Select
                    value={editor.inventoryAccountId}
                    onChange={(e) => updateEditor((current) => ({ ...current, inventoryAccountId: e.target.value }))}
                    disabled={editor.type === "SERVICE"}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                  >
                    <option value="">{t("inventory.placeholder.selectAccount")}</option>
                    {inventoryAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{formatAccountOptionLabel(a, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={isArabic ? "حساب مصروف الشراء" : "Purchase Expense Account"} labelAlign={isArabic ? "end" : "start"}>
                  <Select
                    value={editor.expenseAccountId}
                    onChange={(e) => updateEditor((current) => ({ ...current, expenseAccountId: e.target.value }))}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                  >
                    <option value="">{t("inventory.placeholder.selectAccount")}</option>
                    {expenseAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{formatAccountOptionLabel(a, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={isArabic ? "حساب المبيعات" : "Sales Account"} labelAlign={isArabic ? "end" : "start"}>
                  <Select
                    value={editor.salesAccountId}
                    onChange={(e) => updateEditor((current) => ({ ...current, salesAccountId: e.target.value }))}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                  >
                    <option value="">{t("inventory.placeholder.selectAccount")}</option>
                    {salesAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{formatAccountOptionLabel(a, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={isArabic ? "حساب تكلفة البضاعة المباعة" : "COGS Account"} labelAlign={isArabic ? "end" : "start"}>
                  <Select
                    value={editor.cogsAccountId}
                    onChange={(e) => updateEditor((current) => ({ ...current, cogsAccountId: e.target.value }))}
                    disabled={editor.type === "SERVICE"}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                  >
                    <option value="">{t("inventory.placeholder.selectAccount")}</option>
                    {cogsAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{formatAccountOptionLabel(a, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={isArabic ? "حساب مردودات المبيعات" : "Sales Returns Account"} labelAlign={isArabic ? "end" : "start"}>
                  <Select
                    value={editor.salesReturnAccountId}
                    onChange={(e) => updateEditor((current) => ({ ...current, salesReturnAccountId: e.target.value }))}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                  >
                    <option value="">{t("inventory.placeholder.selectAccount")}</option>
                    {salesAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{formatAccountOptionLabel(a, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={isArabic ? "حساب تسويات المخزون" : "Inventory Adjustment Account"} labelAlign={isArabic ? "end" : "start"} className="md:col-span-2">
                  <Select
                    value={editor.adjustmentAccountId}
                    onChange={(e) => updateEditor((current) => ({ ...current, adjustmentAccountId: e.target.value }))}
                    disabled={editor.type === "SERVICE"}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                  >
                    <option value="">{t("inventory.placeholder.selectAccount")}</option>
                    {adjustmentAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{formatAccountOptionLabel(a, isArabic)}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            </section>

            {/* Section 6: الوصف والملاحظات */}
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6">
              <div className={cn("mb-5 flex items-center gap-3", isArabic ? "justify-end" : "justify-start")}>
                <div className={isArabic ? "text-right" : "text-left"}>
                  <div className="text-lg font-extrabold text-slate-900 arabic-ui-heading">
                    {isArabic ? "6. الوصف والملاحظات" : "6. Description & Notes"}
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Paperclip className="h-5 w-5" />
                </div>
              </div>

              <div className="grid gap-6">
                <Field label={isArabic ? "الوصف" : "Description"} labelAlign={isArabic ? "end" : "start"}>
                  <Textarea
                    value={editor.description}
                    rows={3}
                    onChange={(e) => updateEditor((current) => ({ ...current, description: e.target.value }))}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                  />
                </Field>
                <Field label={isArabic ? "ملاحظات داخلية" : "Internal Notes"} labelAlign={isArabic ? "end" : "start"}>
                  <Textarea
                    value={editor.internalNotes}
                    rows={3}
                    onChange={(e) => updateEditor((current) => ({ ...current, internalNotes: e.target.value }))}
                    className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                  />
                </Field>
                <div className="grid gap-6 md:grid-cols-2">
                  <Field label={isArabic ? "رابط صورة المادة" : "Item Image URL"} labelAlign={isArabic ? "end" : "start"}>
                    <div className="flex gap-2">
                      <Input
                        value={editor.itemImageUrl}
                        onChange={(e) => updateEditor((current) => ({ ...current, itemImageUrl: e.target.value }))}
                        className={cn("border-slate-200 bg-slate-50/70", isArabic ? "text-right" : "text-left")}
                        placeholder="https://..."
                      />
                      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    </div>
                  </Field>
                  <Field label={isArabic ? "المرفقات" : "Attachments"} labelAlign={isArabic ? "end" : "start"}>
                    <div className="flex gap-2">
                      <Textarea
                        value={editor.attachmentsText}
                        rows={1}
                        onChange={(e) => updateEditor((current) => ({ ...current, attachmentsText: e.target.value }))}
                        className={cn("border-slate-200 bg-slate-50/70 min-h-[42px]", isArabic ? "text-right" : "text-left")}
                        placeholder={isArabic ? "روابط المرفقات..." : "Attachment URLs..."}
                      />
                      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
                        <Paperclip className="h-5 w-5" />
                      </div>
                    </div>
                  </Field>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
          <div className={cn("flex flex-col gap-3", isArabic ? "sm:flex-row-reverse" : "sm:flex-row")}>
            <Button
              onClick={() => onSave("saveAndClose")}
              disabled={isSaving}
              className="rounded-2xl bg-emerald-600 px-6 hover:bg-emerald-700 font-bold"
            >
              <Save className="h-4 w-4" />
              {isArabic ? "حفظ وإغلاق" : "Save & Close"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => onSave("save")}
              disabled={isSaving}
              className="rounded-2xl border-emerald-200 px-6 text-emerald-700 hover:bg-emerald-50 font-bold"
            >
              <Save className="h-4 w-4" />
              {isArabic ? "حفظ" : "Save"}
            </Button>
            <Button variant="secondary" onClick={onClose} className={cn("rounded-2xl px-6 font-bold", isArabic ? "mr-auto sm:mr-0" : "ml-auto sm:ml-0")}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
