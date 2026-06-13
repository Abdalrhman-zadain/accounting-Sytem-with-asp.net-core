"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LuSave } from "react-icons/lu";

import { AccountAutocomplete } from "@/features/accounting/chart-of-accounts/components/account-autocomplete";
import { Card } from "@/components/ui";
import { getErrorMessage } from "@/features/pos-market/pos-market-cart-utils";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { getAccountOptions, getPosMarketSettings, updatePosMarketSettings } from "@/lib/api";
import { hasPermission } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";

const PAYMENT_ACCOUNT_FIELDS = [
  { key: "cashAccountId", labelKey: "posMarket.settings.cashAccount" },
  { key: "cardAccountId", labelKey: "posMarket.settings.cardAccount" },
  { key: "cliqAccountId", labelKey: "posMarket.settings.cliqAccount" },
  { key: "walletAccountId", labelKey: "posMarket.settings.walletAccount" },
  { key: "bankTransferAccountId", labelKey: "posMarket.settings.bankTransferAccount" },
] as const;

export function PosMarketSettingsWorkspace() {
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: queryKeys.posMarketSettings(token ?? null),
    queryFn: () => getPosMarketSettings(token),
    enabled: Boolean(token),
  });

  const accountOptionsQuery = useQuery({
    queryKey: queryKeys.accounts(token ?? null, { isPosting: "true", isActive: "true", view: "selector" }),
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true", view: "selector" }, token),
    enabled: Boolean(token),
  });

  const [mappings, setMappings] = useState({
    cashAccountId: "",
    cardAccountId: "",
    cliqAccountId: "",
    walletAccountId: "",
    bankTransferAccountId: "",
  });

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) return;
    setMappings({
      cashAccountId: settings.accounts.cashAccountId ?? "",
      cardAccountId: settings.accounts.cardAccountId ?? "",
      cliqAccountId: settings.accounts.cliqAccountId ?? "",
      walletAccountId: settings.accounts.walletAccountId ?? "",
      bankTransferAccountId: settings.accounts.bankTransferAccountId ?? "",
    });
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => updatePosMarketSettings(mappings, token),
    onSuccess: () => {
      setMessage(t("posMarket.settings.saveSuccess"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.posMarketSettings(token ?? null) });
    },
    onError: (error) => setMessage(getErrorMessage(error, t("posMarket.settings.saveError"))),
  });

  const accountOptions = accountOptionsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border border-[#d5deea] p-6">
        <div className="text-2xl font-black arabic-heading" style={{ color: POS_MARKET_THEME.colors.text }}>
          {t("posMarket.workspace.settings")}
        </div>
        <p className="mt-2 text-sm arabic-auto" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {t("posMarket.settings.description")}
        </p>
      </Card>

      <Card className="rounded-[28px] border border-[#d5deea] p-6">
        <div className="text-lg font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
          {t("posMarket.settings.paymentMappings")}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {PAYMENT_ACCOUNT_FIELDS.map((field) => (
            <label key={field.key} className="block">
              <span className="text-sm font-bold" style={{ color: POS_MARKET_THEME.colors.text }}>
                {t(field.labelKey)}
              </span>
              <div className="mt-2">
                <AccountAutocomplete
                  accounts={accountOptions}
                  value={mappings[field.key]}
                  onChange={(accountId) =>
                    setMappings((current) => ({ ...current, [field.key]: accountId }))
                  }
                  displayMode="arabicOnly"
                  inputClassName="rounded-[16px] border px-3 py-3 text-sm font-semibold"
                />
              </div>
            </label>
          ))}
        </div>

        {message ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {message}
          </p>
        ) : null}

        <button
          type="button"
          disabled={!hasPermission(user, "POS_VIEW_POS_REPORTS") || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: POS_MARKET_THEME.colors.primary }}
        >
          <LuSave className="h-4 w-4" />
          {saveMutation.isPending ? t("pos.settings.saving") : t("posMarket.settings.save")}
        </button>
      </Card>
    </div>
  );
}
