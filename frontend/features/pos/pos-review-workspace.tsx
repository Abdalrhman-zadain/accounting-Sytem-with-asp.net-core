"use client";

import { Card, Modal } from "@/components/ui";
import { Input } from "@/components/ui/forms";
import { DetailTile, DetailedTableCard } from "@/features/pos/pos-detail-cards";
import { cn } from "@/lib/utils";
import type {
  DeliveryCompany,
  DeliveryDriver,
  DeliveryStatus,
  JournalEntry,
  PosOrderType,
  PosSale,
  PosSessionReport,
  PosTable,
} from "@/types/api";

type ReviewTab = "overview" | "cash" | "inventory" | "journal";

type ReviewSessionGroup = {
  sales: PosSale[];
  sessionId: string | null;
  sessionNumber: string;
  warehouseName: string;
};

type PosReviewWorkspaceProps = {
  correctionDeliveryCompanyId: string;
  correctionDeliveryFee: string;
  correctionDriverId: string;
  correctionOrderType: PosOrderType;
  correctionReason: string;
  correctionServiceCharge: string;
  correctionTableId: string;
  deliveryCompanies: DeliveryCompany[];
  deliveryDrivers: DeliveryDriver[];
  isCorrectOrderTypeOpen: boolean;
  journalEntries: JournalEntry[];
  onApproveReview: (saleId: string) => void;
  onApproveSessionReview: (sessionId: string) => void;
  onAssignDriver: (saleId: string, driverId: string | null) => void;
  onCloseCorrectionModal: () => void;
  onCorrectionDeliveryCompanyIdChange: (value: string) => void;
  onCorrectionDeliveryFeeChange: (value: string) => void;
  onCorrectionDriverIdChange: (value: string) => void;
  onCorrectionOrderTypeChange: (value: PosOrderType) => void;
  onCorrectionReasonChange: (value: string) => void;
  onCorrectionServiceChargeChange: (value: string) => void;
  onCorrectionTableIdChange: (value: string) => void;
  onOpenCorrectionModal: (sale: PosSale) => void;
  onRejectReview: (saleId: string) => void;
  onReprintReceipt: (saleId: string) => void;
  onReverseReview: (saleId: string) => void;
  onReviewSessionChange: (sessionId: string) => void;
  onReviewTabChange: (tab: ReviewTab) => void;
  onSaveCorrection: () => void;
  onUpdateDeliveryStatus: (saleId: string, status: DeliveryStatus) => void;
  report: PosSessionReport | null;
  restaurantTables: PosTable[];
  reviewQueryDataLength: number;
  reviewSessionGroups: ReviewSessionGroup[];
  reviewTab: ReviewTab;
  selectedCorrectionSale: PosSale | null;
  selectedReviewGroup: ReviewSessionGroup | null;
  t: (key: string, params?: Record<string, string | number>) => string;
  savingCorrection: boolean;
};

