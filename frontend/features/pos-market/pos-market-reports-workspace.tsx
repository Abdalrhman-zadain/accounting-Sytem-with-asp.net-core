"use client";

import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui";
import { formatCount } from "@/features/pos-market/pos-market-cart-utils";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import {
  getPosMarketInventoryImpactReport,
  getPosMarketReportsOverview,
  getPosMarketSalesByBranchReport,
  getPosMarketSalesByCashierReport,
  getPosMarketSalesByItemReport,
  getPosMarketSalesByPaymentMethodReport,
  getPosMarketTaxSummaryReport,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { getLocalizedText } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { PosInventoryImpactRow, PosSalesByItemRow, PosTaxSummaryRow } from "@/types/api";

function SoftMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: POS_MARKET_THEME.colors.outline, backgroundColor: POS_MARKET_THEME.colors.cardSurface }}
    >
      <div className="text-xs font-bold uppercase tracking-wide" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
        {label}
      </div>
      <div className="mt-2 text-2xl font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>{hint}</div> : null}
    </div>
  );
}

function ReportCard({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
  emptyMessage: string;
}) {
  return (
    <Card className="rounded-[28px] border border-[#d5deea] p-6">
      <div className="text-lg font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
        {title}
      </div>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div
              key={`${row.label}-${row.value}`}
              className="flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3"
              style={{ borderColor: POS_MARKET_THEME.colors.outline, backgroundColor: POS_MARKET_THEME.colors.primarySoft }}
            >
              <div className="font-bold" style={{ color: POS_MARKET_THEME.colors.text }}>{row.label}</div>
              <div className="text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>{row.value}</div>
            </div>
          ))
        ) : (
          <div
            className="rounded-[18px] border border-dashed px-4 py-4 text-sm"
            style={{ borderColor: POS_MARKET_THEME.colors.outline, color: POS_MARKET_THEME.colors.textMuted }}
          >
            {emptyMessage}
          </div>
        )}
      </div>
    </Card>
  );
}

