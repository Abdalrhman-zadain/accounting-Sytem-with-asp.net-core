"use client";

import React from "react";
import { LuPackage } from "react-icons/lu";

import { Modal } from "@/components/ui";
import {
  formatCurrency,
  getLineBase,
  getLineDiscountAmount,
  getLineTotal,
  parseAmount,
  type DiscountType,
} from "@/features/pos-market/pos-market-cart-utils";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { isWeightSaleItem } from "@/features/pos-market/pos-market-weight-utils";
import { useTranslation } from "@/lib/i18n";
import { getLocalizedText } from "@/lib/utils";
import type { InventoryItem } from "@/types/api";

export type PosMarketSaleEntry = {
  quantity: number;
  unitPrice: number;
  discountType?: DiscountType;
  discountValue?: number;
};

type PosMarketProductCardProps = {
  item: InventoryItem;
  currencyCode?: string;
  onAdd?: (item: InventoryItem, entry: PosMarketSaleEntry) => void;
  onSelectWeight?: (item: InventoryItem) => void;
};

function formatPrice(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toFixed(2);
}

function parseQuantityInput(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

export function PosMarketProductCard({
  item,
  currencyCode = "JOD",
  onAdd,
  onSelectWeight,
}: PosMarketProductCardProps) {
  const { language, t } = useTranslation();
  const isAr = language === "ar";
  const defaultPrice = parseAmount(item.defaultSalesPrice);
  const sellByWeight = isWeightSaleItem(item);
  const onHandQuantity = item.trackInventory ? parseAmount(item.onHandQuantity) : null;

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [quantityInput, setQuantityInput] = React.useState("1");
  const [priceInput, setPriceInput] = React.useState("");
  const [discountType, setDiscountType] = React.useState<DiscountType>("FIXED");
  const [discountValueInput, setDiscountValueInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isModalOpen) return;
    setQuantityInput("1");
    setPriceInput(defaultPrice > 0 ? defaultPrice.toFixed(2) : "");
    setDiscountType("FIXED");
    setDiscountValueInput("");
    setError(null);
  }, [defaultPrice, isModalOpen, item.id]);

  const parsedQuantity = parseQuantityInput(quantityInput);
  const parsedPrice = priceInput.trim() === "" ? null : parseAmount(priceInput);
  const discountValue = Math.max(0, parseAmount(discountValueInput));

  const previewLine =
    parsedQuantity != null && parsedPrice != null
      ? {
          itemId: item.id,
          name: item.name,
          code: item.code,
          unit: item.unitOfMeasure,
          itemType: item.type,
          quantity: parsedQuantity,
          unitPrice: parsedPrice,
          baseUnitPrice: parsedPrice,
          discountType,
          discountValue,
          taxRate: 0,
          trackInventory: item.trackInventory,
          unitCost: 0,
          onHandQuantity: parseAmount(item.onHandQuantity),
        }
      : null;

  const lineBase = previewLine ? getLineBase(previewLine) : null;
  const lineDiscount = previewLine ? getLineDiscountAmount(previewLine) : null;
  const lineTotalAfterDiscount = previewLine ? getLineTotal(previewLine) : null;

  const handleOpen = () => {
    if (sellByWeight) {
      onSelectWeight?.(item);
      return;
    }
    setIsModalOpen(true);
  };

  const handleConfirm = () => {
    const quantity = parseQuantityInput(quantityInput);
    if (quantity == null) {
      setError(
        isAr ? "أدخل كمية صالحة أكبر من صفر" : "Enter a valid quantity greater than zero",
      );
      return;
    }

    const unitPrice = parseAmount(priceInput);
    if (priceInput.trim() === "" || unitPrice < 0) {
      setError(isAr ? "أدخل سعراً صالحاً" : "Enter a valid unit price");
      return;
    }

    if (item.trackInventory) {
      const onHand = parseAmount(item.onHandQuantity);
      if (quantity > onHand) {
        setError(
          isAr
            ? `الكمية المتاحة ${onHand}`
            : `Available stock is ${onHand}`,
        );
        return;
      }
    }

    onAdd?.(item, {
      quantity,
      unitPrice,
      ...(discountValue > 0 ? { discountType, discountValue } : {}),
    });
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-white p-2.5 text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        style={{ borderColor: POS_MARKET_THEME.colors.outline }}
      >
        <div className="relative mb-2.5 aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-50">
          {item.itemImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.itemImageUrl}
              alt={item.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <LuPackage className="h-8 w-8 text-slate-200" />
            </div>
          )}
        </div>

        <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-slate-800 arabic-heading">
          {getLocalizedText(item.name, language)}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span
            className="truncate rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{
              backgroundColor: POS_MARKET_THEME.colors.primarySoft,
              color: POS_MARKET_THEME.colors.primary,
            }}
          >
            {item.category || item.code}
          </span>
          <div className="text-end">
            {onHandQuantity != null ? (
              <p
                className="text-[10px] font-bold leading-4"
                style={{
                  color: onHandQuantity > 0 ? POS_MARKET_THEME.colors.textMuted : "#b45309",
                }}
              >
                {isAr ? `على السيارة ${onHandQuantity}` : `On car ${onHandQuantity}`}
              </p>
            ) : null}
            <span className="text-sm font-bold" style={{ color: POS_MARKET_THEME.colors.text }}>
              {formatPrice(item.defaultSalesPrice)} JOD
            </span>
          </div>
        </div>
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={getLocalizedText("Add to cart / أضف إلى السلة", language)}
      >
        <div className="space-y-4 text-sm" style={{ color: POS_MARKET_THEME.colors.text }}>
          <div>
            <div className="text-base font-black arabic-heading">
              {getLocalizedText(item.name, language)}
            </div>
            <div className="mt-1 text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
              {isAr
                ? `السعر الافتراضي: ${formatCurrency(defaultPrice, currencyCode)}`
                : `Default price: ${formatCurrency(defaultPrice, currencyCode)}`}
              {onHandQuantity != null
                ? isAr
                  ? ` · على السيارة: ${onHandQuantity}`
                  : ` · On car: ${onHandQuantity}`
                : null}
            </div>
          </div>

          <div>
            <label
              className="mb-1 block text-xs font-bold"
              style={{ color: POS_MARKET_THEME.colors.textMuted }}
            >
              {isAr ? "الكمية" : "Quantity"}
            </label>
            <input
              type="number"
              min={1}
              step={1}
              autoFocus
              value={quantityInput}
              onChange={(event) => {
                setQuantityInput(event.target.value);
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

          <div>
            <label
              className="mb-1 block text-xs font-bold"
              style={{ color: POS_MARKET_THEME.colors.textMuted }}
            >
              {isAr ? "سعر الوحدة" : "Unit price"}
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={priceInput}
              onChange={(event) => {
                setPriceInput(event.target.value);
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
              onClick={() => setIsModalOpen(false)}
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
      </Modal>
    </>
  );
}
