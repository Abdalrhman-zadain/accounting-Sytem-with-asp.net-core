"use client";

import { cn } from "@/lib/utils";
import type { ContentTab, TranslationFn } from "../reporting-types";

const CONTENT_TABS: Array<{ id: ContentTab; labelKey: string }> = [
  { id: "activity", labelKey: "reporting.tab.activity" },
  { id: "trialBalance", labelKey: "reporting.tab.trialBalance" },
  { id: "generalLedger", labelKey: "reporting.tab.generalLedger" },
];

type ReportingContentTabsProps = {
  activeTab: ContentTab;
  onTabChange: (tab: ContentTab) => void;
  t: TranslationFn;
};

export function ReportingContentTabsBar({ activeTab, onTabChange, t }: ReportingContentTabsProps) {
  return (
    <div className="flex border-b border-gray-200 bg-white">
      {CONTENT_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "border-b-2 px-4 py-3 text-sm font-semibold transition",
              isActive
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-800",
            )}
          >
            {t(tab.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

export function contentTabToExportReportType(contentTab: ContentTab): "summary" | "trialBalance" | "generalLedger" {
  switch (contentTab) {
    case "trialBalance":
      return "trialBalance";
    case "generalLedger":
      return "generalLedger";
    default:
      return "summary";
  }
}
