"use client";

import { LuMinus, LuPlus, LuTrash2 } from "react-icons/lu";

import {
  formatCurrency,
  getCartLineKey,
  type PosMarketCartLine,
  type PosMarketCartMetrics,
} from "@/features/pos-market/pos-market-cart-utils";
import { formatWeightQuantity } from "@/features/pos-market/pos-market-weight-utils";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { useTranslation } from "@/lib/i18n";
import { getLocalizedText } from "@/lib/utils";

type PosMarketCartPanelProps = {
  lines: PosMarketCartLine[];
  metrics: PosMarketCartMetrics;
  currencyCode?: string;
  canHold?: boolean;
  canVoid?: boolean;
  onUpdateQuantity: (lineKey: string, quantity: number) => void;
  onRemoveLine: (lineKey: string) => void;
  onHold?: () => void;
  onVoid?: () => void;
  onClear: () => void;
  onCheckout: () => void;
  isCheckoutDisabled?: boolean;
  isHoldDisabled?: boolean;
};

export function PosMarketCartPanel({
  lines,
  metrics,
  currencyCode = "JOD",
  canHold,
  canVoid,
  onUpdateQuantity,
  onRemoveLine,
  onHold,
  onVoid,
  onClear,
  onCheckout,
  isCheckoutDisabled,
  isHoldDisabled,
}: PosMarketCartPanelProps) {
  const { t, language } = useTranslation();

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
            const qtyLabel = line.sellByWeight
              ? formatWeightQuantity(line.quantity, line.unit, line.quantityPrecision)
              : String(line.quantity);

            return (
              <div
                key={lineKey}
                className="rounded-xl border p-3"
                style={{
                  borderColor: POS_MARKET_THEME.colors.outline,
                  backgroundColor: POS_MARKET_THEME.colors.primarySoft,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold arabic-heading" style={{ color: POS_MARKET_THEME.colors.text }}>
                      {getLocalizedText(line.name, language)}
                    </p>
                    <p className="text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                      {formatCurrency(line.unitPrice, currencyCode)}
                    </p>
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
                    <span className="text-xs font-semibold" style={{ color: POS_MARKET_THEME.colors.primary }}>
                      {qtyLabel}
                    </span>
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
                  <span className="text-sm font-bold" style={{ color: POS_MARKET_THEME.colors.text }}>
                    {formatCurrency(line.quantity * line.unitPrice, currencyCode)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        className="space-y-3 border-t p-4"
        style={{ borderColor: POS_MARKET_THEME.colors.outline }}
      >
        <div className="space-y-1 text-sm">
          <div className="flex justify-between" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
            <span>{t("pos.review.subtotal")}</span>
            <span>{formatCurrency(metrics.subtotalBeforeDiscount, currencyCode)}</span>
          </div>
          {metrics.discountTotal > 0 ? (
            <div className="flex justify-between" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
              <span>{t("pos.review.discount")}</span>
              <span>-{formatCurrency(metrics.discountTotal, currencyCode)}</span>
            </div>
          ) : null}
          <div className="flex justify-between" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
            <span>{t("pos.review.tax")}</span>
            <span>{formatCurrency(metrics.tax, currencyCode)}</span>
          </div>
          <div className="flex justify-between text-base font-bold" style={{ color: POS_MARKET_THEME.colors.text }}>
            <span>{t("posMarket.cart.total")}</span>
            <span>{formatCurrency(metrics.total, currencyCode)}</span>
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
