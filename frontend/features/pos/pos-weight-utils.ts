import type { InventoryItem } from "@/types/api";

export function isWeightSaleItem(item: Pick<InventoryItem, "allowFractionalQuantity">) {
  return Boolean(item.allowFractionalQuantity);
}

export function getQuantityPrecision(
  item: Pick<InventoryItem, "unitOfMeasureRef">,
) {
  const precision = item.unitOfMeasureRef?.decimalPrecision;
  if (typeof precision === "number" && precision >= 0) {
    return precision;
  }
  return 3;
}

export function getWeightQuantityStep(precision: number) {
  if (precision <= 0) {
    return 1;
  }
  return Number((1 / 10 ** precision).toFixed(precision));
}

export function formatWeightQuantity(
  quantity: number,
  unitCode: string,
  precision?: number,
) {
  const digits = precision ?? 3;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(quantity);
  return unitCode ? `${formatted} ${unitCode}` : formatted;
}

/** Sell-by-weight menu items that use traditional Arabic quantity labels on POS/receipts. */
export const POS_ASNAQ_WEIGHT_ITEM_CODES = new Set(["MENU-001", "MENU-005", "MENU-006"]);

export function isKiloWeightUnit(unitCode: string) {
  const normalized = unitCode.trim().toLowerCase();
  return (
    normalized === "kg" ||
    normalized === "kgs" ||
    normalized === "كيلو" ||
    normalized === "كغم"
  );
}

/** Traditional butcher-shop labels for preset KG quantities (display only; quantity math unchanged). */
export function getTraditionalAsnaqWeightLabel(
  quantity: number,
  language: string,
): string | null {
  const rounded = Number(quantity.toFixed(3));
  const isAr = language === "ar";

  if (rounded === 0.125) {
    return isAr ? "عدد واحد" : "Single piece";
  }
  if (rounded === 0.25) {
    return isAr ? "وقية" : "Waqiya";
  }
  if (rounded === 0.5) {
    return isAr ? "نص كيلو" : "Half kilo";
  }
  if (rounded === 0.75) {
    return isAr ? "تلات أواج" : "Three awaj";
  }
  if (rounded === 1) {
    return isAr ? "كيلو" : "Kilo";
  }

  return null;
}

export function formatPosWeightDisplay(
  quantity: number,
  unitCode: string,
  options?: {
    language?: string;
    precision?: number;
    useTraditionalLabels?: boolean;
  },
) {
  const language = options?.language ?? "ar";
  const precision = options?.precision ?? 3;
  const useTraditionalLabels =
    options?.useTraditionalLabels ?? isKiloWeightUnit(unitCode);

  if (useTraditionalLabels) {
    const traditional = getTraditionalAsnaqWeightLabel(quantity, language);
    if (traditional) {
      return traditional;
    }
  }

  return formatWeightQuantity(quantity, unitCode, precision);
}

export function parseWeightInput(value: string, precision: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Number(parsed.toFixed(precision));
}

export function getMinSalesQuantity(item: Pick<InventoryItem, "minSalesQuantity">) {
  const parsed = Number(item.minSalesQuantity ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0.0001;
}
