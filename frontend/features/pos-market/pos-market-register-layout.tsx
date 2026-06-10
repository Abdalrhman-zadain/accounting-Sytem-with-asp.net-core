"use client";

import type { ReactNode } from "react";

type PosMarketRegisterLayoutProps = {
  catalog: ReactNode;
  cart: ReactNode;
};

export function PosMarketRegisterLayout({ catalog, cart }: PosMarketRegisterLayoutProps) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 p-3 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-h-0 overflow-hidden">{catalog}</div>
      <div className="min-h-[320px] lg:min-h-0">{cart}</div>
    </div>
  );
}
