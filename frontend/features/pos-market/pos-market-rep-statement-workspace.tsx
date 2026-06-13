"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LuFileText, LuPrinter } from "react-icons/lu";

import { Button, Card } from "@/components/ui";
import { PageShell, SectionHeading } from "@/components/ui";
import { Field, Input, Select } from "@/components/ui/forms";
import { formatCurrency, getErrorMessage } from "@/features/pos-market/pos-market-cart-utils";
import {
  exportMarketRepStatementPdf,
  printMarketRepStatementA4,
} from "@/features/pos-market/pos-market-print-service";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import {
  getPosMarketDestinationMarkets,
  getPosMarketRepStatement,
  getPosMarketSalesReps,
} from "@/lib/api";
import type {
  PosMarketRepStatementDocumentTypes,
  PosMarketRepStatementPaymentTypes,
} from "@/lib/api/pos-market";
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

function defaultStatementFromDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function defaultStatementToDate() {
  return new Date().toISOString().slice(0, 10);
}

export function PosMarketRepStatementWorkspace({ embedded = false }: { embedded?: boolean }) {
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const isRep = isMarketRepUser(user);

  const [salesRepId, setSalesRepId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [fromDate, setFromDate] = useState(defaultStatementFromDate);
  const [toDate, setToDate] = useState(defaultStatementToDate);
  const [documentTypes, setDocumentTypes] = useState<PosMarketRepStatementDocumentTypes>("both");
  const [paymentTypes, setPaymentTypes] = useState<PosMarketRepStatementPaymentTypes>("both");
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [flashTone, setFlashTone] = useState<"success" | "error">("success");
  const [isStatementLoading, setIsStatementLoading] = useState(false);
  const [previewTotals, setPreviewTotals] = useState<{
    documentCount: number;
    totalAmount: string;
  } | null>(null);

  const salesRepsQuery = useQuery({
    queryKey: queryKeys.posMarketSalesReps(token ?? null),
    queryFn: () => getPosMarketSalesReps(token),
    enabled: Boolean(token),
  });

  const marketsQuery = useQuery({
    queryKey: queryKeys.posMarketDestinationMarkets(token ?? null),
    queryFn: () => getPosMarketDestinationMarkets(token),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (isRep && user?.salesRepId) {
      setSalesRepId(user.salesRepId);
      return;
    }
    if (!salesRepId && salesRepsQuery.data?.length) {
      setSalesRepId(salesRepsQuery.data[0]?.id ?? "");
    }
  }, [isRep, salesRepId, salesRepsQuery.data, user?.salesRepId]);

  const selectedRep = useMemo(
    () => (salesRepsQuery.data ?? []).find((rep) => rep.id === salesRepId),
    [salesRepId, salesRepsQuery.data],
  );

  async function loadStatementReport() {
    if (!fromDate || !toDate) {
      throw new Error(t("posMarket.repStatement.dateRangeRequired"));
    }
    if (fromDate > toDate) {
      throw new Error(t("posMarket.repStatement.invalidDateRange"));
    }
    if (!salesRepId) {
      throw new Error(t("posMarket.repStatement.repRequired"));
    }

    return getPosMarketRepStatement(
      {
        salesRepId,
        fromDate,
        toDate,
        customerId: customerId || undefined,
        documentTypes,
        paymentTypes,
      },
      token,
    );
  }

  function applyPreviewTotals(report: Awaited<ReturnType<typeof loadStatementReport>>) {
    setPreviewTotals({
      documentCount: report.totals.documentCount,
      totalAmount: report.totals.totalAmount,
    });
  }

  async function handlePreview() {
    setFlashMessage(null);
    setIsStatementLoading(true);
    try {
      const report = await loadStatementReport();
      applyPreviewTotals(report);
    } catch (error) {
      setFlashTone("error");
      setFlashMessage(getErrorMessage(error, t("posMarket.repStatement.printError")));
      setPreviewTotals(null);
    } finally {
      setIsStatementLoading(false);
    }
  }

  async function handlePrintA4() {
    setFlashMessage(null);
    setIsStatementLoading(true);
    try {
      const report = await loadStatementReport();
      applyPreviewTotals(report);
      await printMarketRepStatementA4(report, { generatedBy: user?.username ?? user?.name ?? null });
      setFlashTone("success");
      setFlashMessage(t("posMarket.repStatement.printSuccess"));
    } catch (error) {
      setFlashTone("error");
      setFlashMessage(getErrorMessage(error, t("posMarket.repStatement.printError")));
    } finally {
      setIsStatementLoading(false);
    }
  }

  async function handleExportPdf() {
    setFlashMessage(null);
    setIsStatementLoading(true);
    try {
      const report = await loadStatementReport();
      applyPreviewTotals(report);
      await exportMarketRepStatementPdf(report, { generatedBy: user?.username ?? user?.name ?? null });
    } catch (error) {
      setFlashTone("error");
      setFlashMessage(getErrorMessage(error, t("posMarket.repStatement.printError")));
    } finally {
      setIsStatementLoading(false);
    }
  }

  const panel = (
    <>
      {flashMessage ? (
        <div
          className={
            embedded
              ? "rounded-xl border px-4 py-3 text-sm font-semibold"
              : "mb-4 rounded-xl border px-4 py-3 text-sm font-semibold"
          }
          style={{
            borderColor: flashTone === "error" ? "#fecaca" : embedded ? "#d5deea" : POS_MARKET_THEME.colors.outline,
            backgroundColor: flashTone === "error" ? "#fef2f2" : embedded ? "#fff" : POS_MARKET_THEME.colors.cardSurface,
            color: flashTone === "error" ? "#b91c1c" : embedded ? "#111827" : POS_MARKET_THEME.colors.text,
          }}
        >
          {flashMessage}
        </div>
      ) : null}

      <Card className={embedded ? "p-5" : "rounded-3xl border border-[#d5deea] p-6"}>
        {embedded ? (
          <div className="mb-4">
            <div className="text-sm font-bold text-gray-900">{t("posMarket.repStatement.title")}</div>
            <div className="text-xs text-gray-500">{t("posMarket.repStatement.subtitle")}</div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {!isRep ? (
            <Field label={t("posMarket.repStatement.repFilter")}>
              <Select
                value={salesRepId}
                onChange={(event) => setSalesRepId(event.target.value)}
                className="rounded-xl"
              >
                <option value="">{t("posMarket.repStatement.selectRep")}</option>
                {(salesRepsQuery.data ?? []).map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label={t("posMarket.repStatement.repFilter")}>
              <Input value={selectedRep?.name ?? "—"} readOnly className="rounded-xl" />
            </Field>
          )}

          <Field label={t("posMarket.repStatement.marketFilter")}>
            <Select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className="rounded-xl"
            >
              <option value="">{t("posMarket.repStatement.allMarkets")}</option>
              {(marketsQuery.data ?? []).map((market) => (
                <option key={market.id} value={market.id}>
                  {market.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t("posMarket.repStatement.documentTypeFilter")}>
            <Select
              value={documentTypes}
              onChange={(event) =>
                setDocumentTypes(event.target.value as PosMarketRepStatementDocumentTypes)
              }
              className="rounded-xl"
            >
              <option value="both">{t("posMarket.repStatement.documentTypeBoth")}</option>
              <option value="sales">{t("posMarket.repStatement.documentTypeSales")}</option>
              <option value="returns">{t("posMarket.repStatement.documentTypeReturns")}</option>
            </Select>
          </Field>

          <Field label={t("posMarket.repStatement.paymentTypeFilter")}>
            <Select
              value={paymentTypes}
              onChange={(event) =>
                setPaymentTypes(event.target.value as PosMarketRepStatementPaymentTypes)
              }
              className="rounded-xl"
            >
              <option value="both">{t("posMarket.repStatement.paymentTypeBoth")}</option>
              <option value="cash">{t("posMarket.repStatement.paymentTypeCash")}</option>
              <option value="credit">{t("posMarket.repStatement.paymentTypeCredit")}</option>
            </Select>
          </Field>

          <Field label={t("posMarket.repStatement.fromDate")}>
            <Input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="rounded-xl"
            />
          </Field>

          <Field label={t("posMarket.repStatement.toDate")}>
            <Input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="rounded-xl"
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => void handlePreview()} disabled={isStatementLoading}>
            {t("posMarket.repStatement.preview")}
          </Button>
          <Button type="button" onClick={() => void handlePrintA4()} disabled={isStatementLoading}>
            <LuPrinter className="ml-2 h-4 w-4" />
            {t("posMarket.repStatement.printA4")}
          </Button>
          <Button type="button" variant="outline" onClick={() => void handleExportPdf()} disabled={isStatementLoading}>
            <LuFileText className="ml-2 h-4 w-4" />
            {t("posMarket.repStatement.exportPdf")}
          </Button>
        </div>

        <p
          className="mt-3 text-sm"
          style={{ color: embedded ? "#6b7280" : POS_MARKET_THEME.colors.textMuted }}
        >
          {t("posMarket.repStatement.periodHint")}
        </p>
      </Card>

      {previewTotals ? (
        <div className={embedded ? "grid gap-4 md:grid-cols-2" : "mt-6 grid gap-4 md:grid-cols-2"}>
          <SummaryTile
            label={t("posMarket.repStatement.documentCount")}
            value={String(previewTotals.documentCount)}
          />
          <SummaryTile
            label={t("posMarket.repStatement.totalAmount")}
            value={formatCurrency(Number(previewTotals.totalAmount))}
          />
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return <div className="space-y-6">{panel}</div>;
  }

  return (
    <PageShell>
      <SectionHeading
        title={t("posMarket.repStatement.title")}
        description={t("posMarket.repStatement.subtitle")}
      />
      {panel}
    </PageShell>
  );
}