function DetailedTableCard({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <Card className="rounded-[28px] border border-[#d5deea] p-6">
      <div className="text-lg font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
        {title}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr style={{ color: POS_MARKET_THEME.colors.textMuted }}>
              {headers.map((header) => (
                <th key={header} className="px-3 py-2 text-start font-bold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr key={index} className="border-t" style={{ borderColor: POS_MARKET_THEME.colors.outline }}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2" style={{ color: POS_MARKET_THEME.colors.text }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-3 py-4" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function PosMarketReportsWorkspace() {
  const { token } = useAuth();
  const { t, language } = useTranslation();

  const overviewQuery = useQuery({
    queryKey: queryKeys.posMarketReportsOverview(token ?? null),
    queryFn: () => getPosMarketReportsOverview(token),
    enabled: Boolean(token),
  });

  const salesByPaymentMethodQuery = useQuery({
    queryKey: queryKeys.posMarketSalesByPaymentMethod(token ?? null),
    queryFn: () => getPosMarketSalesByPaymentMethodReport(token),
    enabled: Boolean(token),
  });

  const salesByCashierQuery = useQuery({
    queryKey: queryKeys.posMarketSalesByCashier(token ?? null),
    queryFn: () => getPosMarketSalesByCashierReport(token),
    enabled: Boolean(token),
  });

  const salesByBranchQuery = useQuery({
    queryKey: queryKeys.posMarketSalesByBranch(token ?? null),
    queryFn: () => getPosMarketSalesByBranchReport(token),
    enabled: Boolean(token),
  });

  const salesByItemQuery = useQuery({
    queryKey: queryKeys.posMarketSalesByItem(token ?? null),
    queryFn: () => getPosMarketSalesByItemReport(token),
    enabled: Boolean(token),
  });

  const inventoryImpactQuery = useQuery({
    queryKey: queryKeys.posMarketInventoryImpact(token ?? null),
    queryFn: () => getPosMarketInventoryImpactReport(token),
    enabled: Boolean(token),
  });

  const taxSummaryQuery = useQuery({
    queryKey: queryKeys.posMarketTaxSummary(token ?? null),
    queryFn: () => getPosMarketTaxSummaryReport(token),
    enabled: Boolean(token),
  });

  const overview = overviewQuery.data;
  const salesByPaymentMethod = salesByPaymentMethodQuery.data ?? overview?.salesByPaymentMethod ?? [];
  const salesByCashier = salesByCashierQuery.data ?? overview?.salesByCashier ?? [];
  const salesByBranch = salesByBranchQuery.data ?? overview?.salesByBranch ?? [];
  const salesByItem = salesByItemQuery.data ?? [];
  const inventoryImpact = inventoryImpactQuery.data ?? [];
  const taxSummary = taxSummaryQuery.data ?? overview?.taxSummary ?? [];

  const localizeReportName = (value?: string | null) => {
    if (!value || value === "Unassigned") return t("pos.reports.unassigned");
    if (value === "Untaxed" || value === "UNTAXED") return t("pos.reports.untaxed");
    return getLocalizedText(value, language);
  };

  const localizeReportPaymentMethod = (method: string) => {
    switch (method) {
      case "CASH":
      case "CARD":
      case "CLIQ":
      case "BANK_TRANSFER":
      case "WALLET":
      case "STORE_CREDIT":
        return t(`pos.returns.method.${method}`);
      default:
        return getLocalizedText(method, language);
    }
  };

  const localizeTaxSummaryLabel = (row: PosTaxSummaryRow) => {
    const taxLabel =
      row.taxCode === "UNTAXED"
        ? t("pos.reports.untaxed")
        : getLocalizedText(row.taxCode || row.taxName, language);
    return `${taxLabel} (${row.rate}%)`;
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border border-[#d5deea] p-6">
        <div className="text-2xl font-black arabic-heading" style={{ color: POS_MARKET_THEME.colors.text }}>
          {t("posMarket.workspace.reports")}
        </div>
        <p className="mt-2 text-sm arabic-auto" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {t("pos.reports.description")}
        </p>
        {overview ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <SoftMetric
              label={t("pos.reports.pendingReviewLabel")}
              value={formatCount(overview.pendingReviewCount)}
              hint={t("pos.reports.pendingReviewHint")}
            />
            <SoftMetric
              label={t("pos.reports.paymentMixLabel")}
              value={formatCount(salesByPaymentMethod.length)}
              hint={t("pos.reports.paymentMixHint")}
            />
            <SoftMetric
              label={t("pos.reports.cashiersLabel")}
              value={formatCount(salesByCashier.length)}
              hint={t("pos.reports.cashiersHint")}
            />
            <SoftMetric
              label={t("pos.reports.branchesLabel")}
              value={formatCount(salesByBranch.length)}
              hint={t("pos.reports.branchesHint")}
            />
          </div>
        ) : null}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportCard
          title={t("pos.reports.salesByPaymentTitle")}
          emptyMessage={t("pos.reports.noRows")}
          rows={salesByPaymentMethod.map((row) => ({
            label: localizeReportPaymentMethod(row.method),
            value: t("pos.reports.paymentValue", {
              amount: row.salesAmount,
              count: row.invoiceCount,
            }),
          }))}
        />
        <ReportCard
          title={t("pos.reports.salesByCashierTitle")}
          emptyMessage={t("pos.reports.noRows")}
          rows={salesByCashier.map((row) => ({
            label: localizeReportName(row.cashierName),
            value: t("pos.reports.paymentValue", {
              amount: row.salesAmount,
              count: row.invoiceCount,
            }),
          }))}
        />
        <ReportCard
          title={t("pos.reports.salesByBranchTitle")}
          emptyMessage={t("pos.reports.noRows")}
          rows={salesByBranch.map((row) => ({
            label: localizeReportName(row.branchName),
            value: t("pos.reports.paymentValue", {
              amount: row.salesAmount,
              count: row.invoiceCount,
            }),
          }))}
        />
        <ReportCard
          title={t("pos.reports.taxSummaryTitle")}
          emptyMessage={t("pos.reports.noRows")}
          rows={taxSummary.map((row: PosTaxSummaryRow) => ({
            label: localizeTaxSummaryLabel(row),
            value: t("pos.reports.taxValue", {
              netTax: row.netTax,
              returnTax: row.returnTax,
            }),
          }))}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DetailedTableCard
          title={t("pos.reports.salesByItemTitle")}
          headers={[
            t("pos.reports.header.item"),
            t("pos.reports.header.qty"),
            t("pos.reports.header.sales"),
            t("pos.reports.header.tax"),
          ]}
          rows={salesByItem.map((row: PosSalesByItemRow) => [
            localizeReportName(row.itemName),
            row.quantity,
            row.salesAmount,
            row.taxAmount,
          ])}
        />
        <DetailedTableCard
          title={t("pos.reports.inventoryImpactTitle")}
          headers={[
            t("pos.reports.header.reference"),
            t("pos.reports.header.item"),
            t("pos.reports.header.warehouse"),
            t("pos.reports.header.qtyInOut"),
            t("pos.reports.header.runningQty"),
          ]}
          rows={inventoryImpact.map((row: PosInventoryImpactRow) => [
            row.transactionReference,
            row.item?.name ? getLocalizedText(row.item.name, language) : "—",
            row.warehouse?.name ? getLocalizedText(row.warehouse.name, language) : "—",
            `${row.quantityOut} / ${row.quantityIn}`,
            row.runningQuantity,
          ])}
        />
      </div>
    </div>
  );
}
