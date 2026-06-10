"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Card, SectionHeading } from "@/components/ui";
import { Field, Input } from "@/components/ui/forms";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { useAuth } from "@/providers/auth-provider";
import {
  createRepCarStocktake,
  getPosMarketCatalog,
  getPosMarketSalesReps,
  getRepCarStocktake,
  getRepCarStocktakes,
  postRepCarStocktake,
} from "@/lib/api";
import { hasPermission } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import type { CreateRepCarStocktakePayload, RepCarStocktake } from "@/types/api";

type LineDraft = {
  itemId: string;
  code: string;
  name: string;
  unitOfMeasure: string;
  systemQuantity: number;
  countedQuantity: string;
};

function countVariance(line: LineDraft) {
  return Number(line.countedQuantity) - line.systemQuantity;
}

function countLinesWithVariance(lines: RepCarStocktake["lines"]) {
  return lines.filter((line) => Math.abs(line.varianceQuantity) > 0.0001).length;
}

export function PosMarketRepStocktakeWorkspace() {
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const canStocktake = hasPermission(user, "POS_MARKET_REP_STOCKTAKE");

  const [salesRepId, setSalesRepId] = useState("");
  const [stocktakeDate, setStocktakeDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("جرد شهري / Monthly count");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [showVarianceOnly, setShowVarianceOnly] = useState(false);

  const stocktakesQuery = useQuery({
    queryKey: queryKeys.posMarketRepCarStocktakes(token ?? null),
    queryFn: () => getRepCarStocktakes({}, token),
    enabled: Boolean(token),
  });

  const selectedStocktakeQuery = useQuery({
    queryKey: queryKeys.posMarketRepCarStocktake(token ?? null, selectedHistoryId),
    queryFn: () => getRepCarStocktake(selectedHistoryId!, token),
    enabled: Boolean(token && selectedHistoryId),
  });

  const repsQuery = useQuery({
    queryKey: queryKeys.posMarketSalesReps(token ?? null),
    queryFn: () => getPosMarketSalesReps(token),
    enabled: Boolean(token && canStocktake),
  });

  const catalogQuery = useQuery({
    queryKey: queryKeys.posMarketCatalog(token ?? null, salesRepId || null),
    queryFn: () => getPosMarketCatalog(salesRepId, token),
    enabled: Boolean(token && salesRepId),
  });

  const catalogLines = useMemo<LineDraft[]>(() => {
    return (catalogQuery.data ?? [])
      .filter((item) => Number(item.onHandQuantity) > 0)
      .map((item) => ({
        itemId: item.id,
        code: item.code,
        name: item.name,
        unitOfMeasure: item.unitOfMeasure,
        systemQuantity: Number(item.onHandQuantity),
        countedQuantity: String(item.onHandQuantity),
      }));
  }, [catalogQuery.data]);

  const activeLines = lines.length ? lines : catalogLines;

  const visibleDraftLines = useMemo(() => {
    if (!showVarianceOnly) return activeLines;
    return activeLines.filter((line) => Math.abs(countVariance(line)) > 0.0001);
  }, [activeLines, showVarianceOnly]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateRepCarStocktakePayload) => createRepCarStocktake(payload, token),
    onSuccess: (created) => {
      setCreatedId(created.id);
      setMessage(t("posMarket.stocktake.draftCreated"));
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posMarketRepCarStocktakes(token ?? null),
      });
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const postMutation = useMutation({
    mutationFn: (id: string) => postRepCarStocktake(id, token),
    onSuccess: () => {
      setMessage(t("posMarket.stocktake.posted"));
      setCreatedId(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posMarketRepCarStocktakes(token ?? null),
      });
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const selectedStocktake =
    selectedStocktakeQuery.data ??
    (stocktakesQuery.data?.data ?? []).find((row) => row.id === selectedHistoryId) ??
    null;

  if (!canStocktake) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">{t("posMarket.stocktake.noPermission")}</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="p-4">
        <SectionHeading title={t("posMarket.stocktake.historyTitle")} />
        <ul className="mt-4 space-y-2 text-sm">
          {(stocktakesQuery.data?.data ?? []).map((row) => {
            const varianceLineCount = countLinesWithVariance(row.lines);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryId(row.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-start ${
                    selectedHistoryId === row.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="font-semibold">{row.reference}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.salesRep.name} · {row.status} · {row.stocktakeDate.slice(0, 10)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("posMarket.stocktake.varianceLineCount", { count: varianceLineCount })}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="space-y-6">
        <Card className="p-4 space-y-4">
          <SectionHeading title={t("posMarket.stocktake.newTitle")} />
          {message ? <p className="text-sm">{message}</p> : null}
          <div className="grid gap-3 md:grid-cols-3">
            <Field label={t("posMarket.stocktake.salesRep")}>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={salesRepId}
                onChange={(e) => {
                  setSalesRepId(e.target.value);
                  setLines([]);
                }}
              >
                <option value="">—</option>
                {(repsQuery.data ?? []).map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("posMarket.stocktake.date")}>
              <Input type="date" value={stocktakeDate} onChange={(e) => setStocktakeDate(e.target.value)} />
            </Field>
            <Field label={t("posMarket.stocktake.reason")}>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </div>

          {salesRepId ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLines(catalogLines)}
                  disabled={catalogQuery.isLoading}
                >
                  {t("posMarket.stocktake.loadBalances")}
                </Button>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showVarianceOnly}
                    onChange={(e) => setShowVarianceOnly(e.target.checked)}
                  />
                  {t("posMarket.stocktake.showVarianceOnly")}
                </label>
              </div>

              {catalogQuery.isError ? (
                <p className="text-sm text-red-600">{t("posMarket.stocktake.catalogError")}</p>
              ) : visibleDraftLines.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("posMarket.stocktake.noLines")}</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: POS_MARKET_THEME.colors.outline }}>
                  <table className="min-w-full text-sm">
                    <thead style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                      <tr className="border-b" style={{ borderColor: POS_MARKET_THEME.colors.outline }}>
                        <th className="px-3 py-2 text-start">{t("posMarket.stocktake.colCode")}</th>
                        <th className="px-3 py-2 text-start">{t("posMarket.stocktake.colName")}</th>
                        <th className="px-3 py-2 text-end">{t("posMarket.stocktake.colSystem")}</th>
                        <th className="px-3 py-2 text-end">{t("posMarket.stocktake.colCounted")}</th>
                        <th className="px-3 py-2 text-end">{t("posMarket.stocktake.colVariance")}</th>
                        <th className="px-3 py-2 text-start">{t("posMarket.stocktake.colUnit")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDraftLines.map((line) => {
                        const sourceIndex = activeLines.findIndex((row) => row.itemId === line.itemId);
                        const variance = countVariance(line);
                        return (
                          <tr
                            key={line.itemId}
                            className="border-b"
                            style={{ borderColor: POS_MARKET_THEME.colors.outline, color: POS_MARKET_THEME.colors.text }}
                          >
                            <td className="px-3 py-2 font-semibold">{line.code}</td>
                            <td className="px-3 py-2">{line.name}</td>
                            <td className="px-3 py-2 text-end">{line.systemQuantity}</td>
                            <td className="px-3 py-2 text-end">
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                className="w-24 text-end"
                                value={line.countedQuantity}
                                onChange={(e) =>
                                  setLines((current) => {
                                    const base = current.length ? current : catalogLines;
                                    return base.map((row, i) =>
                                      i === sourceIndex
                                        ? { ...row, countedQuantity: e.target.value }
                                        : row,
                                    );
                                  })
                                }
                              />
                            </td>
                            <td
                              className={`px-3 py-2 text-end font-bold ${
                                variance > 0 ? "text-green-700" : variance < 0 ? "text-red-700" : ""
                              }`}
                            >
                              {variance > 0 ? `+${variance}` : variance}
                            </td>
                            <td className="px-3 py-2">{line.unitOfMeasure}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (!salesRepId) return;
                const source = lines.length ? lines : catalogLines;
                const payload: CreateRepCarStocktakePayload = {
                  stocktakeDate,
                  salesRepId,
                  reason,
                  lines: source.map((line) => ({
                    itemId: line.itemId,
                    countedQuantity: line.countedQuantity,
                    unitOfMeasure: line.unitOfMeasure,
                  })),
                };
                createMutation.mutate(payload);
              }}
              disabled={createMutation.isPending || !salesRepId || activeLines.length === 0}
            >
              {t("posMarket.stocktake.saveDraft")}
            </Button>
            {createdId ? (
              <Button onClick={() => postMutation.mutate(createdId)} disabled={postMutation.isPending}>
                {t("posMarket.stocktake.post")}
              </Button>
            ) : null}
          </div>
        </Card>

        {selectedStocktake ? (
          <Card className="overflow-hidden p-0">
            <div className="border-b px-4 py-3" style={{ borderColor: POS_MARKET_THEME.colors.outline }}>
              <h2 className="text-lg font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
                {selectedStocktake.reference} — {selectedStocktake.salesRep.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedStocktake.status} · {selectedStocktake.stocktakeDate.slice(0, 10)} ·{" "}
                {t("posMarket.stocktake.totalVariance", {
                  qty: selectedStocktake.totalVarianceQuantity,
                  amount: selectedStocktake.totalAmount,
                })}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                  <tr className="border-b" style={{ borderColor: POS_MARKET_THEME.colors.outline }}>
                    <th className="px-3 py-2 text-start">{t("posMarket.stocktake.colCode")}</th>
                    <th className="px-3 py-2 text-start">{t("posMarket.stocktake.colName")}</th>
                    <th className="px-3 py-2 text-end">{t("posMarket.stocktake.colSystem")}</th>
                    <th className="px-3 py-2 text-end">{t("posMarket.stocktake.colCounted")}</th>
                    <th className="px-3 py-2 text-end">{t("posMarket.stocktake.colVariance")}</th>
                    <th className="px-3 py-2 text-end">{t("posMarket.stocktake.colValue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStocktake.lines.map((line) => (
                    <tr
                      key={line.id}
                      className="border-b"
                      style={{ borderColor: POS_MARKET_THEME.colors.outline, color: POS_MARKET_THEME.colors.text }}
                    >
                      <td className="px-3 py-2 font-semibold">{line.item.code}</td>
                      <td className="px-3 py-2">{line.item.name}</td>
                      <td className="px-3 py-2 text-end">{line.systemQuantity}</td>
                      <td className="px-3 py-2 text-end">{line.countedQuantity}</td>
                      <td
                        className={`px-3 py-2 text-end font-bold ${
                          line.varianceQuantity > 0
                            ? "text-green-700"
                            : line.varianceQuantity < 0
                              ? "text-red-700"
                              : ""
                        }`}
                      >
                        {line.varianceQuantity > 0
                          ? `+${line.varianceQuantity}`
                          : line.varianceQuantity}
                      </td>
                      <td className="px-3 py-2 text-end">{line.lineTotalAmount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
