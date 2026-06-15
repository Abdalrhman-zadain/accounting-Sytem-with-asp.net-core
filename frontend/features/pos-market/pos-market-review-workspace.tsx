"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Card } from "@/components/ui";
import { formatCurrency, getErrorMessage, parseAmount } from "@/features/pos-market/pos-market-cart-utils";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import {
  approvePosMarketAccounting,
  approvePosMarketSessionAccounting,
  getPendingPosMarketReview,
  getPosMarketSettings,
  getPosMarketSessions,
  rejectPosMarketAccounting,
  rejectPosMarketSessionAccounting,
  reversePosMarketAccounting,
} from "@/lib/api";
import { hasPermission } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { getLocalizedText } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { PosAccountingStatus, PosSale } from "@/types/api";

type ReviewSessionGroup = {
  sessionId: string | null;
  sessionNumber: string;
  warehouseName: string;
  sales: PosSale[];
};

export function PosMarketReviewWorkspace() {
  const { token, user } = useAuth();
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reviewQuery = useQuery({
    queryKey: queryKeys.posMarketReview(token ?? null),
    queryFn: () => getPendingPosMarketReview(token),
    enabled: Boolean(token),
  });

  const sessionsQuery = useQuery({
    queryKey: queryKeys.posMarketSessions(token ?? null),
    queryFn: () => getPosMarketSessions(token),
    enabled: Boolean(token),
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.posMarketSettings(token ?? null),
    queryFn: () => getPosMarketSettings(token),
    enabled: Boolean(token),
  });

  const isSessionPosting = settingsQuery.data?.runtime.postingMode === "BY_SESSION";

  const reviewSessionGroups = useMemo<ReviewSessionGroup[]>(() => {
    const groups = new Map<string, ReviewSessionGroup>();
    for (const sale of reviewQuery.data ?? []) {
      const sessionId = sale.session?.id ?? "unassigned";
      const existing = groups.get(sessionId);
      if (existing) {
        existing.sales.push(sale);
        continue;
      }
      groups.set(sessionId, {
        sessionId: sale.session?.id ?? null,
        sessionNumber: sale.session?.sessionNumber ?? t("pos.reports.unassigned"),
        warehouseName: sale.session?.warehouse?.name ?? "—",
        sales: [sale],
      });
    }
    return Array.from(groups.values());
  }, [reviewQuery.data, t]);

  const selectedGroup =
    reviewSessionGroups.find((group) => group.sessionId === selectedSessionId) ??
    reviewSessionGroups[0] ??
    null;

  const actionableAccountingStatuses: PosAccountingStatus[] = ["PENDING_REVIEW", "UNPOSTED"];
  const selectedGroupHasActionableSales = (selectedGroup?.sales ?? []).some((sale) => {
    if (!sale.posAccountingStatus) {
      return false;
    }
    return actionableAccountingStatuses.includes(sale.posAccountingStatus);
  });

  const invalidateReview = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketReview(token ?? null) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketSessions(token ?? null) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketReportsOverview(token ?? null) });
  };

  const approveSaleMutation = useMutation({
    mutationFn: (saleId: string) => approvePosMarketAccounting(saleId, {}, token),
    onSuccess: () => {
      setMessage(t("posMarket.review.approveSuccess"));
      invalidateReview();
    },
    onError: (error) => setMessage(getErrorMessage(error, t("posMarket.review.approveError"))),
  });

  const rejectSaleMutation = useMutation({
    mutationFn: (saleId: string) => rejectPosMarketAccounting(saleId, {}, token),
    onSuccess: () => {
      setMessage(t("posMarket.review.rejectSuccess"));
      invalidateReview();
    },
    onError: (error) => setMessage(getErrorMessage(error, t("posMarket.review.rejectError"))),
  });

  const reverseSaleMutation = useMutation({
    mutationFn: (saleId: string) => reversePosMarketAccounting(saleId, {}, token),
    onSuccess: () => {
      setMessage(t("posMarket.review.reverseSuccess"));
      invalidateReview();
    },
    onError: (error) => setMessage(getErrorMessage(error, t("posMarket.review.reverseError"))),
  });

  const approveSessionMutation = useMutation({
    mutationFn: (sessionId: string) => approvePosMarketSessionAccounting(sessionId, {}, token),
    onSuccess: () => {
      setMessage(t("posMarket.review.sessionApproveSuccess"));
      invalidateReview();
    },
    onError: (error) => setMessage(getErrorMessage(error, t("posMarket.review.sessionApproveError"))),
  });

  const rejectSessionMutation = useMutation({
    mutationFn: (sessionId: string) => rejectPosMarketSessionAccounting(sessionId, {}, token),
    onSuccess: () => {
      setMessage(t("posMarket.review.sessionRejectSuccess"));
      invalidateReview();
    },
    onError: (error) => setMessage(getErrorMessage(error, t("posMarket.review.sessionRejectError"))),
  });

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border border-[#d5deea] p-6">
        <div className="text-2xl font-black arabic-heading" style={{ color: POS_MARKET_THEME.colors.text }}>
          {t("posMarket.workspace.review")}
        </div>
        <p className="mt-2 text-sm arabic-auto" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {t("pos.review.description")}
        </p>
        <p className="mt-2 text-sm font-semibold" style={{ color: POS_MARKET_THEME.colors.primary }}>
          {t("pos.review.pendingSalesCount", { count: reviewQuery.data?.length ?? 0 })}
        </p>
      </Card>

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      {isSessionPosting ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {t("pos.review.sessionPostingOnly")}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="text-sm font-black uppercase tracking-wide" style={{ color: POS_MARKET_THEME.colors.primary }}>
            {t("pos.review.submittedSessions")}
          </div>
          {reviewSessionGroups.length === 0 ? (
            <Card className="rounded-[20px] border border-[#d5deea] p-4 text-sm text-[#5c6f86]">
              {t("pos.review.empty")}
            </Card>
          ) : (
            reviewSessionGroups.map((group) => (
              <button
                key={group.sessionId ?? group.sessionNumber}
                type="button"
                onClick={() => setSelectedSessionId(group.sessionId)}
                className="w-full rounded-[20px] border p-4 text-left"
                style={{
                  borderColor:
                    selectedGroup?.sessionId === group.sessionId
                      ? POS_MARKET_THEME.colors.primary
                      : POS_MARKET_THEME.colors.outline,
                  backgroundColor:
                    selectedGroup?.sessionId === group.sessionId
                      ? POS_MARKET_THEME.colors.primarySoft
                      : POS_MARKET_THEME.colors.cardSurface,
                }}
              >
                <div className="font-bold" style={{ color: POS_MARKET_THEME.colors.text }}>
                  {group.sessionNumber}
                </div>
                <div className="text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                  {group.warehouseName}
                </div>
                <div className="mt-1 text-xs font-bold" style={{ color: POS_MARKET_THEME.colors.primary }}>
                  {group.sales.length} {t("posMarket.review.sales")}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="space-y-4">
          {selectedGroup ? (
            <>
              <Card className="rounded-[20px] border border-[#d5deea] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
                      {t("pos.review.sessionReview")}
                    </div>
                    <div className="text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                      {t("pos.review.sessionWarehouse", {
                        session: selectedGroup.sessionNumber,
                        warehouse: selectedGroup.warehouseName,
                      })}
                    </div>
                  </div>
                  {selectedGroup.sessionId && selectedGroupHasActionableSales ? (
                    <div className="flex gap-2">
                      {hasPermission(user, "POS_APPROVE_ACCOUNTING") ? (
                        <button
                          type="button"
                          onClick={() => approveSessionMutation.mutate(selectedGroup.sessionId!)}
                          className="rounded-full px-4 py-2 text-xs font-bold text-white"
                          style={{ backgroundColor: POS_MARKET_THEME.colors.primary }}
                        >
                          {t("pos.review.approveSession")}
                        </button>
                      ) : null}
                      {hasPermission(user, "POS_REJECT_ACCOUNTING") ? (
                        <button
                          type="button"
                          onClick={() => rejectSessionMutation.mutate(selectedGroup.sessionId!)}
                          className="rounded-full border px-4 py-2 text-xs font-bold text-red-600"
                          style={{ borderColor: "#f0d9d6" }}
                        >
                          {t("pos.review.reject")}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Card>

              {selectedGroup.sales.map((sale) => (
                <Card key={sale.id} className="rounded-[20px] border border-[#d5deea] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
                        {sale.reference}
                      </div>
                      <div className="text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                        {sale.receiptNumber} · {formatCurrency(parseAmount(sale.totalAmount), sale.currencyCode)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isSessionPosting && hasPermission(user, "POS_APPROVE_ACCOUNTING") ? (
                        <button
                          type="button"
                          onClick={() => approveSaleMutation.mutate(sale.id)}
                          className="rounded-full px-3 py-1.5 text-xs font-bold text-white"
                          style={{ backgroundColor: POS_MARKET_THEME.colors.primary }}
                        >
                          {t("pos.review.approve")}
                        </button>
                      ) : null}
                      {!isSessionPosting && hasPermission(user, "POS_REJECT_ACCOUNTING") ? (
                        <button
                          type="button"
                          onClick={() => rejectSaleMutation.mutate(sale.id)}
                          className="rounded-full border px-3 py-1.5 text-xs font-bold text-red-600"
                          style={{ borderColor: "#f0d9d6" }}
                        >
                          {t("pos.review.reject")}
                        </button>
                      ) : null}
                      {!isSessionPosting && hasPermission(user, "POS_APPROVE_ACCOUNTING") ? (
                        <button
                          type="button"
                          onClick={() => reverseSaleMutation.mutate(sale.id)}
                          className="rounded-full border px-3 py-1.5 text-xs font-bold"
                          style={{ borderColor: POS_MARKET_THEME.colors.outline }}
                        >
                          {t("pos.review.reverse")}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                    {sale.lines.slice(0, 5).map((line) => (
                      <div key={line.id} className="flex justify-between gap-3">
                        <span>{getLocalizedText(line.itemName ?? line.description ?? "", language)}</span>
                        <span>
                          {line.quantity} x {line.unitPrice}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </>
          ) : (
            <Card className="rounded-[20px] border border-[#d5deea] p-6 text-sm text-[#5c6f86]">
              {t("pos.review.empty")}
            </Card>
          )}
        </div>
      </div>

      {(sessionsQuery.data ?? []).length > 0 ? null : null}
    </div>
  );
}
