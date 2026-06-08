"use client";

import React from "react";

import { Modal } from "@/components/ui";
import {
  formatWeightQuantity,
  getMinSalesQuantity,
  getQuantityPrecision,
  getWeightQuantityStep,
  parseWeightInput,
} from "@/features/pos/pos-weight-utils";
import { getLocalizedText } from "@/lib/utils";
import type { InventoryItem } from "@/types/api";

function parseAmount(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number, currency = "JOD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type PosWeightEntryModalProps = {
  isOpen: boolean;
  item: InventoryItem | null;
  language: string;
  currencyCode?: string;
  onClose: () => void;
  onConfirm: (weight: number) => void;
};

export function PosWeightEntryModal({
  isOpen,
  item,
  language,
  currencyCode = "JOD",
  onClose,
  onConfirm,
}: PosWeightEntryModalProps) {
  const isAr = language === "ar";
  const precision = item ? getQuantityPrecision(item) : 3;
  const step = getWeightQuantityStep(precision);
  const minWeight = item ? getMinSalesQuantity(item) : 0.0001;
  const unitCode = item?.unitOfMeasure ?? "KG";
  const unitPrice = parseAmount(item?.defaultSalesPrice);
  const [weightInput, setWeightInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }
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
        isAr
          ? "أدخل وزناً صالحاً أكبر من صفر"
          : "Enter a valid weight greater than zero",
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
        <div className="space-y-4 text-sm text-[#42564a]">
          <div>
            <div className="text-base font-black text-[#233329]">
              {getLocalizedText(item.name, language)}
            </div>
            <div className="mt-1 text-xs text-[#6b7c70]">
              {isAr
                ? `السعر لكل ${unitCode}: ${formatCurrency(unitPrice, currencyCode)}`
                : `Price per ${unitCode}: ${formatCurrency(unitPrice, currencyCode)}`}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[#5f6d66]">
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
              className="h-11 w-full rounded-xl border border-[#d6e1d9] bg-white px-3 text-sm font-semibold text-[#233329]"
              dir="ltr"
            />
          </div>

          {lineTotal != null ? (
            <div className="rounded-xl border border-[#dbeafe] bg-[#eff6ff] px-3 py-2 text-sm font-bold text-[#1d4ed8]">
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
              className="flex-1 rounded-full border border-[#d6e1d9] px-4 py-2.5 text-xs font-bold text-[#506054]"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 rounded-full bg-[#46644b] px-4 py-2.5 text-xs font-bold text-white"
            >
              {isAr ? "إضافة" : "Add"}
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
