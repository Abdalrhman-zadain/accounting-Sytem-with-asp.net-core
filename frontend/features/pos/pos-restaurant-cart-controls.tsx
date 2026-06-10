"use client";

import { cn } from "@/lib/utils";
import { LuArrowRightLeft, LuChefHat, LuCombine, LuScissors, LuUser, LuUtensils } from "react-icons/lu";
import type {
  DeliveryCompany,
  DeliveryCollectionMethod,
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
  deliveryCollectionMethod: DeliveryCollectionMethod;
  deliveryDriverId: string | null;
  deliveryDrivers: DeliveryDriver[];
  selectedDeliveryDriverLabel?: string | null;
  selectedDeliveryDriverPhone?: string | null;
  deliveryFee: number;
  deliveryMode: "DIRECT" | "THIRD_PARTY";
  deliveryNotes: string;
  editingInvoiceId: string | null;
  onDeliveryAddressChange: (value: string) => void;
  onDeliveryCompanyChange: (value: string | null) => void;
  onDeliveryCollectionMethodChange: (value: DeliveryCollectionMethod) => void;
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
  selectedTableLabel?: string | null;
  selectedWaiterId: string | null;
  serviceChargeAmount: number;
  waiters: PosWaiter[];
  lockedTableId?: string | null;
  waiterMode?: boolean;
  onBackToTables?: () => void;
  language?: string;
  orderLocked?: boolean;
};

const ORDER_TYPE_OPTIONS: Array<{ value: PosOrderType; en: string; ar: string }> = [
  { value: "DINE_IN", en: "Dine-In", ar: "صالة" },
  { value: "TAKEAWAY", en: "Takeaway", ar: "سفري" },
  { value: "DELIVERY", en: "Delivery", ar: "توصيل" },
];

