"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Card, SectionHeading } from "@/components/ui";
import { Field, Input } from "@/components/ui/forms";
import { getErrorMessage } from "@/features/pos-market/pos-market-cart-utils";
import { useAuth } from "@/providers/auth-provider";
import {
  cancelRepCarTransfer,
  createRepCarTransfer,
  getPosMarketSalesReps,
  getRepCarStock,
  getRepCarTransfer,
  getRepCarTransfers,
  postRepCarTransfer,
  reverseRepCarTransfer,
} from "@/lib/api";
import { useTranslation, type TranslationKey } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import type { CreateRepCarTransferPayload, RepCarStockBalance, RepCarTransfer } from "@/types/api";

type LineDraft = {
  itemId: string;
  quantity: string;
  unitOfMeasure: string;
};

type RepTransferStockIssue = {
  itemId: string;
  code: string;
  onHand: number;
  requested: number;
  shortage: number;
};

function findRepTransferStockIssues(
  lines: Array<{ itemId: string; quantity: string }>,
  balances: RepCarStockBalance[],
): RepTransferStockIssue[] {
  const onHandByItem = new Map(balances.map((row) => [row.itemId, row.onHandQuantity]));
  const issues: RepTransferStockIssue[] = [];

  for (const line of lines) {
    if (!line.itemId) continue;
    const requested = Number(line.quantity);
    if (!Number.isFinite(requested) || requested <= 0) continue;
    const onHand = onHandByItem.get(line.itemId) ?? 0;
    if (requested > onHand) {
      const balance = balances.find((row) => row.itemId === line.itemId);
      issues.push({
        itemId: line.itemId,
        code: balance?.item.code ?? line.itemId,
        onHand,
        requested,
        shortage: requested - onHand,
      });
    }
  }

  return issues;
}

