"use client";

import { LuClock3 } from "react-icons/lu";

import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { useTranslation } from "@/lib/i18n";
import { getLocalizedText } from "@/lib/utils";
import type { PosSession } from "@/types/api";

type PosMarketSessionBarProps = {
  session: PosSession | null;
  onCloseSession: () => void;
  isPending?: boolean;
  canCloseSession?: boolean;
};

export function PosMarketSessionBar({
  session,
  onCloseSession,
  isPending,
  canCloseSession = true,
}: PosMarketSessionBarProps) {
  const { t, language } = useTranslation();

  return (
    <div
      className="shrink-0 border-b px-3 py-3 sm:px-5"
      style={{
        borderColor: POS_MARKET_THEME.colors.outline,
        backgroundColor: POS_MARKET_THEME.colors.cardSurface,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: POS_MARKET_THEME.colors.primary }}
          >
            <LuClock3 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold" style={{ color: POS_MARKET_THEME.colors.text }}>
              {session
                ? t("posMarket.session.active", { number: session.sessionNumber })
                : t("posMarket.session.closed")}
            </p>
            {session ? (
              <p className="truncate text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                {session.terminalName}
                {session.salesRep?.name ? ` · ${session.salesRep.name}` : ""}
                {session.warehouse?.name ? ` · ${session.warehouse.name}` : ""}
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onCloseSession}
          disabled={isPending || !session || canCloseSession === false}
          title={
            canCloseSession === false
              ? getLocalizedText("You cannot close this shift / لا يمكن إغلاق الوردية", language)
              : undefined
          }
          className="rounded-xl border px-4 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            borderColor: "#f0d9d6",
            backgroundColor: "#fff5f4",
            color: "#b54b40",
          }}
        >
          {isPending ? t("pos.sessions.closingAction") : t("pos.sessions.closeShiftAction")}
        </button>
      </div>
    </div>
  );
}
