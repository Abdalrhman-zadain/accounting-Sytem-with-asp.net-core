"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  posRegisterCartPanelClass,
  posRegisterCatalogClass,
  posRegisterGridClass,
} from "@/features/pos/pos-layout-classes";
import {
  PosRegisterMobileOrderSheet,
  PosRegisterStickyCartBar,
  useRegisterWideLayout,
  type PosRegisterMobileCartBarProps,
} from "@/features/pos/pos-register-mobile-cart";

function SalePanelShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-[#e8ece9] bg-white shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)]">
      {children}
    </div>
  );
}

/**
 * Register layout:
 * - Wide (≥960px): catalog + order panel side by side
 * - Narrow (iPad portrait, phones): full-screen catalog + sticky cart bar + slide-up order sheet
 */
export function PosRegisterMainGrid({
  catalog,
  salePanel,
  mobileCartBar,
}: {
  catalog: ReactNode;
  salePanel: ReactNode;
  mobileCartBar: Omit<PosRegisterMobileCartBarProps, "isOpen" | "onToggle">;
}) {
  const isWide = useRegisterWideLayout();
  const [isMobileOrderOpen, setIsMobileOrderOpen] = useState(false);

  useEffect(() => {
    if (isWide) setIsMobileOrderOpen(false);
  }, [isWide]);

  return (
    <>
      <div className={posRegisterGridClass}>
        <section className={posRegisterCatalogClass}>{catalog}</section>

        {isWide ? (
          <aside className={posRegisterCartPanelClass}>
            <SalePanelShell>{salePanel}</SalePanelShell>
          </aside>
        ) : null}
      </div>

      {!isWide ? (
        <>
          <PosRegisterStickyCartBar
            {...mobileCartBar}
            isOpen={isMobileOrderOpen}
            onToggle={() => setIsMobileOrderOpen((open) => !open)}
          />
          <PosRegisterMobileOrderSheet
            isOpen={isMobileOrderOpen}
            onClose={() => setIsMobileOrderOpen(false)}
            orderTitle={mobileCartBar.orderTitle}
          >
            <SalePanelShell>{salePanel}</SalePanelShell>
          </PosRegisterMobileOrderSheet>
        </>
      ) : null}
    </>
  );
}
