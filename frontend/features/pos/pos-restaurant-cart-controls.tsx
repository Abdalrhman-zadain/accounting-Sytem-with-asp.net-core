"use client";

import { cn } from "@/lib/utils";
import type {
  DeliveryCompany,
  DeliveryDriver,
  PosOrderType,
  PosTable,
  PosWaiter,
} from "@/types/api";

type PosRestaurantCartControlsProps = {
  cartLinesCount: number;
  deliveryAddress: string;
  deliveryCompanies: DeliveryCompany[];
  deliveryCompanyId: string | null;
  deliveryDriverId: string | null;
  deliveryDrivers: DeliveryDriver[];
  deliveryFee: number;
  deliveryMode: "DIRECT" | "THIRD_PARTY";
  deliveryNotes: string;
  editingInvoiceId: string | null;
  onDeliveryAddressChange: (value: string) => void;
  onDeliveryCompanyChange: (value: string | null) => void;
  onDeliveryDriverChange: (value: string | null) => void;
  onDeliveryFeeChange: (value: string) => void;
  onDeliveryModeChange: (value: "DIRECT" | "THIRD_PARTY") => void;
  onDeliveryNotesChange: (value: string) => void;
  onOpenMergeTables: () => void;
  onOpenSplitBill: () => void;
  onOpenTableSelector: () => void;
  onOpenTransferTable: () => void;
  onOrderTypeChange: (value: PosOrderType) => void;
  onSelectTable: (tableId: string, waiterId: string | null) => void;
  onServiceChargeChange: (value: string) => void;
  onWaiterChange: (value: string | null) => void;
  orderType: PosOrderType;
  restaurantTables: PosTable[];
  selectedTableId: string | null;
  selectedWaiterId: string | null;
  serviceChargeAmount: number;
  waiters: PosWaiter[];
  lockedTableId?: string | null;
  waiterMode?: boolean;
  onBackToTables?: () => void;
};

