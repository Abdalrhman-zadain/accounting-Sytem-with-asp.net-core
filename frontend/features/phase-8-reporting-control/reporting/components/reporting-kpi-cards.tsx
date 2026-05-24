"use client";

import type { ReportingMetric, ReportingSummary } from "@/types/api";
import { formatCurrency } from "@/lib/utils";
import type { TranslationFn } from "../reporting-types";
import { MiniBarSparkline } from "./mini-bar-sparkline";

const KPI_KEYS = ["assets", "liabilities", "equity", "netIncome"] as const;

function getSummaryMetricLabel(key: string, fallback: string, t: TranslationFn) {
  const translationKey = `reporting.summary.metric.${key}`;
  const translated = t(translationKey);
  return translated === translationKey ? fallback : translated;
}

type ReportingKpiCardsProps = {
  summary: ReportingSummary;
  t: TranslationFn;
};

export function ReportingKpiCards({ summary, t }: ReportingKpiCardsProps) {
  const metricsByKey = new Map(summary.metrics.map((metric) => [metric.key, metric]));
  const cards = KPI_KEYS.map((key) => metricsByKey.get(key)).filter((metric): metric is ReportingMetric => Boolean(metric));

  if (!cards.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((metric) => (
        <div key={metric.key} className="flex flex-col border border-gray-200 bg-white p-4">
          <div className="text-xs font-semibold text-gray-500">{getSummaryMetricLabel(metric.key, metric.label, t)}</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">{formatCurrency(metric.amount)}</div>
          <div className="mt-1 text-sm text-gray-500">
            {t("reporting.metric.comparison")}: {formatCurrency(metric.comparisonAmount)}
          </div>
          <div className="mt-4">
            <MiniBarSparkline
              trend={metric.trend}
              trendLabels={summary.trendLabels}
              comparisonAmount={metric.comparisonAmount}
              amount={metric.amount}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
