"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { getPurchaseRequestById } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cleanDisplayName, formatDate } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { PurchaseOrderStatus, PurchaseRequest } from "@/types/api";
import { Button, Card, PageShell, SectionHeading, StatusPill } from "@/components/ui";

export function PurchaseRequestDetailsPage({ purchaseRequestId }: { purchaseRequestId: string }) {
  const router = useRouter();
  const { token } = useAuth();
  const { t, language } = useTranslation();
  const isArabic = language === "ar";

  const purchaseRequestQuery = useQuery({
    queryKey: queryKeys.purchaseRequestById(token, purchaseRequestId),
    queryFn: () => getPurchaseRequestById(purchaseRequestId, token),
  });

  const purchaseRequest = purchaseRequestQuery.data;
  const detailsError = getErrorMessage(purchaseRequestQuery.error);

  const historyDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(isArabic ? "ar-JO" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [isArabic],
  );

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading
            title={t("purchases.requests.section.details")}
            description={t("purchases.requests.description")}
          />
          <Button variant="secondary" onClick={() => router.push("/purchases?tab=requests")}>
            {t("purchases.action.backToRequests")}
          </Button>
        </div>

        {detailsError ? (
          <Card className="border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
            {detailsError}
          </Card>
        ) : null}

        {!purchaseRequest && purchaseRequestQuery.isLoading ? (
          <Card className="p-6 text-sm text-gray-500">{t("purchases.requests.state.loadingDetails")}</Card>
        ) : null}

        {purchaseRequest ? (
          <>
            <Card className="space-y-5 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-700">
                    {purchaseRequest.reference}
                  </div>
                  <div className="text-2xl font-black text-gray-900">
                    {purchaseRequest.description || t("purchases.requests.empty.noDescription")}
                  </div>
                  <div className="text-sm text-gray-500">{formatDate(purchaseRequest.requestDate)}</div>
                </div>
                <StatusPill
                  label={translatePurchaseRequestStatus(purchaseRequest.status, t)}
                  tone={requestStatusTone(purchaseRequest.status)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <MiniMetric label={t("purchases.requests.metric.date")} value={formatDate(purchaseRequest.requestDate)} />
                <MiniMetric label={t("purchases.requests.metric.lines")} value={String(purchaseRequest.lines.length)} />
                <MiniMetric label={t("purchases.requests.metric.status")} value={translatePurchaseRequestStatus(purchaseRequest.status, t)} />
                <MiniMetric
                  label={t("purchases.requests.metric.linkedDocuments")}
                  value={String(purchaseRequest.linkedPurchaseOrders.length + purchaseRequest.linkedPurchaseInvoices.length)}
                />
              </div>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="space-y-4 p-6">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
                  {t("purchases.requests.section.lines")}
                </div>
                <div className="space-y-3">
                  {purchaseRequest.lines.map((line) => (
                    <div key={line.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-bold text-gray-900">{line.itemName || line.description}</div>
                        <div className="text-sm text-gray-500">
                          {t("purchases.requests.line.quantity", { quantity: line.quantity })}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">{line.description}</div>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>
                          {t("purchases.requests.field.deliveryDate")}:{" "}
                          {line.requestedDeliveryDate ? formatDate(line.requestedDeliveryDate) : t("purchases.requests.empty.notSet")}
                        </span>
                        <span>
                          {t("purchases.requests.field.justification")}:{" "}
                          {line.justification || t("purchases.requests.empty.notSet")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="space-y-4 p-6">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
                  {t("purchases.requests.section.history")}
                </div>
                {purchaseRequest.statusHistory.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                    {t("purchases.requests.empty.history")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchaseRequest.statusHistory.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <StatusPill
                            label={translatePurchaseRequestStatus(entry.status, t)}
                            tone={requestStatusTone(entry.status)}
                          />
                          <div className="text-xs text-gray-500">
                            {historyDateFormatter.format(new Date(entry.changedAt))}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-700">
                          {entry.note || t("purchases.requests.empty.noNote")}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {t("purchases.requests.history.byUser", {
                            user: cleanDisplayName(entry.user?.name) || entry.user?.email || t("purchases.requests.history.systemUser"),
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="space-y-4 p-6">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
                  {t("purchases.requests.section.linkedOrders")}
                </div>
                {purchaseRequest.linkedPurchaseOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                    {t("purchases.requests.empty.linkedOrders")}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <TableHead>{t("purchases.requests.table.orderReference")}</TableHead>
                          <TableHead>{t("purchases.requests.table.orderDate")}</TableHead>
                          <TableHead>{t("purchases.requests.table.orderSupplier")}</TableHead>
                          <TableHead>{t("purchases.requests.table.status")}</TableHead>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseRequest.linkedPurchaseOrders.map((order) => (
                          <tr key={order.id} className="border-t border-gray-100">
                            <td className="px-6 py-4">{order.reference}</td>
                            <td className="px-6 py-4">{formatDate(order.orderDate)}</td>
                            <td className="px-6 py-4">{order.supplier.code} · {order.supplier.name}</td>
                            <td className="px-6 py-4">
                              <StatusPill
                                label={translatePurchaseOrderStatus(order.status, t)}
                                tone={purchaseOrderStatusTone(order.status)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <Card className="space-y-4 p-6">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
                  {t("purchases.requests.section.linkedInvoices")}
                </div>
                {purchaseRequest.linkedPurchaseInvoices.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                    {t("purchases.requests.empty.linkedInvoices")}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <TableHead>{t("purchases.invoices.table.reference")}</TableHead>
                          <TableHead>{t("purchases.invoices.table.date")}</TableHead>
                          <TableHead>{t("purchases.requests.table.orderSupplier")}</TableHead>
                          <TableHead>{t("purchases.requests.table.status")}</TableHead>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseRequest.linkedPurchaseInvoices.map((invoice) => (
                          <tr key={invoice.id} className="border-t border-gray-100">
                            <td className="px-6 py-4">{invoice.reference}</td>
                            <td className="px-6 py-4">{formatDate(invoice.invoiceDate)}</td>
                            <td className="px-6 py-4">{invoice.supplier.code} · {invoice.supplier.name}</td>
                            <td className="px-6 py-4">
                              <StatusPill
                                label={translatePurchaseInvoiceStatus(invoice.status, t)}
                                tone={purchaseInvoiceStatusTone(invoice.status)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </>
        ) : null}
      </div>

    </PageShell>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 px-4 py-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">{label}</div>
      <div className="mt-2 text-base font-bold text-gray-900">{value}</div>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="px-6 py-3 text-start text-[10px] font-bold uppercase tracking-widest text-gray-600">{children}</th>;
}

function translatePurchaseRequestStatus(
  status: PurchaseRequest["status"],
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  switch (status) {
    case "DRAFT":
      return t("purchases.status.draft");
    case "SUBMITTED":
      return t("purchases.status.submitted");
    case "APPROVED":
      return t("purchases.status.approved");
    case "REJECTED":
      return t("purchases.status.rejected");
    case "CLOSED":
      return t("purchases.status.closed");
    default:
      return status;
  }
}

function translatePurchaseOrderStatus(
  status: PurchaseOrderStatus,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  switch (status) {
    case "DRAFT":
      return t("purchases.status.orderDraft");
    case "ISSUED":
      return t("purchases.status.orderIssued");
    case "PARTIALLY_RECEIVED":
      return t("purchases.status.orderPartiallyReceived");
    case "FULLY_RECEIVED":
      return t("purchases.status.orderFullyReceived");
    case "CANCELLED":
      return t("purchases.status.cancelled");
    case "CLOSED":
      return t("purchases.status.closed");
    default:
      return status;
  }
}

function translatePurchaseInvoiceStatus(
  status: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  switch (status) {
    case "DRAFT":
      return t("purchases.status.draft");
    case "POSTED":
      return t("purchases.invoices.status.posted");
    case "PARTIALLY_PAID":
      return t("purchases.invoices.status.partiallyPaid");
    case "FULLY_PAID":
      return t("purchases.invoices.status.fullyPaid");
    case "CANCELLED":
      return t("purchases.status.cancelled");
    case "REVERSED":
      return t("purchases.status.reversed");
    default:
      return status;
  }
}

function requestStatusTone(status: PurchaseRequest["status"]) {
  if (status === "APPROVED") return "positive" as const;
  if (status === "REJECTED" || status === "SUBMITTED") return "warning" as const;
  return "neutral" as const;
}

function purchaseOrderStatusTone(status: PurchaseOrderStatus) {
  if (status === "FULLY_RECEIVED") return "positive" as const;
  if (status === "ISSUED" || status === "PARTIALLY_RECEIVED" || status === "CANCELLED") {
    return "warning" as const;
  }
  return "neutral" as const;
}

function purchaseInvoiceStatusTone(status: string) {
  if (status === "POSTED" || status === "FULLY_PAID") return "positive" as const;
  if (status === "PARTIALLY_PAID" || status === "CANCELLED" || status === "REVERSED") {
    return "warning" as const;
  }
  return "neutral" as const;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : null;
}