export function PosRestaurantCartControls({
  cartLinesCount,
  deliveryAddress,
  deliveryCompanies,
  deliveryCompanyId,
  deliveryDriverId,
  deliveryDrivers,
  deliveryFee,
  deliveryMode,
  deliveryNotes,
  editingInvoiceId,
  onDeliveryAddressChange,
  onDeliveryCompanyChange,
  onDeliveryDriverChange,
  onDeliveryFeeChange,
  onDeliveryModeChange,
  onDeliveryNotesChange,
  onOpenMergeTables,
  onOpenSplitBill,
  onOpenTableSelector,
  onOpenTransferTable,
  onOrderTypeChange,
  onSelectTable,
  onServiceChargeChange,
  onWaiterChange,
  orderType,
  restaurantTables,
  selectedTableId,
  selectedWaiterId,
  serviceChargeAmount,
  waiters,
  lockedTableId,
  waiterMode,
  onBackToTables,
}: PosRestaurantCartControlsProps) {
  return (
    <div className="space-y-3.5">
      {waiterMode && onBackToTables && (
        <button
          type="button"
          onClick={onBackToTables}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#cbd5d0] bg-[#edf5ef] px-4 py-2.5 text-xs font-bold text-[#2e5d3c] shadow-sm transition hover:bg-[#e1f2e5]"
        >
          ← Back to Tables / العودة للطاولات
        </button>
      )}

      {orderType === "DINE_IN" ? (
        <div className="space-y-3.5 rounded-[16px] border-2 border-[#dbe4de] bg-[#f8faf8] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#46644b]">
                {lockedTableId ? "Your Table / طاولتك" : "Floor tables / الطاولات"}
              </div>
              <div className="mt-1 text-sm font-black text-[#1e2c22]">
                {selectedTableId
                  ? `Table: ${restaurantTables.find((table) => table.id === selectedTableId)?.tableNumber ?? "—"}`
                  : "Select a table / اختر طاولة"}
              </div>
            </div>
            {!lockedTableId && (
              <button
                type="button"
                onClick={onOpenTableSelector}
                className="whitespace-nowrap rounded-full border border-[#b8ccbf] bg-white px-4 py-2 text-xs font-bold text-[#2e5d3c] shadow-sm transition-colors hover:bg-[#edf5ef]"
              >
                Open floor / فتح القاعة
              </button>
            )}
          </div>
          {!lockedTableId && (
            <select
              value={selectedWaiterId ?? ""}
              onChange={(event) => onWaiterChange(event.target.value || null)}
              className="h-10.5 w-full rounded-[12px] border border-[#c2d6c9] bg-white px-3 py-2 text-xs font-bold text-[#233329]"
            >
              <option value="">Select waiter / اختر النادل</option>
              {waiters.map((waiter) => (
                <option key={waiter.id} value={waiter.id}>
                  {waiter.name ?? waiter.email}
                </option>
              ))}
            </select>
          )}
          {selectedTableId && !lockedTableId && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={onOpenTransferTable}
                className="rounded-full border border-[#cbd5cf] bg-white px-3.5 py-2 text-[11px] font-bold text-[#46644b] transition-colors hover:bg-[#edf5ef]"
              >
                Transfer table
              </button>
              <button
                type="button"
                onClick={onOpenMergeTables}
                className="rounded-full border border-[#cbd5cf] bg-white px-3.5 py-2 text-[11px] font-bold text-[#46644b] transition-colors hover:bg-[#edf5ef]"
              >
                Merge tables
              </button>
              <button
                type="button"
                onClick={onOpenSplitBill}
                disabled={cartLinesCount === 0}
                className="rounded-full border border-[#cbd5cf] bg-white px-3.5 py-2 text-[11px] font-bold text-[#46644b] transition-colors hover:bg-[#edf5ef] disabled:opacity-40"
              >
                Split bill
              </button>
            </div>
          )}
        </div>
      ) : null}

      {orderType === "DELIVERY" ? (
        <div className="space-y-3.5 rounded-[16px] border-2 border-[#dbe4de] bg-[#f8faf8] p-4">
          <div className="flex gap-2">
            {(["DIRECT", "THIRD_PARTY"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onDeliveryModeChange(mode)}
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-bold transition",
                  deliveryMode === mode
                    ? "bg-[#46644b] text-white"
                    : "border border-[#cbd5cf] bg-white text-[#46644b]",
                )}
              >
                {mode === "DIRECT"
                  ? "Direct delivery / توصيل مباشر"
                  : "3rd party / شركة توصيل"}
              </button>
            ))}
          </div>
          {deliveryMode === "DIRECT" ? (
            <select
              value={deliveryDriverId ?? ""}
              onChange={(event) => onDeliveryDriverChange(event.target.value || null)}
              className="h-10.5 w-full rounded-[12px] border border-[#c2d6c9] bg-white px-3 py-2 text-xs font-bold text-[#233329]"
            >
              <option value="">Select driver / اختر السائق</option>
              {deliveryDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={deliveryCompanyId ?? ""}
              onChange={(event) => onDeliveryCompanyChange(event.target.value || null)}
              className="h-10.5 w-full rounded-[12px] border border-[#c2d6c9] bg-white px-3 py-2 text-xs font-bold text-[#233329]"
            >
              <option value="">Select company / اختر الشركة</option>
              {deliveryCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                  {company.arabicName ? ` / ${company.arabicName}` : ""}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={deliveryAddress}
            onChange={(event) => onDeliveryAddressChange(event.target.value)}
            placeholder="Address / العنوان"
            className="h-10 w-full rounded-[12px] border border-[#cbd5cf] bg-white px-3 text-xs font-semibold text-[#233329]"
          />
          <input
            type="text"
            value={deliveryNotes}
            onChange={(event) => onDeliveryNotesChange(event.target.value)}
            placeholder="Notes / ملاحظات"
            className="h-10 w-full rounded-[12px] border border-[#cbd5cf] bg-white px-3 text-xs font-semibold text-[#233329]"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={deliveryFee}
            onChange={(event) => onDeliveryFeeChange(event.target.value)}
            placeholder="Delivery fee / رسوم التوصيل"
            className="h-10 w-full rounded-[12px] border border-[#cbd5cf] bg-white px-3 text-xs font-semibold text-[#233329]"
          />
        </div>
      ) : null}

      {orderType === "DINE_IN" ? (
        <div className="rounded-[16px] border-2 border-[#dbe4de] bg-[#f8faf8] p-4">
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#46644b]">
            Service charge / رسوم الخدمة
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={serviceChargeAmount}
            onChange={(event) => onServiceChargeChange(event.target.value)}
            className="mt-2.5 h-10 w-full rounded-[12px] border border-[#cbd5cf] bg-white px-3 text-xs font-black text-[#233329]"
          />
        </div>
      ) : null}
    </div>
  );
}
