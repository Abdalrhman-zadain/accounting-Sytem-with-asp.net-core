"use client";

import { LuBell } from "react-icons/lu";

import { posTouchButtonClass } from "@/features/pos/pos-layout-classes";
import { useTranslation } from "@/lib/i18n";
import { cn, getLocalizedText } from "@/lib/utils";
export function PosSessionBar({
  onCloseSession,
  isPending,
  canCloseSession,
}: {
  onCloseSession: () => void;
  isPending?: boolean;
  canCloseSession?: boolean;
}) {
  const { language } = useTranslation();

  return (
    <div className="shrink-0 border-b border-[#e7ebea] bg-white px-3 py-3 sm:px-5">
      <div className="flex items-center justify-end gap-2">
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
            "rounded-[12px] border border-[#f0d9d6] bg-[#fff5f4] px-4 py-2.5 text-xs font-bold text-[#b54b40] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50",
            posTouchButtonClass,
          )}
        >
          {isPending
            ? getLocalizedText("Closing… / جاري الإغلاق…", language)
            : getLocalizedText("Close Shift / إغلاق الوردية", language)}
        </button>
        <button
          type="button"
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-[#e4e9e6] bg-white text-[#9aa8a0] shadow-sm transition hover:bg-[#f5f7f6]",
            posTouchButtonClass,
          )}
        >
          <LuBell className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
