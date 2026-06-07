"use client";

import type { ReactNode } from "react";

/**
 * Premium main register grid:
 * Optimizes space for the product catalog and styles the cart panel with high-fidelity borders.
 */
export function PosRegisterMainGrid({
  catalog,
  salePanel,
}: {
  catalog: ReactNode;
  salePanel: ReactNode;
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-visible bg-[#fafafc] p-3 sm:gap-5 sm:p-4 lg:overflow-hidden lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="order-1 min-w-0">{catalog}</section>
      <aside className="order-2 flex min-h-0 flex-col lg:order-2 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-6rem)] xl:self-start">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-[#e8ece9] bg-white shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)]">
          {salePanel}
        </div>
      </aside>
    </div>
  );
}
