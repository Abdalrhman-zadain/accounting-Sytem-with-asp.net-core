"use client";

import { useParams } from "next/navigation";

import { PosMarketReceivableDetailWorkspace } from "@/features/pos-market/pos-market-receivable-detail-workspace";

export default function PosMarketReceivableDetailPage() {
  const params = useParams();
  const customerId = typeof params.customerId === "string" ? params.customerId : "";

  return <PosMarketReceivableDetailWorkspace customerId={customerId} />;
}
