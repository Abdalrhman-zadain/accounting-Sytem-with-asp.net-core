import { useMemo, useState, useEffect } from "react";
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
  LuPercent,
  LuTruck,
  LuNotebook,
  LuDollarSign,
  LuTriangleAlert,
  LuPlus,
} from "react-icons/lu";

import { Button } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import {
  getSuppliers,
  getPosAddonGroupsAdmin,
  getPosItemAddonConfig,
  setPosItemAddonGroups,
} from "@/lib/api";
import type { PosAddonGroup } from "@/features/pos/pos-addon-types";
import type {
  InventoryItem,
  InventoryItemCategory,
  InventoryItemGroup,
  InventoryItemType,
  InventoryUnitOfMeasure,
  InventoryWarehouse,
  AccountOption,
  Tax,
  Supplier,
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

  // Extended ERP UI fields
  isActive: boolean;
  sellable: boolean;
  purchasable: boolean;
  onHandQuantity?: string;
  valuationAmount?: string;
  salesUnitId?: string;
  purchaseUnitId?: string;
  allowFractionalQuantity?: boolean;
  minSalesQuantity?: string;
  minStockLevel?: string;
  maxStockLevel?: string;
  allowNegativeStock?: boolean;
  salesDiscountAccountId?: string;
  defaultCostCenterId?: string;
  purchaseTaxId?: string;
  priceIncludesTax?: boolean;
  specialTaxTreatment?: string;
  defaultSupplierId?: string;
  supplierItemCode?: string;
  lastPurchasePrice?: string;
  leadTime?: string;
  minPurchaseQuantity?: string;
  alternativeSuppliersText?: string;
  datasheetUrl?: string;
  purchaseNotes?: string;
  inventoryNotes?: string;
};

