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
    <div className="grid min-h-0 flex-1 gap-6 overflow-auto bg-[#fafafc] p-4 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[390px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:self-start">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-[#e8ece9] bg-white shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)]">
          {salePanel}
        </div>
      </aside>
      <section className="min-w-0">{catalog}</section>
    </div>
  );
}