export function PosRestaurantCartControls({
  cartLinesCount,
  deliveryAddress,
  deliveryCompanies,
  deliveryCompanyId,
  deliveryCollectionMethod,
  deliveryDriverId,
  deliveryDrivers,
  selectedDeliveryDriverLabel,
  selectedDeliveryDriverPhone,
  deliveryFee,
  deliveryMode,
  deliveryNotes,
  editingInvoiceId,
  onDeliveryAddressChange,
  onDeliveryCompanyChange,
  onDeliveryCollectionMethodChange,
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
  selectedTableLabel,
  selectedWaiterId,
  serviceChargeAmount,
  waiters,
  lockedTableId,
  waiterMode,
  onBackToTables,
  language,
  orderLocked = false,
}: PosRestaurantCartControlsProps) {
  const isAr = language === "ar";
  const selectedTable = restaurantTables.find((t) => t.id === selectedTableId) ?? null;
  const visibleTableLabel = selectedTable
    ? isAr
      ? `طاولة ${selectedTable.tableNumber}`
      : `Table ${selectedTable.tableNumber}`
    : selectedTableLabel
      ? isAr
        ? `طاولة ${selectedTableLabel}`
        : `Table ${selectedTableLabel}`
      : null;
  const isTableLocked = Boolean(lockedTableId && lockedTableId === selectedTableId && editingInvoiceId);
  const controlsDisabled = orderLocked;
  const selectedDeliveryDriver = deliveryDrivers.find((driver) => driver.id === deliveryDriverId) ?? null;
  const visibleDeliveryDriverLabel = selectedDeliveryDriver?.name ?? selectedDeliveryDriverLabel ?? null;

  return (
    <div className="flex flex-col gap-3">
      {/* Back-to-tables (waiter mode) */}
      {waiterMode && onBackToTables && (
        <button
          type="button"
          onClick={onBackToTables}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-[12px] border border-[#cbd5d0] bg-[#edf5ef] px-4 text-xs font-bold text-[#2e5d3c] shadow-sm transition hover:bg-[#e1f2e5]"
        >
          {isAr ? "← العودة للطاولات" : "← Back to Tables"}
        </button>
      )}

      {/* ── ORDER TYPE SELECTOR (2×2 segmented) ── */}
      {!waiterMode && (
        <div className="grid grid-cols-2 gap-1.5">
          {ORDER_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={controlsDisabled || (isTableLocked && opt.value !== orderType)}
              onClick={() => onOrderTypeChange(opt.value)}
              className={cn(
                "flex h-9 items-center justify-center rounded-[10px] border text-xs font-bold transition-colors disabled:opacity-40",
                orderType === opt.value
                  ? "border-[#ea580c] bg-[#fff7ed] text-[#c2410c]"
                  : "border-[#e5e7eb] bg-white text-[#374151] hover:border-[#d1d5db] hover:bg-[#fafafa]",
              )}
            >
              {isAr ? opt.ar : opt.en}
            </button>
          ))}
        </div>
      )}

      {/* ── DINE-IN: table badge + ops + service charge ── */}
      {orderType === "DINE_IN" ? (
        <div className="space-y-2.5">
          {/* Table badge */}
          <div className="flex items-center gap-2 rounded-xl border border-[#d6d3f0] bg-[#f5f3ff] px-3 py-2">
            <LuUtensils className="h-4 w-4 shrink-0 text-[#4338ca]" />
            <span className="flex-1 text-xs font-bold text-[#4338ca]">
              {visibleTableLabel
                ? visibleTableLabel
                : isAr
                  ? "لم تُختر طاولة"
                  : "No table selected"}
            </span>
            <button
              type="button"
              disabled={controlsDisabled}
              onClick={onOpenTableSelector}
              className="rounded-lg border border-[#c7c3ff] bg-white px-2 py-1 text-[10px] font-bold text-[#4338ca] hover:bg-[#efefff] disabled:opacity-40"
            >
              {isAr ? "تغيير" : "Change"}
            </button>
          </div>

          {/* Table operations (only visible when a table order is active)
              Note: Hidden per user request. To restore the buttons, uncomment this block.
          {selectedTableId && (
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={controlsDisabled}
                onClick={onOpenTransferTable}
                className="flex flex-col items-center gap-1 rounded-xl border border-[#d6e1d9] bg-white px-1.5 py-2 text-center text-[10px] font-bold text-[#506054] transition hover:bg-[#f6faf7] hover:text-[#233329] disabled:opacity-40"
              >
                <LuArrowRightLeft className="h-3.5 w-3.5" />
                <span>{isAr ? "نقل" : "Transfer"}</span>
              </button>
              <button
                type="button"
                disabled={controlsDisabled}
                onClick={onOpenMergeTables}
                className="flex flex-col items-center gap-1 rounded-xl border border-[#d6e1d9] bg-white px-1.5 py-2 text-center text-[10px] font-bold text-[#506054] transition hover:bg-[#f6faf7] hover:text-[#233329] disabled:opacity-40"
              >
                <LuCombine className="h-3.5 w-3.5" />
                <span>{isAr ? "دمج" : "Merge"}</span>
              </button>
              <button
                type="button"
                onClick={onOpenSplitBill}
                disabled={controlsDisabled || cartLinesCount === 0}
                className="flex flex-col items-center gap-1 rounded-xl border border-[#d6e1d9] bg-white px-1.5 py-2 text-center text-[10px] font-bold text-[#506054] transition hover:bg-[#f6faf7] hover:text-[#233329] disabled:opacity-40"
              >
                <LuScissors className="h-3.5 w-3.5" />
                <span>{isAr ? "تقسيم" : "Split"}</span>
              </button>
            </div>
          )}
          */}
        </div>
      ) : null}

      {/* ── DELIVERY details ── */}
      {orderType === "DELIVERY" ? (
        <div className="space-y-2.5 rounded-[16px] border-2 border-[#dbe4de] bg-[#f8faf8] p-3">
          {/* Direct vs third-party toggle */}
          <div className="flex gap-2">
            {(["THIRD_PARTY", "DIRECT"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={controlsDisabled}
                onClick={() => onDeliveryModeChange(mode)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-40",
                  deliveryMode === mode
                    ? "bg-[#4338ca] text-white"
                    : "border border-[#cbd5cf] bg-white text-[#46644b]",
                )}
              >
                {mode === "DIRECT"
                  ? isAr
                    ? "توصيل مباشر"
                    : "Direct"
                  : isAr
                    ? "شركة توصيل"
                    : "3rd party"}
              </button>
            ))}
          </div>

          {deliveryMode === "DIRECT" ? (
            <div className="space-y-2">
              <select
                value={deliveryDriverId ?? ""}
                disabled={controlsDisabled}
                onChange={(e) => onDeliveryDriverChange(e.target.value || null)}
                className="h-9 w-full rounded-xl border border-[#c2d6c9] bg-white px-3 text-xs font-bold text-[#233329] disabled:opacity-50"
              >
                <option value="">{isAr ? "اختر السائق" : "Select driver"}</option>
                {deliveryDriverId && !selectedDeliveryDriver && visibleDeliveryDriverLabel ? (
                  <option value={deliveryDriverId}>{visibleDeliveryDriverLabel}</option>
                ) : null}
                {deliveryDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {deliveryDriverId && visibleDeliveryDriverLabel ? (
                <div className="rounded-xl border border-[#dbeafe] bg-[#eff6ff] px-3 py-2 text-[11px] font-bold text-[#1d4ed8]">
                  <div>
                    {isAr ? "السائق: " : "Driver: "}
                    {visibleDeliveryDriverLabel}
                  </div>
                  {selectedDeliveryDriver?.phone || selectedDeliveryDriverPhone ? (
                    <div className="mt-1 font-semibold opacity-90">
                      {isAr ? "الهاتف: " : "Phone: "}
                      {selectedDeliveryDriver?.phone ?? selectedDeliveryDriverPhone}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <select
                value={deliveryCompanyId ?? ""}
                disabled={controlsDisabled}
                onChange={(e) => onDeliveryCompanyChange(e.target.value || null)}
                className="h-9 w-full rounded-xl border border-[#c2d6c9] bg-white px-3 text-xs font-bold text-[#233329] disabled:opacity-50"
              >
                <option value="">{isAr ? "اختر الشركة (اختياري)" : "Select company (optional)"}</option>
                {deliveryCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.arabicName ? ` / ${c.arabicName}` : ""}
                  </option>
                ))}
              </select>
              <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-center text-[11px] font-bold text-[#166534] shadow-sm">
                {isAr
                  ? "العميل دفع على تطبيق شركة التوصيل"
                  : "Customer paid through the delivery app"}
              </div>
            </div>
          )}

          <input
            type="text"
            value={deliveryAddress}
            disabled={controlsDisabled}
            onChange={(e) => onDeliveryAddressChange(e.target.value)}
            placeholder={
              deliveryMode === "THIRD_PARTY"
                ? isAr
                  ? "العنوان (اختياري)"
                  : "Address (optional)"
                : isAr
                  ? "العنوان"
                  : "Address"
            }
            className="h-9 w-full rounded-xl border border-[#cbd5cf] bg-white px-3 text-xs font-semibold text-[#233329] disabled:opacity-50"
          />
          <input
            type="text"
            value={deliveryNotes}
            disabled={controlsDisabled}
            onChange={(e) => onDeliveryNotesChange(e.target.value)}
            placeholder={isAr ? "ملاحظات التوصيل" : "Delivery notes"}
            className="h-9 w-full rounded-xl border border-[#cbd5cf] bg-white px-3 text-xs font-semibold text-[#233329] disabled:opacity-50"
          />
          <div>
            <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#68776f]">
              {isAr ? "رسوم التوصيل" : "Delivery fee"}
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={controlsDisabled}
              value={deliveryFee}
              onChange={(e) => onDeliveryFeeChange(e.target.value)}
              className="h-9 w-full rounded-xl border border-[#cbd5cf] bg-white px-3 text-xs font-semibold text-[#233329] disabled:opacity-50"
            />
          </div>

        </div>
      ) : null}

      {/* ── PICKUP: quick waiter ── */}
      {orderType === "PICKUP" ? (
        <div>
          <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#68776f]">
            {isAr ? "مندوب الاستلام" : "Staff (pickup)"}
          </div>
          <select
            value={selectedWaiterId ?? ""}
            onChange={(e) => onWaiterChange(e.target.value || null)}
            className="h-9 w-full rounded-xl border border-[#cbd5cf] bg-white px-3 text-xs font-semibold text-[#233329]"
          >
            <option value="">{isAr ? "— اختر —" : "— None —"}</option>
            {waiters.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name || w.email}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
