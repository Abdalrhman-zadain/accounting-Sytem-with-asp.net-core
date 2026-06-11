"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Card, SectionHeading } from "@/components/ui";
import { Field, Input } from "@/components/ui/forms";
import { getErrorMessage } from "@/features/pos-market/pos-market-cart-utils";
import {
  fetchMarketInventoryItems,
  fetchMarketInventoryItemsForWarehouse,
  findRepLoadStockIssues,
  getWarehouseOnHandQuantity,
  type RepLoadStockIssue,
} from "@/features/pos-market/pos-market-inventory-utils";
import { useAuth } from "@/providers/auth-provider";
import {
  cancelRepCarLoad,
  reverseRepCarLoad,
  createRepCarLoad,
  getInventoryWarehouses,
  getPosMarketSalesReps,
  getRepCarLoad,
  getRepCarLoads,
  postRepCarLoad,
} from "@/lib/api";
import { hasPermission } from "@/lib/auth-access";
import { useTranslation, type TranslationKey } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import type { CreateRepCarLoadPayload, RepCarLoad } from "@/types/api";

type LineDraft = {
  itemId: string;
  quantity: string;
  unitOfMeasure: string;
};

function StockIssueSummary({
  issues,
  t,
}: {
  issues: RepLoadStockIssue[];
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  if (issues.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
      <p className="font-semibold">
        {t("posMarket.repLoads.stockSummaryTitle", { count: issues.length })}
      </p>
      <ul className="mt-1 space-y-0.5 text-xs">
        {issues.map((issue) => (
          <li key={issue.itemId}>
            {t("posMarket.repLoads.stockSummaryLine", {
              code: issue.code,
              onHand: issue.onHand,
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PosMarketRepLoadWorkspace() {
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const canManage = hasPermission(user, "POS_MARKET_MANAGE_REP_LOADS");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [salesRepId, setSalesRepId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [loadDate, setLoadDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ itemId: "", quantity: "1", unitOfMeasure: "EA" }]);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  const pushMessage = (text: string, tone: "success" | "error" = "success") => {
    setMessage(text);
    setMessageTone(tone);
  };

  const loadsQuery = useQuery({
    queryKey: queryKeys.posMarketRepCarLoads(token ?? null),
    queryFn: () => getRepCarLoads({}, token),
    enabled: Boolean(token),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.posMarketRepCarLoad(token ?? null, selectedId),
    queryFn: () => getRepCarLoad(selectedId!, token),
    enabled: Boolean(token && selectedId),
  });

  const repsQuery = useQuery({
    queryKey: queryKeys.posMarketSalesReps(token ?? null),
    queryFn: () => getPosMarketSalesReps(token),
    enabled: Boolean(token && canManage),
  });

  const warehousesQuery = useQuery({
    queryKey: queryKeys.inventoryWarehouses(token ?? null, { isActive: "true" }),
    queryFn: () => getInventoryWarehouses({ isActive: "true" }, token),
    enabled: Boolean(token),
  });

  const itemsQuery = useQuery({
    queryKey: queryKeys.posMarketInventoryItems(token ?? null),
    queryFn: () => fetchMarketInventoryItems(token),
    enabled: Boolean(token),
  });

  const selected: RepCarLoad | null = detailQuery.data ?? null;
  const activeWarehouseId = selected?.warehouseId ?? warehouseId;

  const warehouseItemsQuery = useQuery({
    queryKey: queryKeys.posMarketWarehouseInventoryItems(token ?? null, activeWarehouseId || null),
    queryFn: () => fetchMarketInventoryItemsForWarehouse(activeWarehouseId, token),
    enabled: Boolean(token && activeWarehouseId),
  });

  const marketItems = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const warehouseItems = useMemo(() => warehouseItemsQuery.data ?? [], [warehouseItemsQuery.data]);

  const draftStockIssues = useMemo(() => {
    if (!warehouseId || warehouseItems.length === 0) return [];
    return findRepLoadStockIssues(lines, warehouseItems);
  }, [lines, warehouseId, warehouseItems]);

  const draftStockIssueByItemId = useMemo(
    () => new Map(draftStockIssues.map((issue) => [issue.itemId, issue])),
    [draftStockIssues],
  );

  const selectedStockIssues = useMemo(() => {
    if (!selected || selected.status !== "DRAFT" || warehouseItems.length === 0) return [];
    return findRepLoadStockIssues(
      selected.lines.map((line) => ({
        itemId: line.itemId,
        quantity: String(line.quantity),
      })),
      warehouseItems,
    );
  }, [selected, warehouseItems]);

  const selectedStockIssueByItemId = useMemo(
    () => new Map(selectedStockIssues.map((issue) => [issue.itemId, issue])),
    [selectedStockIssues],
  );

  const createMutation = useMutation({
    mutationFn: (payload: CreateRepCarLoadPayload) => createRepCarLoad(payload, token),
    onSuccess: (created) => {
      pushMessage(t("posMarket.repLoads.draftCreated"));
      setSelectedId(created.id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketRepCarLoads(token ?? null) });
    },
    onError: (error: unknown) =>
      pushMessage(getErrorMessage(error, t("posMarket.repLoads.saveError")), "error"),
  });

  const postMutation = useMutation({
    mutationFn: (id: string) => postRepCarLoad(id, token),
    onSuccess: () => {
      pushMessage(t("posMarket.repLoads.posted"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketRepCarLoads(token ?? null) });
      if (selectedId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.posMarketRepCarLoad(token ?? null, selectedId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.posMarketWarehouseInventoryItems(token ?? null, activeWarehouseId || null),
        });
      }
    },
    onError: (error: unknown) =>
      pushMessage(getErrorMessage(error, t("posMarket.repLoads.postError")), "error"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelRepCarLoad(id, token),
    onSuccess: () => {
      pushMessage(t("posMarket.repLoads.cancelled"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketRepCarLoads(token ?? null) });
    },
    onError: (error: unknown) =>
      pushMessage(getErrorMessage(error, t("posMarket.repLoads.cancelError")), "error"),
  });

  const reverseMutation = useMutation({
    mutationFn: (id: string) => reverseRepCarLoad(id, token),
    onSuccess: () => {
      pushMessage(t("posMarket.repLoads.undone"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketRepCarLoads(token ?? null) });
      if (selectedId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.posMarketRepCarLoad(token ?? null, selectedId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.posMarketWarehouseInventoryItems(token ?? null, activeWarehouseId || null),
        });
      }
    },
    onError: (error: unknown) =>
      pushMessage(getErrorMessage(error, t("posMarket.repLoads.undoError")), "error"),
  });

  const handleReverseSelected = () => {
    if (!selected?.canReverse) return;
    if (!window.confirm(t("posMarket.repLoads.undoConfirm"))) return;
    reverseMutation.mutate(selected.id);
  };

  const handlePostSelected = () => {
    if (!selected) return;
    if (selectedStockIssues.length > 0) {
      pushMessage(
        t("posMarket.repLoads.saveBlockedStock", { count: selectedStockIssues.length }),
        "error",
      );
      return;
    }
    postMutation.mutate(selected.id);
  };

  const handleSaveDraft = () => {
    if (!salesRepId || !warehouseId) {
      pushMessage(t("posMarket.repLoads.selectRepWarehouse"), "error");
      return;
    }
    const payload: CreateRepCarLoadPayload = {
      loadDate,
      warehouseId,
      salesRepId,
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
      pushMessage(t("posMarket.repLoads.addLine"), "error");
      return;
    }
    if (draftStockIssues.length > 0) {
      pushMessage(
        t("posMarket.repLoads.saveBlockedStock", { count: draftStockIssues.length }),
        "error",
      );
      return;
    }
    createMutation.mutate(payload);
  };

  if (!canManage) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">{t("posMarket.repLoads.noPermission")}</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="p-4">
        <SectionHeading title={t("posMarket.repLoads.listTitle")} />
        <div className="mt-4 space-y-2">
          {(loadsQuery.data?.data ?? []).map((load) => (
            <button
              key={load.id}
              type="button"
              onClick={() => {
                setSelectedId(load.id);
                setMessage(null);
              }}
              className={`w-full rounded-lg border px-3 py-2 text-start text-sm ${
                selectedId === load.id ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="font-semibold">{load.reference}</div>
              <div className="text-xs text-muted-foreground">
                {load.salesRep.name} · {load.status}
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
          <Card className="p-4 space-y-3">
            <SectionHeading title={selected.reference} description={selected.status} />
            <p className="text-sm">
              {selected.salesRep.name} · {selected.warehouse.name} · {selected.loadDate.slice(0, 10)}
            </p>
            <div className="hidden gap-2 text-xs font-semibold text-muted-foreground md:grid md:grid-cols-[2fr_1fr_1fr_1fr]">
              <span>{t("posMarket.repLoads.colProduct")}</span>
              <span>{t("posMarket.repLoads.colQuantity")}</span>
              <span>{t("posMarket.repLoads.colUnit")}</span>
              <span>
                {selected.status === "DRAFT"
                  ? t("posMarket.repLoads.colAvailable")
                  : t("posMarket.repLoads.colOnCar")}
              </span>
            </div>
            <ul className="space-y-2 text-sm">
              {selected.lines.map((line, lineIndex) => {
                const warehouseOnHand = getWarehouseOnHandQuantity(warehouseItems, line.itemId);
                const repOnHand = line.repOnHand;
                const displayOnHand =
                  selected.status === "DRAFT" ? warehouseOnHand : (repOnHand ?? "—");
                const issue = selected.status === "DRAFT" ? selectedStockIssueByItemId.get(line.itemId) : undefined;
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
                        {displayOnHand}
                      </span>
                    </div>
                    {showShortage && issue ? (
                      <p className="text-xs font-semibold text-amber-800">
                        {t("posMarket.repLoads.lineShortage", { shortage: issue.shortage })}
                      </p>
                    ) : null}
                    {hasReverseShortfall ? (
                      <p className="text-xs font-semibold text-amber-800">
                        {t("posMarket.repLoads.reverseBlockedShortfall", {
                          code: line.item.code,
                          loaded: line.quantity,
                          onCar: repOnHand ?? 0,
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
                <p className="font-semibold">{t("posMarket.repLoads.reverseBlockedTitle")}</p>
                {selected.hasSalesAfterPost ? (
                  <p className="mt-1 text-xs">{t("posMarket.repLoads.reverseBlockedSales")}</p>
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
                {t("posMarket.repLoads.reversedAt", {
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
                  {t("posMarket.repLoads.post")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => cancelMutation.mutate(selected.id)}
                  disabled={cancelMutation.isPending}
                >
                  {t("posMarket.repLoads.cancel")}
                </Button>
              </div>
            ) : null}
            {selected.status === "POSTED" && selected.canReverse ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleReverseSelected}
                  disabled={reverseMutation.isPending}
                >
                  {t("posMarket.repLoads.undo")}
                </Button>
              </div>
            ) : null}
          </Card>
        ) : null}

        <Card className="p-4 space-y-4">
          <SectionHeading title={t("posMarket.repLoads.newTitle")} />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={t("posMarket.repLoads.salesRep")}>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={salesRepId}
                onChange={(e) => setSalesRepId(e.target.value)}
              >
                <option value="">—</option>
                {(repsQuery.data ?? []).map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("posMarket.repLoads.warehouse")}>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
              >
                <option value="">—</option>
                {(warehousesQuery.data ?? []).map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("posMarket.repLoads.date")}>
              <Input type="date" value={loadDate} onChange={(e) => setLoadDate(e.target.value)} />
            </Field>
            <Field label={t("posMarket.repLoads.notes")}>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>

          {itemsQuery.isError ? (
            <p className="text-sm text-red-600">{t("posMarket.repLoads.itemsError")}</p>
          ) : itemsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("posMarket.repLoads.itemsLoading")}</p>
          ) : marketItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("posMarket.repLoads.itemsEmpty")}</p>
          ) : null}

          {warehouseId && warehouseItemsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("posMarket.repLoads.warehouseStockLoading")}</p>
          ) : null}

          <div className="space-y-3">
            <div className="hidden gap-2 text-xs font-semibold text-muted-foreground md:grid md:grid-cols-[2fr_1fr_1fr_1fr]">
              <span>{t("posMarket.repLoads.colProduct")}</span>
              <span>{t("posMarket.repLoads.colQuantity")}</span>
              <span>{t("posMarket.repLoads.colUnit")}</span>
              <span>{t("posMarket.repLoads.colAvailable")}</span>
            </div>
            {lines.map((line, index) => {
              const onHand = warehouseId
                ? getWarehouseOnHandQuantity(warehouseItems, line.itemId)
                : null;
              const issue = line.itemId ? draftStockIssueByItemId.get(line.itemId) : undefined;
              const showShortage =
                issue &&
                lines.findIndex((row) => row.itemId === line.itemId) === index;

              return (
                <div key={index} className="space-y-1">
                  <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr] md:items-start">
                    <select
                      className="rounded-md border px-3 py-2"
                      value={line.itemId}
                      onChange={(e) => {
                        const item = marketItems.find((row) => row.id === e.target.value);
                        setLines((current) =>
                          current.map((row, i) =>
                            i === index
                              ? {
                                  ...row,
                                  itemId: e.target.value,
                                  unitOfMeasure: item?.unitOfMeasure ?? row.unitOfMeasure,
                                }
                              : row,
                          ),
                        );
                      }}
                    >
                      <option value="">{t("posMarket.repLoads.itemPlaceholder")}</option>
                      {marketItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code} — {item.name}
                        </option>
                      ))}
                    </select>
                    <div className="space-y-1">
                      <Input
                        type="number"
                        min="0.0001"
                        step="any"
                        value={line.quantity}
                        onChange={(e) =>
                          setLines((current) =>
                            current.map((row, i) =>
                              i === index ? { ...row, quantity: e.target.value } : row,
                            ),
                          )
                        }
                      />
                      {showShortage && issue ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-amber-800">
                            {t("posMarket.repLoads.lineShortage", { shortage: issue.shortage })}
                          </span>
                          <button
                            type="button"
                            className="text-primary underline-offset-2 hover:underline"
                            onClick={() =>
                              setLines((current) =>
                                current.map((row, i) =>
                                  i === index
                                    ? { ...row, quantity: String(issue.onHand) }
                                    : row,
                                ),
                              )
                            }
                          >
                            {t("posMarket.repLoads.setToAvailable")}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <Input
                      value={line.unitOfMeasure}
                      onChange={(e) =>
                        setLines((current) =>
                          current.map((row, i) =>
                            i === index ? { ...row, unitOfMeasure: e.target.value } : row,
                          ),
                        )
                      }
                    />
                    <div
                      className={`flex min-h-[42px] items-center rounded-md border px-3 py-2 text-sm ${
                        issue
                          ? "border-amber-300 bg-amber-50 font-semibold text-amber-900"
                          : line.itemId && warehouseId
                            ? "border-border bg-muted/40 text-muted-foreground"
                            : "border-dashed border-border bg-muted/20 text-muted-foreground"
                      }`}
                    >
                      {line.itemId && warehouseId && onHand !== null ? onHand : "—"}
                    </div>
                  </div>
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
              {t("posMarket.repLoads.addLineButton")}
            </Button>
          </div>

          <StockIssueSummary issues={draftStockIssues} t={t} />

          <Button
            onClick={handleSaveDraft}
            disabled={createMutation.isPending || draftStockIssues.length > 0}
          >
            {t("posMarket.repLoads.saveDraft")}
          </Button>
        </Card>
      </div>
    </div>
  );
}
