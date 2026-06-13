"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui";
import { Field, Input } from "@/components/ui/forms";
import { useAuth } from "@/providers/auth-provider";
import { getMarketStockOverview } from "@/lib/api";
import { hasPermission } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import {
  buildBalanceMap,
  locationKey,
  locationLabel,
} from "@/features/pos-market/pos-market-stock-hub-utils";

export function PosMarketStockOverviewWorkspace() {
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const canManage = hasPermission(user, "POS_MARKET_MANAGE_REP_LOADS");

  const [search, setSearch] = useState("");
  const [hideZero, setHideZero] = useState(true);

  const overviewQuery = useQuery({
    queryKey: queryKeys.posMarketStockOverview(token ?? null, search, hideZero),
    queryFn: () => getMarketStockOverview({ search, hideZero }, token),
    enabled: Boolean(token) && canManage,
  });

  const overview = overviewQuery.data;
  const balanceMap = useMemo(() => buildBalanceMap(overview), [overview]);

  if (!canManage) {
    return (
      <Card className="p-4 text-sm text-slate-600">
        {t("posMarket.stockHub.noPermission")}
      </Card>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col bg-slate-50">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[100%] flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/pos-market/stock-hub"
              className="mb-1 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {t("posMarket.stockOverview.backToHub")}
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">
              {t("posMarket.stockHub.overviewTitle")}
            </h1>
            <p className="text-sm text-slate-500">{t("posMarket.stockOverview.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t("posMarket.stockHub.search")} className="min-w-[200px]">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("posMarket.stockHub.searchPlaceholder")}
              />
            </Field>
            <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={hideZero}
                onChange={(event) => setHideZero(event.target.checked)}
              />
              {t("posMarket.stockHub.hideZero")}
            </label>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {overviewQuery.isLoading ? (
          <p className="text-sm text-slate-500">{t("posMarket.stockHub.loading")}</p>
        ) : overviewQuery.isError ? (
          <p className="text-sm text-red-600">{t("posMarket.stockHub.loadError")}</p>
        ) : overview && overview.items.length === 0 ? (
          <p className="text-sm text-slate-500">{t("posMarket.stockHub.empty")}</p>
        ) : overview ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100">
                  <th className="sticky left-0 z-10 bg-slate-100 px-3 py-2.5 text-start font-semibold">
                    {t("posMarket.stockHub.colProduct")}
                  </th>
                  {overview.locations.map((location) => (
                    <th
                      key={locationKey(location)}
                      className="px-3 py-2.5 text-center font-semibold whitespace-nowrap"
                      title={locationLabel(location, t)}
                    >
                      <span className="block text-[10px] uppercase tracking-wide text-slate-500">
                        {location.type === "warehouse" ? "WH" : "REP"}
                      </span>
                      {location.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overview.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium whitespace-nowrap group-hover:bg-slate-50">
                      <span className="font-semibold text-slate-800">{item.code}</span>
                      <span className="mx-1 text-slate-400">—</span>
                      <span className="text-slate-600">{item.name}</span>
                    </td>
                    {overview.locations.map((location) => {
                      const qty =
                        balanceMap.get(`${location.type}:${location.id}:${item.id}`) ?? 0;
                      return (
                        <td
                          key={locationKey(location)}
                          className={`px-3 py-2 text-center tabular-nums ${
                            qty > 0 ? "font-medium text-slate-900" : "text-slate-300"
                          }`}
                        >
                          {qty > 0 ? qty : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
