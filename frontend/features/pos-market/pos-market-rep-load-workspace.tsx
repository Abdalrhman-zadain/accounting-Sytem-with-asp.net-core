"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Card, SectionHeading } from "@/components/ui";
import { Field, Input } from "@/components/ui/forms";
import { getErrorMessage } from "@/features/pos-market/pos-market-cart-utils";
import {
  fetchMarketInventoryItems,
  fetchMarketInventoryItemsForWarehouse,
  findRepLoadStockIssue,
  getWarehouseOnHandQuantity,
} from "@/features/pos-market/pos-market-inventory-utils";
import { useAuth } from "@/providers/auth-provider";
import {
  cancelRepCarLoad,
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

function formatStockIssueMessage(
  issue: { code: string; onHand: number; demand: number },
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
) {
  return t("posMarket.repLoads.exceedsWarehouseStock", {
    code: issue.code,
    onHand: issue.onHand,
    demand: issue.demand,
  });
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

  const draftStockIssue = useMemo(() => {
    if (!warehouseId || warehouseItems.length === 0) return null;
    return findRepLoadStockIssue(lines, warehouseItems);
  }, [lines, warehouseId, warehouseItems]);

  const selectedStockIssue = useMemo(() => {
    if (!selected || selected.status !== "DRAFT" || warehouseItems.length === 0) return null;
    return findRepLoadStockIssue(
      selected.lines.map((line) => ({
        itemId: line.itemId,
        quantity: String(line.quantity),
      })),
      warehouseItems,
    );
  }, [selected, warehouseItems]);

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

  const handlePostSelected = () => {
    if (!selected) return;
    if (selectedStockIssue) {
      pushMessage(formatStockIssueMessage(selectedStockIssue, t), "error");
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
    if (draftStockIssue) {
      pushMessage(formatStockIssueMessage(draftStockIssue, t), "error");
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
            <ul className="space-y-2 text-sm">
              {selected.lines.map((line) => {
                const onHand = getWarehouseOnHandQuantity(warehouseItems, line.itemId);
                const over = Number(line.quantity) > onHand + 0.0001;
                return (
                  <li
                    key={line.id}
                    className={over ? "rounded-md border border-red-200 bg-red-50 px-2 py-1 text-red-800" : ""}
                  >
                    <div>
                      {line.item.code} — {line.quantity} {line.unitOfMeasure}
                    </div>
                    <div className="text-xs">
                      {t("posMarket.repLoads.warehouseOnHand", { qty: onHand })}
                      {over
                        ? ` · ${t("posMarket.repLoads.lineOverStock", {
                            demand: line.quantity,
                            onHand,
                          })}`
                        : ""}
                    </div>
                  </li>
                );
              })}
            </ul>
            {selected.status === "DRAFT" && selectedStockIssue ? (
              <p className="text-sm font-semibold text-red-700">
                {formatStockIssueMessage(selectedStockIssue, t)}
              </p>
            ) : null}
            {selected.status === "DRAFT" ? (
              <div className="flex gap-2">
                <Button
                  onClick={handlePostSelected}
                  disabled={postMutation.isPending || Boolean(selectedStockIssue)}
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

          {draftStockIssue ? (
            <p className="text-sm font-semibold text-red-700">
              {formatStockIssueMessage(draftStockIssue, t)}
            </p>
          ) : null}

          <div className="space-y-3">
            {lines.map((line, index) => {
              const onHand = warehouseId
                ? getWarehouseOnHandQuantity(warehouseItems, line.itemId)
                : null;
              const quantity = Number(line.quantity);
              const lineOver =
                onHand !== null &&
                line.itemId &&
                Number.isFinite(quantity) &&
                quantity > onHand + 0.0001;

              return (
                <div key={index} className="space-y-1">
                  <div className="grid gap-2 md:grid-cols-3">
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
                    <Input
                      type="number"
                      min="0.0001"
                      step="any"
                      value={line.quantity}
                      className={lineOver ? "border-red-500 text-red-700" : undefined}
                      onChange={(e) =>
                        setLines((current) =>
                          current.map((row, i) =>
                            i === index ? { ...row, quantity: e.target.value } : row,
                          ),
                        )
                      }
                    />
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
                  </div>
                  {line.itemId && warehouseId && onHand !== null ? (
                    <p className={`text-xs ${lineOver ? "font-semibold text-red-700" : "text-muted-foreground"}`}>
                      {t("posMarket.repLoads.warehouseOnHand", { qty: onHand })}
                      {lineOver
                        ? ` · ${t("posMarket.repLoads.lineOverStock", {
                            demand: quantity,
                            onHand,
                          })}`
                        : ""}
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
              {t("posMarket.repLoads.addLineButton")}
            </Button>
          </div>

          <Button
            onClick={handleSaveDraft}
            disabled={createMutation.isPending || Boolean(draftStockIssue)}
          >
            {t("posMarket.repLoads.saveDraft")}
          </Button>
        </Card>
      </div>
    </div>
  );
}
