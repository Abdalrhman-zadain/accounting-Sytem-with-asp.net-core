"use client";

import { cn } from "@/lib/utils";

const actionStyles: Record<string, string> = {
  CREATE: "border-blue-200 bg-blue-50 text-blue-700",
  VIEW: "border-gray-200 bg-gray-100 text-gray-700",
  UPDATE: "border-orange-200 bg-orange-50 text-orange-700",
};

export function ReportingActionBadge({ action }: { action: string }) {
  const normalized = action.trim().toUpperCase();
  const style = actionStyles[normalized] ?? "border-gray-200 bg-gray-50 text-gray-600";

  return (
    <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-xs font-bold tracking-wide", style)}>
      {normalized || action}
    </span>
  );
}
