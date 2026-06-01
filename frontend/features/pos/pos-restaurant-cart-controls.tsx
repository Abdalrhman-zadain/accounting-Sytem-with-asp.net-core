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
}: PosRestaurantCartControlsProps) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7a8780]">
          Order type / نوع الطلب
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {([
            ["DINE_IN", "Dine-In / داخلي"],
            ["TAKEAWAY", "Takeaway / سفري"],
            ["DELIVERY", "Delivery / توصيل"],
            ["PICKUP", "Pickup / استلام"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onOrderTypeChange(value)}
              className={cn(
                "rounded-[10px] border px-3 py-2 text-[11px] font-bold transition",
                orderType === value
                  ? "border-[#5f8a67] bg-[#edf5ef] text-[#2d4a33]"
                  : "border-[#d6e1d9] bg-[#fbfcfb] text-[#60746a] hover:bg-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {orderType === "DINE_IN" ? (
        <div className="space-y-2 rounded-[12px] border border-[#dbe4de] bg-[#f8faf8] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7a8780]">
                Floor tables / الطاولات
              </div>
              <div className="mt-1 text-[11px] text-[#62736a]">
                {selectedTableId
                  ? `Selected table: ${restaurantTables.find((table) => table.id === selectedTableId)?.tableNumber ?? "—"}`
                  : "Select a table for dine-in orders / اختر طاولة للطلبات الداخلية"}
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenTableSelector}
              className="rounded-full border border-[#cfe0d3] bg-white px-3 py-1.5 text-[10px] font-bold text-[#46644b]"
            >
              Open floor / فتح القاعة
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {restaurantTables.slice(0, 6).map((table) => {
              const isSelected = selectedTableId === table.id;
              const isBusy =
                Boolean(table.activeInvoice?.id) &&
                table.activeInvoice?.id !== editingInvoiceId &&
                !isSelected;
              return (
                <button
                  key={table.id}
                  type="button"
                  disabled={isBusy}
                  onClick={() => onSelectTable(table.id, table.assignedWaiter?.id ?? null)}
                  className={cn(
                    "rounded-[10px] border px-2 py-2 text-left transition",
                    isSelected
                      ? "border-[#5f8a67] bg-[#edf5ef]"
                      : isBusy
                        ? "cursor-not-allowed border-[#ead7d5] bg-[#fff6f5] text-[#9a6a63]"
                        : "border-[#dbe4de] bg-white text-[#42554a]",
                  )}
                >
                  <div className="text-[11px] font-black">{table.tableNumber}</div>
                  <div className="mt-1 text-[10px]">
                    {table.status.replaceAll("_", " ")} • {table.capacity} seats
                  </div>
                </button>
              );
            })}
          </div>
          <select
            value={selectedWaiterId ?? ""}
            onChange={(event) => onWaiterChange(event.target.value || null)}
            className="w-full rounded-[10px] border border-[#d6e1d9] bg-white px-3 py-2 text-[11px] font-semibold text-[#233329]"
          >
            <option value="">Select waiter / اختر النادل</option>
            {waiters.map((waiter) => (
              <option key={waiter.id} value={waiter.id}>
                {waiter.name ?? waiter.email}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenTransferTable}
              disabled={!selectedTableId}
              className="rounded-full border border-[#d6e1d9] bg-white px-3 py-1.5 text-[10px] font-bold text-[#46644b] disabled:opacity-40"
            >
              Transfer table
            </button>
            <button
              type="button"
              onClick={onOpenMergeTables}
              disabled={!selectedTableId}
              className="rounded-full border border-[#d6e1d9] bg-white px-3 py-1.5 text-[10px] font-bold text-[#46644b] disabled:opacity-40"
            >
              Merge tables
            </button>
            <button
              type="button"
              onClick={onOpenSplitBill}
              disabled={!selectedTableId || cartLinesCount === 0}
              className="rounded-full border border-[#d6e1d9] bg-white px-3 py-1.5 text-[10px] font-bold text-[#46644b] disabled:opacity-40"
            >
              Split bill
            </button>
          </div>
        </div>
      ) : null}

      {orderType === "DELIVERY" ? (
        <div className="space-y-3 rounded-[12px] border border-[#dbe4de] bg-[#f8faf8] p-3">
          <div className="flex gap-2">
            {(["DIRECT", "THIRD_PARTY"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onDeliveryModeChange(mode)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[10px] font-bold transition",
                  deliveryMode === mode
                    ? "bg-[#46644b] text-white"
                    : "border border-[#d6e1d9] bg-white text-[#46644b]",
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
              className="w-full rounded-[10px] border border-[#d6e1d9] bg-white px-3 py-2 text-[11px] font-semibold text-[#233329]"
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
              className="w-full rounded-[10px] border border-[#d6e1d9] bg-white px-3 py-2 text-[11px] font-semibold text-[#233329]"
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
            className="h-9 w-full rounded-[10px] border border-[#d6e1d9] bg-white px-3 text-[11px] font-medium text-[#233329]"
          />
          <input
            type="text"
            value={deliveryNotes}
            onChange={(event) => onDeliveryNotesChange(event.target.value)}
            placeholder="Notes / ملاحظات"
            className="h-9 w-full rounded-[10px] border border-[#d6e1d9] bg-white px-3 text-[11px] font-medium text-[#233329]"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={deliveryFee}
            onChange={(event) => onDeliveryFeeChange(event.target.value)}
            placeholder="Delivery fee / رسوم التوصيل"
            className="h-9 w-full rounded-[10px] border border-[#d6e1d9] bg-white px-3 text-[11px] font-medium text-[#233329]"
          />
        </div>
      ) : null}

      {orderType === "DINE_IN" ? (
        <div className="rounded-[12px] border border-[#dbe4de] bg-[#f8faf8] p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7a8780]">
            Service charge / رسوم الخدمة
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={serviceChargeAmount}
            onChange={(event) => onServiceChargeChange(event.target.value)}
            className="mt-2 h-9 w-full rounded-[10px] border border-[#d6e1d9] bg-white px-3 text-[11px] font-medium text-[#233329]"
          />
        </div>
      ) : null}
    </div>
  );
}