export function PosReviewWorkspace({
  correctionDeliveryCompanyId,
  correctionDeliveryFee,
  correctionDriverId,
  correctionOrderType,
  correctionReason,
  correctionServiceCharge,
  correctionTableId,
  deliveryCompanies,
  deliveryDrivers,
  isCorrectOrderTypeOpen,
  journalEntries,
  onApproveReview,
  onApproveSessionReview,
  onAssignDriver,
  onCloseCorrectionModal,
  onCorrectionDeliveryCompanyIdChange,
  onCorrectionDeliveryFeeChange,
  onCorrectionDriverIdChange,
  onCorrectionOrderTypeChange,
  onCorrectionReasonChange,
  onCorrectionServiceChargeChange,
  onCorrectionTableIdChange,
  onOpenCorrectionModal,
  onRejectReview,
  onReprintReceipt,
  onReverseReview,
  onReviewSessionChange,
  onReviewTabChange,
  onSaveCorrection,
  onUpdateDeliveryStatus,
  report,
  restaurantTables,
  reviewQueryDataLength,
  reviewSessionGroups,
  reviewTab,
  savingCorrection,
  selectedCorrectionSale,
  selectedReviewGroup,
  t,
}: PosReviewWorkspaceProps) {
  const inventoryRows =
    selectedReviewGroup?.sales.flatMap((sale) =>
      sale.lines
        .filter((line) => line.item?.trackInventory)
        .map((line) => ({
          itemName: line.itemName ?? line.description ?? `Line ${line.lineNumber}`,
          quantity: line.quantity,
          saleReference: sale.reference,
          warehouse: line.warehouse?.name ?? "—",
        })),
    ) ?? [];

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
        <div className="text-2xl font-black text-[#233329] arabic-heading">
          {t("pos.workspace.review")}
        </div>
        <p className="mt-2 text-sm text-[#64736b] arabic-auto">
          {t("pos.review.description")}
        </p>
      </Card>
      {reviewQueryDataLength === 0 ? (
        <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 text-sm text-[#64736b]">
          {t("pos.review.empty")}
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-5">
            <div className="text-sm font-black uppercase tracking-[0.16em] text-[#5c7463]">
              Submitted sessions
            </div>
            <div className="mt-4 space-y-3">
              {reviewSessionGroups.map((group) => (
                <button
                  key={group.sessionId ?? group.sessionNumber}
                  type="button"
                  onClick={() => onReviewSessionChange(group.sessionId ?? "")}
                  className={cn(
                    "w-full rounded-[18px] border p-4 text-left transition",
                    selectedReviewGroup?.sessionId === group.sessionId
                      ? "border-[#46644b] bg-[#f3f7f3]"
                      : "border-[#dbe2dd] bg-[#f8faf8]",
                  )}
                >
                  <div className="font-bold text-[#233329]">{group.sessionNumber}</div>
                  <div className="mt-1 text-xs text-[#66756d]">
                    {group.sales.length} sale(s) pending · {group.warehouseName}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {selectedReviewGroup ? (
            <div className="space-y-4">
              <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.16em] text-[#5c7463]">
                      Session review
                    </div>
                    <div className="mt-1 text-xl font-black text-[#233329]">
                      {selectedReviewGroup.sessionNumber}
                    </div>
                    <div className="mt-1 text-sm text-[#66756d]">
                      {selectedReviewGroup.sales.length} sale(s) pending accounting review
                    </div>
                  </div>
                  {selectedReviewGroup.sessionId ? (
                    <button
                      type="button"
                      onClick={() => onApproveSessionReview(selectedReviewGroup.sessionId!)}
                      className="rounded-full bg-[#46644b] px-4 py-2 text-xs font-bold text-white"
                    >
                      Approve session
                    </button>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {([
                    ["overview", "Overview"],
                    ["cash", "Cash Count"],
                    ["inventory", "Inventory Impact"],
                    ["journal", "Journal Entry Preview"],
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onReviewTabChange(id)}
                      className={cn(
                        "rounded-full px-4 py-2 text-xs font-bold transition",
                        reviewTab === id
                          ? "bg-[#46644b] text-white"
                          : "border border-[#d6e1d9] bg-[#f7faf8] text-[#46644b]",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Card>

              {reviewTab === "cash" && report ? (
                <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <DetailTile label="Opening cash" value={report.openingCash} />
                    <DetailTile label="Cash sales" value={report.cashSales} />
                    <DetailTile label="Cash refunds" value={report.cashRefunds} />
                    <DetailTile label="Expected cash" value={report.expectedCash} />
                    <DetailTile label="Actual cash counted" value={report.actualCash ?? "—"} />
                    <DetailTile label="Cash difference" value={report.difference ?? "—"} />
                  </div>
                </Card>
              ) : null}

              {reviewTab === "inventory" ? (
                <DetailedTableCard
                  title="Inventory impact"
                  headers={["Sale", "Item", "Quantity", "Warehouse"]}
                  rows={inventoryRows.map((row) => [
                    row.saleReference,
                    row.itemName,
                    row.quantity,
                    row.warehouse,
                  ])}
                />
              ) : null}

              {reviewTab === "journal" ? (
                <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
                  <div className="text-lg font-black text-[#233329]">Journal Entry Preview</div>
                  <div className="mt-4 space-y-5">
                    {journalEntries.length === 0 ? (
                      <div className="rounded-[18px] border border-dashed border-[#d7ddd8] bg-[#fafcf9] px-4 py-4 text-sm text-[#64736b]">
                        No draft journal entries linked to the selected session.
                      </div>
                    ) : (
                      journalEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-[20px] border border-[#dbe2dd] bg-[#f8faf8] p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="font-bold text-[#233329]">{entry.reference}</div>
                            <div className="text-xs font-bold text-[#5f6d66]">{entry.status}</div>
                          </div>
                          <div className="mt-3 space-y-2 text-sm text-[#5f6d66]">
                            {entry.lines.map((line) => (
                              <div
                                key={line.id}
                                className="flex items-center justify-between gap-3"
                              >
                                <span>
                                  {line.accountCode} · {line.accountName}
                                </span>
                                <span>
                                  {line.debitAmount} / {line.creditAmount}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              ) : null}

              {reviewTab === "overview" ? (
                <div className="space-y-4">
                  {selectedReviewGroup.sales.map((sale) => (
                    <Card key={sale.id} className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-lg font-black text-[#233329]">{sale.reference}</div>
                          <div className="mt-1 text-sm text-[#68776f]">
                            {sale.orderType ?? "—"} · {sale.totalAmount} {sale.currencyCode}
                          </div>
                          <div className="mt-1 text-sm text-[#68776f]">
                            {sale.table?.tableNumber
                              ? `Table ${sale.table.tableNumber}`
                              : "No table"}{" "}
                            ·{" "}
                            {sale.deliveryCompany?.name ??
                              sale.driver?.name ??
                              "Direct / Counter"}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onReprintReceipt(sale.id)}
                            className="rounded-full border border-[#d6e0d8] px-4 py-2 text-xs font-bold text-[#46644b]"
                          >
                            Receipt
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenCorrectionModal(sale)}
                            className="rounded-full border border-[#d6e0d8] px-4 py-2 text-xs font-bold text-[#46644b]"
                          >
                            Correct order type
                          </button>
                          {sale.orderType === "DELIVERY" ? (
                            <>
                              <select
                                value={sale.driverId ?? ""}
                                onChange={(event) =>
                                  onAssignDriver(sale.id, event.target.value || null)
                                }
                                className="rounded-full border border-[#d6e0d8] bg-white px-4 py-2 text-xs font-bold text-[#46644b]"
                              >
                                <option value="">Driver</option>
                                {deliveryDrivers.map((driver) => (
                                  <option key={driver.id} value={driver.id}>
                                    {driver.name}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={sale.deliveryStatus ?? "PENDING"}
                                onChange={(event) =>
                                  onUpdateDeliveryStatus(
                                    sale.id,
                                    event.target.value as DeliveryStatus,
                                  )
                                }
                                className="rounded-full border border-[#d6e0d8] bg-white px-4 py-2 text-xs font-bold text-[#46644b]"
                              >
                                <option value="PENDING">Pending</option>
                                <option value="PREPARING">Preparing</option>
                                <option value="READY_FOR_DELIVERY">Ready</option>
                                <option value="OUT_FOR_DELIVERY">Out</option>
                                <option value="DELIVERED">Delivered</option>
                                <option value="CANCELLED">Cancelled</option>
                              </select>
                            </>
                          ) : null}
                          {sale.posAccountingStatus === "POSTED" ? (
                            <button
                              type="button"
                              onClick={() => onReverseReview(sale.id)}
                              className="rounded-full border border-[#ead7d5] px-4 py-2 text-xs font-bold text-[#8f5a55]"
                            >
                              {t("pos.review.reverse")}
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onApproveReview(sale.id)}
                                className="rounded-full bg-[#46644b] px-4 py-2 text-xs font-bold text-white"
                              >
                                {t("pos.review.approve")}
                              </button>
                              <button
                                type="button"
                                onClick={() => onRejectReview(sale.id)}
                                className="rounded-full border border-[#ead7d5] px-4 py-2 text-xs font-bold text-[#8f5a55]"
                              >
                                {t("pos.review.reject")}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <DetailTile label={t("pos.review.subtotal")} value={sale.subtotalAmount} />
                        <DetailTile label={t("pos.review.discount")} value={sale.discountAmount} />
                        <DetailTile label={t("pos.review.tax")} value={sale.taxAmount} />
                        <DetailTile
                          label="Delivery / Service"
                          value={`${sale.deliveryFeeAmount ?? "0.00"} / ${sale.serviceChargeAmount ?? "0.00"}`}
                        />
                      </div>
                      <div className="mt-5 grid gap-3 xl:grid-cols-2">
                        <div className="rounded-[20px] border border-[#dbe2dd] bg-[#f8faf8] p-4">
                          <div className="font-bold text-[#233329]">{t("pos.review.linesTitle")}</div>
                          <div className="mt-3 space-y-2 text-sm text-[#5f6d66]">
                            {sale.lines.map((line) => (
                              <div
                                key={line.id}
                                className="flex items-center justify-between gap-3"
                              >
                                <span>
                                  {line.itemName ??
                                    line.description ??
                                    `Line ${line.lineNumber}`}
                                </span>
                                <span>
                                  {line.quantity} x {line.unitPrice} = {line.lineAmount}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-[20px] border border-[#dbe2dd] bg-[#f8faf8] p-4">
                          <div className="font-bold text-[#233329]">
                            {t("pos.review.paymentsTitle")}
                          </div>
                          <div className="mt-3 space-y-2 text-sm text-[#5f6d66]">
                            {sale.payments.map((payment) => (
                              <div
                                key={payment.id}
                                className="flex items-center justify-between gap-3"
                              >
                                <span>
                                  {payment.paymentMethod} · {payment.bankCashAccount.name}
                                </span>
                                <span>
                                  {payment.amount}
                                  {payment.tenderedAmount ? ` / ${payment.tenderedAmount}` : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <Modal
        isOpen={isCorrectOrderTypeOpen}
        onClose={onCloseCorrectionModal}
        title="Correct Order Type / تصحيح نوع الطلب"
      >
        <div className="space-y-4">
          <select
            value={correctionOrderType}
            onChange={(event) =>
              onCorrectionOrderTypeChange(event.target.value as PosOrderType)
            }
            className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
          >
            <option value="DINE_IN">Dine-In</option>
            <option value="TAKEAWAY">Takeaway</option>
            <option value="DELIVERY">Delivery</option>
            <option value="PICKUP">Pickup</option>
          </select>
          {correctionOrderType === "DINE_IN" ? (
            <select
              value={correctionTableId}
              onChange={(event) => onCorrectionTableIdChange(event.target.value)}
              className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
            >
              <option value="">Select table</option>
              {restaurantTables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.tableNumber}
                </option>
              ))}
            </select>
          ) : null}
          {correctionOrderType === "DELIVERY" ? (
            <>
              <select
                value={correctionDeliveryCompanyId}
                onChange={(event) => onCorrectionDeliveryCompanyIdChange(event.target.value)}
                className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
              >
                <option value="">Select delivery company</option>
                {deliveryCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <select
                value={correctionDriverId}
                onChange={(event) => onCorrectionDriverIdChange(event.target.value)}
                className="w-full rounded-[16px] border border-[#d6e1d9] bg-white px-4 py-3 text-sm font-semibold text-[#233329]"
              >
                <option value="">Select driver</option>
                {deliveryDrivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </>
          ) : null}
          <Input
            type="number"
            min="0"
            step="0.01"
            value={correctionServiceCharge}
            onChange={(event) => onCorrectionServiceChargeChange(event.target.value)}
            placeholder="Service charge"
            className="rounded-[16px] border-[#d6e1d9] bg-white py-3"
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={correctionDeliveryFee}
            onChange={(event) => onCorrectionDeliveryFeeChange(event.target.value)}
            placeholder="Delivery fee"
            className="rounded-[16px] border-[#d6e1d9] bg-white py-3"
          />
          <Input
            value={correctionReason}
            onChange={(event) => onCorrectionReasonChange(event.target.value)}
            placeholder="Reason / سبب التصحيح"
            className="rounded-[16px] border-[#d6e1d9] bg-white py-3"
          />
          <button
            type="button"
            disabled={!selectedCorrectionSale || !correctionReason.trim() || savingCorrection}
            onClick={onSaveCorrection}
            className="w-full rounded-[18px] bg-[#5f8a67] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            Save correction / حفظ التصحيح
          </button>
        </div>
      </Modal>
    </div>
  );
}
