"use client";

import React from "react";

import { Modal } from "@/components/ui";
import {
  formatCurrency,
  getLineBase,
  getLineDiscountAmount,
  getLineTotal,
  parseAmount,
  type DiscountType,
} from "@/features/pos-market/pos-market-cart-utils";
import {
  buildWeightPresets,
  formatWeightQuantity,
  getMinSalesQuantity,
  getQuantityPrecision,
  getWeightPresetLabel,
  getWeightQuantityStep,
  parseWeightInput,
} from "@/features/pos-market/pos-market-weight-utils";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { useTranslation } from "@/lib/i18n";
import { getLocalizedText } from "@/lib/utils";
import type { InventoryItem } from "@/types/api";

export type PosMarketWeightEntryPayload = {
  weight: number;
  discountType?: DiscountType;
  discountValue?: number;
};

type PosMarketWeightEntryModalProps = {
  isOpen: boolean;
  item: InventoryItem | null;
  language: string;
  currencyCode?: string;
  onClose: () => void;
  onConfirm: (payload: PosMarketWeightEntryPayload) => void;
};

export function PosMarketWeightEntryModal({
  isOpen,
  item,
  language,
  currencyCode = "JOD",
  onClose,
  onConfirm,
}: PosMarketWeightEntryModalProps) {
  const { t } = useTranslation();
  const isAr = language === "ar";
  const precision = item ? getQuantityPrecision(item) : 3;
  const step = getWeightQuantityStep(precision);
  const minWeight = item ? getMinSalesQuantity(item) : 0.0001;
  const unitCode = item?.unitOfMeasure ?? "KG";
  const unitPrice = parseAmount(item?.defaultSalesPrice);
  const onHand = item?.trackInventory ? parseAmount(item.onHandQuantity) : null;
  const [weightInput, setWeightInput] = React.useState("");
  const [selectedPreset, setSelectedPreset] = React.useState<number | null>(null);
  const [discountType, setDiscountType] = React.useState<DiscountType>("FIXED");
  const [discountValueInput, setDiscountValueInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const weightPresets = React.useMemo(
    () =>
      buildWeightPresets({
        precision,
        minWeight,
        maxWeight: onHand,
      }),
    [minWeight, onHand, precision],
  );

  React.useEffect(() => {
    if (!isOpen) return;
    setWeightInput("");
    setSelectedPreset(null);
    setDiscountType("FIXED");
    setDiscountValueInput("");
    setError(null);
  }, [isOpen, item?.id]);

  const parsedWeight = parseWeightInput(weightInput, precision);
  const discountValue = Math.max(0, parseAmount(discountValueInput));

  const previewLine =
    parsedWeight != null && item
      ? {
          itemId: item.id,
          name: item.name,
          code: item.code,
          unit: unitCode,
          itemType: item.type,
          quantity: parsedWeight,
          unitPrice,
          baseUnitPrice: unitPrice,
          discountType,
          discountValue,
          taxRate: 0,
          trackInventory: item.trackInventory,
          unitCost: 0,
          onHandQuantity: parseAmount(item.onHandQuantity),
          sellByWeight: true,
          quantityPrecision: precision,
        }
      : null;

  const lineBase = previewLine ? getLineBase(previewLine) : null;
  const lineDiscount = previewLine ? getLineDiscountAmount(previewLine) : null;
  const lineTotalAfterDiscount = previewLine ? getLineTotal(previewLine) : null;

  const handlePresetSelect = (value: number) => {
    setSelectedPreset(value);
    setWeightInput(String(value));
    setError(null);
  };

  const handleConfirm = () => {
    const weight = parseWeightInput(weightInput, precision);
    if (weight == null) {
      setError(
        isAr ? "أدخل وزناً صالحاً أكبر من صفر" : "Enter a valid weight greater than zero",
      );
      return;
    }
    if (weight < minWeight) {
      setError(
        isAr
          ? `الحد الأدنى للوزن ${formatWeightQuantity(minWeight, unitCode, precision)}`
          : `Minimum weight is ${formatWeightQuantity(minWeight, unitCode, precision)}`,
      );
      return;
    }
    if (item?.trackInventory) {
      const onHandQty = parseAmount(item.onHandQuantity);
      if (weight > onHandQty) {
        setError(
          isAr
            ? `الكمية المتاحة ${formatWeightQuantity(onHandQty, unitCode, precision)}`
            : `Available stock is ${formatWeightQuantity(onHandQty, unitCode, precision)}`,
        );
        return;
      }
    }

    const payload: PosMarketWeightEntryPayload = { weight };
    if (discountValue > 0) {
      payload.discountType = discountType;
      payload.discountValue = discountValue;
    }
    onConfirm(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getLocalizedText("Enter weight / أدخل الوزن", language)}
    >
      {item ? (
        <div className="space-y-4 text-sm" style={{ color: POS_MARKET_THEME.colors.text }}>
          <div>
            <div className="text-base font-black arabic-heading">
              {getLocalizedText(item.name, language)}
            </div>
            <div className="mt-1 text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
              {isAr
                ? `السعر لكل ${unitCode}: ${formatCurrency(unitPrice, currencyCode)}`
                : `Price per ${unitCode}: ${formatCurrency(unitPrice, currencyCode)}`}
            </div>
          </div>

          {weightPresets.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-bold" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                {isAr ? "اختر الوزن" : "Choose weight"}
              </p>
              <div className="flex flex-wrap gap-2">
                {weightPresets.map((preset) => {
                  const selected = selectedPreset === preset.value;
                  const presetTotal = Number((preset.value * unitPrice).toFixed(2));
                  const label = getWeightPresetLabel(
                    preset.value,
                    unitCode,
                    precision,
                    language,
                    preset,
                  );

                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handlePresetSelect(preset.value)}
                      className="rounded-xl border px-3 py-2 text-start text-xs font-bold transition"
                      style={{
                        borderColor: selected
                          ? POS_MARKET_THEME.colors.primary
                          : POS_MARKET_THEME.colors.outline,
                        backgroundColor: selected
                          ? POS_MARKET_THEME.colors.primarySoft
                          : "white",
                        color: selected
                          ? POS_MARKET_THEME.colors.primary
                          : POS_MARKET_THEME.colors.text,
                      }}
                    >
                      <span className="block">{label}</span>
                      <span
                        className="mt-0.5 block text-[10px] font-semibold"
                        style={{ color: POS_MARKET_THEME.colors.textMuted }}
                      >
                        {formatCurrency(presetTotal, currencyCode)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-xs font-bold" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
              {isAr ? `أو أدخل الوزن (${unitCode})` : `Or enter weight (${unitCode})`}
            </label>
            <input
              type="number"
              min={minWeight}
              step={step}
              autoFocus
              value={weightInput}
              onChange={(event) => {
                setWeightInput(event.target.value);
                setSelectedPreset(null);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleConfirm();
                }
              }}
              className="h-11 w-full rounded-xl border px-3 text-sm font-semibold"
              style={{ borderColor: POS_MARKET_THEME.colors.outline }}
              dir="ltr"
            />
          </div>

          <div
            className="rounded-xl border p-3"
            style={{ borderColor: POS_MARKET_THEME.colors.outline }}
          >
            <p className="mb-2 text-xs font-bold" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
              {t("posMarket.discount.repDiscount")}
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setDiscountType((current) => (current === "FIXED" ? "PERCENT" : "FIXED"))
                }
                className="rounded-lg border px-2 py-1.5 text-[10px] font-semibold"
                style={{ borderColor: POS_MARKET_THEME.colors.outline }}
              >
                {discountType === "FIXED" ? t("posMarket.discount.fixed") : t("posMarket.discount.percent")}
              </button>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountValueInput}
                onChange={(event) => setDiscountValueInput(event.target.value)}
                placeholder="0"
                className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold"
                style={{ borderColor: POS_MARKET_THEME.colors.outline }}
                dir="ltr"
              />
            </div>
          </div>

          {lineBase != null ? (
            <div
              className="space-y-1 rounded-xl border px-3 py-2 text-xs font-semibold"
              style={{
                borderColor: POS_MARKET_THEME.colors.outline,
                backgroundColor: POS_MARKET_THEME.colors.primarySoft,
                color: POS_MARKET_THEME.colors.text,
              }}
            >
              <div className="flex justify-between">
                <span>{t("pos.review.subtotal")}</span>
                <span dir="ltr">{formatCurrency(lineBase, currencyCode)}</span>
              </div>
              {lineDiscount != null && lineDiscount > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <span>{t("posMarket.discount.repDiscount")}</span>
                  <span dir="ltr">-{formatCurrency(lineDiscount, currencyCode)}</span>
                </div>
              ) : null}
              {lineTotalAfterDiscount != null ? (
                <div
                  className="flex justify-between border-t pt-1 text-sm font-bold"
                  style={{ borderColor: POS_MARKET_THEME.colors.outline, color: POS_MARKET_THEME.colors.primary }}
                >
                  <span>{t("posMarket.discount.afterDiscount")}</span>
                  <span dir="ltr">{formatCurrency(lineTotalAfterDiscount, currencyCode)}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-[#f2c9c1] bg-[#fff4f1] px-3 py-2 text-xs font-bold text-[#9a4338]">
              {error}
            </div>
          ) : null}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border px-4 py-2.5 text-xs font-bold"
              style={{ borderColor: POS_MARKET_THEME.colors.outline }}
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 rounded-full px-4 py-2.5 text-xs font-bold text-white"
              style={{ backgroundColor: POS_MARKET_THEME.colors.primary }}
            >
              {isAr ? "إضافة" : "Add"}
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
