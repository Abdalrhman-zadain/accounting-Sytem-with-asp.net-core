"use client";

import type { ReactNode } from "react";

import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import {
  PosRegisterMainGrid,
  POS_REGISTER_MARKET_THEME,
  posRegisterCatalogClass,
  posRegisterCartPanelClass,
  type PosRegisterMobileCartBarProps,
} from "@/features/pos-shared";
import { cn } from "@/lib/utils";

const posMarketRegisterGridClass = cn(
  "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:gap-4 sm:p-4",
  "pos-wide:grid pos-wide:grid-cols-[minmax(0,1fr)_minmax(280px,36%)] pos-wide:pb-4 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px]",
);

type PosMarketRegisterLayoutProps = {
  catalog: ReactNode;
  cart: ReactNode;
  mobileCartBar: Omit<PosRegisterMobileCartBarProps, "isOpen" | "onToggle" | "theme">;
};

export function PosMarketRegisterLayout({ catalog, cart, mobileCartBar }: PosMarketRegisterLayoutProps) {
  return (
    <PosRegisterMainGrid
      catalog={catalog}
      salePanel={cart}
      mobileCartBar={{ ...mobileCartBar, theme: POS_REGISTER_MARKET_THEME }}
      gridClassName={cn(posMarketRegisterGridClass, "bg-[#f7f9fc]")}
      catalogClassName={posRegisterCatalogClass}
      cartPanelClassName={posRegisterCartPanelClass}
      salePanelShell={(children) => (
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border bg-white shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)]"
          style={{ borderColor: POS_MARKET_THEME.colors.outline }}
        >
          {children}
        </div>
      )}
    />
  );
}
