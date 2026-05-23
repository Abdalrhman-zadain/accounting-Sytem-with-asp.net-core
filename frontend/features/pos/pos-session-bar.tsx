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
    <div className="flex shrink-0 flex-col border-b border-[#e7ebea] bg-white">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:gap-5 sm:px-5">
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
        <div className="flex flex-1 flex-wrap justify-end gap-2">
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
              "rounded-lg border border-[#efd7d4] bg-[#fff7f6] px-3 py-1.5 text-xs font-semibold text-[#a15f57] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {isPending ? "Closing…" : getLocalizedText("Close Shift / إغلاق الوردية", language)}
          </button>
          <button type="button" className="rounded-lg p-1.5 text-[#9aa8a0] transition hover:bg-[#f5f7f6]">
            <LuBell className="h-4 w-4" />
          </button>
        </div>
      </div>
      {shiftReport ? (
        <div className="flex flex-wrap gap-2 border-t border-[#edf1ee] px-4 py-2 text-[10px] text-[#5d6962] sm:px-5">
          <span className="rounded-full bg-[#f6f8f7] px-2.5 py-0.5 font-bold">
            {getLocalizedText("Opening / الافتتاح:", language)}{" "}
            <span className="text-[#1f3427]">{formatCurrency(parseAmount(shiftReport.openingCash), cc)}</span>
          </span>
          <span className="rounded-full bg-[#f6f8f7] px-2.5 py-0.5 font-bold">
            {getLocalizedText("Cash sales / نقد:", language)}{" "}
            <span className="text-[#1f3427]">{formatCurrency(parseAmount(shiftReport.cashSales), cc)}</span>
          </span>
          <span className="rounded-full bg-[#f6f8f7] px-2.5 py-0.5 font-bold">
            {getLocalizedText("Card / بطاقة:", language)}{" "}
            <span className="text-[#1f3427]">{formatCurrency(parseAmount(shiftReport.cardSales), cc)}</span>
          </span>
          <span className="rounded-full bg-[#f6f8f7] px-2.5 py-0.5 font-bold">
            {getLocalizedText("Bank / تحويل:", language)}{" "}
            <span className="text-[#1f3427]">
              {formatCurrency(parseAmount(shiftReport.bankTransferSales), cc)}
            </span>
          </span>
          <span className="rounded-full border border-[#d6e6da] bg-white px-2.5 py-0.5 font-black text-[#4f7c58]">
            {getLocalizedText("Expected cash / المتوقع:", language)}{" "}
            {formatCurrency(parseAmount(shiftReport.expectedCash), cc)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
