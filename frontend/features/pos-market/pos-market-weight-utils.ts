import type { InventoryItem } from "@/types/api";

export function isWeightSaleItem(item: Pick<InventoryItem, "allowFractionalQuantity">) {
  return Boolean(item.allowFractionalQuantity);
}

export function getQuantityPrecision(item: Pick<InventoryItem, "unitOfMeasureRef">) {
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

export const DEFAULT_WEIGHT_PRESETS = [0.25, 0.5, 0.75, 1] as const;

export type WeightPresetOption = {
  value: number;
  labelAr?: string;
  labelEn?: string;
};

function isKiloUnit(unitCode: string) {
  const normalized = unitCode.trim().toLowerCase();
  return (
    normalized === "kg" ||
    normalized === "kgs" ||
    normalized === "كيلو" ||
    normalized === "كغم"
  );
}

export function getWeightPresetLabel(
  preset: number,
  unitCode: string,
  precision: number,
  language: string,
  customLabel?: Pick<WeightPresetOption, "labelAr" | "labelEn">,
) {
  if (language === "ar" && customLabel?.labelAr?.trim()) {
    return customLabel.labelAr.trim();
  }
  if (language !== "ar" && customLabel?.labelEn?.trim()) {
    return customLabel.labelEn.trim();
  }

  if (isKiloUnit(unitCode)) {
    if (preset === 0.25) {
      return language === "ar" ? "ربع كيلو" : "Quarter kilo";
    }
    if (preset === 0.5) {
      return language === "ar" ? "نص كيلو" : "Half kilo";
    }
    if (preset === 0.75) {
      return language === "ar" ? "750 غم" : "750 g";
    }
    if (preset === 1) {
      return language === "ar" ? "كيلو" : "1 kilo";
    }
  }

  return formatWeightQuantity(preset, unitCode, precision);
}

export function buildWeightPresets(options: {
  precision: number;
  minWeight: number;
  maxWeight?: number | null;
  extraPresets?: WeightPresetOption[];
}) {
  const seen = new Set<number>();
  const roundWeight = (value: number) => Number(value.toFixed(options.precision));
  const presets: WeightPresetOption[] = [
    ...DEFAULT_WEIGHT_PRESETS.map((value) => ({ value })),
    ...(options.extraPresets ?? []),
  ];

  return presets
    .map((preset) => ({
      ...preset,
      value: roundWeight(preset.value),
    }))
    .filter((preset) => {
      const value = preset.value;
      if (!Number.isFinite(value) || value <= 0 || value < options.minWeight) {
        return false;
      }
      if (typeof options.maxWeight === "number" && value > options.maxWeight) {
        return false;
      }
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    })
    .sort((a, b) => a.value - b.value);
}
