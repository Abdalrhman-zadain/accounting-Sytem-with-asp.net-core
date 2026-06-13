"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Card, SectionHeading } from "@/components/ui";
import { Field, Input } from "@/components/ui/forms";
import { getErrorMessage } from "@/features/pos-market/pos-market-cart-utils";
import {
  buildBalanceMap,
  locationKey,
  locationLabel,
  parseLocationKey,
  resolveTransferKind,
} from "@/features/pos-market/pos-market-stock-hub-utils";
import { useAuth } from "@/providers/auth-provider";
import {
  createInventoryTransfer,
  createRepCarLoad,
  createRepCarTransfer,
  createRepCarUnload,
  getMarketStockOverview,
  postInventoryTransfer,
  postRepCarLoad,
  postRepCarTransfer,
  postRepCarUnload,
} from "@/lib/api";
import { hasPermission } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";

type LineDraft = {
  itemId: string;
  quantity: string;
  unitOfMeasure: string;
};

export function PosMarketStockHubWorkspace() {
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const canManage = hasPermission(user, "POS_MARKET_MANAGE_REP_LOADS");
  const canRepTransfer = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [fromKey, setFromKey] = useState("");
  const [toKey, setToKey] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([
    { itemId: "", quantity: "1", unitOfMeasure: "EA" },
  ]);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  const overviewQuery = useQuery({
    queryKey: queryKeys.posMarketStockOverview(token ?? null, "", true),
    queryFn: () => getMarketStockOverview({ hideZero: true }, token),
    enabled: Boolean(token) && canManage,
  });

  const overview = overviewQuery.data;
  const balanceMap = useMemo(() => buildBalanceMap(overview), [overview]);

  const fromLocation = parseLocationKey(fromKey);
  const toLocation = parseLocationKey(toKey);
  const transferKind =
    fromLocation && toLocation ? resolveTransferKind(fromLocation, toLocation) : null;

  const warehouseLocations = useMemo(
    () => overview?.locations.filter((row) => row.type === "warehouse") ?? [],
    [overview],
  );
  const repLocations = useMemo(
    () => overview?.locations.filter((row) => row.type === "rep") ?? [],
    [overview],
  );

  const locationCount = overview?.locations.length ?? 0;
  const itemCount = overview?.items.length ?? 0;

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!fromLocation || !toLocation || !transferKind) {
        throw new Error(t("posMarket.stockHub.selectLocations"));
      }
      if (fromKey === toKey) {
        throw new Error(t("posMarket.stockHub.sameLocationError"));
      }
      if (transferKind === "rep-transfer" && !canRepTransfer) {
        throw new Error(t("posMarket.stockHub.repTransferAdminOnly"));
      }

      const validLines = lines.filter((line) => line.itemId && Number(line.quantity) > 0);
      if (validLines.length === 0) {
        throw new Error(t("posMarket.stockHub.addLine"));
      }

      const linePayload = validLines.map((line) => ({
        itemId: line.itemId,
        quantity: line.quantity,
        unitOfMeasure: line.unitOfMeasure,
      }));

      if (transferKind === "load") {
        const draft = await createRepCarLoad(
          {
            loadDate: transferDate,
            warehouseId: fromLocation.id,
            salesRepId: toLocation.id,
            description: description || undefined,
            lines: linePayload,
          },
          token,
        );
        await postRepCarLoad(draft.id, token);
        return;
      }

      if (transferKind === "unload") {
        const draft = await createRepCarUnload(
          {
            unloadDate: transferDate,
            warehouseId: toLocation.id,
            salesRepId: fromLocation.id,
            description: description || undefined,
            lines: linePayload,
          },
          token,
        );
        await postRepCarUnload(draft.id, token);
        return;
      }

      if (transferKind === "rep-transfer") {
        const draft = await createRepCarTransfer(
          {
            transferDate: transferDate,
            fromSalesRepId: fromLocation.id,
            toSalesRepId: toLocation.id,
            description: description || undefined,
            lines: linePayload,
          },
          token,
        );
        await postRepCarTransfer(draft.id, token);
        return;
      }

      const draft = await createInventoryTransfer(
        {
          transferDate: transferDate,
          sourceWarehouseId: fromLocation.id,
          destinationWarehouseId: toLocation.id,
          description: description || undefined,
          lines: linePayload,
        },
        token,
      );
      await postInventoryTransfer(draft.id, token);
    },
    onSuccess: () => {
      setMessage(t("posMarket.stockHub.transferPosted"));
      setMessageTone("success");
      setLines([{ itemId: "", quantity: "1", unitOfMeasure: "EA" }]);
      setDescription("");
      void queryClient.invalidateQueries({
        queryKey: ["pos-market-stock-overview", token ?? null],
      });
    },
    onError: (error) => {
      setMessage(getErrorMessage(error, t("posMarket.stockHub.transferError")));
      setMessageTone("error");
    },
  });

  if (!canManage) {
    return (
      <Card className="p-4 text-sm text-slate-600">
        {t("posMarket.stockHub.noPermission")}
      </Card>
    );
  }

  const transferKindLabel = (() => {
    switch (transferKind) {
      case "load":
        return t("posMarket.stockHub.kindLoad");
      case "unload":
        return t("posMarket.stockHub.kindUnload");
      case "rep-transfer":
        return t("posMarket.stockHub.kindRepTransfer");
      case "wh-transfer":
        return t("posMarket.stockHub.kindWhTransfer");
      default:
        return t("posMarket.stockHub.kindUnknown");
    }
  })();

  return (
    <div className="space-y-4 p-3">
      {message ? (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            messageTone === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {message}
        </div>
      ) : null}

      <Link
        href="/pos-market/stock-hub/overview"
        className="group block rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 group-hover:text-slate-950">
              {t("posMarket.stockHub.overviewTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t("posMarket.stockOverview.openHint")}
            </p>
            {overviewQuery.isSuccess ? (
              <p className="mt-2 text-xs text-slate-500">
                {t("posMarket.stockOverview.summary", {
                  locations: locationCount,
                  items: itemCount,
                })}
              </p>
            ) : null}
          </div>
          <span className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white group-hover:bg-slate-800">
            {t("posMarket.stockOverview.openButton")}
          </span>
        </div>
      </Link>

      <Card className="space-y-3 p-4">
        <SectionHeading
          title={t("posMarket.stockHub.transferTitle")}
          description={transferKindLabel}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <Field label={t("posMarket.stockHub.fromLocation")}>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={fromKey}
              onChange={(event) => setFromKey(event.target.value)}
            >
              <option value="">{t("posMarket.stockHub.locationPlaceholder")}</option>
              {warehouseLocations.length > 0 ? (
                <optgroup label={t("posMarket.stockHub.warehousesGroup")}>
                  {warehouseLocations.map((location) => (
                    <option key={locationKey(location)} value={locationKey(location)}>
                      {locationLabel(location, t)}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {repLocations.length > 0 ? (
                <optgroup label={t("posMarket.stockHub.repsGroup")}>
                  {repLocations.map((location) => (
                    <option key={locationKey(location)} value={locationKey(location)}>
                      {locationLabel(location, t)}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </Field>

          <Field label={t("posMarket.stockHub.toLocation")}>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={toKey}
              onChange={(event) => setToKey(event.target.value)}
            >
              <option value="">{t("posMarket.stockHub.locationPlaceholder")}</option>
              {warehouseLocations.length > 0 ? (
                <optgroup label={t("posMarket.stockHub.warehousesGroup")}>
                  {warehouseLocations.map((location) => (
                    <option key={locationKey(location)} value={locationKey(location)}>
                      {locationLabel(location, t)}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {repLocations.length > 0 ? (
                <optgroup label={t("posMarket.stockHub.repsGroup")}>
                  {repLocations.map((location) => (
                    <option key={locationKey(location)} value={locationKey(location)}>
                      {locationLabel(location, t)}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </Field>

          <Field label={t("posMarket.stockHub.date")}>
            <Input
              type="date"
              value={transferDate}
              onChange={(event) => setTransferDate(event.target.value)}
            />
          </Field>

          <Field label={t("posMarket.stockHub.notes")}>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </div>

        {transferKind === "rep-transfer" && !canRepTransfer ? (
          <p className="text-sm text-amber-700">{t("posMarket.stockHub.repTransferAdminOnly")}</p>
        ) : null}

        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_100px_80px_40px] gap-2 text-xs font-semibold text-slate-600">
            <span>{t("posMarket.stockHub.colProduct")}</span>
            <span>{t("posMarket.stockHub.colQuantity")}</span>
            <span>{t("posMarket.stockHub.colUnit")}</span>
            <span />
          </div>
          {lines.map((line, index) => {
            const available =
              fromLocation && line.itemId
                ? balanceMap.get(`${fromLocation.type}:${fromLocation.id}:${line.itemId}`) ?? 0
                : null;
            return (
              <div
                key={index}
                className="grid grid-cols-[1fr_100px_80px_40px] gap-2 items-center"
              >
                <select
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  value={line.itemId}
                  onChange={(event) => {
                    const itemId = event.target.value;
                    const item = overview?.items.find((row) => row.id === itemId);
                    setLines((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index
                          ? {
                              ...row,
                              itemId,
                              unitOfMeasure: item?.unitOfMeasure ?? row.unitOfMeasure,
                            }
                          : row,
                      ),
                    );
                  }}
                >
                  <option value="">{t("posMarket.stockHub.itemPlaceholder")}</option>
                  {(overview?.items ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} — {item.name}
                    </option>
                  ))}
                </select>
                <Input
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setLines((current) => current.filter((_, rowIndex) => rowIndex !== index))
                  }
                  disabled={lines.length <= 1}
                >
                  ×
                </Button>
                {available !== null && line.itemId ? (
                  <p className="col-span-full text-xs text-slate-500">
                    {t("posMarket.stockHub.available", { qty: available })}
                  </p>
                ) : null}
              </div>
            );
          })}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              setLines((current) => [
                ...current,
                { itemId: "", quantity: "1", unitOfMeasure: "EA" },
              ])
            }
          >
            {t("posMarket.stockHub.addLineButton")}
          </Button>
        </div>

        <Button
          type="button"
          onClick={() => transferMutation.mutate()}
          disabled={
            transferMutation.isPending ||
            !transferKind ||
            (transferKind === "rep-transfer" && !canRepTransfer)
          }
        >
          {transferMutation.isPending
            ? t("posMarket.stockHub.posting")
            : t("posMarket.stockHub.postTransfer")}
        </Button>
      </Card>
    </div>
  );
}
