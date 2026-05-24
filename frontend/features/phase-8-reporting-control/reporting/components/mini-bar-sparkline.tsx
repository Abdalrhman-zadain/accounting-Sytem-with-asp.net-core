"use client";

import { cn } from "@/lib/utils";

/** Fallback when API trend series is unavailable: interpolate comparison → current. */
export function deriveSparklineValues(comparisonAmount: string, amount: string): number[] {
  const start = Math.abs(Number(comparisonAmount) || 0);
  const end = Math.abs(Number(amount) || 0);
  const steps = 4;

  if (start === 0 && end === 0) {
    return [0.15, 0.15, 0.15, 0.15, 0.15];
  }

  return Array.from({ length: 5 }, (_, index) => {
    const t = index / steps;
    return start + (end - start) * t;
  });
}

function normalizeHeights(values: number[]): number[] {
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || max;

  return values.map((value) => {
    const normalized = range === 0 ? 0.35 : 0.2 + ((value - min) / range) * 0.8;
    return Math.min(1, Math.max(0.12, normalized));
  });
}

function trendToHeights(trend: string[]): number[] {
  const magnitudes = trend.map((value) => Math.abs(Number(value) || 0));
  return normalizeHeights(magnitudes);
}

type MiniBarSparklineProps = {
  trend?: string[];
  trendLabels?: string[];
  comparisonAmount: string;
  amount: string;
  barClassName?: string;
  className?: string;
};

export function MiniBarSparkline({
  trend,
  trendLabels,
  comparisonAmount,
  amount,
  barClassName,
  className,
}: MiniBarSparklineProps) {
  const heights = trend?.length ? trendToHeights(trend) : normalizeHeights(deriveSparklineValues(comparisonAmount, amount));
  const labels = trendLabels?.length === heights.length ? trendLabels : undefined;

  return (
    <div
      className={cn("flex h-10 items-end justify-between gap-1", className)}
      role="img"
      aria-label={
        labels?.length
          ? `Trend ${labels[0]} to ${labels[labels.length - 1]}`
          : "Period trend"
      }
    >
      {heights.map((height, index) => (
        <div
          key={labels?.[index] ?? index}
          className={cn("w-full max-w-[14px] rounded-sm bg-blue-500/80", barClassName)}
          style={{ height: `${height * 100}%` }}
          title={labels?.[index]}
        />
      ))}
    </div>
  );
}
