"use client";

import { LuBell, LuStore } from "react-icons/lu";

import { useTranslation } from "@/lib/i18n";

import { cn, getLocalizedText } from "@/lib/utils";
import type { InventoryWarehouse, PosSession, PosSessionReport } from "@/types/api";

function parseAmount(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number, currency = "JOD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function PosSessionBar({
  session,
  cashierLabel,
  warehouses,
  selectedWarehouseId,
  onWarehouseChange,
  onCloseSession,
  isPending,
  shiftReport,
  currencyCode,
  canCloseSession,
}: {
  session: PosSession;
  cashierLabel: string;
  warehouses: InventoryWarehouse[];
  selectedWarehouseId: string;
  onWarehouseChange: (id: string) => void;
  onCloseSession: () => void;
  isPending?: boolean;
  shiftReport?: PosSessionReport | null;
  currencyCode?: string;
  canCloseSession?: boolean;
}) {
  const { language } = useTranslation();
  const cc = currencyCode || session.cashAccount.currencyCode || "JOD";
  const initials =
    cashierLabel
      .split(" ")
      .map((w) => w[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "CA";

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-[#e7ebea] bg-white px-4 py-2 sm:px-5">
      <div className="flex flex-wrap items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-2">
          <LuStore className="h-4 w-4 text-[#9aa8a0]" />
          <div>
            <p className="text-[9px] uppercase tracking-wide text-[#9aa8a0]">Terminal</p>
            <p className="text-[12px] font-semibold text-[#2f3f35]">{session.terminalName}</p>
          </div>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wide text-[#9aa8a0]">Branch</p>
          <p className="text-[12px] font-semibold text-[#2f3f35]">{session.branchName ?? "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef4f0] text-xs font-bold text-[#4f7c58]">
            {initials}
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-[#9aa8a0]">Cashier</p>
            <p className="text-[12px] font-semibold text-[#2f3f35]">{cashierLabel}</p>
          </div>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wide text-[#9aa8a0]">Session</p>
          <div className="flex items-center gap-1.5">
            <p className="text-[12px] font-semibold text-[#2f3f35]">{session.sessionNumber}</p>
            <span className="rounded-full bg-[#e7f4eb] px-2 py-0.5 text-[9px] font-bold text-[#4f8a5f]">
              {getLocalizedText("Open / مفتوح", language)}
            </span>
          </div>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wide text-[#9aa8a0]">Warehouse</p>
          <select
            value={selectedWarehouseId}
            onChange={(e) => onWarehouseChange(e.target.value)}
            className="max-w-[190px] cursor-pointer bg-transparent text-[12px] font-semibold text-[#2f3f35] outline-none"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        {shiftReport && (
          <div className="ms-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] bg-[#f2f6f3] px-4 py-1.5 text-[10px] shadow-inner">
            <span className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wide text-[#8a9990]">{getLocalizedText("Opening / الافتتاح:", language)}</span>
              <span className="font-bold text-[#1f3427]">{formatCurrency(parseAmount(shiftReport.openingCash), cc)}</span>
            </span>
            <div className="h-3 w-px bg-[#d7e0da]" />
            <span className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wide text-[#8a9990]">{getLocalizedText("Cash / نقد:", language)}</span>
              <span className="font-bold text-[#1f3427]">{formatCurrency(parseAmount(shiftReport.cashSales), cc)}</span>
            </span>
            <div className="h-3 w-px bg-[#d7e0da]" />
            <span className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wide text-[#8a9990]">{getLocalizedText("Card / بطاقة:", language)}</span>
              <span className="font-bold text-[#1f3427]">{formatCurrency(parseAmount(shiftReport.cardSales), cc)}</span>
            </span>
            <div className="h-3 w-px bg-[#d7e0da]" />
            <span className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wide text-[#8a9990]">{getLocalizedText("Bank / بنك:", language)}</span>
              <span className="font-bold text-[#1f3427]">{formatCurrency(parseAmount(shiftReport.bankTransferSales), cc)}</span>
            </span>
            <div className="h-3 w-px bg-[#d7e0da]" />
            <span className="flex items-center gap-1.5 rounded-[10px] bg-white px-2.5 py-0.5 font-black text-[#4f7c58] shadow-sm ring-1 ring-[#c1d3c6]">
              <span>{getLocalizedText("Expected / المتوقع:", language)}</span>
              <span>{formatCurrency(parseAmount(shiftReport.expectedCash), cc)}</span>
            </span>
          </div>
        )}
      </div>
      
      <div className="ms-auto flex shrink-0 items-center gap-2 border-s border-[#e7ebea] ps-4">
        <button
          type="button"
          onClick={onCloseSession}
          disabled={isPending || canCloseSession === false}
          title={
            canCloseSession === false
              ? getLocalizedText("You cannot close this shift / لا يمكن إغلاق الوردية", language)
              : undefined
          }
          className={cn(
            "rounded-[12px] border border-[#f0d9d6] bg-[#fff5f4] px-4 py-1.5 text-xs font-bold text-[#b54b40] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {isPending ? "Closing…" : getLocalizedText("Close Shift / إغلاق الوردية", language)}
        </button>
        <button type="button" className="flex h-[34px] w-[34px] items-center justify-center rounded-[12px] border border-[#e4e9e6] bg-white text-[#9aa8a0] shadow-sm transition hover:bg-[#f5f7f6]">
          <LuBell className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
