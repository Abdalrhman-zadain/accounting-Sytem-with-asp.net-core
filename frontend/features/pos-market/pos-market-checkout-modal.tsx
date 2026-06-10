"use client";

import { Modal } from "@/components/ui";
import { Input } from "@/components/ui/forms";
import {
  formatCurrency,
  getPaymentMethodLabel,
  type PosMarketCartMetrics,
  type PosMarketPaymentEntry,
} from "@/features/pos-market/pos-market-cart-utils";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { useTranslation } from "@/lib/i18n";

const PAYMENT_METHODS: PosMarketPaymentEntry["paymentMethod"][] = [
  "CASH",
  "CARD",
  "CLIQ",
  "BANK_TRANSFER",
  "WALLET",
];

type PosMarketCheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  metrics: PosMarketCartMetrics;
  paymentEntry: PosMarketPaymentEntry | null;
  currencyCode?: string;
  isPending?: boolean;
  allowCreditSale?: boolean;
  hasDestinationMarket?: boolean;
  onPaymentMethodChange: (method: PosMarketPaymentEntry["paymentMethod"]) => void;
  onAmountChange: (amount: string) => void;
  onComplete: () => void;
  onPayLater: () => void;
};

export function PosMarketCheckoutModal({
  isOpen,
  onClose,
  metrics,
  paymentEntry,
  currencyCode = "JOD",
  isPending,
  allowCreditSale = false,
  hasDestinationMarket = false,
  onPaymentMethodChange,
  onAmountChange,
  onComplete,
  onPayLater,
}: PosMarketCheckoutModalProps) {
  const { t } = useTranslation();
  const canCompleteWithCredit =
    allowCreditSale && hasDestinationMarket && metrics.total > 0;
  const canComplete =
    metrics.total > 0 &&
    (metrics.amountDue <= 0.009 || canCompleteWithCredit) &&
    (metrics.paid > 0 || canCompleteWithCredit);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("posMarket.checkout.title")}>
      <div className="space-y-4">
        <div
          className="rounded-2xl border p-4"
          style={{
            borderColor: POS_MARKET_THEME.colors.outline,
            backgroundColor: POS_MARKET_THEME.colors.primarySoft,
          }}
        >
          <div className="flex items-center justify-between text-lg font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
            <span>{t("posMarket.cart.total")}</span>
            <span>{formatCurrency(metrics.total, currencyCode)}</span>
          </div>
          {metrics.amountDue > 0.009 ? (
            <p className="mt-2 text-sm font-semibold" style={{ color: POS_MARKET_THEME.colors.primary }}>
              {t("posMarket.checkout.amountDue")}: {formatCurrency(metrics.amountDue, currencyCode)}
            </p>
          ) : null}
          {metrics.change > 0 ? (
            <p className="mt-2 text-sm font-semibold" style={{ color: POS_MARKET_THEME.colors.primary }}>
              {t("pos.review.change")}: {formatCurrency(metrics.change, currencyCode)}
            </p>
          ) : null}
        </div>

        {allowCreditSale ? (
          <div
            className="rounded-xl border px-4 py-3 text-xs font-semibold"
            style={{
              borderColor: POS_MARKET_THEME.colors.outline,
              backgroundColor: POS_MARKET_THEME.colors.cardSurface,
              color: POS_MARKET_THEME.colors.textMuted,
            }}
          >
            {t("posMarket.checkout.creditHint")}
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
            {t("posMarket.checkout.paymentMethod")}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => onPaymentMethodChange(method)}
                className="rounded-xl border px-3 py-2.5 text-xs font-bold transition"
                style={
                  paymentEntry?.paymentMethod === method
                    ? {
                        borderColor: POS_MARKET_THEME.colors.primary,
                        backgroundColor: POS_MARKET_THEME.colors.primarySoft,
                        color: POS_MARKET_THEME.colors.primary,
                      }
                    : {
                        borderColor: POS_MARKET_THEME.colors.outline,
                        color: POS_MARKET_THEME.colors.text,
                      }
                }
              >
                {getPaymentMethodLabel(method)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
            {t("posMarket.checkout.amountTendered")}
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={paymentEntry?.amount ?? ""}
            onChange={(event) => onAmountChange(event.target.value)}
            className="rounded-xl py-3"
            style={{
              borderColor: POS_MARKET_THEME.colors.outline,
            }}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {canCompleteWithCredit ? (
            <button
              type="button"
              onClick={onPayLater}
              disabled={isPending}
              className="w-full rounded-xl border px-4 py-3 text-sm font-black disabled:opacity-50"
              style={{
                borderColor: POS_MARKET_THEME.colors.primary,
                color: POS_MARKET_THEME.colors.primary,
                backgroundColor: POS_MARKET_THEME.colors.cardSurface,
              }}
            >
              {isPending ? t("posMarket.checkout.processing") : t("posMarket.checkout.payLater")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onComplete}
            disabled={isPending || !canComplete}
            className="w-full rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-50 sm:col-span-1"
            style={{
              backgroundColor: POS_MARKET_THEME.colors.primary,
              gridColumn: canCompleteWithCredit ? undefined : "1 / -1",
            }}
          >
            {isPending ? t("posMarket.checkout.processing") : t("posMarket.checkout.complete")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
