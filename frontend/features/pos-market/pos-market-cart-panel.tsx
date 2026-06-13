"use client";

import React from "react";
import { LuMinus, LuPlus, LuTrash2 } from "react-icons/lu";

import {
  formatCurrency,
  getCartLineKey,
  getLineTotal,
  type DiscountType,
  type PosMarketCartLine,
  type PosMarketCartMetrics,
} from "@/features/pos-market/pos-market-cart-utils";
import {
  formatWeightQuantity,
  getWeightQuantityStep,
  parseWeightInput,
} from "@/features/pos-market/pos-market-weight-utils";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { useTranslation } from "@/lib/i18n";
import { getLocalizedText } from "@/lib/utils";

type PosMarketCartPanelProps = {
  lines: PosMarketCartLine[];
  metrics: PosMarketCartMetrics;
  currencyCode?: string;
  canHold?: boolean;
  canVoid?: boolean;
  canEditDiscount?: boolean;
  invoiceDiscountType: DiscountType;
  invoiceDiscountValue: number;
  setInvoiceDiscountType: (type: DiscountType) => void;
  setInvoiceDiscountValue: (value: number) => void;
  onUpdateQuantity: (lineKey: string, quantity: number) => void;
  onUpdateLineDiscount: (lineKey: string, discountType: DiscountType, discountValue: number) => void;
  onUpdateLineWeight: (lineKey: string, weight: number) => string | null;
  onRemoveLine: (lineKey: string) => void;
  onHold?: () => void;
  onVoid?: () => void;
  onClear: () => void;
  onCheckout: () => void;
  isCheckoutDisabled?: boolean;
  isHoldDisabled?: boolean;
};

