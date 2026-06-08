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
