"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LuChevronUp, LuShoppingCart, LuX } from "react-icons/lu";

import { posTouchButtonClass } from "@/features/pos/pos-layout-classes";
import { cn } from "@/lib/utils";

const REGISTER_WIDE_MIN_PX = 960;

export function useRegisterWideLayout(wideMinPx = REGISTER_WIDE_MIN_PX) {
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${wideMinPx}px)`);
    const update = () => setIsWide(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [wideMinPx]);

  return isWide;
}

export type PosRegisterMobileCartBarProps = {
  itemCount: number;
  totalLabel: string;
  itemsLabel: string;
  viewOrderLabel: string;
  orderTitle: string;
  isOpen: boolean;
  onToggle: () => void;
  wideMinPx?: 960 | 1180;
};

export function PosRegisterStickyCartBar({
  itemCount,
  totalLabel,
  itemsLabel,
  viewOrderLabel,
  isOpen,
  onToggle,
  wideMinPx = 960,
}: PosRegisterMobileCartBarProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-[180] border-t border-[#dce3de] bg-white/95 px-3 py-2.5 shadow-[0_-8px_32px_rgba(0,0,0,0.08)] backdrop-blur-md",
        wideMinPx === 1180 ? "min-[1180px]:hidden" : "min-[960px]:hidden",
        "pb-[max(0.625rem,env(safe-area-inset-bottom))]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-[14px] border border-[#d6e1d9] bg-[#f8fbf9] px-3 py-2.5 text-start transition hover:bg-[#f1f7f3]",
          posTouchButtonClass,
        )}
        aria-expanded={isOpen}
      >
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#16a34a] text-white">
          <LuShoppingCart className="h-5 w-5" />
          {itemCount > 0 ? (
            <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#111827] px-1 text-[10px] font-black text-white">
              {itemCount > 99 ? "99+" : itemCount}
            </span>
          ) : null}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold text-[#6b7280]">{itemsLabel}</span>
          <span className="block text-lg font-black tabular-nums text-[#111827]" dir="ltr">
            {totalLabel}
          </span>
        </span>

        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-[10px] bg-[#16a34a] px-3 py-2 text-xs font-bold text-white",
            posTouchButtonClass,
          )}
        >
          {viewOrderLabel}
          <LuChevronUp
            className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")}
          />
        </span>
      </button>
    </div>
  );
}

export function PosRegisterMobileOrderSheet({
  isOpen,
  onClose,
  orderTitle,
  children,
  wideMinPx = 960,
}: {
  isOpen: boolean;
  onClose: () => void;
  orderTitle: string;
  children: ReactNode;
  wideMinPx?: 960 | 1180;
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[190]",
        wideMinPx === 1180 ? "min-[1180px]:hidden" : "min-[960px]:hidden",
      )}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#1e2c23]/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close order"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={orderTitle}
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[min(92dvh,820px)] flex-col overflow-hidden rounded-t-[20px] border border-[#e8ece9] bg-white shadow-[0_-16px_48px_rgba(0,0,0,0.12)]",
          "animate-in slide-in-from-bottom fade-in duration-200 motion-reduce:animate-none",
          "pb-[env(safe-area-inset-bottom,0px)]",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#eef1ef] px-4 py-3">
          <div className="mx-auto h-1 w-10 shrink-0 rounded-full bg-[#d1d5db]" aria-hidden />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#eef1ef] px-4 pb-3">
          <h2 className="text-base font-black text-[#111827] arabic-heading">{orderTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]",
              posTouchButtonClass,
            )}
            aria-label="Close order"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
