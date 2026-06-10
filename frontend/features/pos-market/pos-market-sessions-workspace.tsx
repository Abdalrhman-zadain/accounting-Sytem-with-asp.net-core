"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui";
import { formatCount } from "@/features/pos-market/pos-market-cart-utils";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { usePosMarketSession } from "@/features/pos-market/use-pos-market-session";
import { getPosMarketSessionReport, getPosMarketSessions } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: POS_MARKET_THEME.colors.outline, backgroundColor: POS_MARKET_THEME.colors.primarySoft }}
    >
      <div className="text-xs font-semibold" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
        {label}
      </div>
      <div className="mt-1 text-sm font-bold" style={{ color: POS_MARKET_THEME.colors.text }}>
        {value}
      </div>
    </div>
  );
}

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
      {hint ? (
        <div className="mt-1 text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function PosMarketSessionsWorkspace() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const session = usePosMarketSession(token);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const sessionsQuery = useQuery({
    queryKey: queryKeys.posMarketSessions(token ?? null),
    queryFn: () => getPosMarketSessions(token),
    enabled: Boolean(token),
  });

  const reportSessionId = selectedSessionId ?? session.activeSession?.id ?? sessionsQuery.data?.[0]?.id ?? null;

  const reportQuery = useQuery({
    queryKey: queryKeys.posMarketSessionReport(token ?? null, reportSessionId),
    queryFn: () => getPosMarketSessionReport(reportSessionId!, token),
    enabled: Boolean(token && reportSessionId),
  });

  const report = reportQuery.data ?? null;

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border border-[#d5deea] p-6">
        <div className="text-2xl font-black arabic-heading" style={{ color: POS_MARKET_THEME.colors.text }}>
          {t("posMarket.workspace.sessions")}
        </div>
        <p className="mt-2 text-sm arabic-auto" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {session.activeSession
            ? t("pos.sessions.activeDescription", {
                sessionNumber: session.activeSession.sessionNumber,
                terminalName: session.activeSession.terminalName,
              })
            : t("pos.sessions.noOpen")}
        </p>
        {report ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <SoftMetric label={t("pos.sessions.expected")} value={report.expectedCash} />
            <SoftMetric label={t("pos.sessions.actual")} value={report.actualCash ?? "—"} />
            <SoftMetric label={t("pos.sessions.difference")} value={report.difference ?? "—"} />
            <SoftMetric
              label={t("pos.sessions.invoices")}
              value={formatCount(report.invoiceCount)}
              hint={t("pos.sessions.returnsHint", { count: report.returnCount })}
            />
          </div>
        ) : null}
      </Card>

      <Card className="rounded-[28px] border border-[#d5deea] p-6">
        <div className="text-lg font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
          {t("pos.sessions.recent")}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-3">
            {(sessionsQuery.data ?? []).map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedSessionId(row.id)}
                className={cn(
                  "w-full rounded-[20px] border p-4 text-left transition",
                  reportSessionId === row.id ? "shadow-sm" : "",
                )}
                style={{
                  borderColor:
                    reportSessionId === row.id
                      ? POS_MARKET_THEME.colors.primary
                      : POS_MARKET_THEME.colors.outline,
                  backgroundColor:
                    reportSessionId === row.id
                      ? POS_MARKET_THEME.colors.primarySoft
                      : POS_MARKET_THEME.colors.pageSurface,
                }}
              >
                <div className="font-bold" style={{ color: POS_MARKET_THEME.colors.text }}>
                  {row.sessionNumber}
                </div>
                <div className="text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                  {row.terminalName} · {row.warehouse?.name ?? "—"}
                </div>
                <div className="mt-1 text-sm font-bold" style={{ color: POS_MARKET_THEME.colors.primary }}>
                  {row.status}
                </div>
              </button>
            ))}
          </div>

          {report ? (
            <div
              className="rounded-[20px] border p-4"
              style={{ borderColor: POS_MARKET_THEME.colors.outline, backgroundColor: POS_MARKET_THEME.colors.pageSurface }}
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <DetailTile label={t("pos.sessions.branch")} value={report.branchName || "—"} />
                <DetailTile label={t("pos.sessions.warehouse")} value={report.warehouse.name} />
                <DetailTile label={t("pos.sessions.cashAccount")} value={report.cashAccount.name} />
                <DetailTile label={t("pos.sessions.openingCash")} value={report.openingCash} />
                <DetailTile label={t("pos.sessions.cashSales")} value={report.cashSales} />
                <DetailTile label={t("pos.sessions.cardSales")} value={report.cardSales} />
                <DetailTile label={t("pos.sessions.totalSales")} value={report.totalSales} />
                <DetailTile label={t("pos.sessions.tax")} value={report.tax} />
                <DetailTile
                  label={t("pos.sessions.openedAt")}
                  value={new Date(report.openedAt).toLocaleString()}
                />
                <DetailTile
                  label={t("pos.sessions.closedAt")}
                  value={report.closedAt ? new Date(report.closedAt).toLocaleString() : "—"}
                />
              </div>
            </div>
          ) : (
            <div
              className="rounded-[20px] border border-dashed p-6 text-sm"
              style={{ borderColor: POS_MARKET_THEME.colors.outline, color: POS_MARKET_THEME.colors.textMuted }}
            >
              {t("posMarket.sessions.selectHint")}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