type ItemEditorModalProps = {
  isOpen: boolean;
  presentation?: "modal" | "inline";
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

    // Extended UI fields defaults
    isActive: true,
    sellable: true,
    purchasable: true,
    onHandQuantity: "0",
    valuationAmount: "0",
    salesUnitId: "",
    purchaseUnitId: "",
    allowFractionalQuantity: false,
    minSalesQuantity: "1",
    minStockLevel: "0",
    maxStockLevel: "0",
    allowNegativeStock: false,
    salesDiscountAccountId: "",
    defaultCostCenterId: "",
    purchaseTaxId: "",
    priceIncludesTax: false,
    specialTaxTreatment: "",
    defaultSupplierId: "",
    supplierItemCode: "",
    lastPurchasePrice: "",
    leadTime: "",
    minPurchaseQuantity: "1",
    alternativeSuppliersText: "",
    datasheetUrl: "",
    purchaseNotes: "",
    inventoryNotes: "",
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

export interface FormErrors {
  name?: string;
  itemGroupId?: string;
  itemCategoryId?: string;
  unitOfMeasureId?: string;
  unitConversions?: string;
  defaultSalesPrice?: string;
  defaultPurchasePrice?: string;
  barcode?: string;
  reorderLevel?: string;
  reorderQuantity?: string;
  minStockLevel?: string;
  maxStockLevel?: string;
  salesAccountId?: string;
  defaultTaxId?: string;
}

const FIELD_TAB_MAP: Partial<Record<keyof FormErrors, string>> = {
  defaultSalesPrice: "pricing_units",
  defaultPurchasePrice: "pricing_units",
  barcode: "pricing_units",
  unitConversions: "pricing_units",
  reorderLevel: "inventory",
  reorderQuantity: "inventory",
  minStockLevel: "inventory",
  maxStockLevel: "inventory",
  salesAccountId: "accounts",
  defaultTaxId: "tax",
};

const GENERAL_ERROR_PATTERNS = [
  "server error",
  "internal server error",
  "permission denied",
  "forbidden",
  "network error",
  "failed to fetch",
  "unexpected error",
  "unexpected",
  "unauthorized",
  "timeout",
];

function focusField(field: keyof FormErrors) {
  if (typeof document === "undefined") {
    return;
  }

  const wrapper = document.querySelector(`[id="item-field-${field}"]`) as HTMLElement | null;
  if (!wrapper) {
    return;
  }

  wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
  const input = wrapper.querySelector("input, select, textarea, button") as HTMLElement | null;
  input?.focus({ preventScroll: true });
}

type BackendFieldErrors = Partial<FormErrors> & { _general?: string };

function parseBackendErrors(errorMsg: string | null | undefined, isArabic: boolean): BackendFieldErrors {
  if (!errorMsg) return {};
  
  const result: BackendFieldErrors = {};
  const messages = errorMsg.split(",").map(m => m.trim());
  
  for (const msg of messages) {
    const lower = msg.toLowerCase();
    
    if (lower.includes("name")) {
      result.name = isArabic ? "اسم المادة مطلوب" : "Material name is required";
    } else if (lower.includes("itemgroupid") || lower.includes("item group")) {
      result.itemGroupId = isArabic ? "مجموعة الأصناف مطلوبة" : "Item group is required";
    } else if (lower.includes("itemcategoryid") || lower.includes("category")) {
      result.itemCategoryId = isArabic ? "تصنيف الصنف مطلوب" : "Item category is required";
    } else if (lower.includes("unitofmeasureid") || lower.includes("unit of measure") || lower.includes("baseunitofmeasureid")) {
      result.unitOfMeasureId = isArabic ? "وحدة القياس الأساسية مطلوبة" : "Base unit of measure is required";
    } else if (lower.includes("base unit conversion row") || lower.includes("base unit row") || lower.includes("conversion factor") || lower.includes("duplicate units") || lower.includes("each conversion row")) {
      result.unitConversions = isArabic ? "تحقق من جدول الوحدات والتحويلات وتأكد من اكتمال صف الوحدة الأساسية وعدم تكرار الوحدات." : "Check the unit conversions table and ensure the base unit row is complete with no duplicate units.";
    } else if (lower.includes("defaultsalesprice") || lower.includes("sales price")) {
      result.defaultSalesPrice = isArabic ? "سعر البيع الافتراضي غير صالح أو مطلوب" : "Default sales price must be numeric and is required if sellable";
    } else if (lower.includes("defaultpurchaseprice") || lower.includes("purchase price")) {
      result.defaultPurchasePrice = isArabic ? "سعر الشراء الافتراضي غير صالح" : msg;
    } else if (lower.includes("barcode")) {
      result.barcode = isArabic ? "الباركود غير صالح أو طويل جداً" : msg;
    } else if (lower.includes("reorderlevel") || lower.includes("reorder level")) {
      result.reorderLevel = isArabic ? "حد إعادة الطلب غير صالح" : msg;
    } else if (lower.includes("reorderquantity") || lower.includes("reorder quantity")) {
      result.reorderQuantity = isArabic ? "كمية إعادة الطلب غير صالحة" : msg;
    } else if (lower.includes("minstocklevel") || lower.includes("minimum stock")) {
      result.minStockLevel = isArabic ? "الحد الأدنى للمخزون غير صالح" : msg;
    } else if (lower.includes("maxstocklevel") || lower.includes("maximum stock")) {
      result.maxStockLevel = isArabic ? "الحد الأقصى للمخزون غير صالح" : msg;
    } else if (lower.includes("salesaccount") || lower.includes("revenue account")) {
      result.salesAccountId = isArabic ? "حساب المبيعات مطلوب عند تحديد المادة كقابلة للبيع" : "Sales revenue account is required when item is sellable";
    } else if (lower.includes("defaulttaxid") || lower.includes("tax")) {
      result.defaultTaxId = isArabic ? "فئة الضريبة مطلوبة عند تفعيل خاضع للضريبة" : "Tax category is required when taxable";
    } else {
      if (GENERAL_ERROR_PATTERNS.some((pattern) => lower.includes(pattern))) {
        result._general = result._general ? `${result._general}, ${msg}` : msg;
      } else if (!result._general) {
        result._general = msg;
      } else {
        result._general += `, ${msg}`;
      }
    }
  }

  return result;
}

export function ItemEditorModal({
  isOpen,
  presentation = "modal",
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
  const { token, user } = useAuth();

  const [activeTab, setActiveTab] = useState<string>("pricing_units");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [localErrors, setLocalErrors] = useState<FormErrors>({});
  const [pendingFocusField, setPendingFocusField] = useState<keyof FormErrors | null>(null);

  const [addonGroups, setAddonGroups] = useState<PosAddonGroup[]>([]);
  const [linkedGroups, setLinkedGroups] = useState<PosAddonGroup[]>([]);
  const [isAddonLoading, setIsAddonLoading] = useState(false);
  const [addonError, setAddonError] = useState<string | null>(null);

  const clearFieldError = (field: keyof FormErrors) => {
    if (localErrors[field]) {
      setLocalErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (editorState: ItemEditorState): FormErrors => {
    const errors: FormErrors = {};
    const isService = editorState.type === "SERVICE";

    // Item Name
    if (!editorState.name.trim()) {
      errors.name = isArabic ? "اسم المادة مطلوب" : "Material name is required";
    }

    // Item Group
    if (!editorState.itemGroupId) {
      errors.itemGroupId = isArabic ? "مجموعة الأصناف مطلوبة" : "Item group is required";
    }

    // Item Category
    if (!editorState.itemCategoryId) {
      errors.itemCategoryId = isArabic ? "فئة الصنف مطلوبة" : "Item category is required";
    }

    // Base Unit of Measure (required unless it is a Service item)
    if (!isService && !editorState.unitOfMeasureId) {
      errors.unitOfMeasureId = isArabic ? "وحدة القياس الأساسية مطلوبة" : "Base unit of measure is required";
    }

    if (!isService) {
      if (!editorState.unitOfMeasure.trim()) {
        errors.unitOfMeasureId = isArabic ? "وحدة القياس الأساسية مطلوبة" : "Base unit of measure is required";
      }
      if (!editorState.unitConversions.length) {
        errors.unitConversions = isArabic
          ? "يجب وجود صف للوحدة الأساسية داخل جدول التحويلات."
          : "A base unit conversion row is required.";
      }
    }

    // Pricing & Units Tab
    if (editorState.defaultSalesPrice.trim() && Number.isNaN(Number(editorState.defaultSalesPrice))) {
      errors.defaultSalesPrice = isArabic ? "سعر البيع الافتراضي يجب أن يكون رقمياً" : "Default sales price must be numeric";
    }
    if (editorState.defaultPurchasePrice.trim() && Number.isNaN(Number(editorState.defaultPurchasePrice))) {
      errors.defaultPurchasePrice = isArabic ? "سعر الشراء الافتراضي يجب أن يكون رقمياً" : "Default purchase price must be numeric";
    }
    if (editorState.barcode.trim().length > 120) {
      errors.barcode = isArabic ? "الباركود طويل جداً" : "Barcode is too long";
    }

    // Sellable fields check
    if (editorState.sellable) {
      if (!editorState.defaultSalesPrice.trim()) {
        errors.defaultSalesPrice = isArabic ? "سعر البيع مطلوب عند تحديد المادة كقابلة للبيع" : "Sales price is required when the item is sellable";
      } else if (Number.isNaN(Number(editorState.defaultSalesPrice))) {
        errors.defaultSalesPrice = isArabic ? "يجب أن يكون سعر البيع رقمياً" : "Sales price must be numeric";
      }

      // Accounts tab check
      const selectedGroup = activeItemGroups?.find((g) => g.id === editorState.itemGroupId);
      const hasSalesAccount = !!(editorState.salesAccountId || selectedGroup?.salesAccount);
      if (!hasSalesAccount) {
        errors.salesAccountId = isArabic ? "حساب المبيعات مطلوب عند تحديد المادة كقابلة للبيع" : "Sales revenue account is required when item is sellable";
      }
    }

    // Tax Category
    if (editorState.taxable && !editorState.defaultTaxId) {
      errors.defaultTaxId = isArabic ? "فئة الضريبة مطلوبة عند تفعيل خاضع للضريبة" : "Tax category is required when the item is taxable";
    }

    // Inventory Tab
    if (editorState.reorderLevel.trim() && Number.isNaN(Number(editorState.reorderLevel))) {
      errors.reorderLevel = isArabic ? "حد إعادة الطلب يجب أن يكون رقمياً" : "Reorder level must be numeric";
    }
    if (editorState.reorderQuantity.trim() && Number.isNaN(Number(editorState.reorderQuantity))) {
      errors.reorderQuantity = isArabic ? "كمية إعادة الطلب يجب أن تكون رقمية" : "Reorder quantity must be numeric";
    }
    if (!isService) {
      if (editorState.minStockLevel && (Number.isNaN(Number(editorState.minStockLevel)) || Number(editorState.minStockLevel) < 0)) {
        errors.minStockLevel = isArabic ? "الحد الأدنى للمخزون يجب أن يكون رقماً غير سالب" : "Minimum stock level must be a non-negative number";
      }
      if (editorState.maxStockLevel && (Number.isNaN(Number(editorState.maxStockLevel)) || Number(editorState.maxStockLevel) < 0)) {
        errors.maxStockLevel = isArabic ? "الحد الأقصى للمخزون يجب أن يكون رقماً غير سالب" : "Maximum stock level must be a non-negative number";
      }
    }

    const unitIds = new Set<string>();
    let hasBaseUnit = false;
    for (const row of editorState.unitConversions) {
      if (!row.unitId) {
        errors.unitConversions = isArabic ? "يجب اختيار وحدة لكل صف تحويل." : "Each conversion row must include a unit.";
        break;
      }
      if (unitIds.has(row.unitId)) {
        errors.unitConversions = isArabic ? "لا يمكن تكرار نفس الوحدة أكثر من مرة." : "Duplicate units are not allowed.";
        break;
      }
      unitIds.add(row.unitId);

      const factor = Number(row.conversionFactorToBaseUnit);
      if (!row.conversionFactorToBaseUnit.trim() || Number.isNaN(factor) || factor <= 0) {
        errors.unitConversions = isArabic
          ? "معامل التحويل إلى الوحدة الأساسية يجب أن يكون أكبر من صفر."
          : "Conversion factor must be greater than zero.";
        break;
      }

      if (!isService && row.unitId === editorState.unitOfMeasureId) {
        hasBaseUnit = true;
        if (factor !== 1) {
          errors.unitConversions = isArabic
            ? "يجب أن يكون معامل تحويل الوحدة الأساسية مساوياً لـ 1."
            : "Base unit conversion factor must be 1.";
          break;
        }
      }
    }

    if (!isService && editorState.unitOfMeasureId && !hasBaseUnit && !errors.unitConversions) {
      errors.unitConversions = isArabic ? "يجب أن يكون صف الوحدة الأساسية موجوداً دائماً." : "The base unit row must always exist.";
    }

    return errors;
  };

  const revealFirstError = (errors: FormErrors) => {
    const firstErrorField = Object.keys(errors)[0] as keyof FormErrors | undefined;
    if (!firstErrorField) {
      return;
    }

    const targetTab = FIELD_TAB_MAP[firstErrorField];
    setPendingFocusField(firstErrorField);
    if (targetTab && activeTab !== targetTab) {
      setActiveTab(targetTab);
      return;
    }
    focusField(firstErrorField);
    setPendingFocusField(null);
  };

  const handleSaveClick = (mode: "save" | "saveAndClose") => {
    const errors = validateForm(editor);
    
    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      revealFirstError(errors);
      return;
    }
    
    setLocalErrors({});
    onSave(mode);
  };

  const generalError = useMemo(() => {
    if (!validationError) return null;
    const parsed = parseBackendErrors(validationError, isArabic);
    return parsed._general || null;
  }, [validationError, isArabic]);

  // Handle backend validation error updates
  useEffect(() => {
    if (validationError) {
      const parsed = parseBackendErrors(validationError, isArabic);
      const { _general: _ignoredGeneral, ...fieldErrors } = parsed;
      
      if (Object.keys(fieldErrors).length > 0) {
        setLocalErrors((prev) => ({
          ...prev,
          ...fieldErrors,
        }));
        revealFirstError(fieldErrors);
      }
    }
  }, [validationError, isArabic]);

  useEffect(() => {
    if (!pendingFocusField) {
      return;
    }

    const targetTab = FIELD_TAB_MAP[pendingFocusField];
    if (targetTab && activeTab !== targetTab) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      focusField(pendingFocusField);
      setPendingFocusField(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, pendingFocusField]);

  useEffect(() => {
    if (token) {
      getSuppliers({ isActive: "true" }, token)
        .then((res) => setSuppliers(res || []))
        .catch((err) => console.error("Failed to load suppliers in Item Editor", err));
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "pos_addons" && editor.id && token) {
      setIsAddonLoading(true);
      setAddonError(null);
      Promise.all([
        getPosAddonGroupsAdmin(token),
        getPosItemAddonConfig(editor.id, token),
      ])
        .then(([allGroups, config]) => {
          setAddonGroups(allGroups || []);
          setLinkedGroups(config?.groups || []);
        })
        .catch((err) => {
          console.error("Failed to load addons mapping", err);
          setAddonError(isArabic ? "فشل تحميل إعدادات الإضافات" : "Failed to load add-ons configuration");
        })
        .finally(() => {
          setIsAddonLoading(false);
        });
    }
  }, [activeTab, editor.id, token, isArabic]);

  const handleLinkGroup = async (groupId: string) => {
    if (!editor.id || !token) return;
    setAddonError(null);
    try {
      const currentIds = linkedGroups.map((g) => g.id);
      if (currentIds.includes(groupId)) return;
      const nextIds = [...currentIds, groupId];
      const res = await setPosItemAddonGroups(editor.id, { groupIds: nextIds }, token);
      setLinkedGroups(res?.groups || []);
    } catch (err) {
      console.error("Failed to link addon group", err);
      setAddonError(isArabic ? "فشل ربط مجموعة الإضافات" : "Failed to link add-on group");
    }
  };

  const handleUnlinkGroup = async (groupId: string) => {
    if (!editor.id || !token) return;
    setAddonError(null);
    try {
      const nextIds = linkedGroups.map((g) => g.id).filter((id) => id !== groupId);
      const res = await setPosItemAddonGroups(editor.id, { groupIds: nextIds }, token);
      setLinkedGroups(res?.groups || []);
    } catch (err) {
      console.error("Failed to unlink addon group", err);
      setAddonError(isArabic ? "فشل إلغاء ربط مجموعة الإضافات" : "Failed to unlink add-on group");
    }
  };

  const linkableGroups = useMemo(() => {
    const linkedIds = linkedGroups.map((g) => g.id);
    return addonGroups.filter((g) => g.isActive !== false && !linkedIds.includes(g.id));
  }, [addonGroups, linkedGroups]);

  // Safeguard against active tab being hidden when type changes
  useEffect(() => {
    if (editor.type === "SERVICE" && activeTab === "inventory") {
      setActiveTab("pricing_units");
    }
  }, [editor.type, activeTab]);

  useEffect(() => {
    setLocalErrors((prev) => {
      const next = { ...prev };

      if (editor.type === "SERVICE") {
        delete next.unitOfMeasureId;
        delete next.unitConversions;
        delete next.reorderLevel;
        delete next.reorderQuantity;
        delete next.minStockLevel;
        delete next.maxStockLevel;
      }

      if (!editor.sellable) {
        delete next.defaultSalesPrice;
        delete next.salesAccountId;
      }

      if (!editor.taxable) {
        delete next.defaultTaxId;
      }

      return next;
    });
  }, [editor.sellable, editor.taxable, editor.type]);

  if (!isOpen) return null;

  const isInline = presentation === "inline";

  const updateEditor = (updater: (current: ItemEditorState) => ItemEditorState) => {
    onChange(updater);
  };

  const itemEditorCategories = activeItemCategories.filter((row) => row.itemGroupId === editor.itemGroupId);

  const addUnitConversionRow = () => {
    clearFieldError("unitConversions");
    updateEditor((current) => ({
      ...current,
      unitConversions: [...current.unitConversions, createUnitConversionEditor()],
    }));
  };

  const removeUnitConversionRow = (key: string) => {
    clearFieldError("unitConversions");
    updateEditor((current) => ({
      ...current,
      unitConversions: current.unitConversions.filter((row) => row.key !== key),
    }));
  };

  const updateUnitConversionRow = (
    key: string,
    updater: (row: ItemUnitConversionEditorState) => ItemUnitConversionEditorState,
  ) => {
    clearFieldError("unitConversions");
    updateEditor((current) => ({
      ...current,
      unitConversions: current.unitConversions.map((row) => (row.key === key ? updater(row) : row)),
    }));
  };

  const isAccountantOrAdmin = user?.role === "ADMIN" || user?.role === "MANAGER" || user?.posRoles?.includes("ACCOUNTANT");

  const averageCost = useMemo(() => {
    const qty = parseFloat(editor.onHandQuantity || "0");
    const val = parseFloat(editor.valuationAmount || "0");
    return qty > 0 ? val / qty : 0;
  }, [editor.onHandQuantity, editor.valuationAmount]);

  const selectedTax = activeTaxes.find((t) => t.id === editor.defaultTaxId);
  const taxRateDisplay = selectedTax ? `${parseFloat(selectedTax.rate).toFixed(2)}%` : "0.00%";

  const tabs = [
    { id: "pricing_units", labelAr: "التسعير والوحدات", labelEn: "Pricing & Units", icon: Calculator },
    { id: "inventory", labelAr: "المخزون", labelEn: "Inventory", icon: Settings, hide: editor.type === "SERVICE" },
    { id: "accounts", labelAr: "الحسابات", labelEn: "Accounts", icon: FileText, hide: !isAccountantOrAdmin },
    { id: "tax", labelAr: "الضريبة", labelEn: "Tax", icon: LuPercent },
    { id: "suppliers", labelAr: "الموردين", labelEn: "Suppliers", icon: LuTruck },
    { id: "images_attachments", labelAr: "الصور والمرفقات", labelEn: "Images & Attachments", icon: ImageIcon },
    { id: "pos_addons", labelAr: "إضافات نقاط البيع", labelEn: "POS Add-ons", icon: LuPlus, hide: !editor.sellable || !editor.id },
    { id: "notes", labelAr: "ملاحظات", labelEn: "Notes", icon: LuNotebook },
  ];

  return (
    <div className={cn(isInline ? "relative" : "fixed inset-0 z-50 p-3 sm:p-6")}>
      {!isInline ? <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} /> : null}
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className={cn(
          "relative mx-auto flex flex-col overflow-hidden",
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
                <div className="truncate text-sm text-slate-500">{t("inventory.items.description")}</div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Package2 className="h-6 w-6" />
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
                  <Package2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-slate-900 arabic-ui-heading">{title}</h1>
                  <p className="truncate text-xs text-slate-500">{t("inventory.items.description")}</p>
                </div>
              </div>
            ) : null}

            {generalError ? (
              <div className={cn("rounded-md border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 shadow-sm", isArabic ? "text-right" : "text-left")}>
                {generalError}
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

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <div className="sm:col-span-2">
                  <Field id="item-field-name" label={isArabic ? "اسم المادة" : "Item Name"} required error={localErrors.name} labelAlign={isArabic ? "end" : "start"}>
                    <Input
                      value={editor.name}
                      onChange={(e) => {
                        updateEditor((current) => ({ ...current, name: e.target.value }));
                        clearFieldError("name");
                      }}
                      className={cn("bg-slate-50/50", isArabic ? "text-right" : "text-left", localErrors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")}
                    />
                  </Field>
                </div>
                <div>
                  <Field label={isArabic ? "رمز المادة / SKU" : "Item Code / SKU"} labelAlign={isArabic ? "end" : "start"}>
                    <Input
                      value={editor.id ? editor.code : ""}
                      disabled
                      placeholder={isArabic ? "توليد تلقائي" : "Auto-generated"}
                      className={cn("border-slate-200 bg-slate-100 font-mono text-slate-500 cursor-not-allowed", isArabic ? "text-right" : "text-left")}
                    />
                  </Field>
                </div>
                <div>
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
                      className={cn("border-slate-200 bg-slate-50/50", isArabic ? "text-right" : "text-left")}
                    >
                      {ITEM_TYPE_OPTIONS.map((type) => (
                        <option key={type.value} value={type.value}>{isArabic ? type.labelAr : type.labelEn}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div>
                  <Field id="item-field-itemGroupId" label={isArabic ? "مجموعة المواد" : "Item Group"} required error={localErrors.itemGroupId} labelAlign={isArabic ? "end" : "start"}>
                    <Select
                      value={editor.itemGroupId}
                      onChange={(e) => {
                        updateEditor((current) => ({ ...current, itemGroupId: e.target.value, itemCategoryId: "" }));
                        clearFieldError("itemGroupId");
                      }}
                      className={cn("bg-slate-50/50", isArabic ? "text-right" : "text-left", localErrors.itemGroupId ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")}
                    >
                      <option value="">{t("inventory.placeholder.selectItemGroup")}</option>
                      {activeItemGroups.map((g) => (
                        <option key={g.id} value={g.id}>{formatCodeName(g.code, g.name, isArabic)}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div>
                  <Field id="item-field-itemCategoryId" label={isArabic ? "فئة المادة" : "Item Category"} required error={localErrors.itemCategoryId} labelAlign={isArabic ? "end" : "start"}>
                    <Select
                      value={editor.itemCategoryId}
                      onChange={(e) => {
                        const category = activeItemCategories.find((row) => row.id === e.target.value);
                        updateEditor((current) => ({
                          ...current,
                          itemCategoryId: e.target.value,
                          category: category?.name ?? current.category,
                        }));
                        clearFieldError("itemCategoryId");
                      }}
                      className={cn("bg-slate-50/50", isArabic ? "text-right" : "text-left", localErrors.itemCategoryId ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")}
                    >
                      <option value="">{t("inventory.placeholder.selectItemCategory")}</option>
                      {itemEditorCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{formatCodeName(cat.code, cat.name, isArabic)}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div>
                  <Field id="item-field-unitOfMeasureId" label={isArabic ? "وحدة القياس الأساسية" : "Base Unit of Measure"} required={editor.type !== "SERVICE"} error={localErrors.unitOfMeasureId} labelAlign={isArabic ? "end" : "start"}>
                    <Select
                      value={editor.unitOfMeasureId}
                      onChange={(e) => {
                        const unit = activeUnitsOfMeasure.find((row) => row.id === e.target.value);
                        updateEditor((current) => ({
                          ...current,
                          unitOfMeasureId: e.target.value,
                          unitOfMeasure: unit?.code ?? current.unitOfMeasure,
                        }));
                        clearFieldError("unitOfMeasureId");
                      }}
                      className={cn("bg-slate-50/50", isArabic ? "text-right" : "text-left", localErrors.unitOfMeasureId ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")}
                    >
                      <option value="">{t("inventory.placeholder.selectUnit")}</option>
                      {activeUnitsOfMeasure.map((u) => (
                        <option key={u.id} value={u.id}>{formatCodeName(u.code, u.name, isArabic)}</option>
                      ))}
                    </Select>
                  </Field>
                </div>

                {/* Status Switch */}
                <div>
                  <Field label={isArabic ? "الحالة (نشط / معطل)" : "Status (Active / Inactive)"} labelAlign={isArabic ? "end" : "start"}>
                    <div className={cn("flex items-center gap-3 h-[46px] border border-slate-200 bg-slate-50/30 rounded-xl px-4", isArabic ? "flex-row-reverse" : "flex-row")}>
                      <button
                        type="button"
                        onClick={() => updateEditor((current) => ({ ...current, isActive: !current.isActive }))}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/20",
                          editor.isActive ? "bg-emerald-600" : "bg-slate-200"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                            editor.isActive ? (isArabic ? "-translate-x-5" : "translate-x-5") : "translate-x-0"
                          )}
                        />
                      </button>
                      <span className="text-sm font-semibold text-slate-700">
                        {editor.isActive ? (isArabic ? "نشط" : "Active") : (isArabic ? "غير نشط" : "Inactive")}
                      </span>
                    </div>
                  </Field>
                </div>
              </div>
            </section>

            {/* Redesigned Tab Navigation */}
            <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-100/50 p-1 rounded-xl shadow-inner">
              {tabs.filter((tab) => !tab.hide).map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 outline-none",
                      isActive
                        ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50 font-bold"
                        : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-800"
                    )}
                  >
                    <IconComponent className={cn("h-4 w-4 shrink-0", isActive ? "text-emerald-600" : "text-slate-400")} />
                    <span>{isArabic ? tab.labelAr : tab.labelEn}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Workspace Panels */}
            <div className="min-h-[450px]">
              {/* Tab 1: pricing_units */}
              {activeTab === "pricing_units" && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="grid gap-5 md:grid-cols-2">
                    {/* Default Prices Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Calculator className="h-5 w-5 text-emerald-600" />
                        <h3 className="font-bold text-slate-900">{isArabic ? "الأسعار الافتراضية والوحدات" : "Default Prices & Units"}</h3>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="item-field-defaultSalesPrice" label={isArabic ? "سعر البيع الافتراضي" : "Default Sales Price"} required={editor.sellable} error={localErrors.defaultSalesPrice} labelAlign={isArabic ? "end" : "start"}>
                          <Input
                            value={editor.defaultSalesPrice}
                            onChange={(e) => {
                              updateEditor((current) => ({ ...current, defaultSalesPrice: e.target.value }));
                              clearFieldError("defaultSalesPrice");
                            }}
                            className={cn("bg-white", isArabic ? "text-right" : "text-left", localErrors.defaultSalesPrice ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")}
                            inputMode="decimal"
                          />
                        </Field>
                        <Field id="item-field-defaultPurchasePrice" label={isArabic ? "سعر الشراء الافتراضي" : "Default Purchase Price"} error={localErrors.defaultPurchasePrice} labelAlign={isArabic ? "end" : "start"}>
                          <Input
                            value={editor.defaultPurchasePrice}
                            onChange={(e) => {
                              updateEditor((current) => ({ ...current, defaultPurchasePrice: e.target.value }));
                              clearFieldError("defaultPurchasePrice");
                            }}
                            className={cn("bg-white", isArabic ? "text-right" : "text-left", localErrors.defaultPurchasePrice ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")}
                            inputMode="decimal"
                          />
                        </Field>
                        <Field label={isArabic ? "وحدة البيع" : "Sales Unit"} labelAlign={isArabic ? "end" : "start"}>
                          <Select
                            value={editor.salesUnitId || editor.unitOfMeasureId}
                            onChange={(e) => updateEditor((current) => ({ ...current, salesUnitId: e.target.value }))}
                            className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                          >
                            <option value="">{isArabic ? "الوحدة الأساسية" : "Base Unit"}</option>
                            {activeUnitsOfMeasure.map((u) => (
                              <option key={u.id} value={u.id}>{formatCodeName(u.code, u.name, isArabic)}</option>
                            ))}
                          </Select>
                        </Field>
                        <Field label={isArabic ? "وحدة الشراء" : "Purchase Unit"} labelAlign={isArabic ? "end" : "start"}>
                          <Select
                            value={editor.purchaseUnitId || editor.unitOfMeasureId}
                            onChange={(e) => updateEditor((current) => ({ ...current, purchaseUnitId: e.target.value }))}
                            className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                          >
                            <option value="">{isArabic ? "الوحدة الأساسية" : "Base Unit"}</option>
                            {activeUnitsOfMeasure.map((u) => (
                              <option key={u.id} value={u.id}>{formatCodeName(u.code, u.name, isArabic)}</option>
                            ))}
                          </Select>
                        </Field>
                        <Field
                          label={isArabic ? "البيع بالوزن" : "Sell by weight"}
                          labelAlign={isArabic ? "end" : "start"}
                        >
                          <div className={cn("flex items-center gap-3 h-[46px] border border-slate-200 bg-slate-50/30 rounded-xl px-4", isArabic ? "flex-row-reverse" : "flex-row")}>
                            <button
                              type="button"
                              onClick={() => updateEditor((current) => ({ ...current, allowFractionalQuantity: !current.allowFractionalQuantity }))}
                              className={cn(
                                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                editor.allowFractionalQuantity ? "bg-emerald-600" : "bg-slate-200"
                              )}
                            >
                              <span
                                className={cn(
                                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                  editor.allowFractionalQuantity ? (isArabic ? "-translate-x-5" : "translate-x-5") : "translate-x-0"
                                )}
                              />
                            </button>
                            <span className="text-sm font-semibold text-slate-700">
                              {editor.allowFractionalQuantity ? (isArabic ? "نعم" : "Yes") : (isArabic ? "لا" : "No")}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            {isArabic
                              ? "فعّل هذا الخيار للأصناف بوحدة وزن (مثل كغ). سعر البيع الافتراضي = السعر لكل كيلو. الكاشير يدخل الوزن فقط عند البيع في نقطة البيع."
                              : "Enable for weight-based units (e.g. KG). Default sales price is per kg. Cashiers only enter weight at POS checkout."}
                          </p>
                        </Field>
                        {editor.allowFractionalQuantity ? (
                          <Field label={isArabic ? "الحد الأدنى للوزن" : "Minimum weight"} labelAlign={isArabic ? "end" : "start"}>
                            <Input
                              value={editor.minSalesQuantity}
                              onChange={(e) => updateEditor((current) => ({ ...current, minSalesQuantity: e.target.value }))}
                              className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                              inputMode="decimal"
                            />
                          </Field>
                        ) : null}
                      </div>
                    </div>

                    {/* Barcodes & Labels Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Barcode className="h-5 w-5 text-indigo-600" />
                        <h3 className="font-bold text-slate-900">{isArabic ? "الرموز والملصقات" : "Barcodes & Labels"}</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <Field id="item-field-barcode" label={isArabic ? "الباركود" : "Barcode"} error={localErrors.barcode} labelAlign={isArabic ? "end" : "start"}>
                              <Input
                                value={editor.barcode}
                                onChange={(e) => {
                                  updateEditor((current) => ({ ...current, barcode: e.target.value }));
                                  clearFieldError("barcode");
                                }}
                                className={cn("bg-white", isArabic ? "text-right" : "text-left", localErrors.barcode ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")}
                                placeholder={isArabic ? "أدخل الباركود أو امسحه" : "Enter or scan barcode"}
                              />
                            </Field>
                            <div className={cn("flex flex-wrap gap-2 mt-2", isArabic ? "justify-end" : "justify-start")}>
                              <Button variant="secondary" size="sm" className="rounded-xl px-3 py-1 text-xs" onClick={previewCodes}>{isArabic ? "معاينة" : "Preview"}</Button>
                              <Button variant="secondary" size="sm" className="rounded-xl px-3 py-1 text-xs" onClick={generateBarcode} disabled={isGeneratingBarcode}>
                                {isArabic ? "توليد" : "Generate"}
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Field label={isArabic ? "رمز QR" : "QR Code"} labelAlign={isArabic ? "end" : "start"}>
                              <Input
                                value={editor.qrCodeValue}
                                readOnly
                                className={cn("border-slate-200 bg-slate-100 text-slate-500", isArabic ? "text-right" : "text-left")}
                              />
                            </Field>
                            <div className={cn("flex flex-wrap gap-2 mt-2", isArabic ? "justify-end" : "justify-start")}>
                              <Button variant="secondary" size="sm" className="rounded-xl px-3 py-1 text-xs" onClick={printLabel}>{isArabic ? "طباعة الملصق" : "Print Label"}</Button>
                              <Button variant="secondary" size="sm" className="rounded-xl px-3 py-1 text-xs" onClick={previewCodes}>{isArabic ? "معاينة QR" : "Preview QR"}</Button>
                              <Button variant="secondary" size="sm" className="rounded-xl px-3 py-1 text-xs" onClick={generateQr}>{isArabic ? "توليد QR" : "Generate QR"}</Button>
                            </div>
                          </div>
                        </div>

                        {showCodePreview && (
                          <div className="mt-4 grid gap-4 sm:grid-cols-2 border-t border-slate-100 pt-4">
                            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center">
                              <div className="mb-2 text-xs font-bold text-slate-500 uppercase">{isArabic ? "معاينة الباركود" : "Barcode Preview"}</div>
                              {editor.barcode.trim() ? (
                                <div className="mx-auto max-w-[200px] overflow-hidden rounded-xl border border-white bg-white p-3 shadow-sm" dangerouslySetInnerHTML={{ __html: getBarcodePreviewSvg(editor.barcode.trim()) }} />
                              ) : (
                                <div className="py-4 text-xs text-slate-400">{isArabic ? "أدخل باركود للمعاينة" : "Enter barcode to preview"}</div>
                              )}
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center">
                              <div className="mb-2 text-xs font-bold text-slate-500 uppercase">{isArabic ? "معاينة QR" : "QR Preview"}</div>
                              {editor.qrCodeValue.trim() ? (
                                <div className="mx-auto h-[120px] w-[120px] overflow-hidden rounded-xl border border-white bg-white p-3 shadow-sm" dangerouslySetInnerHTML={{ __html: getQrPreviewSvg(editor.qrCodeValue.trim()) }} />
                              ) : (
                                <div className="py-4 text-xs text-slate-400">{isArabic ? "توليد QR للمعاينة" : "Generate QR to preview"}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Unit Conversions Table Card */}
                  {editor.type !== "SERVICE" && (
                    <div
                      id="item-field-unitConversions"
                      className={cn(
                        "rounded-2xl border bg-white p-5 shadow-sm",
                        localErrors.unitConversions ? "border-red-300" : "border-slate-200",
                      )}
                    >
                      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-5 w-5 text-emerald-600" />
                          <h3 className="font-bold text-slate-900">{isArabic ? "الوحدات والتحويلات الإضافية" : "Additional Units & Conversions"}</h3>
                        </div>
                        <Button type="button" variant="secondary" size="sm" onClick={addUnitConversionRow} className="rounded-xl text-xs">
                          {isArabic ? "+ إضافة وحدة" : "+ Add Unit"}
                        </Button>
                      </div>

                      {editor.unitConversions.length === 0 ? (
                        <div className="py-8 text-center text-sm text-slate-400">
                          {isArabic ? "لا توجد وحدات إضافية محددة. سيتم استخدام الوحدة الأساسية فقط." : "No additional unit conversions defined. Only the base unit will be available."}
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                          <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50/75">
                              <tr>
                                <th scope="col" className={cn("px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider", isArabic ? "text-right" : "text-left")}>{isArabic ? "الوحدة" : "Unit"}</th>
                                <th scope="col" className={cn("px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider", isArabic ? "text-right" : "text-left")}>{isArabic ? "معامل التحويل للوحدة الأساسية" : "Conversion Factor to Base Unit"}</th>
                                <th scope="col" className={cn("px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider", isArabic ? "text-right" : "text-left")}>{isArabic ? "باركود الوحدة" : "Unit Barcode"}</th>
                                <th scope="col" className={cn("px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider", isArabic ? "text-right" : "text-left")}>{isArabic ? "سعر البيع" : "Sales Price"}</th>
                                <th scope="col" className={cn("px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider", isArabic ? "text-right" : "text-left")}>{isArabic ? "سعر الشراء" : "Purchase Price"}</th>
                                <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{isArabic ? "إجراء" : "Action"}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {editor.unitConversions.map((row) => (
                                <tr key={row.key}>
                                  <td className="whitespace-nowrap px-4 py-2">
                                    <Select
                                      value={row.unitId}
                                      disabled={row.isBaseUnit}
                                      onChange={(e) => updateUnitConversionRow(row.key, (current) => ({ ...current, unitId: e.target.value }))}
                                      className="h-9 rounded-lg border-slate-200 py-1 text-xs"
                                    >
                                      <option value="">{t("inventory.placeholder.selectUnit")}</option>
                                      {activeUnitsOfMeasure.map((u) => (
                                        <option key={u.id} value={u.id}>{formatCodeName(u.code, u.name, isArabic)}</option>
                                      ))}
                                    </Select>
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-2">
                                    <Input
                                      value={row.conversionFactorToBaseUnit}
                                      disabled={row.isBaseUnit}
                                      onChange={(e) => updateUnitConversionRow(row.key, (current) => ({ ...current, conversionFactorToBaseUnit: e.target.value }))}
                                      className="h-9 rounded-lg border-slate-200 py-1 text-xs font-mono"
                                      inputMode="decimal"
                                      placeholder="1.0"
                                    />
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-2">
                                    <Input
                                      value={row.barcode}
                                      onChange={(e) => updateUnitConversionRow(row.key, (current) => ({ ...current, barcode: e.target.value }))}
                                      className="h-9 rounded-lg border-slate-200 py-1 text-xs"
                                      placeholder={isArabic ? "أدخل باركود الوحدة" : "Unit barcode"}
                                    />
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-2">
                                    <Input
                                      value={row.defaultSalesPrice}
                                      onChange={(e) => updateUnitConversionRow(row.key, (current) => ({ ...current, defaultSalesPrice: e.target.value }))}
                                      className="h-9 rounded-lg border-slate-200 py-1 text-xs"
                                      inputMode="decimal"
                                      placeholder="0.00"
                                    />
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-2">
                                    <Input
                                      value={row.defaultPurchasePrice}
                                      onChange={(e) => updateUnitConversionRow(row.key, (current) => ({ ...current, defaultPurchasePrice: e.target.value }))}
                                      className="h-9 rounded-lg border-slate-200 py-1 text-xs"
                                      inputMode="decimal"
                                      placeholder="0.00"
                                    />
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-2 text-center">
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      disabled={row.isBaseUnit}
                                      onClick={() => removeUnitConversionRow(row.key)}
                                      className="h-8 w-8 rounded-lg border-red-200 p-0 text-red-500 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div className={cn("mt-4 text-xs text-slate-500 leading-relaxed", isArabic ? "text-right" : "text-left")}>
                        {isArabic
                          ? "مثال: إذا كانت وحدة القياس الأساسية هي حبة، والكرتونة تحتوي على 24 حبة، فإن معامل تحويل الكرتونة هو 24."
                          : "Example: If the base unit of measure is Piece, and a Carton contains 24 pieces, the Carton conversion factor is 24."}
                      </div>
                      {localErrors.unitConversions ? (
                        <div className={cn("mt-3 text-sm font-medium text-red-600", isArabic ? "text-right" : "text-left")}>
                          {localErrors.unitConversions}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: inventory */}
              {activeTab === "inventory" && editor.type !== "SERVICE" && (
                <div className="space-y-5 animate-fadeIn">
                  {/* Visual Inventory Status Dashboard */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/20 p-4 flex items-center justify-between shadow-sm">
                      <div className={cn("space-y-1", isArabic ? "text-right" : "text-left")}>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {isArabic ? "الكمية المتوفرة حالياً" : "Current Quantity On-Hand"}
                        </span>
                        <div className="text-3xl font-black text-emerald-800 font-mono">
                          {parseFloat(editor.onHandQuantity || "0").toFixed(3)}
                        </div>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Package2 className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50/20 p-4 flex items-center justify-between shadow-sm">
                      <div className={cn("space-y-1", isArabic ? "text-right" : "text-left")}>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {isArabic ? "متوسط تكلفة الوحدة" : "Average Unit Cost"}
                        </span>
                        <div className="text-3xl font-black text-blue-800 font-mono">
                          {editor.currencyCode} {averageCost.toFixed(3)}
                        </div>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <LuDollarSign className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  {/* Settings Form Card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Settings className="h-5 w-5 text-amber-500" />
                      <h3 className="font-bold text-slate-900">{isArabic ? "إعدادات المستودعات والطلب" : "Warehouse & Reorder Settings"}</h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      <Field label={isArabic ? "تتبع المخزون" : "Track Inventory"} labelAlign={isArabic ? "end" : "start"}>
                        <div className={cn("flex items-center gap-3 h-[46px] border border-slate-200 bg-slate-50/30 rounded-xl px-4", isArabic ? "flex-row-reverse" : "flex-row")}>
                          <button
                            type="button"
                            onClick={() => updateEditor((current) => ({ ...current, trackInventory: !current.trackInventory }))}
                            className={cn(
                              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                              editor.trackInventory ? "bg-emerald-600" : "bg-slate-200"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                editor.trackInventory ? (isArabic ? "-translate-x-5" : "translate-x-5") : "translate-x-0"
                              )}
                            />
                          </button>
                          <span className="text-sm font-semibold text-slate-700">
                            {editor.trackInventory ? (isArabic ? "نعم" : "Yes") : (isArabic ? "لا" : "No")}
                          </span>
                        </div>
                      </Field>
                      <Field label={isArabic ? "المستودع الافتراضي" : "Default Warehouse"} labelAlign={isArabic ? "end" : "start"}>
                        <Select
                          value={editor.preferredWarehouseId}
                          onChange={(e) => updateEditor((current) => ({ ...current, preferredWarehouseId: e.target.value }))}
                          disabled={!editor.trackInventory}
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                        >
                          <option value="">{t("inventory.placeholder.selectWarehouse")}</option>
                          {warehouses.filter((w) => w.isActive).map((w) => (
                            <option key={w.id} value={w.id}>{formatCodeName(w.code, w.name, isArabic)}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field id="item-field-reorderLevel" label={isArabic ? "حد إعادة الطلب" : "Reorder Level"} error={localErrors.reorderLevel} labelAlign={isArabic ? "end" : "start"}>
                        <Input
                          value={editor.reorderLevel}
                          onChange={(e) => {
                            updateEditor((current) => ({ ...current, reorderLevel: e.target.value }));
                            clearFieldError("reorderLevel");
                          }}
                          disabled={!editor.trackInventory}
                          className={cn("bg-white", isArabic ? "text-right" : "text-left", localErrors.reorderLevel ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")}
                          inputMode="decimal"
                        />
                      </Field>
                      <Field id="item-field-reorderQuantity" label={isArabic ? "كمية إعادة الطلب" : "Reorder Quantity"} error={localErrors.reorderQuantity} labelAlign={isArabic ? "end" : "start"}>
                        <Input
                          value={editor.reorderQuantity}
                          onChange={(e) => {
                            updateEditor((current) => ({ ...current, reorderQuantity: e.target.value }));
                            clearFieldError("reorderQuantity");
                          }}
                          disabled={!editor.trackInventory}
                          className={cn("bg-white", isArabic ? "text-right" : "text-left", localErrors.reorderQuantity ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")}
                          inputMode="decimal"
                        />
                      </Field>
                      <Field id="item-field-minStockLevel" label={isArabic ? "الحد الأدنى للمخزون" : "Minimum Stock Level"} error={localErrors.minStockLevel} labelAlign={isArabic ? "end" : "start"}>
                        <Input
                          value={editor.minStockLevel}
                          onChange={(e) => {
                            updateEditor((current) => ({ ...current, minStockLevel: e.target.value }));
                            clearFieldError("minStockLevel");
                          }}
                          disabled={!editor.trackInventory}
                          className={cn("bg-white", isArabic ? "text-right" : "text-left", localErrors.minStockLevel ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")}
                          inputMode="decimal"
                        />
                      </Field>
                      <Field id="item-field-maxStockLevel" label={isArabic ? "الحد الأقصى للمخزون" : "Maximum Stock Level"} error={localErrors.maxStockLevel} labelAlign={isArabic ? "end" : "start"}>
                        <Input
                          value={editor.maxStockLevel}
                          onChange={(e) => {
                            updateEditor((current) => ({ ...current, maxStockLevel: e.target.value }));
                            clearFieldError("maxStockLevel");
                          }}
                          disabled={!editor.trackInventory}
                          className={cn("bg-white", isArabic ? "text-right" : "text-left", localErrors.maxStockLevel ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")}
                          inputMode="decimal"
                        />
                      </Field>
                      <Field label={isArabic ? "السماح بالبيع بالسالب" : "Allow Negative Stock"} labelAlign={isArabic ? "end" : "start"}>
                        <div className={cn("flex items-center gap-3 h-[46px] border border-slate-200 bg-slate-50/30 rounded-xl px-4", isArabic ? "flex-row-reverse" : "flex-row")}>
                          <button
                            type="button"
                            onClick={() => updateEditor((current) => ({ ...current, allowNegativeStock: !current.allowNegativeStock }))}
                            disabled={!editor.trackInventory}
                            className={cn(
                              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50",
                              editor.allowNegativeStock ? "bg-emerald-600" : "bg-slate-200"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                editor.allowNegativeStock ? (isArabic ? "-translate-x-5" : "translate-x-5") : "translate-x-0"
                              )}
                            />
                          </button>
                          <span className="text-sm font-semibold text-slate-700">
                            {editor.allowNegativeStock ? (isArabic ? "مسموح" : "Allowed") : (isArabic ? "غير مسموح" : "Not Allowed")}
                          </span>
                        </div>
                      </Field>
                      <Field label={isArabic ? "طريقة التقييم" : "Valuation Method"} labelAlign={isArabic ? "end" : "start"}>
                        <Input
                          value={isArabic ? "المتوسط المرجح (WAC)" : "Weighted Average (WAC)"}
                          disabled
                          className={cn("border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed", isArabic ? "text-right" : "text-left")}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: accounts */}
              {activeTab === "accounts" && isAccountantOrAdmin && (
                <div className="space-y-5 animate-fadeIn">
                  <div className={cn("rounded-xl border border-amber-200/50 bg-amber-50/30 p-4 flex items-start gap-3 shadow-sm", isArabic ? "flex-row-reverse" : "flex-row")}>
                    <LuTriangleAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className={cn("text-xs leading-relaxed text-slate-700", isArabic ? "text-right" : "text-left")}>
                      {isArabic
                        ? "إذا لم يتم اختيار حسابات مخصصة هنا، سيقوم النظام تلقائياً باستخدام الحسابات الافتراضية المعرّفة في إعدادات مجموعة المواد."
                        : "If custom accounts are not specified here, transactions will automatically fall back to the default accounts mapped at the Item Group level."}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <h3 className="font-bold text-slate-900">{isArabic ? "الربط المحاسبي للمادة" : "General Ledger Account Mapping"}</h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={isArabic ? "حساب المخزون (الأصول)" : "Inventory Account (Assets)"} labelAlign={isArabic ? "end" : "start"}>
                        <Select
                          value={editor.inventoryAccountId}
                          onChange={(e) => updateEditor((current) => ({ ...current, inventoryAccountId: e.target.value }))}
                          disabled={editor.type === "SERVICE"}
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                        >
                          <option value="">{t("inventory.placeholder.selectAccount")}</option>
                          {inventoryAccounts.map((a) => (
                            <option key={a.id} value={a.id}>{formatAccountOptionLabel(a, isArabic)}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field id="item-field-salesAccountId" label={isArabic ? "حساب المبيعات (الإيرادات)" : "Sales Revenue Account"} required={editor.sellable} error={localErrors.salesAccountId} labelAlign={isArabic ? "end" : "start"}>
                        <Select
                          value={editor.salesAccountId}
                          onChange={(e) => {
                            updateEditor((current) => ({ ...current, salesAccountId: e.target.value }));
                            clearFieldError("salesAccountId");
                          }}
                          className={cn("bg-white", isArabic ? "text-right" : "text-left", localErrors.salesAccountId ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")}
                        >
                          <option value="">{t("inventory.placeholder.selectAccount")}</option>
                          {salesAccounts.map((a) => (
                            <option key={a.id} value={a.id}>{formatAccountOptionLabel(a, isArabic)}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label={isArabic ? "حساب مصروف الشراء" : "Purchase Expense Account"} labelAlign={isArabic ? "end" : "start"}>
                        <Select
                          value={editor.expenseAccountId}
                          onChange={(e) => updateEditor((current) => ({ ...current, expenseAccountId: e.target.value }))}
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                        >
                          <option value="">{t("inventory.placeholder.selectAccount")}</option>
                          {expenseAccounts.map((a) => (
                            <option key={a.id} value={a.id}>{formatAccountOptionLabel(a, isArabic)}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label={isArabic ? "حساب تكلفة البضاعة المباعة (COGS)" : "Cost of Goods Sold (COGS)"} labelAlign={isArabic ? "end" : "start"}>
                        <Select
                          value={editor.cogsAccountId}
                          onChange={(e) => updateEditor((current) => ({ ...current, cogsAccountId: e.target.value }))}
                          disabled={editor.type === "SERVICE"}
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
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
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                        >
                          <option value="">{t("inventory.placeholder.selectAccount")}</option>
                          {salesAccounts.map((a) => (
                            <option key={a.id} value={a.id}>{formatAccountOptionLabel(a, isArabic)}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label={isArabic ? "حساب تسويات فروقات المخزون" : "Inventory Adjustments Account"} labelAlign={isArabic ? "end" : "start"}>
                        <Select
                          value={editor.adjustmentAccountId}
                          onChange={(e) => updateEditor((current) => ({ ...current, adjustmentAccountId: e.target.value }))}
                          disabled={editor.type === "SERVICE"}
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                        >
                          <option value="">{t("inventory.placeholder.selectAccount")}</option>
                          {adjustmentAccounts.map((a) => (
                            <option key={a.id} value={a.id}>{formatAccountOptionLabel(a, isArabic)}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label={isArabic ? "حساب خصومات المبيعات" : "Sales Discount Account"} labelAlign={isArabic ? "end" : "start"}>
                        <Select
                          value={editor.salesDiscountAccountId}
                          onChange={(e) => updateEditor((current) => ({ ...current, salesDiscountAccountId: e.target.value }))}
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                        >
                          <option value="">{isArabic ? "اختر الحساب" : "Select Account"}</option>
                          {salesAccounts.map((a) => (
                            <option key={a.id} value={a.id}>{formatAccountOptionLabel(a, isArabic)}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label={isArabic ? "مركز التكلفة الافتراضي" : "Default Cost Center"} labelAlign={isArabic ? "end" : "start"}>
                        <Select
                          value={editor.defaultCostCenterId}
                          onChange={(e) => updateEditor((current) => ({ ...current, defaultCostCenterId: e.target.value }))}
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                        >
                          <option value="">{isArabic ? "لا يوجد" : "None"}</option>
                        </Select>
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: tax */}
              {activeTab === "tax" && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <LuPercent className="h-5 w-5 text-indigo-500" />
                      <h3 className="font-bold text-slate-900">{isArabic ? "الإعدادات الضريبية" : "Tax Settings"}</h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      <Field label={isArabic ? "خاضع للضريبة" : "Taxable"} labelAlign={isArabic ? "end" : "start"}>
                        <div className={cn("flex items-center gap-3 h-[46px] border border-slate-200 bg-slate-50/30 rounded-xl px-4", isArabic ? "flex-row-reverse" : "flex-row")}>
                          <button
                            type="button"
                            onClick={() => updateEditor((current) => ({ ...current, taxable: !current.taxable }))}
                            className={cn(
                              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                              editor.taxable ? "bg-emerald-600" : "bg-slate-200"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                editor.taxable ? (isArabic ? "-translate-x-5" : "translate-x-5") : "translate-x-0"
                              )}
                            />
                          </button>
                          <span className="text-sm font-semibold text-slate-700">
                            {editor.taxable ? (isArabic ? "نعم" : "Yes") : (isArabic ? "لا" : "No")}
                          </span>
                        </div>
                      </Field>
                      <Field id="item-field-defaultTaxId" label={isArabic ? "فئة ضريبة المبيعات" : "Sales Tax Code"} required={editor.taxable} error={localErrors.defaultTaxId} labelAlign={isArabic ? "end" : "start"}>
                        <Select
                          value={editor.defaultTaxId}
                          onChange={(e) => {
                            updateEditor((current) => ({ ...current, defaultTaxId: e.target.value }));
                            clearFieldError("defaultTaxId");
                          }}
                          disabled={!editor.taxable}
                          className={cn("bg-white", isArabic ? "text-right" : "text-left", localErrors.defaultTaxId ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")}
                        >
                          <option value="">{t("inventory.placeholder.selectTax")}</option>
                          {activeTaxes.map((tax) => (
                            <option key={tax.id} value={tax.id}>{formatCodeName(tax.taxCode, tax.taxName, isArabic)} ({parseFloat(tax.rate).toFixed(0)}%)</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label={isArabic ? "فئة ضريبة المشتريات" : "Purchase Tax Code"} labelAlign={isArabic ? "end" : "start"}>
                        <Select
                          value={editor.purchaseTaxId}
                          onChange={(e) => updateEditor((current) => ({ ...current, purchaseTaxId: e.target.value }))}
                          disabled={!editor.taxable}
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                        >
                          <option value="">{t("inventory.placeholder.selectTax")}</option>
                          {activeTaxes.map((tax) => (
                            <option key={tax.id} value={tax.id}>{formatCodeName(tax.taxCode, tax.taxName, isArabic)} ({parseFloat(tax.rate).toFixed(0)}%)</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label={isArabic ? "معدل الضريبة الفعلي" : "Effective Tax Rate"} labelAlign={isArabic ? "end" : "start"}>
                        <Input
                          value={taxRateDisplay}
                          disabled
                          className={cn("border-slate-200 bg-slate-100 text-slate-600 font-bold cursor-not-allowed", isArabic ? "text-right" : "text-left")}
                        />
                      </Field>
                      <Field label={isArabic ? "السعر شامل الضريبة" : "Price Includes Tax"} labelAlign={isArabic ? "end" : "start"}>
                        <div className={cn("flex items-center gap-3 h-[46px] border border-slate-200 bg-slate-50/30 rounded-xl px-4", isArabic ? "flex-row-reverse" : "flex-row")}>
                          <button
                            type="button"
                            onClick={() => updateEditor((current) => ({ ...current, priceIncludesTax: !current.priceIncludesTax }))}
                            className={cn(
                              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                              editor.priceIncludesTax ? "bg-emerald-600" : "bg-slate-200"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                editor.priceIncludesTax ? (isArabic ? "-translate-x-5" : "translate-x-5") : "translate-x-0"
                              )}
                            />
                          </button>
                          <span className="text-sm font-semibold text-slate-700">
                            {editor.priceIncludesTax ? (isArabic ? "نعم" : "Yes") : (isArabic ? "لا" : "No")}
                          </span>
                        </div>
                      </Field>
                      <Field label={isArabic ? "معاملة ضريبية خاصة" : "Special Tax Treatment"} labelAlign={isArabic ? "end" : "start"}>
                        <Input
                          value={editor.specialTaxTreatment}
                          onChange={(e) => updateEditor((current) => ({ ...current, specialTaxTreatment: e.target.value }))}
                          placeholder={isArabic ? "مثال: معفى أو صفري للاتفاقيات الدولية" : "e.g., zero-rated agreements"}
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: suppliers */}
              {activeTab === "suppliers" && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <LuTruck className="h-5 w-5 text-emerald-500" />
                      <h3 className="font-bold text-slate-900">{isArabic ? "معلومات الموردين والمشتريات" : "Supplier & Procurement Info"}</h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      <Field label={isArabic ? "المورد الافتراضي الرئيسي" : "Primary Default Supplier"} labelAlign={isArabic ? "end" : "start"}>
                        <Select
                          value={editor.defaultSupplierId}
                          onChange={(e) => updateEditor((current) => ({ ...current, defaultSupplierId: e.target.value }))}
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                        >
                          <option value="">{isArabic ? "اختر المورد الرئيسي" : "Select Primary Supplier"}</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>{formatCodeName(s.code, s.name, isArabic)}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label={isArabic ? "رمز المادة لدى المورد" : "Supplier Item Code / SKU"} labelAlign={isArabic ? "end" : "start"}>
                        <Input
                          value={editor.supplierItemCode}
                          onChange={(e) => updateEditor((current) => ({ ...current, supplierItemCode: e.target.value }))}
                          placeholder={isArabic ? "أدخل رمز المورد للمادة" : "Supplier-side product code"}
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                        />
                      </Field>
                      <Field label={isArabic ? "آخر سعر شراء مستلم" : "Last Purchase Price"} labelAlign={isArabic ? "end" : "start"}>
                        <Input
                          value={editor.lastPurchasePrice}
                          onChange={(e) => updateEditor((current) => ({ ...current, lastPurchasePrice: e.target.value }))}
                          placeholder="0.00"
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                          inputMode="decimal"
                        />
                      </Field>
                      <Field label={isArabic ? "فترة التوريد المتوقعة (أيام)" : "Expected Lead Time (Days)"} labelAlign={isArabic ? "end" : "start"}>
                        <Input
                          value={editor.leadTime}
                          onChange={(e) => updateEditor((current) => ({ ...current, leadTime: e.target.value }))}
                          placeholder="e.g. 5"
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                          inputMode="numeric"
                        />
                      </Field>
                      <Field label={isArabic ? "الحد الأدنى لكمية المشتريات" : "Min Purchase Quantity"} labelAlign={isArabic ? "end" : "start"}>
                        <Input
                          value={editor.minPurchaseQuantity}
                          onChange={(e) => updateEditor((current) => ({ ...current, minPurchaseQuantity: e.target.value }))}
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                          inputMode="numeric"
                        />
                      </Field>
                    </div>

                    <div className="mt-4">
                      <Field label={isArabic ? "موردون بديلون وشروط التوريد" : "Alternative Suppliers & Notes"} labelAlign={isArabic ? "end" : "start"}>
                        <Textarea
                          value={editor.alternativeSuppliersText}
                          onChange={(e) => updateEditor((current) => ({ ...current, alternativeSuppliersText: e.target.value }))}
                          placeholder={isArabic ? "اكتب أسماء الموردين البديلين وشروط تسليم المادة وأي تفاصيل أخرى..." : "List alternative vendor names, contacts, or shipment terms..."}
                          rows={3}
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 6: images_attachments */}
              {activeTab === "images_attachments" && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <ImageIcon className="h-5 w-5 text-teal-600" />
                      <h3 className="font-bold text-slate-900">{isArabic ? "الصور والمرفقات والمستندات" : "Images, Attachments & Datasheets"}</h3>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                        <Field label={isArabic ? "رابط صورة المادة" : "Item Image URL"} labelAlign={isArabic ? "end" : "start"}>
                          <div className="flex gap-2">
                            <Input
                              value={editor.itemImageUrl}
                              onChange={(e) => updateEditor((current) => ({ ...current, itemImageUrl: e.target.value }))}
                              className={cn("border-slate-200 bg-white", isArabic ? "text-right" : "text-left")}
                              placeholder="https://example.com/image.png"
                            />
                            <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          </div>
                        </Field>

                        {/* Image Preview Box */}
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 flex flex-col items-center justify-center h-48">
                          {editor.itemImageUrl.trim() ? (
                            <img
                              src={editor.itemImageUrl.trim()}
                              alt="Product preview"
                              className="max-h-full max-w-full rounded-lg object-contain shadow-sm bg-white"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = ""; // Clear on error
                              }}
                            />
                          ) : (
                            <div className="text-center text-xs text-slate-400">
                              <ImageIcon className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                              {isArabic ? "لا توجد صورة محملة لمعاينتها" : "No image URL provided for preview"}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Field label={isArabic ? "روابط ملفات المرفقات (تفصل بسطور جديدة أو فواصل)" : "Attachment URLs (Newline or comma separated)"} labelAlign={isArabic ? "end" : "start"}>
                          <div className="flex gap-2">
                            <Textarea
                              value={editor.attachmentsText}
                              rows={3}
                              onChange={(e) => updateEditor((current) => ({ ...current, attachmentsText: e.target.value }))}
                              className={cn("border-slate-200 bg-white min-h-[100px]", isArabic ? "text-right" : "text-left")}
                              placeholder={isArabic ? "روابط مستندات المادة..." : "Attachment URLs..."}
                            />
                            <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
                              <Paperclip className="h-5 w-5" />
                            </div>
                          </div>
                        </Field>

                        <Field label={isArabic ? "رابط كتالوج المادة / كتيب المواصفات" : "Product Datasheet / Catalog URL"} labelAlign={isArabic ? "end" : "start"}>
                          <Input
                            value={editor.datasheetUrl}
                            onChange={(e) => updateEditor((current) => ({ ...current, datasheetUrl: e.target.value }))}
                            placeholder="https://example.com/manual.pdf"
                            className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 7: notes */}
              {activeTab === "notes" && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <LuNotebook className="h-5 w-5 text-emerald-500" />
                      <h3 className="font-bold text-slate-900">{isArabic ? "الوصف والملحوظات الداخلية والخارجية" : "Descriptions, Public & Internal Notes"}</h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={isArabic ? "الوصف على الفواتير" : "Description on Invoices (Public)"} labelAlign={isArabic ? "end" : "start"}>
                        <Textarea
                          value={editor.description}
                          onChange={(e) => updateEditor((current) => ({ ...current, description: e.target.value }))}
                          placeholder={isArabic ? "اكتب الوصف الذي يظهر للعملاء في الفاتورة المطبوعة..." : "Enter description displayed to clients on PDF invoices..."}
                          rows={4}
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                        />
                      </Field>
                      <Field label={isArabic ? "ملاحظات داخلية (سرية للموظفين)" : "Internal Notes (Private)"} labelAlign={isArabic ? "end" : "start"}>
                        <Textarea
                          value={editor.internalNotes}
                          onChange={(e) => updateEditor((current) => ({ ...current, internalNotes: e.target.value }))}
                          placeholder={isArabic ? "اكتب ملاحظات داخلية تظهر فقط لمدراء النظام والموظفين..." : "Enter private notes visible only to admins and cashiers..."}
                          rows={4}
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                        />
                      </Field>
                      <Field label={isArabic ? "ملحوظات المشتريات وفواتير الشراء" : "Purchase & Vendor Order Notes"} labelAlign={isArabic ? "end" : "start"}>
                        <Textarea
                          value={editor.purchaseNotes}
                          onChange={(e) => updateEditor((current) => ({ ...current, purchaseNotes: e.target.value }))}
                          placeholder={isArabic ? "ملاحظات خاصة بمشتريات المادة أو أوامر الشراء..." : "Enter custom notes for purchase orders..."}
                          rows={3}
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                        />
                      </Field>
                      <Field label={isArabic ? "ملحوظات تسوية وجرد المخزون" : "Warehouse & Inventory Adjustment Notes"} labelAlign={isArabic ? "end" : "start"}>
                        <Textarea
                          value={editor.inventoryNotes}
                          onChange={(e) => updateEditor((current) => ({ ...current, inventoryNotes: e.target.value }))}
                          placeholder={isArabic ? "تعليمات خاصة بجرد هذه المادة ومكان تخزينها بالمستودعات..." : "Enter adjustment instructions or storage location details..."}
                          rows={3}
                          className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 8: pos_addons */}
              {activeTab === "pos_addons" && editor.id && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <LuPlus className="h-5 w-5 text-emerald-600" />
                      <h3 className="font-bold text-slate-900">
                        {isArabic ? "مجموعات إضافات نقاط البيع" : "POS Add-on Groups"}
                      </h3>
                    </div>

                    <p className={cn("text-sm text-slate-500 mb-6", isArabic ? "text-right" : "text-left")}>
                      {isArabic
                        ? "اربط مجموعات الإضافات النشطة بهذا المنتج. ستظهر هذه الإضافات للكاشير عند إضافة المنتج للسلة."
                        : "Link active add-on groups to this product. These add-ons will be presented to the cashier when adding this item to the cart."}
                    </p>

                    {addonError && (
                      <div className={cn("mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-700", isArabic ? "text-right" : "text-left")}>
                        {addonError}
                      </div>
                    )}

                    {isAddonLoading ? (
                      <div className="py-12 text-center text-sm text-slate-400">
                        {isArabic ? "جاري التحميل..." : "Loading..."}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Dropdown to add link */}
                        <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end", isArabic ? "sm:flex-row-reverse" : "")}>
                          <div className="flex-1">
                            <Field
                              label={isArabic ? "اختر مجموعة إضافات لربطها" : "Select Add-on Group to Link"}
                              labelAlign={isArabic ? "end" : "start"}
                            >
                              <Select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleLinkGroup(e.target.value);
                                  }
                                }}
                                className={cn("bg-white border-slate-200", isArabic ? "text-right" : "text-left")}
                              >
                                <option value="">
                                  {isArabic ? "-- اختر مجموعة إضافات نشطة --" : "-- Select Active Add-on Group --"}
                                </option>
                                {linkableGroups.map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.code} — {isArabic ? (g.nameAr || g.name) : g.name}
                                  </option>
                                ))}
                              </Select>
                            </Field>
                          </div>
                        </div>

                        {/* Linked Groups List */}
                        <div className="space-y-3">
                          <h4 className={cn("text-sm font-bold text-slate-900", isArabic ? "text-right" : "text-left")}>
                            {isArabic ? "مجموعات الإضافات المرتبطة حالياً" : "Currently Linked Add-on Groups"}
                          </h4>

                          {linkedGroups.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                              {isArabic
                                ? "لا توجد مجموعات إضافات مرتبطة بهذا المنتج حالياً."
                                : "No add-on groups are linked to this product currently."}
                            </div>
                          ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {linkedGroups.map((group) => (
                                <div
                                  key={group.id}
                                  className={cn(
                                    "flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 transition hover:bg-slate-50",
                                    isArabic ? "flex-row-reverse" : ""
                                  )}
                                >
                                  <div className={cn("min-w-0 space-y-1", isArabic ? "text-right" : "text-left")}>
                                    <div className="font-bold text-slate-900">
                                      {isArabic ? (group.nameAr || group.name) : group.name}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 text-xs text-slate-500">
                                      <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">
                                        {group.code}
                                      </span>
                                      <span>•</span>
                                      <span>
                                        {group.selectionType === "SINGLE"
                                          ? (isArabic ? "اختيار واحد" : "Single Choice")
                                          : (isArabic ? "اختيار متعدد" : "Multiple Choice")}
                                      </span>
                                      {group.isRequired && (
                                        <>
                                          <span>•</span>
                                          <span className="font-semibold text-red-600">
                                            {isArabic ? "إجباري" : "Required"}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleUnlinkGroup(group.id)}
                                    className="h-8 w-8 rounded-lg border-red-200 p-0 text-red-500 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "pos_addons" && !editor.id && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
                  {isArabic
                    ? "الرجاء حفظ المنتج أولاً قبل ربط مجموعات الإضافات."
                    : "Please save the product first before linking add-on groups."}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with fixed action buttons */}
        <div className={cn("border-t border-slate-200 bg-white px-5 py-4 sm:px-8", isInline && "rounded-b-lg shadow-md")}>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => handleSaveClick("saveAndClose")}
              disabled={isSaving}
              className="rounded-xl bg-emerald-600 px-6 hover:bg-emerald-700 font-bold"
            >
              <Save className="h-4 w-4" />
              {isArabic ? "حفظ وإغلاق" : "Save & Close"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleSaveClick("save")}
              disabled={isSaving}
              className="rounded-xl border-slate-200 px-6 text-emerald-700 hover:bg-emerald-50 font-bold"
            >
              <Save className="h-4 w-4" />
              {isArabic ? "حفظ وتعديل" : "Save"}
            </Button>
            <Button variant="secondary" onClick={onClose} className="rounded-xl border-slate-200 px-6 font-bold ltr:ml-auto rtl:mr-auto">
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
