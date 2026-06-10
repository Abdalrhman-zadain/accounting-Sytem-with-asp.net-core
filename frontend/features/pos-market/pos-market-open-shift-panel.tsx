"use client";

import { useEffect, useState } from "react";

import { Field, Input } from "@/components/ui/forms";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { useTranslation } from "@/lib/i18n";
import { getLocalizedText } from "@/lib/utils";
import type { BankCashAccount, InventoryWarehouse } from "@/types/api";

type MarketSalesRepOption = { id: string; code: string; name: string };

import { normalizePaymentAccountMethod } from "./pos-market-cart-utils";

type SessionFormState = {
  terminalName: string;
  branchName: string;
  openingCash: string;
};

type PosMarketOpenShiftPanelProps = {
  sessionState: SessionFormState;
  cashierLabel: string;
  warehouses: InventoryWarehouse[];
  paymentAccounts: BankCashAccount[];
  salesReps?: MarketSalesRepOption[];
  showSalesRepPicker?: boolean;
  lockedSalesRepId?: string | null;
  onSessionStateChange: (patch: Partial<SessionFormState>) => void;
  onOpenSession: (
    openingCash: string,
    warehouseId: string,
    cashAccountId: string,
    salesRepId: string,
  ) => void;
  isPending?: boolean;
  canOpenShift?: boolean;
};

export function PosMarketOpenShiftPanel({
  sessionState,
  cashierLabel,
  warehouses,
  paymentAccounts,
  salesReps = [],
  showSalesRepPicker = false,
  lockedSalesRepId,
  onSessionStateChange,
  onOpenSession,
  isPending,
  canOpenShift = true,
}: PosMarketOpenShiftPanelProps) {
  const { t, language } = useTranslation();
  const isArabic = language === "ar";
  const [openingCash, setOpeningCash] = useState(sessionState.openingCash);
  const [warehouseId, setWarehouseId] = useState("");
  const [cashAccountId, setCashAccountId] = useState("");
  const [salesRepId, setSalesRepId] = useState(lockedSalesRepId ?? "");

  useEffect(() => {
    if (!warehouseId && warehouses.length > 0) {
      const defaultWarehouse =
        warehouses.find((warehouse) => warehouse.code === "WH-MAIN") ?? warehouses[0];
      setWarehouseId(defaultWarehouse.id);
    }
  }, [warehouseId, warehouses]);

  useEffect(() => {
    if (!cashAccountId && paymentAccounts.length > 0) {
      const defaultCash =
        paymentAccounts.find(
          (account) => normalizePaymentAccountMethod(account) === "CASH",
        ) ?? paymentAccounts[0];
      setCashAccountId(defaultCash.id);
    }
  }, [cashAccountId, paymentAccounts]);

  useEffect(() => {
    if (lockedSalesRepId) {
      setSalesRepId(lockedSalesRepId);
      return;
    }
    if (!salesRepId && salesReps.length === 1) {
      setSalesRepId(salesReps[0].id);
    }
  }, [lockedSalesRepId, salesRepId, salesReps]);

  const resolvedSalesRepId = lockedSalesRepId ?? salesRepId;

  const inputClass =
    "rounded-[18px] border py-3 text-sm font-semibold";
  const inputStyle = {
    borderColor: POS_MARKET_THEME.colors.outline,
    backgroundColor: POS_MARKET_THEME.colors.cardSurface,
    color: POS_MARKET_THEME.colors.text,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={t("pos.sessions.terminalNumberLabel")} className="mb-0">
        <Input
          value={sessionState.terminalName}
          onChange={(event) => onSessionStateChange({ terminalName: event.target.value })}
          className={inputClass}
          style={inputStyle}
        />
      </Field>
      <Field label={t("pos.sessions.branch")} className="mb-0">
        <Input
          value={sessionState.branchName}
          onChange={(event) => onSessionStateChange({ branchName: event.target.value })}
          className={inputClass}
          style={inputStyle}
        />
      </Field>
      <Field label={t("pos.sessions.cashierLabel")} className="mb-0">
        <Input
          value={cashierLabel}
          readOnly
          className={inputClass}
          style={{ ...inputStyle, backgroundColor: POS_MARKET_THEME.colors.primarySoft }}
        />
      </Field>
      <Field label={t("pos.sessions.openingCash")} className="mb-0">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={openingCash}
          onChange={(event) => setOpeningCash(event.target.value)}
          className={inputClass}
          style={inputStyle}
        />
      </Field>
      <Field
        label={getLocalizedText("المستودع الرئيسي / Main warehouse", language)}
        className="mb-0"
      >
        <select
          value={warehouseId}
          onChange={(event) => setWarehouseId(event.target.value)}
          className={`w-full px-4 ${inputClass}`}
          style={inputStyle}
        >
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
      </Field>
      {showSalesRepPicker ? (
        <Field
          label={getLocalizedText("المندوب / Sales rep", language)}
          className="mb-0"
        >
          <select
            value={resolvedSalesRepId}
            onChange={(event) => setSalesRepId(event.target.value)}
            disabled={Boolean(lockedSalesRepId)}
            className={`w-full px-4 ${inputClass}`}
            style={inputStyle}
          >
            <option value="">{getLocalizedText("اختر المندوب / Select rep", language)}</option>
            {salesReps.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <Field label={t("pos.sessions.cashRegisterLabel")} className="mb-0">
        <select
          value={cashAccountId}
          onChange={(event) => setCashAccountId(event.target.value)}
          className={`w-full px-4 ${inputClass}`}
          style={inputStyle}
        >
          {paymentAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {isArabic ? account.account?.nameAr || account.name : account.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="md:col-span-2">
        <button
          type="button"
          onClick={() =>
            onOpenSession(openingCash, warehouseId, cashAccountId, resolvedSalesRepId)
          }
          disabled={
            isPending ||
            !canOpenShift ||
            !warehouseId ||
            !cashAccountId ||
            !resolvedSalesRepId
          }
          title={
            !canOpenShift
              ? getLocalizedText(
                  "Requires POS_OPEN_SESSION permission / يتطلب صلاحية فتح الجلسة",
                  language,
                )
              : undefined
          }
          className="w-full rounded-[20px] px-4 py-3 text-sm font-black text-white transition disabled:opacity-50"
          style={{ backgroundColor: POS_MARKET_THEME.colors.primary }}
        >
          {isPending ? t("pos.sessions.openingAction") : t("pos.sessions.openShiftAction")}
        </button>
      </div>
    </div>
  );
}
