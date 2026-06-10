"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Card } from "@/components/ui";
import {
  formatCurrency,
  mapPosSaleToHeldSale,
  stashHeldSaleForResume,
} from "@/features/pos-market/pos-market-cart-utils";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { usePosMarketSession } from "@/features/pos-market/use-pos-market-session";
import { getDraftPosMarketSales, getHeldPosMarketSales, voidPosMarketSale } from "@/lib/api";
import { hasPermission } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { getLocalizedText } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function PosMarketHeldWorkspace() {
  const { token, user } = useAuth();
  const { t, language } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = usePosMarketSession(token);
  const activeSession = session.activeSession;

  const heldQuery = useQuery({
    queryKey: queryKeys.posMarketHeldSales(token ?? null, activeSession?.id ?? null),
    queryFn: () => getHeldPosMarketSales(activeSession!.id, token),
    enabled: Boolean(token && activeSession?.id),
  });

  const draftQuery = useQuery({
    queryKey: queryKeys.posMarketDraftSales(token ?? null, activeSession?.id ?? null),
    queryFn: () => getDraftPosMarketSales(activeSession!.id, token),
    enabled: Boolean(token && activeSession?.id),
  });

  const voidMutation = useMutation({
    mutationFn: (saleId: string) => voidPosMarketSale(saleId, {}, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posMarketHeldSales(token ?? null, activeSession?.id ?? null),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posMarketDraftSales(token ?? null, activeSession?.id ?? null),
      });
    },
  });

  const heldSales = (heldQuery.data ?? []).map(mapPosSaleToHeldSale);
  const draftSales = (draftQuery.data ?? []).map(mapPosSaleToHeldSale);

  const renderSaleCard = (
    sale: ReturnType<typeof mapPosSaleToHeldSale>,
    resumeLabel: string,
  ) => (
    <Card key={sale.id} className="rounded-[28px] border border-[#d5deea] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
            {sale.title}
          </div>
          <div className="mt-1 space-y-0.5 text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
            {sale.customerName ? (
              <p className="font-semibold arabic-heading" style={{ color: POS_MARKET_THEME.colors.text }}>
                {sale.customerName}
              </p>
            ) : null}
            <p>{new Date(sale.createdAt).toLocaleString()}</p>
          </div>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold"
          style={{ backgroundColor: POS_MARKET_THEME.colors.primarySoft, color: POS_MARKET_THEME.colors.primary }}
        >
          {t("posMarket.held.linesCount", { count: sale.cartLines.length })}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
        {sale.cartLines.slice(0, 4).map((line) => (
          <div key={`${sale.id}-${line.itemId}`} className="flex justify-between gap-3">
            <span>{getLocalizedText(line.name, language)}</span>
            <span>
              {line.quantity} x {formatCurrency(line.unitPrice)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={() => {
            stashHeldSaleForResume(sale);
            router.push(`/pos-market/register?resume=${sale.id}`);
          }}
          className="rounded-full px-4 py-2 text-xs font-bold text-white"
          style={{ backgroundColor: POS_MARKET_THEME.colors.primary }}
        >
          {resumeLabel}
        </button>
        {hasPermission(user, "POS_VOID_DRAFT_SALE") ? (
          <button
            type="button"
            onClick={() => voidMutation.mutate(sale.id)}
            className="rounded-full border px-4 py-2 text-xs font-bold text-red-600"
            style={{ borderColor: "#f0d9d6" }}
          >
            {t("pos.sales.voidAction")}
          </button>
        ) : null}
      </div>
    </Card>
  );

  if (!activeSession) {
    return (
      <Card className="rounded-[28px] border border-[#d5deea] p-6">
        <p className="text-[#5c6f86]">{t("posMarket.held.noSession")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border border-[#d5deea] p-6">
        <div className="text-2xl font-black arabic-heading" style={{ color: POS_MARKET_THEME.colors.text }}>
          {t("posMarket.workspace.held")}
        </div>
        <p className="mt-2 text-sm arabic-auto" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {t("pos.held.description")}
        </p>
      </Card>

      <div className="space-y-4">
        <div className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: POS_MARKET_THEME.colors.primary }}>
          {t("posMarket.held.drafts")}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {draftSales.length > 0 ? (
            draftSales.map((sale) => renderSaleCard(sale, t("pos.held.resumeDraft")))
          ) : (
            <Card className="rounded-[28px] border border-[#d5deea] p-6 text-sm text-[#5c6f86]">
              {t("posMarket.held.noDrafts")}
            </Card>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: POS_MARKET_THEME.colors.primary }}>
          {t("posMarket.held.heldSales")}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {heldSales.length > 0 ? (
            heldSales.map((sale) => renderSaleCard(sale, t("pos.sales.resumeHeld")))
          ) : (
            <Card className="rounded-[28px] border border-[#d5deea] p-6 text-sm text-[#5c6f86]">
              {t("pos.held.empty")}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