function StockIssueSummary({
  issues,
  t,
}: {
  issues: RepTransferStockIssue[];
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  if (issues.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
      <p className="font-semibold">
        {t("posMarket.repTransfers.stockSummaryTitle", { count: issues.length })}
      </p>
      <ul className="mt-1 space-y-0.5 text-xs">
        {issues.map((issue) => (
          <li key={issue.itemId}>
            {t("posMarket.repTransfers.stockSummaryLine", {
              code: issue.code,
              onHand: issue.onHand,
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PosMarketRepTransferWorkspace() {
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const canManage =
    user?.role === "ADMIN" || user?.role === "MANAGER";

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fromSalesRepId, setFromSalesRepId] = useState("");
  const [toSalesRepId, setToSalesRepId] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ itemId: "", quantity: "1", unitOfMeasure: "EA" }]);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  const pushMessage = (text: string, tone: "success" | "error" = "success") => {
    setMessage(text);
    setMessageTone(tone);
  };

  const transfersQuery = useQuery({
    queryKey: queryKeys.posMarketRepCarTransfers(token ?? null),
    queryFn: () => getRepCarTransfers({}, token),
    enabled: Boolean(token),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.posMarketRepCarTransfer(token ?? null, selectedId),
    queryFn: () => getRepCarTransfer(selectedId!, token),
    enabled: Boolean(token && selectedId),
  });

  const repsQuery = useQuery({
    queryKey: queryKeys.posMarketSalesReps(token ?? null),
    queryFn: () => getPosMarketSalesReps(token),
    enabled: Boolean(token && canManage),
  });

  const selected: RepCarTransfer | null = detailQuery.data ?? null;
  const activeFromRepId = selected?.fromSalesRepId ?? fromSalesRepId;

  const sourceStockQuery = useQuery({
    queryKey: queryKeys.posMarketRepCarStock(token ?? null, activeFromRepId || null),
    queryFn: () => getRepCarStock(activeFromRepId, token),
    enabled: Boolean(token && activeFromRepId),
  });

  const sourceBalances = useMemo(() => sourceStockQuery.data ?? [], [sourceStockQuery.data]);

  const draftStockIssues = useMemo(() => {
    if (!fromSalesRepId || sourceBalances.length === 0) return [];
    return findRepTransferStockIssues(lines, sourceBalances);
  }, [lines, fromSalesRepId, sourceBalances]);

  const draftStockIssueByItemId = useMemo(
    () => new Map(draftStockIssues.map((issue) => [issue.itemId, issue])),
    [draftStockIssues],
  );

  const selectedStockIssues = useMemo(() => {
    if (!selected || selected.status !== "DRAFT" || sourceBalances.length === 0) return [];
    return findRepTransferStockIssues(
      selected.lines.map((line) => ({
        itemId: line.itemId,
        quantity: String(line.quantity),
      })),
      sourceBalances,
    );
  }, [selected, sourceBalances]);

  const selectedStockIssueByItemId = useMemo(
    () => new Map(selectedStockIssues.map((issue) => [issue.itemId, issue])),
    [selectedStockIssues],
  );

  const createMutation = useMutation({
    mutationFn: (payload: CreateRepCarTransferPayload) => createRepCarTransfer(payload, token),
    onSuccess: (created) => {
      pushMessage(t("posMarket.repTransfers.draftCreated"));
      setSelectedId(created.id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketRepCarTransfers(token ?? null) });
    },
    onError: (error: unknown) =>
      pushMessage(getErrorMessage(error, t("posMarket.repTransfers.saveError")), "error"),
  });

  const postMutation = useMutation({
    mutationFn: (id: string) => postRepCarTransfer(id, token),
    onSuccess: () => {
      pushMessage(t("posMarket.repTransfers.posted"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketRepCarTransfers(token ?? null) });
      if (selectedId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.posMarketRepCarTransfer(token ?? null, selectedId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.posMarketRepCarStock(token ?? null, activeFromRepId || null),
        });
      }
    },
    onError: (error: unknown) =>
      pushMessage(getErrorMessage(error, t("posMarket.repTransfers.postError")), "error"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelRepCarTransfer(id, token),
    onSuccess: () => {
      pushMessage(t("posMarket.repTransfers.cancelled"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketRepCarTransfers(token ?? null) });
    },
    onError: (error: unknown) =>
      pushMessage(getErrorMessage(error, t("posMarket.repTransfers.cancelError")), "error"),
  });

  const reverseMutation = useMutation({
    mutationFn: (id: string) => reverseRepCarTransfer(id, token),
    onSuccess: () => {
      pushMessage(t("posMarket.repTransfers.undone"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketRepCarTransfers(token ?? null) });
      if (selectedId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.posMarketRepCarTransfer(token ?? null, selectedId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.posMarketRepCarStock(token ?? null, activeFromRepId || null),
        });
      }
    },
    onError: (error: unknown) =>
      pushMessage(getErrorMessage(error, t("posMarket.repTransfers.undoError")), "error"),
  });

  const handleReverseSelected = () => {
    if (!selected?.canReverse) return;
    if (!window.confirm(t("posMarket.repTransfers.undoConfirm"))) return;
    reverseMutation.mutate(selected.id);
  };

  const handlePostSelected = () => {
    if (!selected) return;
    if (selectedStockIssues.length > 0) {
      pushMessage(
        t("posMarket.repTransfers.saveBlockedStock", { count: selectedStockIssues.length }),
        "error",
      );
      return;
    }
    postMutation.mutate(selected.id);
  };

  const handleSaveDraft = () => {
    if (!fromSalesRepId || !toSalesRepId) {
      pushMessage(t("posMarket.repTransfers.selectReps"), "error");
      return;
    }
    if (fromSalesRepId === toSalesRepId) {
      pushMessage(t("posMarket.repTransfers.sameRepError"), "error");
      return;
    }
    const payload: CreateRepCarTransferPayload = {
      transferDate,
      fromSalesRepId,
      toSalesRepId,
      description: description || undefined,
      lines: lines
        .filter((line) => line.itemId && Number(line.quantity) > 0)
        .map((line) => ({
          itemId: line.itemId,
          quantity: line.quantity,
          unitOfMeasure: line.unitOfMeasure,
        })),
    };
    if (!payload.lines.length) {
      pushMessage(t("posMarket.repTransfers.addLine"), "error");
      return;
    }
    if (draftStockIssues.length > 0) {
      pushMessage(
        t("posMarket.repTransfers.saveBlockedStock", { count: draftStockIssues.length }),
        "error",
      );
      return;
    }
    createMutation.mutate(payload);
  };

  if (!canManage) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">{t("posMarket.repTransfers.noPermission")}</p>
      </Card>
    );
  }

  const reps = repsQuery.data ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="p-4">
        <SectionHeading title={t("posMarket.repTransfers.listTitle")} />
        <div className="mt-4 space-y-2">
          {(transfersQuery.data?.data ?? []).map((transfer) => (
            <button
              key={transfer.id}
              type="button"
              onClick={() => {
                setSelectedId(transfer.id);
                setMessage(null);
              }}
              className={`w-full rounded-lg border px-3 py-2 text-start text-sm ${
                selectedId === transfer.id ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="font-semibold">{transfer.reference}</div>
              <div className="text-xs text-muted-foreground">
                {transfer.fromSalesRep.name} → {transfer.toSalesRep.name} · {transfer.status}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        {message ? (
          <p
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
              messageTone === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {message}
          </p>
        ) : null}

        {selected ? (
          <Card className="space-y-3 p-4">
            <SectionHeading title={selected.reference} description={selected.status} />
            <p className="text-sm">
              {selected.fromSalesRep.name} → {selected.toSalesRep.name} ·{" "}
              {selected.transferDate.slice(0, 10)}
            </p>
            <div className="hidden gap-2 text-xs font-semibold text-muted-foreground md:grid md:grid-cols-[2fr_1fr_1fr_1fr]">
              <span>{t("posMarket.repTransfers.colProduct")}</span>
              <span>{t("posMarket.repTransfers.colQuantity")}</span>
              <span>{t("posMarket.repTransfers.colUnit")}</span>
              <span>{t("posMarket.repTransfers.colOnCar")}</span>
            </div>
            <ul className="space-y-2 text-sm">
              {selected.lines.map((line, lineIndex) => {
                const sourceOnHand =
                  sourceBalances.find((row) => row.itemId === line.itemId)?.onHandQuantity ?? "—";
                const issue =
                  selected.status === "DRAFT"
                    ? selectedStockIssueByItemId.get(line.itemId)
                    : undefined;
                const hasReverseShortfall =
                  selected.status === "POSTED" &&
                  typeof line.reverseShortfall === "number" &&
                  line.reverseShortfall > 0;
                const showShortage =
                  issue &&
                  selected.lines.findIndex((row) => row.itemId === line.itemId) === lineIndex;
                return (
                  <li key={line.id} className="space-y-1">
                    <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr] md:items-center">
                      <span>
                        {line.item.code} — {line.item.name}
                      </span>
                      <span>{line.quantity}</span>
                      <span>{line.unitOfMeasure}</span>
                      <span
                        className={
                          issue || hasReverseShortfall
                            ? "rounded-md border border-amber-300 bg-amber-50 px-2 py-1 font-semibold text-amber-900"
                            : "text-muted-foreground"
                        }
                      >
                        {selected.status === "DRAFT" ? sourceOnHand : (line.destOnHand ?? "—")}
                      </span>
                    </div>
                    {showShortage && issue ? (
                      <p className="text-xs font-semibold text-amber-800">
                        {t("posMarket.repTransfers.lineShortage", { shortage: issue.shortage })}
                      </p>
                    ) : null}
                    {hasReverseShortfall ? (
                      <p className="text-xs font-semibold text-amber-800">
                        {t("posMarket.repTransfers.reverseBlockedShortfall", {
                          code: line.item.code,
                          transferred: line.quantity,
                          onCar: line.destOnHand ?? 0,
                        })}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {selected.status === "DRAFT" ? (
              <StockIssueSummary issues={selectedStockIssues} t={t} />
            ) : null}
            {selected.status === "POSTED" && !selected.canReverse ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                <p className="font-semibold">{t("posMarket.repTransfers.reverseBlockedTitle")}</p>
                {selected.hasSalesAfterPost ? (
                  <p className="mt-1 text-xs">{t("posMarket.repTransfers.reverseBlockedSales")}</p>
                ) : null}
                <ul className="mt-1 space-y-0.5 text-xs">
                  {(selected.reverseBlockReasons ?? []).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {selected.status === "REVERSED" && selected.reversedAt ? (
              <p className="text-sm text-muted-foreground">
                {t("posMarket.repTransfers.reversedAt", {
                  date: selected.reversedAt.slice(0, 10),
                })}
              </p>
            ) : null}
            {selected.status === "DRAFT" ? (
              <div className="flex gap-2">
                <Button
                  onClick={handlePostSelected}
                  disabled={postMutation.isPending || selectedStockIssues.length > 0}
                >
                  {t("posMarket.repTransfers.post")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => cancelMutation.mutate(selected.id)}
                  disabled={cancelMutation.isPending}
                >
                  {t("posMarket.repTransfers.cancel")}
                </Button>
              </div>
            ) : null}
            {selected.status === "POSTED" && selected.canReverse ? (
              <Button variant="outline" onClick={handleReverseSelected} disabled={reverseMutation.isPending}>
                {t("posMarket.repTransfers.undo")}
              </Button>
            ) : null}
          </Card>
        ) : null}

        {!selectedId ? (
          <Card className="space-y-4 p-4">
            <SectionHeading title={t("posMarket.repTransfers.newTitle")} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("posMarket.repTransfers.fromRep")}>
                <select
                  value={fromSalesRepId}
                  onChange={(event) => setFromSalesRepId(event.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">{t("posMarket.repTransfers.repPlaceholder")}</option>
                  {reps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("posMarket.repTransfers.toRep")}>
                <select
                  value={toSalesRepId}
                  onChange={(event) => setToSalesRepId(event.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">{t("posMarket.repTransfers.repPlaceholder")}</option>
                  {reps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("posMarket.repTransfers.date")}>
                <Input type="date" value={transferDate} onChange={(event) => setTransferDate(event.target.value)} />
              </Field>
              <Field label={t("posMarket.repTransfers.notes")}>
                <Input value={description} onChange={(event) => setDescription(event.target.value)} />
              </Field>
            </div>

            {!fromSalesRepId ? (
              <p className="text-sm text-muted-foreground">{t("posMarket.repTransfers.selectFromRep")}</p>
            ) : sourceStockQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">{t("posMarket.repTransfers.stockLoading")}</p>
            ) : sourceBalances.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("posMarket.repTransfers.stockEmpty")}</p>
            ) : (
              <>
                <div className="hidden gap-2 text-xs font-semibold text-muted-foreground md:grid md:grid-cols-[2fr_1fr_1fr_1fr]">
                  <span>{t("posMarket.repTransfers.colProduct")}</span>
                  <span>{t("posMarket.repTransfers.colQuantity")}</span>
                  <span>{t("posMarket.repTransfers.colUnit")}</span>
                  <span>{t("posMarket.repTransfers.colOnCar")}</span>
                </div>
                {lines.map((line, index) => {
                  const balance = sourceBalances.find((row) => row.itemId === line.itemId);
                  const issue = draftStockIssueByItemId.get(line.itemId);
                  return (
                    <div key={index} className="space-y-1">
                      <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr] md:items-center">
                        <select
                          value={line.itemId}
                          onChange={(event) => {
                            const itemId = event.target.value;
                            const item = sourceBalances.find((row) => row.itemId === itemId);
                            setLines((current) =>
                              current.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      itemId,
                                      unitOfMeasure: item?.item.unitOfMeasure ?? row.unitOfMeasure,
                                    }
                                  : row,
                              ),
                            );
                          }}
                          className="rounded-lg border px-2 py-2 text-sm"
                        >
                          <option value="">{t("posMarket.repTransfers.itemPlaceholder")}</option>
                          {sourceBalances.map((row) => (
                            <option key={row.itemId} value={row.itemId}>
                              {row.item.code} — {row.item.name} ({row.onHandQuantity})
                            </option>
                          ))}
                        </select>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={line.quantity}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((row, rowIndex) =>
                                rowIndex === index ? { ...row, quantity: event.target.value } : row,
                              ),
                            )
                          }
                        />
                        <Input
                          value={line.unitOfMeasure}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((row, rowIndex) =>
                                rowIndex === index ? { ...row, unitOfMeasure: event.target.value } : row,
                              ),
                            )
                          }
                        />
                        <span
                          className={
                            issue
                              ? "rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-900"
                              : "text-sm text-muted-foreground"
                          }
                        >
                          {balance?.onHandQuantity ?? "—"}
                        </span>
                      </div>
                      {issue ? (
                        <p className="text-xs font-semibold text-amber-800">
                          {t("posMarket.repTransfers.lineShortage", { shortage: issue.shortage })}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setLines((current) => [...current, { itemId: "", quantity: "1", unitOfMeasure: "EA" }])
                  }
                >
                  {t("posMarket.repTransfers.addLineButton")}
                </Button>
                <StockIssueSummary issues={draftStockIssues} t={t} />
              </>
            )}

            <Button onClick={handleSaveDraft} disabled={createMutation.isPending}>
              {t("posMarket.repTransfers.saveDraft")}
            </Button>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