function CartLineRow({
  line,
  lineKey,
  currencyCode,
  canEditDiscount,
  onUpdateQuantity,
  onUpdateLineDiscount,
  onUpdateLineWeight,
  onRemoveLine,
}: {
  line: PosMarketCartLine;
  lineKey: string;
  currencyCode: string;
  canEditDiscount?: boolean;
  onUpdateQuantity: (lineKey: string, quantity: number) => void;
  onUpdateLineDiscount: (lineKey: string, discountType: DiscountType, discountValue: number) => void;
  onUpdateLineWeight: (lineKey: string, weight: number) => string | null;
  onRemoveLine: (lineKey: string) => void;
}) {
  const { t, language } = useTranslation();
  const [isEditingDiscount, setIsEditingDiscount] = React.useState(false);
  const [isEditingWeight, setIsEditingWeight] = React.useState(false);
  const [weightDraft, setWeightDraft] = React.useState("");
  const weightPrecision = line.quantityPrecision ?? 3;
  const weightStep = getWeightQuantityStep(weightPrecision);
  const lineTotal = getLineTotal(line);
  const unitPriceDisplay = line.sellByWeight
    ? (line.baseUnitPrice ?? line.unitPrice)
    : line.unitPrice;
  const hasDiscount = line.discountValue > 0;

  const qtyLabel = line.sellByWeight
    ? formatWeightQuantity(line.quantity, line.unit, weightPrecision)
    : String(line.quantity);

  return (
    <div
      className="rounded-xl border p-3"
      style={{
        borderColor: POS_MARKET_THEME.colors.outline,
        backgroundColor: POS_MARKET_THEME.colors.primarySoft,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className="truncate text-sm font-semibold arabic-heading"
            style={{ color: POS_MARKET_THEME.colors.text }}
          >
            {getLocalizedText(line.name, language)}
          </p>
          <p className="text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
            {formatCurrency(unitPriceDisplay, currencyCode)}
            {line.sellByWeight ? ` / ${line.unit}` : null}
          </p>
          {hasDiscount ? (
            <span className="mt-0.5 inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              −
              {line.discountType === "PERCENT"
                ? `${line.discountValue}%`
                : formatCurrency(line.discountValue, currencyCode)}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onRemoveLine(lineKey)}
          className="rounded-lg p-1.5 text-red-500 hover:bg-white"
        >
          <LuTrash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        {line.sellByWeight ? (
          isEditingWeight ? (
            <input
              type="number"
              min={weightStep}
              step={weightStep}
              autoFocus
              value={weightDraft}
              onBlur={() => {
                const precision = line.quantityPrecision ?? 3;
                const next = parseWeightInput(weightDraft, precision);
                if (next != null && next > 0) {
                  onUpdateLineWeight(lineKey, next);
                }
                setIsEditingWeight(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const precision = line.quantityPrecision ?? 3;
                  const next = parseWeightInput(weightDraft, precision);
                  if (next != null && next > 0) {
                    onUpdateLineWeight(lineKey, next);
                  }
                  setIsEditingWeight(false);
                }
              }}
              onChange={(event) => setWeightDraft(event.target.value)}
              className="w-20 rounded-lg border bg-white px-2 py-1 text-xs font-bold"
              style={{ borderColor: POS_MARKET_THEME.colors.outline }}
              dir="ltr"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setWeightDraft(String(line.quantity));
                setIsEditingWeight(true);
              }}
              className="text-xs font-semibold hover:underline"
              style={{ color: POS_MARKET_THEME.colors.primary }}
            >
              {qtyLabel}
            </button>
          )
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdateQuantity(lineKey, line.quantity - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border bg-white"
              style={{ borderColor: POS_MARKET_THEME.colors.outline }}
            >
              <LuMinus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[2rem] text-center text-sm font-bold">{line.quantity}</span>
            <button
              type="button"
              onClick={() => onUpdateQuantity(lineKey, line.quantity + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border bg-white"
              style={{ borderColor: POS_MARKET_THEME.colors.outline }}
            >
              <LuPlus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <span className="text-sm font-bold" style={{ color: POS_MARKET_THEME.colors.text }} dir="ltr">
          {formatCurrency(lineTotal, currencyCode)}
        </span>
      </div>

      {canEditDiscount ? (
        <div className="mt-2">
          {!isEditingDiscount && !hasDiscount ? (
            <button
              type="button"
              onClick={() => setIsEditingDiscount(true)}
              className="text-[10px] font-semibold hover:underline"
              style={{ color: POS_MARKET_THEME.colors.primary }}
            >
              + {t("posMarket.discount.editDiscount")}
            </button>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                  {t("posMarket.discount.repDiscount")}
                </span>
                {!hasDiscount ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingDiscount(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateLineDiscount(
                      lineKey,
                      line.discountType === "FIXED" ? "PERCENT" : "FIXED",
                      line.discountValue,
                    )
                  }
                  className="rounded-lg border bg-white px-2 py-1 text-[10px] font-semibold"
                  style={{ borderColor: POS_MARKET_THEME.colors.outline }}
                >
                  {line.discountType === "FIXED"
                    ? t("posMarket.discount.fixed")
                    : t("posMarket.discount.percent")}
                </button>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.discountValue === 0 ? "" : line.discountValue}
                  onChange={(event) =>
                    onUpdateLineDiscount(
                      lineKey,
                      line.discountType,
                      Math.max(0, Number(event.target.value) || 0),
                    )
                  }
                  className="min-w-0 flex-1 rounded-lg border bg-white px-2 py-1 text-xs font-semibold"
                  style={{ borderColor: POS_MARKET_THEME.colors.outline }}
                  placeholder="0"
                  dir="ltr"
                />
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function PosMarketCartPanel({
  lines,
  metrics,
  currencyCode = "JOD",
  canHold,
  canVoid,
  canEditDiscount,
  invoiceDiscountType,
  invoiceDiscountValue,
  setInvoiceDiscountType,
  setInvoiceDiscountValue,
  onUpdateQuantity,
  onUpdateLineDiscount,
  onUpdateLineWeight,
  onRemoveLine,
  onHold,
  onVoid,
  onClear,
  onCheckout,
  isCheckoutDisabled,
  isHoldDisabled,
}: PosMarketCartPanelProps) {
  const { t } = useTranslation();
  const [isInvoiceDiscountOpen, setIsInvoiceDiscountOpen] = React.useState(false);

  return (
    <div
      className="flex h-full flex-col rounded-2xl border shadow-sm"
      style={{
        borderColor: POS_MARKET_THEME.colors.outline,
        backgroundColor: POS_MARKET_THEME.colors.cardSurface,
      }}
    >
      <div
        className="border-b px-4 py-3"
        style={{ borderColor: POS_MARKET_THEME.colors.outline }}
      >
        <h3 className="text-sm font-bold" style={{ color: POS_MARKET_THEME.colors.text }}>
          {t("posMarket.cart.title")}
        </h3>
        <p className="text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {t("posMarket.cart.linesCount", { count: lines.length })}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {lines.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
            {t("posMarket.cart.empty")}
          </p>
        ) : (
          lines.map((line) => {
            const lineKey = getCartLineKey(line);
            return (
              <CartLineRow
                key={lineKey}
                line={line}
                lineKey={lineKey}
                currencyCode={currencyCode}
                canEditDiscount={canEditDiscount}
                onUpdateQuantity={onUpdateQuantity}
                onUpdateLineDiscount={onUpdateLineDiscount}
                onUpdateLineWeight={onUpdateLineWeight}
                onRemoveLine={onRemoveLine}
              />
            );
          })
        )}

        {canEditDiscount && lines.length > 0 ? (
          <div
            className="rounded-xl border p-3"
            style={{ borderColor: POS_MARKET_THEME.colors.outline }}
          >
            {!isInvoiceDiscountOpen && invoiceDiscountValue === 0 ? (
              <button
                type="button"
                onClick={() => setIsInvoiceDiscountOpen(true)}
                className="flex w-full items-center justify-end gap-1 text-[11px] font-semibold hover:underline"
                style={{ color: POS_MARKET_THEME.colors.primary }}
              >
                <LuPlus className="h-3 w-3" />
                {t("posMarket.discount.addInvoiceDiscount")}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                    {t("posMarket.discount.invoiceDiscount")}
                  </span>
                  {invoiceDiscountValue === 0 ? (
                    <button
                      type="button"
                      onClick={() => setIsInvoiceDiscountOpen(false)}
                      className="text-[10px] text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setInvoiceDiscountType(invoiceDiscountType === "FIXED" ? "PERCENT" : "FIXED")
                    }
                    className="rounded-lg border bg-white px-2 py-1.5 text-[10px] font-semibold"
                    style={{ borderColor: POS_MARKET_THEME.colors.outline }}
                  >
                    {invoiceDiscountType === "FIXED"
                      ? t("posMarket.discount.fixed")
                      : t("posMarket.discount.percent")}
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoiceDiscountValue === 0 ? "" : invoiceDiscountValue}
                    onChange={(event) =>
                      setInvoiceDiscountValue(Math.max(0, Number(event.target.value) || 0))
                    }
                    className="min-w-0 flex-1 rounded-lg border bg-white px-2 py-1.5 text-xs font-semibold"
                    style={{ borderColor: POS_MARKET_THEME.colors.outline }}
                    placeholder="0"
                    dir="ltr"
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div
        className="space-y-3 border-t p-4"
        style={{ borderColor: POS_MARKET_THEME.colors.outline }}
      >
        <div className="space-y-1 text-sm">
          <div className="flex justify-between" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
            <span>{t("pos.review.subtotal")}</span>
            <span dir="ltr">{formatCurrency(metrics.subtotalBeforeDiscount, currencyCode)}</span>
          </div>
          {metrics.lineDiscountTotal > 0 ? (
            <div className="flex justify-between" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
              <span>{t("posMarket.discount.lineDiscount")}</span>
              <span dir="ltr">-{formatCurrency(metrics.lineDiscountTotal, currencyCode)}</span>
            </div>
          ) : null}
          {metrics.invoiceDiscount > 0 ? (
            <div className="flex justify-between" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
              <span>{t("posMarket.discount.invoiceDiscount")}</span>
              <span dir="ltr">-{formatCurrency(metrics.invoiceDiscount, currencyCode)}</span>
            </div>
          ) : null}
          {metrics.discountTotal > 0 ? (
            <div className="flex justify-between font-semibold text-emerald-700">
              <span>{t("posMarket.discount.repDiscount")}</span>
              <span dir="ltr">-{formatCurrency(metrics.discountTotal, currencyCode)}</span>
            </div>
          ) : null}
          <div className="flex justify-between" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
            <span>{t("pos.review.tax")}</span>
            <span dir="ltr">{formatCurrency(metrics.tax, currencyCode)}</span>
          </div>
          <div className="flex justify-between text-base font-bold" style={{ color: POS_MARKET_THEME.colors.text }}>
            <span>{t("posMarket.cart.total")}</span>
            <span dir="ltr">{formatCurrency(metrics.total, currencyCode)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {canHold ? (
            <button
              type="button"
              onClick={onHold}
              disabled={lines.length === 0 || isHoldDisabled}
              className="rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-50"
              style={{ borderColor: POS_MARKET_THEME.colors.outline, color: POS_MARKET_THEME.colors.primary }}
            >
              {t("posMarket.cart.hold")}
            </button>
          ) : null}
          {canVoid && onVoid ? (
            <button
              type="button"
              onClick={onVoid}
              disabled={lines.length === 0}
              className="rounded-xl border px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50"
              style={{ borderColor: "#f0d9d6" }}
            >
              {t("pos.sales.voidAction")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClear}
            disabled={lines.length === 0}
            className="rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-50"
            style={{ borderColor: POS_MARKET_THEME.colors.outline, color: POS_MARKET_THEME.colors.textMuted }}
          >
            {t("posMarket.cart.clear")}
          </button>
          <button
            type="button"
            onClick={onCheckout}
            disabled={isCheckoutDisabled || lines.length === 0}
            title={
              isCheckoutDisabled && lines.length > 0
                ? t("posMarket.destination.requiredHint")
                : undefined
            }
            className="col-span-2 rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            style={{ backgroundColor: POS_MARKET_THEME.colors.primary }}
          >
            {t("posMarket.checkout.pay")}
          </button>
        </div>
      </div>
    </div>
  );
}
