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
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { printMarketCollectionReceipt } from "@/features/pos-market/pos-market-print-service";
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

export function PosMarketReceivablesWorkspace() {
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [salesRepFilter, setSalesRepFilter] = useState("");
  const [collectCustomer, setCollectCustomer] = useState<PosMarketReceivableCustomer | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectDate, setCollectDate] = useState(new Date().toISOString().slice(0, 10));
  const [collectBankAccountId, setCollectBankAccountId] = useState("");
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [flashTone, setFlashTone] = useState<"success" | "error">("success");

  const canCollect = hasPermission(user, "POS_MARKET_COLLECT_RECEIVABLE");
  const showRepFilter = !isMarketRepUser(user);

  const receivablesQuery = useQuery({
    queryKey: queryKeys.posMarketReceivables(token ?? null, {
      salesRepId: salesRepFilter || undefined,
      search: search.trim() || undefined,
    }),
    queryFn: () =>
      getPosMarketReceivables(
        {
          salesRepId: salesRepFilter || undefined,
          search: search.trim() || undefined,
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

  useEffect(() => {
    if (!collectCustomer || collectBankAccountId || bankAccounts.length === 0) return;
    setCollectBankAccountId(bankAccounts[0]?.id ?? "");
  }, [bankAccounts, collectBankAccountId, collectCustomer]);

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border border-[#d5deea] p-6">
        <div className="text-2xl font-black arabic-heading" style={{ color: POS_MARKET_THEME.colors.text }}>
          {t("posMarket.receivables.title")}
        </div>
        <p className="mt-1 text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {t("posMarket.receivables.subtitle")}
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

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <SummaryTile
            label={t("posMarket.receivables.totalOutstanding")}
            value={formatCurrency(parseAmount(totals?.totalOutstanding ?? 0))}
          />
          <SummaryTile
            label={t("posMarket.receivables.customerCount")}
            value={String(totals?.customerCount ?? 0)}
          />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
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
        </div>

        {receivablesQuery.isError ? (
          <p className="mt-4 text-sm text-red-600">{t("posMarket.receivables.loadError")}</p>
        ) : null}

        <div className="mt-6 overflow-x-auto rounded-2xl border" style={{ borderColor: POS_MARKET_THEME.colors.outline }}>
          <table className="min-w-full text-sm">
            <thead style={{ backgroundColor: POS_MARKET_THEME.colors.primarySoft }}>
              <tr>
                <th className="px-4 py-3 text-start font-bold">{t("posMarket.receivables.market")}</th>
                <th className="px-4 py-3 text-start font-bold">{t("posMarket.receivables.rep")}</th>
                <th className="px-4 py-3 text-start font-bold">{t("posMarket.receivables.balance")}</th>
                <th className="px-4 py-3 text-start font-bold">{t("posMarket.receivables.invoices")}</th>
                <th className="px-4 py-3 text-end font-bold" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ReceivableRow
                  key={row.customerId}
                  row={row}
                  canCollect={canCollect}
                  onCollect={() => openCollectModal(row)}
                  collectLabel={t("posMarket.receivables.collect")}
                  detailsLabel={t("posMarket.receivables.detail.view")}
                />
              ))}
              {!receivablesQuery.isLoading && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                    {t("posMarket.receivables.noRows")}
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
  canCollect,
  onCollect,
  collectLabel,
  detailsLabel,
}: {
  row: PosMarketReceivableCustomer;
  canCollect: boolean;
  onCollect: () => void;
  collectLabel: string;
  detailsLabel: string;
}) {
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
      <td className="px-4 py-3">{row.salesRepName ?? "—"}</td>
      <td className="px-4 py-3 font-bold">{formatCurrency(parseAmount(row.outstandingBalance))}</td>
      <td className="px-4 py-3">{row.openInvoiceCount}</td>
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
            {detailsLabel}
          </Link>
          {canCollect ? (
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
