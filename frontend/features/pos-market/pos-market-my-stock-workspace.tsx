"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui";
import { formatCurrency } from "@/features/pos-market/pos-market-cart-utils";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { getRepCarStock, getRepCarStockMovements } from "@/lib/api";
import { isMarketRepUser } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: POS_MARKET_THEME.colors.outline,
        backgroundColor: POS_MARKET_THEME.colors.cardSurface,
      }}
    >
      <div className="text-xs font-bold uppercase tracking-wide" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
        {label}
      </div>
      <div className="mt-2 text-2xl font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
        {value}
      </div>
    </div>
  );
}

export function PosMarketMyStockWorkspace() {
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const salesRepId = user?.salesRepId ?? null;

  const stockQuery = useQuery({
    queryKey: queryKeys.posMarketRepCarStock(token ?? null, salesRepId),
    queryFn: () => getRepCarStock(salesRepId!, token),
    enabled: Boolean(token && salesRepId),
  });

  const movementsQuery = useQuery({
    queryKey: queryKeys.posMarketRepCarStockMovements(token ?? null, salesRepId),
    queryFn: () => getRepCarStockMovements({ salesRepId: salesRepId!, limit: 15 }, token),
    enabled: Boolean(token && salesRepId),
  });

  const balances = stockQuery.data ?? [];

  const summary = useMemo(() => {
    const skuCount = balances.length;
    const totalQty = balances.reduce((sum, row) => sum + row.onHandQuantity, 0);
    const totalValue = balances.reduce((sum, row) => sum + row.valuationAmount, 0);
    return { skuCount, totalQty, totalValue };
  }, [balances]);

  if (!isMarketRepUser(user)) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{t("posMarket.myStock.repOnly")}</p>
      </Card>
    );
  }

  if (!salesRepId) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{t("posMarket.myStock.noRepLink")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile label={t("posMarket.myStock.skuCount")} value={String(summary.skuCount)} />
        <SummaryTile label={t("posMarket.myStock.totalQty")} value={summary.totalQty.toFixed(2)} />
        <SummaryTile
          label={t("posMarket.myStock.totalValue")}
          value={formatCurrency(summary.totalValue)}
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b px-4 py-3" style={{ borderColor: POS_MARKET_THEME.colors.outline }}>
          <h2 className="text-lg font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
            {t("posMarket.myStock.onCarTitle")}
          </h2>
        </div>
        {stockQuery.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">{t("posMarket.myStock.loading")}</p>
        ) : stockQuery.isError ? (
          <p className="p-4 text-sm text-red-600">{t("posMarket.myStock.error")}</p>
        ) : balances.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t("posMarket.myStock.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                <tr className="border-b" style={{ borderColor: POS_MARKET_THEME.colors.outline }}>
                  <th className="px-4 py-2 text-start">{t("posMarket.myStock.colCode")}</th>
                  <th className="px-4 py-2 text-start">{t("posMarket.myStock.colName")}</th>
                  <th className="px-4 py-2 text-end">{t("posMarket.myStock.colOnHand")}</th>
                  <th className="px-4 py-2 text-start">{t("posMarket.myStock.colUnit")}</th>
                  <th className="px-4 py-2 text-end">{t("posMarket.myStock.colValue")}</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((row) => (
                  <tr
                    key={row.itemId}
                    className="border-b"
                    style={{ borderColor: POS_MARKET_THEME.colors.outline, color: POS_MARKET_THEME.colors.text }}
                  >
                    <td className="px-4 py-2 font-semibold">{row.item.code}</td>
                    <td className="px-4 py-2">{row.item.name}</td>
                    <td className="px-4 py-2 text-end font-bold">{row.onHandQuantity}</td>
                    <td className="px-4 py-2">{row.item.unitOfMeasure}</td>
                    <td className="px-4 py-2 text-end">{formatCurrency(row.valuationAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b px-4 py-3" style={{ borderColor: POS_MARKET_THEME.colors.outline }}>
          <h2 className="text-lg font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
            {t("posMarket.myStock.recentMovements")}
          </h2>
        </div>
        {movementsQuery.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">{t("posMarket.myStock.loading")}</p>
        ) : (movementsQuery.data?.data ?? []).length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t("posMarket.myStock.noMovements")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                <tr className="border-b" style={{ borderColor: POS_MARKET_THEME.colors.outline }}>
                  <th className="px-4 py-2 text-start">{t("posMarket.myStock.colDate")}</th>
                  <th className="px-4 py-2 text-start">{t("posMarket.myStock.colType")}</th>
                  <th className="px-4 py-2 text-start">{t("posMarket.myStock.colProduct")}</th>
                  <th className="px-4 py-2 text-start">{t("posMarket.myStock.colReference")}</th>
                  <th className="px-4 py-2 text-end">{t("posMarket.myStock.colQtyIn")}</th>
                  <th className="px-4 py-2 text-end">{t("posMarket.myStock.colQtyOut")}</th>
                </tr>
              </thead>
              <tbody>
                {(movementsQuery.data?.data ?? []).map((row) => (
                  <tr
                    key={row.id}
                    className="border-b"
                    style={{ borderColor: POS_MARKET_THEME.colors.outline, color: POS_MARKET_THEME.colors.text }}
                  >
                    <td className="px-4 py-2">{row.transactionDate.slice(0, 10)}</td>
                    <td className="px-4 py-2">{row.movementType}</td>
                    <td className="px-4 py-2">{row.item.code}</td>
                    <td className="px-4 py-2">{row.transactionReference}</td>
                    <td className="px-4 py-2 text-end text-green-700">
                      {row.quantityIn > 0 ? row.quantityIn : "—"}
                    </td>
                    <td className="px-4 py-2 text-end text-red-700">
                      {row.quantityOut > 0 ? row.quantityOut : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
