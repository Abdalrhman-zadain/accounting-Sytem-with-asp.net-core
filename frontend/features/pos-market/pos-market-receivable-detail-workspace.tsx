"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LuArrowRight, LuPackage, LuWallet } from "react-icons/lu";

import { Card, Modal } from "@/components/ui";
import { PageShell, SectionHeading } from "@/components/ui";
import { Field, Input, Select } from "@/components/ui/forms";
import {
  formatCurrency,
  getErrorMessage,
  parseAmount,
} from "@/features/pos-market/pos-market-cart-utils";
import { printMarketCollectionReceipt } from "@/features/pos-market/pos-market-print-service";
import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import {
  collectPosMarketReceivables,
  getBankCashAccounts,
  getPosMarketReceivableDetail,
} from "@/lib/api";
import { hasPermission } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";

type TabId = "deliveries" | "payments";

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

function formatDetailDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

type PosMarketReceivableDetailWorkspaceProps = {
  customerId: string;
};

export function PosMarketReceivableDetailWorkspace({
  customerId,
}: PosMarketReceivableDetailWorkspaceProps) {
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("deliveries");
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectDate, setCollectDate] = useState(new Date().toISOString().slice(0, 10));
  const [collectBankAccountId, setCollectBankAccountId] = useState("");
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [flashTone, setFlashTone] = useState<"success" | "error">("success");

  const canCollect = hasPermission(user, "POS_MARKET_COLLECT_RECEIVABLE");

  const detailQuery = useQuery({
    queryKey: queryKeys.posMarketReceivableDetail(token ?? null, customerId),
    queryFn: () => getPosMarketReceivableDetail(customerId, token),
    enabled: Boolean(token && customerId),
  });

  const bankAccountsQuery = useQuery({
    queryKey: queryKeys.bankCashAccounts(token ?? null, { isActive: "true" }),
    queryFn: () => getBankCashAccounts({ isActive: "true" }, token),
    enabled: Boolean(token && isCollectOpen),
  });

  const detail = detailQuery.data;
  const bankAccounts = bankAccountsQuery.data ?? [];
  const outstanding = parseAmount(detail?.summary.outstandingBalance ?? 0);

  useEffect(() => {
    if (!isCollectOpen || collectBankAccountId || bankAccounts.length === 0) return;
    setCollectBankAccountId(bankAccounts[0]?.id ?? "");
  }, [bankAccounts, collectBankAccountId, isCollectOpen]);

  const collectMutation = useMutation({
    mutationFn: () => {
      const amount = Number(parseAmount(collectAmount).toFixed(2));
      if (amount <= 0) throw new Error(t("posMarket.receivables.amount"));
      if (!collectBankAccountId) throw new Error(t("posMarket.receivables.bankAccount"));
      return collectPosMarketReceivables(
        {
          customerId,
          receiptDate: collectDate,
          amount,
          bankCashAccountId: collectBankAccountId,
        },
        token,
      );
    },
    onSuccess: async (response) => {
      setIsCollectOpen(false);
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
          salesRepName: detail?.customer.salesRepName ?? null,
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
      await queryClient.invalidateQueries({
        queryKey: queryKeys.posMarketReceivableDetail(token ?? null, customerId),
      });
    },
    onError: (error) => {
      setFlashMessage(getErrorMessage(error, t("posMarket.receivables.collectError")));
      setFlashTone("error");
    },
  });

  const tabClass = (tab: TabId) =>
    `rounded-xl px-4 py-2 text-sm font-bold transition ${
      activeTab === tab ? "text-white" : ""
    }`;

  const deliveriesContent = useMemo(() => {
    const deliveries = detail?.deliveries ?? [];
    if (deliveries.length === 0) {
      return (
        <p className="py-8 text-center text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {t("posMarket.receivables.detail.noDeliveries")}
        </p>
      );
    }
    return (
      <div className="space-y-3">
        {deliveries.map((delivery) => (
          <div
            key={delivery.id}
            className="rounded-2xl border p-4"
            style={{ borderColor: POS_MARKET_THEME.colors.outline }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-bold" style={{ color: POS_MARKET_THEME.colors.text }}>
                  {delivery.receiptNumber ?? delivery.reference}
                </div>
                <div className="text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                  {formatDetailDate(delivery.deliveredAt)}
                </div>
              </div>
              <div className="text-end">
                <div className="text-sm font-black" style={{ color: POS_MARKET_THEME.colors.text }}>
                  {formatCurrency(parseAmount(delivery.totalAmount))}
                </div>
                {parseAmount(delivery.outstandingAmount) > 0 ? (
                  <div className="text-xs font-semibold text-amber-700">
                    {t("posMarket.receivables.detail.deliveryOutstanding")}:{" "}
                    {formatCurrency(parseAmount(delivery.outstandingAmount))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-3 space-y-1 border-t pt-3" style={{ borderColor: POS_MARKET_THEME.colors.outline }}>
              {delivery.lines.map((line) => (
                <div key={line.id} className="flex justify-between gap-3 text-sm">
                  <span>
                    {line.itemName}
                    <span className="mx-1 text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                      × {line.quantity}
                      {line.unitOfMeasure ? ` ${line.unitOfMeasure}` : ""}
                    </span>
                  </span>
                  <span className="font-semibold">{formatCurrency(parseAmount(line.lineAmount))}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }, [detail?.deliveries, t]);

  const paymentsContent = useMemo(() => {
    const payments = detail?.payments ?? [];
    if (payments.length === 0) {
      return (
        <p className="py-8 text-center text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {t("posMarket.receivables.detail.noPayments")}
        </p>
      );
    }
    return (
      <div className="space-y-2">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm"
            style={{ borderColor: POS_MARKET_THEME.colors.outline }}
          >
            <div>
              <div className="font-semibold">{payment.reference}</div>
              <div className="text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                {formatDetailDate(payment.receiptDate)}
                {payment.bankCashAccountName ? ` · ${payment.bankCashAccountName}` : ""}
              </div>
            </div>
            <div className="font-black text-emerald-700">
              {formatCurrency(parseAmount(payment.amount))}
            </div>
          </div>
        ))}
      </div>
    );
  }, [detail?.payments, t]);

  if (!customerId) {
    return null;
  }

  return (
    <PageShell>
      <div className="mb-4">
        <Link
          href="/pos-market/receivables"
          className="inline-flex items-center gap-2 text-sm font-semibold"
          style={{ color: POS_MARKET_THEME.colors.primary }}
        >
          <LuArrowRight className="h-4 w-4 rtl:rotate-180" />
          {t("posMarket.receivables.detail.back")}
        </Link>
      </div>

      <SectionHeading
        title={detail?.customer.customerName ?? t("posMarket.receivables.detail.title")}
        description={detail?.customer.customerCode ?? ""}
      />

      <div className="rounded-3xl border border-[#d5deea] p-1">
        <Card className="rounded-[28px] border border-[#d5deea] p-6">
          {detailQuery.isLoading ? (
            <p className="text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
              {t("common.loading")}
            </p>
          ) : detailQuery.isError || !detail ? (
            <p className="text-sm text-red-600">{t("posMarket.receivables.detail.loadError")}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black arabic-heading" style={{ color: POS_MARKET_THEME.colors.text }}>
                    {detail.customer.customerName}
                  </h2>
                  <p className="text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                    {detail.customer.customerCode}
                    {detail.customer.contactInfo ? ` · ${detail.customer.contactInfo}` : ""}
                  </p>
                  {detail.customer.salesRepName ? (
                    <p className="text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                      {t("posMarket.receivables.rep")}: {detail.customer.salesRepName}
                    </p>
                  ) : null}
                </div>
                {canCollect && outstanding > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCollectAmount(detail.summary.outstandingBalance);
                      setCollectBankAccountId(bankAccounts[0]?.id ?? "");
                      setIsCollectOpen(true);
                    }}
                    className="rounded-xl px-4 py-2.5 text-sm font-black text-white"
                    style={{ backgroundColor: POS_MARKET_THEME.colors.primary }}
                  >
                    {t("posMarket.receivables.collect")}
                  </button>
                ) : null}
              </div>

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
                  label={t("posMarket.receivables.detail.totalDelivered")}
                  value={formatCurrency(parseAmount(detail.summary.totalDelivered))}
                />
                <SummaryTile
                  label={t("posMarket.receivables.detail.totalPaid")}
                  value={formatCurrency(parseAmount(detail.summary.totalPaid))}
                />
                <SummaryTile
                  label={t("posMarket.receivables.detail.outstanding")}
                  value={formatCurrency(parseAmount(detail.summary.outstandingBalance))}
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("deliveries")}
                  className={tabClass("deliveries")}
                  style={
                    activeTab === "deliveries"
                      ? { backgroundColor: POS_MARKET_THEME.colors.primary }
                      : {
                          backgroundColor: POS_MARKET_THEME.colors.primarySoft,
                          color: POS_MARKET_THEME.colors.primary,
                        }
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <LuPackage className="h-4 w-4" />
                    {t("posMarket.receivables.detail.deliveriesTab")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("payments")}
                  className={tabClass("payments")}
                  style={
                    activeTab === "payments"
                      ? { backgroundColor: POS_MARKET_THEME.colors.primary }
                      : {
                          backgroundColor: POS_MARKET_THEME.colors.primarySoft,
                          color: POS_MARKET_THEME.colors.primary,
                        }
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <LuWallet className="h-4 w-4" />
                    {t("posMarket.receivables.detail.paymentsTab")}
                  </span>
                </button>
              </div>

              <div className="mt-4">{activeTab === "deliveries" ? deliveriesContent : paymentsContent}</div>
            </>
          )}
        </Card>
      </div>

      <Modal
        isOpen={isCollectOpen}
        onClose={() => setIsCollectOpen(false)}
        title={t("posMarket.receivables.collectTitle")}
      >
        {detail ? (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
              {t("posMarket.receivables.detail.collectHint", {
                balance: formatCurrency(outstanding),
              })}
            </p>
            <Field label={t("posMarket.receivables.amount")}>
              <Input
                type="number"
                min="0"
                step="0.01"
                max={outstanding}
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
    </PageShell>
  );
}
