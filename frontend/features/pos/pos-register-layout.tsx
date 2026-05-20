"use client";

import type { ReactNode } from "react";

/** Main register grid: catalog (scrolls) + compact sticky sale panel. */
export function PosRegisterMainGrid({
  catalog,
  salePanel,
}: {
  catalog: ReactNode;
  salePanel: ReactNode;
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-auto bg-[#f6f7f8] p-3 lg:grid-cols-[minmax(0,1fr)_330px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0">{catalog}</section>
      <aside className="lg:sticky lg:top-3 lg:max-h-[calc(100vh-5.25rem)] lg:self-start lg:overflow-y-auto">
        {salePanel}
      </aside>
    </div>
  );
}
