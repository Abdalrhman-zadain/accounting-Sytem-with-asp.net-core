"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui";
import {
  formatCurrency,
  mapPosSaleToAmendSale,
  parseAmount,
  stashAmendSaleForEdit,
} from "@/features/pos-market/pos-market-cart-utils";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { usePosMarketSession } from "@/features/pos-market/use-pos-market-session";
import { getCompletedPosMarketSales } from "@/lib/api";
import { hasPermission } from "@/lib/auth-access";
import { useTranslation, type TranslationKey } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import type { PosSale } from "@/types/api";

function amendBlockReasonKey(reason: string | null | undefined): TranslationKey {
  switch (reason) {
    case "NO_PERMISSION":
      return "posMarket.amend.block.noPermission";
    case "REP_ONLY":
      return "posMarket.amend.block.repOnly";
    case "NOT_MARKET":
      return "posMarket.amend.block.notMarket";
    case "NOT_COMPLETED":
      return "posMarket.amend.block.notCompleted";
    case "ACCOUNTING_POSTED":
      return "posMarket.amend.block.accountingPosted";
    case "POSTING_MODE":
      return "posMarket.amend.block.postingMode";
    case "SESSION_CLOSED":
      return "posMarket.amend.block.sessionClosed";
    case "JOURNAL_POSTED":
      return "posMarket.amend.block.journalPosted";
    case "HAS_RETURNS":
      return "posMarket.amend.block.hasReturns";
    case "HAS_COLLECTIONS":
      return "posMarket.amend.block.hasCollections";
    case "WRONG_REP":
      return "posMarket.amend.block.wrongRep";
    default:
      return "posMarket.amend.block.unknown";
  }
}

export function PosMarketAmendWorkspace() {
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const session = usePosMarketSession(token);
  const activeSession = session.activeSession;

  const completedQuery = useQuery({
    queryKey: [...queryKeys.posMarketCompletedSales(token ?? null), activeSession?.id ?? null],
    queryFn: () => getCompletedPosMarketSales(token, activeSession!.id),
    enabled: Boolean(token && activeSession?.id),
  });

  const canAmend = hasPermission(user, "POS_MARKET_AMEND_SALE");
  const sales = completedQuery.data ?? [];
  const amendableSales = sales.filter((sale) => sale.canAmend);
  const currencyCode = activeSession?.cashAccount?.currencyCode ?? "JOD";

  const handleSelectSale = (sale: PosSale) => {
    stashAmendSaleForEdit(mapPosSaleToAmendSale(sale));
    router.push(`/pos-market/register?amend=${sale.id}`);
  };

  if (!canAmend) {
    return (
      <Card className="rounded-[28px] border border-[#d5deea] p-6">
        <p className="text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {t("posMarket.amend.noPermission")}
        </p>
      </Card>
    );
  }

  if (!activeSession) {
    return (
      <Card className="rounded-[28px] border border-[#d5deea] p-6">
        <h2 className="text-lg font-black arabic-heading" style={{ color: POS_MARKET_THEME.colors.text }}>
          {t("posMarket.amend.pageTitle")}
        </h2>
        <p className="mt-3 text-sm leading-7" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {t("posMarket.amend.requiresOpenSession")}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <Card className="rounded-[28px] border border-[#d5deea] p-6">
        <h2 className="text-lg font-black arabic-heading" style={{ color: POS_MARKET_THEME.colors.text }}>
          {t("posMarket.amend.pageTitle")}
        </h2>
        <p className="mt-2 text-sm leading-7" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {t("posMarket.amend.pageDescription")}
        </p>
        <p className="mt-2 text-xs leading-6" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {t("posMarket.amend.accountingNote")}
        </p>
      </Card>

      {completedQuery.isLoading ? (
        <Card className="rounded-[28px] border border-[#d5deea] p-6">
          <p className="text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
            {t("common.loading")}
          </p>
        </Card>
      ) : sales.length === 0 ? (
        <Card className="rounded-[28px] border border-[#d5deea] p-6">
          <p className="text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
            {t("posMarket.amend.empty")}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => (
            <Card
              key={sale.id}
              className="rounded-[24px] border border-[#d5deea] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
                    {sale.receiptNumber ?? sale.reference}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                    {sale.customer?.name ?? "—"}
                  </div>
                  <div className="mt-1 text-xs font-semibold" style={{ color: POS_MARKET_THEME.colors.text }}>
                    {formatCurrency(parseAmount(sale.totalAmount), currencyCode)}
                  </div>
                  {!sale.canAmend && sale.amendBlockReason ? (
                    <p className="mt-2 text-xs leading-6 text-amber-800">
                      {t(amendBlockReasonKey(sale.amendBlockReason))}
                    </p>
                  ) : null}
                  {sale.canAmend && sale.hasPriorCollections ? (
                    <p className="mt-2 text-xs leading-6" style={{ color: POS_MARKET_THEME.colors.primary }}>
                      {t("posMarket.amend.hasPriorCollections")}
                    </p>
                  ) : null}
                </div>
                {sale.canAmend ? (
                  <button
                    type="button"
                    onClick={() => handleSelectSale(sale)}
                    className="rounded-full px-4 py-2 text-xs font-bold text-white"
                    style={{ backgroundColor: POS_MARKET_THEME.colors.primary }}
                  >
                    {t("posMarket.amend.selectAndEdit")}
                  </button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      {amendableSales.length > 0 ? (
        <p className="px-2 text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {t("posMarket.amend.amendableCount", { count: amendableSales.length })}
        </p>
      ) : null}
    </div>
  );
}
