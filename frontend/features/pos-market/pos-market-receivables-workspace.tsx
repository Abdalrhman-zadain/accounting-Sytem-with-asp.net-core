"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Card, Modal } from "@/components/ui";
import { Field, Input, Select } from "@/components/ui/forms";
import {
  formatCurrency,
  getErrorMessage,
  parseAmount,
} from "@/features/pos-market/pos-market-cart-utils";
import {
  printMarketAccountStatement,
  printMarketCollectionReceipt,
} from "@/features/pos-market/pos-market-print-service";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import {
  collectPosMarketReceivables,
  getBankCashAccounts,
  getPosMarketReceivableSalesReps,
  getPosMarketReceivables,
  type PosMarketReceivableCustomer,
} from "@/lib/api";
import { hasPermission, isMarketRepUser } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: POS_MARKET_THEME.colors.outline,
        backgroundColor: POS_MARKET_THEME.colors.cardSurface,
      }}
    >
      <div className="text-xs font-bold uppercase tracking-wide" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
        {label}
      </div>
      <div className="mt-2 text-2xl font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
        {value}
      </div>
    </div>
  );
}

function buildStatementPayload(
  row: PosMarketReceivableCustomer,
  printedBy?: string | null,
) {
  return {
    statementDate: new Date().toISOString(),
    companyName: "Simple Account",
    customerName: row.customerName,
    customerCode: row.customerCode,
    salesRepName: row.salesRepName,
    totalDelivered: parseAmount(row.totalDelivered),
    totalPaid: parseAmount(row.totalPaid),
    outstandingBalance: parseAmount(row.outstandingBalance),
    printedBy: printedBy ?? null,
  };
}

