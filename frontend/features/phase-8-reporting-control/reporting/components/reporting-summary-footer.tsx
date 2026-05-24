"use client";

import type { ReportingSummary } from "@/types/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { TranslationFn } from "../reporting-types";

type ReportingSummaryFooterProps = {
  summary: ReportingSummary;
  t: TranslationFn;
  sidebarCollapsed?: boolean;
};

function metricAmount(summary: ReportingSummary, key: string) {
  return summary.metrics.find((metric) => metric.key === key)?.amount ?? "0.00";
}

export function ReportingSummaryFooter({ summary, t, sidebarCollapsed }: ReportingSummaryFooterProps) {
  const items = [
    { label: t("reporting.footer.totalAssets"), value: formatCurrency(metricAmount(summary, "assets")) },
    { label: t("reporting.footer.balanceDifference"), value: formatCurrency(metricAmount(summary, "trialBalanceDifference")) },
    { label: t("reporting.footer.cashAccounts"), value: String(summary.operational.cashAccountCount) },
    { label: t("reporting.footer.auditEvents"), value: String(summary.operational.auditEventCount) },
    { label: t("reporting.footer.generatedAt"), value: formatDate(summary.generatedAt) },
  ];

  return (
    <footer
      className={cn(
        "fixed bottom-0 z-20 border-t border-gray-200 bg-white",
        sidebarCollapsed ? "ltr:left-20 rtl:right-20" : "ltr:left-60 rtl:right-60",
        "ltr:right-0 rtl:left-0",
      )}
    >
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-6">
        {items.map((item) => (
          <div key={item.label} className="flex min-w-[120px] flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{item.label}</span>
            <span className="text-sm font-semibold text-gray-900 tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
    </footer>
  );
}
