"use client";

import React from "react";

import { Modal } from "@/components/ui";
import {
  formatCurrency,
  parseAmount,
} from "@/features/pos-market/pos-market-cart-utils";
import {
  formatWeightQuantity,
  getMinSalesQuantity,
  getQuantityPrecision,
  getWeightQuantityStep,
  parseWeightInput,
} from "@/features/pos-market/pos-market-weight-utils";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { getLocalizedText } from "@/lib/utils";
import type { InventoryItem } from "@/types/api";

type PosMarketWeightEntryModalProps = {
  isOpen: boolean;
  item: InventoryItem | null;
  language: string;
  currencyCode?: string;
  onClose: () => void;
  onConfirm: (weight: number) => void;
};

export function PosMarketWeightEntryModal({
  isOpen,
  item,
  language,
  currencyCode = "JOD",
  onClose,
  onConfirm,
}: PosMarketWeightEntryModalProps) {
  const isAr = language === "ar";
  const precision = item ? getQuantityPrecision(item) : 3;
  const step = getWeightQuantityStep(precision);
  const minWeight = item ? getMinSalesQuantity(item) : 0.0001;
  const unitCode = item?.unitOfMeasure ?? "KG";
  const unitPrice = parseAmount(item?.defaultSalesPrice);
  const [weightInput, setWeightInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setWeightInput("");
    setError(null);
  }, [isOpen, item?.id]);

  const parsedWeight = parseWeightInput(weightInput, precision);
  const lineTotal =
    parsedWeight != null ? Number((parsedWeight * unitPrice).toFixed(2)) : null;

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
      const onHand = parseAmount(item.onHandQuantity);
      if (weight > onHand) {
        setError(
          isAr
            ? `الكمية المتاحة ${formatWeightQuantity(onHand, unitCode, precision)}`
            : `Available stock is ${formatWeightQuantity(onHand, unitCode, precision)}`,
        );
        return;
      }
    }
    onConfirm(weight);
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

          <div>
            <label className="mb-1 block text-xs font-bold" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
              {isAr ? `الوزن (${unitCode})` : `Weight (${unitCode})`}
            </label>
            <input
              type="number"
              min={minWeight}
              step={step}
              autoFocus
              value={weightInput}
              onChange={(event) => {
                setWeightInput(event.target.value);
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

          {lineTotal != null ? (
            <div
              className="rounded-xl border px-3 py-2 text-sm font-bold"
              style={{
                borderColor: POS_MARKET_THEME.colors.outline,
                backgroundColor: POS_MARKET_THEME.colors.primarySoft,
                color: POS_MARKET_THEME.colors.primary,
              }}
            >
              {isAr ? "إجمالي السطر: " : "Line total: "}
              {formatCurrency(lineTotal, currencyCode)}
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
