"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Card } from "@/components/ui";
import { Field, Input } from "@/components/ui/forms";
import {
  formatCurrency,
  getErrorMessage,
  parseAmount,
} from "@/features/pos-market/pos-market-cart-utils";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { createPosMarketReturn, getCompletedPosMarketSales, getPosMarketReturns } from "@/lib/api";
import { hasPermission } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { getLocalizedText } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
        {label}
      </div>
      <div className="text-sm font-bold" style={{ color: POS_MARKET_THEME.colors.text }}>
        {value}
      </div>
    </div>
  );
}

export function PosMarketReturnsWorkspace() {
  const { token, user } = useAuth();
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const completedQuery = useQuery({
    queryKey: queryKeys.posMarketCompletedSales(token ?? null),
    queryFn: () => getCompletedPosMarketSales(token),
    enabled: Boolean(token),
  });

  const returnsQuery = useQuery({
    queryKey: queryKeys.posMarketReturns(token ?? null),
    queryFn: () => getPosMarketReturns(token),
    enabled: Boolean(token),
  });

  const selectedSale =
    (completedQuery.data ?? []).find((sale) => sale.id === selectedSaleId) ?? null;

  const returnPreview = useMemo(() => {
    if (!selectedSale) return { totalAmount: 0, selectedLineCount: 0 };
    return selectedSale.lines.reduce(
      (summary, line) => {
        const quantity = parseAmount(returnQuantities[line.id]);
        if (quantity <= 0) return summary;
        const soldQuantity = parseAmount(line.quantity);
        const ratio = soldQuantity > 0 ? Math.min(quantity, soldQuantity) / soldQuantity : 0;
        summary.selectedLineCount += 1;
        summary.totalAmount += parseAmount(line.lineAmount) * ratio;
        return summary;
      },
      { totalAmount: 0, selectedLineCount: 0 },
    );
  }, [returnQuantities, selectedSale]);

  const createReturnMutation = useMutation({
    mutationFn: () => {
      if (!selectedSale) throw new Error("No sale selected");
      const lines = selectedSale.lines
        .map((line) => ({
          salesInvoiceLineId: line.id,
          quantity: parseAmount(returnQuantities[line.id]),
        }))
        .filter((line) => line.quantity > 0);

      const cashAccountId = selectedSale.payments[0]?.bankCashAccount?.id;
      if (!cashAccountId) throw new Error(t("posMarket.returns.noPaymentAccount"));

      return createPosMarketReturn(
        {
          salesInvoiceId: selectedSale.id,
          sessionId: selectedSale.session?.id,
          reason: returnReason || undefined,
          lines,
          payments: [
            {
              refundMethod: "CASH",
              bankCashAccountId: cashAccountId,
              amount: Number(returnPreview.totalAmount.toFixed(2)),
            },
          ],
        },
        token,
      );
    },
    onSuccess: () => {
      setSelectedSaleId("");
      setReturnReason("");
      setReturnQuantities({});
      setMessage(t("posMarket.returns.success"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketReturns(token ?? null) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketCompletedSales(token ?? null) });
    },
    onError: (error) => {
      setMessage(getErrorMessage(error, t("posMarket.returns.error")));
    },
  });

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border border-[#d5deea] p-6">
        <div className="text-2xl font-black arabic-heading" style={{ color: POS_MARKET_THEME.colors.text }}>
          {t("posMarket.workspace.returns")}
        </div>
        <p className="mt-2 text-sm arabic-auto" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {t("pos.returns.description")}
        </p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="rounded-[28px] border border-[#d5deea] p-6">
          <div className="text-lg font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
            {t("pos.returns.createTitle")}
          </div>
          <div className="mt-4 space-y-4">
            <Field label={t("pos.returns.originalSaleLabel")} className="mb-0">
              <select
                value={selectedSaleId}
                onChange={(event) => {
                  setSelectedSaleId(event.target.value);
                  setReturnQuantities({});
                }}
                className="w-full rounded-[18px] border px-4 py-3 text-sm font-semibold"
                style={{ borderColor: POS_MARKET_THEME.colors.outline }}
              >
                <option value="">{t("pos.returns.selectSalePlaceholder")}</option>
                {(completedQuery.data ?? []).map((sale) => (
                  <option key={sale.id} value={sale.id}>
                    {sale.reference} · {sale.totalAmount} {sale.currencyCode}
                  </option>
                ))}
              </select>
            </Field>

            {selectedSale ? (
              <>
                <div
                  className="rounded-[20px] border p-4"
                  style={{ borderColor: POS_MARKET_THEME.colors.outline, backgroundColor: POS_MARKET_THEME.colors.primarySoft }}
                >
                  <div className="grid gap-2 md:grid-cols-2">
                    <DetailTile label={t("pos.returns.receiptLabel")} value={selectedSale.receiptNumber ?? "—"} />
                    <DetailTile label={t("pos.returns.sessionLabel")} value={selectedSale.session?.sessionNumber ?? "—"} />
                    <DetailTile label={t("pos.returns.warehouseLabel")} value={selectedSale.session?.warehouse?.name ?? "—"} />
                    <DetailTile label={t("pos.returns.invoiceTotalLabel")} value={selectedSale.totalAmount} />
                  </div>
                </div>

                <Field label={t("pos.returns.reasonLabel")} className="mb-0">
                  <Input
                    value={returnReason}
                    onChange={(event) => setReturnReason(event.target.value)}
                    placeholder={t("pos.returns.reasonPlaceholder")}
                    className="rounded-[18px] py-3"
                  />
                </Field>

                <div className="space-y-3">
                  {selectedSale.lines.map((line) => {
                    const soldQuantity = parseAmount(line.quantity);
                    return (
                      <div
                        key={line.id}
                        className="grid gap-3 rounded-[20px] border p-4 lg:grid-cols-[minmax(0,1fr)_140px]"
                        style={{ borderColor: POS_MARKET_THEME.colors.outline }}
                      >
                        <div>
                          <div className="font-bold" style={{ color: POS_MARKET_THEME.colors.text }}>
                            {getLocalizedText(line.itemName ?? line.description ?? "", language)}
                          </div>
                          <div className="text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                            {t("posMarket.returns.soldQty", { qty: soldQuantity })}
                          </div>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          max={soldQuantity}
                          step="any"
                          value={returnQuantities[line.id] ?? ""}
                          onChange={(event) =>
                            setReturnQuantities((current) => ({
                              ...current,
                              [line.id]: event.target.value,
                            }))
                          }
                          className="rounded-xl py-2"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl border p-3 text-sm font-bold" style={{ borderColor: POS_MARKET_THEME.colors.outline }}>
                  {t("posMarket.returns.preview", {
                    count: returnPreview.selectedLineCount,
                    amount: formatCurrency(returnPreview.totalAmount),
                  })}
                </div>

                <button
                  type="button"
                  disabled={
                    !hasPermission(user, "POS_VIEW_COMPLETED_SALES") ||
                    createReturnMutation.isPending ||
                    returnPreview.selectedLineCount === 0
                  }
                  onClick={() => createReturnMutation.mutate()}
                  className="w-full rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                  style={{ backgroundColor: POS_MARKET_THEME.colors.primary }}
                >
                  {createReturnMutation.isPending ? t("posMarket.returns.processing") : t("posMarket.returns.submit")}
                </button>
              </>
            ) : null}

            {message ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {message}
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="rounded-[28px] border border-[#d5deea] p-6">
          <div className="text-lg font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
            {t("posMarket.returns.recent")}
          </div>
          <div className="mt-4 space-y-3">
            {(returnsQuery.data ?? []).slice(0, 12).map((row) => (
              <div
                key={row.id}
                className="rounded-xl border p-3"
                style={{ borderColor: POS_MARKET_THEME.colors.outline }}
              >
                <div className="font-bold" style={{ color: POS_MARKET_THEME.colors.text }}>
                  {row.reference}
                </div>
                <div className="text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                  {row.totalAmount} · {row.status}
                </div>
              </div>
            ))}
            {(returnsQuery.data ?? []).length === 0 ? (
              <p className="text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                {t("posMarket.returns.empty")}
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