export function PosMarketReceivablesWorkspace() {
  const { token, user, isHydrated } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [salesRepFilter, setSalesRepFilter] = useState("");
  const [balanceOnly, setBalanceOnly] = useState(false);
  const [collectCustomer, setCollectCustomer] = useState<PosMarketReceivableCustomer | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectDate, setCollectDate] = useState(new Date().toISOString().slice(0, 10));
  const [collectBankAccountId, setCollectBankAccountId] = useState("");
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [flashTone, setFlashTone] = useState<"success" | "error">("success");

  const isRep = isHydrated && isMarketRepUser(user);
  const canCollect = isHydrated && hasPermission(user, "POS_MARKET_COLLECT_RECEIVABLE");
  const showRepFilter = isHydrated && !isRep;
  const showBalanceOnlyFilter = showRepFilter;

  const receivablesQuery = useQuery({
    queryKey: queryKeys.posMarketReceivables(token ?? null, {
      salesRepId: salesRepFilter || undefined,
      search: search.trim() || undefined,
      balanceOnly: showBalanceOnlyFilter && balanceOnly ? true : undefined,
    }),
    queryFn: () =>
      getPosMarketReceivables(
        {
          salesRepId: salesRepFilter || undefined,
          search: search.trim() || undefined,
          balanceOnly: showBalanceOnlyFilter && balanceOnly ? true : undefined,
        },
        token,
      ),
    enabled: Boolean(token),
  });

  const salesRepsQuery = useQuery({
    queryKey: queryKeys.posMarketReceivableSalesReps(token ?? null),
    queryFn: () => getPosMarketReceivableSalesReps(token),
    enabled: Boolean(token && showRepFilter),
  });

  const bankAccountsQuery = useQuery({
    queryKey: queryKeys.bankCashAccounts(token ?? null, { isActive: "true" }),
    queryFn: () => getBankCashAccounts({ isActive: "true" }, token),
    enabled: Boolean(token && collectCustomer),
  });

  const rows = receivablesQuery.data?.customers ?? [];
  const totals = receivablesQuery.data?.totals;
  const bankAccounts = bankAccountsQuery.data ?? [];

  const collectMutation = useMutation({
    mutationFn: () => {
      if (!collectCustomer) throw new Error("No customer selected");
      const amount = Number(parseAmount(collectAmount).toFixed(2));
      if (amount <= 0) throw new Error(t("posMarket.receivables.amount"));
      if (!collectBankAccountId) throw new Error(t("posMarket.receivables.bankAccount"));

      return collectPosMarketReceivables(
        {
          customerId: collectCustomer.customerId,
          receiptDate: collectDate,
          amount,
          bankCashAccountId: collectBankAccountId,
        },
        token,
      );
    },
    onSuccess: async (response) => {
      const customerSnapshot = collectCustomer;
      setCollectCustomer(null);
      setCollectAmount("");
      setFlashMessage(t("posMarket.receivables.collectSuccess"));
      setFlashTone("success");
      try {
        await printMarketCollectionReceipt({
          reference: response.reference,
          receiptDate: response.receiptDate,
          companyName: "Simple Account",
          customerName: response.customerName,
          customerCode: response.customerCode,
          salesRepName: customerSnapshot?.salesRepName ?? null,
          balanceBefore: parseAmount(response.balanceBefore),
          amountPaid: parseAmount(response.amountPaid),
          balanceAfter: parseAmount(response.balanceAfter),
          bankCashAccountName: response.bankCashAccountName,
          collectedBy: user?.name ?? user?.username ?? null,
        });
      } catch {
        // printing failure should not block collection
      }
      await queryClient.invalidateQueries({ queryKey: ["pos-market-receivables", token] });
    },
    onError: (error) => {
      setFlashMessage(getErrorMessage(error, t("posMarket.receivables.collectError")));
      setFlashTone("error");
    },
  });

  const openCollectModal = (customer: PosMarketReceivableCustomer) => {
    setCollectCustomer(customer);
    setCollectAmount(customer.outstandingBalance);
    setCollectBankAccountId("");
  };

  const handlePrintStatement = async (row: PosMarketReceivableCustomer) => {
    try {
      await printMarketAccountStatement(
        buildStatementPayload(row, user?.name ?? user?.username ?? null),
      );
    } catch {
      setFlashMessage(t("posMarket.statement.printError"));
      setFlashTone("error");
    }
  };

  useEffect(() => {
    if (!collectCustomer || collectBankAccountId || bankAccounts.length === 0) return;
    setCollectBankAccountId(bankAccounts[0]?.id ?? "");
  }, [bankAccounts, collectBankAccountId, collectCustomer]);

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border border-[#d5deea] p-6">
        <div className="text-2xl font-black arabic-heading" style={{ color: POS_MARKET_THEME.colors.text }}>
          {isRep ? t("posMarket.statement.title") : t("posMarket.receivables.title")}
        </div>
        <p className="mt-1 text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {isRep ? t("posMarket.statement.subtitle") : t("posMarket.receivables.subtitle")}
        </p>

        {flashMessage ? (
          <div
            className="mt-4 rounded-xl px-4 py-3 text-sm font-semibold"
            style={{
              backgroundColor: flashTone === "error" ? "#fef2f2" : POS_MARKET_THEME.colors.primarySoft,
              color: flashTone === "error" ? "#b91c1c" : POS_MARKET_THEME.colors.primary,
            }}
          >
            {flashMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryTile
            label={t("posMarket.statement.delivered")}
            value={formatCurrency(parseAmount(totals?.totalDelivered ?? 0))}
          />
          <SummaryTile
            label={t("posMarket.statement.collected")}
            value={formatCurrency(parseAmount(totals?.totalPaid ?? 0))}
          />
          <SummaryTile
            label={t("posMarket.statement.remaining")}
            value={formatCurrency(parseAmount(totals?.totalOutstanding ?? 0))}
          />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("posMarket.receivables.searchPlaceholder")}
            className="rounded-xl"
          />
          {showRepFilter ? (
            <Select
              value={salesRepFilter}
              onChange={(event) => setSalesRepFilter(event.target.value)}
              className="rounded-xl"
            >
              <option value="">{t("posMarket.receivables.allReps")}</option>
              {(salesRepsQuery.data ?? []).map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name}
                </option>
              ))}
            </Select>
          ) : null}
          {showBalanceOnlyFilter ? (
            <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold" style={{ borderColor: POS_MARKET_THEME.colors.outline }}>
              <input
                type="checkbox"
                checked={balanceOnly}
                onChange={(event) => setBalanceOnly(event.target.checked)}
              />
              {t("posMarket.statement.balanceOnly")}
            </label>
          ) : null}
        </div>

        {receivablesQuery.isError ? (
          <p className="mt-4 text-sm text-red-600">{t("posMarket.receivables.loadError")}</p>
        ) : null}

        <div className="mt-6 overflow-x-auto rounded-2xl border" style={{ borderColor: POS_MARKET_THEME.colors.outline }}>
          <table className="min-w-full text-sm">
            <thead style={{ backgroundColor: POS_MARKET_THEME.colors.primarySoft }}>
              <tr>
                <th className="px-4 py-3 text-start font-bold">{t("posMarket.receivables.market")}</th>
                {!isRep ? (
                  <th className="px-4 py-3 text-start font-bold">{t("posMarket.receivables.rep")}</th>
                ) : null}
                <th className="px-4 py-3 text-start font-bold">{t("posMarket.statement.delivered")}</th>
                <th className="px-4 py-3 text-start font-bold">{t("posMarket.statement.collected")}</th>
                <th className="px-4 py-3 text-start font-bold">{t("posMarket.statement.remaining")}</th>
                <th className="px-4 py-3 text-end font-bold" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ReceivableRow
                  key={row.customerId}
                  row={row}
                  isRep={isRep}
                  canCollect={canCollect}
                  onCollect={() => openCollectModal(row)}
                  onPrint={() => void handlePrintStatement(row)}
                  collectLabel={t("posMarket.receivables.collect")}
                  viewLabel={t("posMarket.statement.view")}
                  printLabel={t("posMarket.statement.print")}
                />
              ))}
              {!receivablesQuery.isLoading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={isRep ? 5 : 6}
                    className="px-4 py-8 text-center text-sm"
                    style={{ color: POS_MARKET_THEME.colors.textMuted }}
                  >
                    {t("posMarket.statement.noRows")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={Boolean(collectCustomer)}
        onClose={() => setCollectCustomer(null)}
        title={t("posMarket.receivables.collectTitle")}
      >
        {collectCustomer ? (
          <div className="space-y-4">
            <p className="text-sm font-bold" style={{ color: POS_MARKET_THEME.colors.text }}>
              {collectCustomer.customerName}
            </p>
            <Field label={t("posMarket.receivables.amount")}>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={collectAmount}
                onChange={(event) => setCollectAmount(event.target.value)}
              />
            </Field>
            <Field label={t("posMarket.receivables.receiptDate")}>
              <Input
                type="date"
                value={collectDate}
                onChange={(event) => setCollectDate(event.target.value)}
              />
            </Field>
            <Field label={t("posMarket.receivables.bankAccount")}>
              <Select
                value={collectBankAccountId}
                onChange={(event) => setCollectBankAccountId(event.target.value)}
              >
                <option value="" />
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
              {t("posMarket.receivables.detail.collectHintSimple")}
            </p>
            <button
              type="button"
              disabled={collectMutation.isPending}
              onClick={() => collectMutation.mutate()}
              className="w-full rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-50"
              style={{ backgroundColor: POS_MARKET_THEME.colors.primary }}
            >
              {collectMutation.isPending
                ? t("posMarket.checkout.processing")
                : t("posMarket.receivables.collect")}
            </button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function ReceivableRow({
  row,
  isRep,
  canCollect,
  onCollect,
  onPrint,
  collectLabel,
  viewLabel,
  printLabel,
}: {
  row: PosMarketReceivableCustomer;
  isRep: boolean;
  canCollect: boolean;
  onCollect: () => void;
  onPrint: () => void;
  collectLabel: string;
  viewLabel: string;
  printLabel: string;
}) {
  const outstanding = parseAmount(row.outstandingBalance);

  return (
    <tr className="border-t" style={{ borderColor: POS_MARKET_THEME.colors.outline }}>
      <td className="px-4 py-3">
        <Link
          href={`/pos-market/receivables/${row.customerId}`}
          className="text-start font-semibold hover:underline"
          style={{ color: POS_MARKET_THEME.colors.text }}
        >
          <div>{row.customerName}</div>
          <div className="text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
            {row.customerCode}
          </div>
        </Link>
      </td>
      {!isRep ? <td className="px-4 py-3">{row.salesRepName ?? "—"}</td> : null}
      <td className="px-4 py-3">{formatCurrency(parseAmount(row.totalDelivered))}</td>
      <td className="px-4 py-3">{formatCurrency(parseAmount(row.totalPaid))}</td>
      <td className="px-4 py-3 font-bold">{formatCurrency(outstanding)}</td>
      <td className="px-4 py-3 text-end">
        <div className="flex flex-wrap justify-end gap-2">
          <Link
            href={`/pos-market/receivables/${row.customerId}`}
            className="rounded-lg border px-3 py-1.5 text-xs font-bold"
            style={{
              borderColor: POS_MARKET_THEME.colors.outline,
              color: POS_MARKET_THEME.colors.primary,
              backgroundColor: POS_MARKET_THEME.colors.primarySoft,
            }}
          >
            {viewLabel}
          </Link>
          <button
            type="button"
            onClick={onPrint}
            className="rounded-lg border px-3 py-1.5 text-xs font-bold"
            style={{
              borderColor: POS_MARKET_THEME.colors.outline,
              color: POS_MARKET_THEME.colors.text,
              backgroundColor: POS_MARKET_THEME.colors.cardSurface,
            }}
          >
            {printLabel}
          </button>
          {canCollect && outstanding > 0 ? (
            <button
              type="button"
              onClick={onCollect}
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-white"
              style={{ backgroundColor: POS_MARKET_THEME.colors.primary }}
            >
              {collectLabel}
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
