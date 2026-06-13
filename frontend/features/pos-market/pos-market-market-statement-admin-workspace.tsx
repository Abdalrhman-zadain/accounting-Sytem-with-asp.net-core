"use client";

import { useSearchParams } from "next/navigation";

import { PosMarketReceivableDetailWorkspace } from "@/features/pos-market/pos-market-receivable-detail-workspace";
import { PosMarketReceivablesWorkspace } from "@/features/pos-market/pos-market-receivables-workspace";

const ADMIN_MARKET_STATEMENT_TAB = "market-statement";

function adminMarketStatementHref(customerId?: string) {
  const params = new URLSearchParams({ tab: ADMIN_MARKET_STATEMENT_TAB });
  if (customerId) {
    params.set("customerId", customerId);
  }
  return `/sales-receivables?${params.toString()}`;
}

export function PosMarketMarketStatementAdminWorkspace() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customerId")?.trim() || null;

  if (customerId) {
    return (
      <PosMarketReceivableDetailWorkspace
        customerId={customerId}
        embedded
        backHref={adminMarketStatementHref()}
      />
    );
  }

  return (
    <PosMarketReceivablesWorkspace
      embedded
      detailHref={(id) => adminMarketStatementHref(id)}
    />
  );
}
