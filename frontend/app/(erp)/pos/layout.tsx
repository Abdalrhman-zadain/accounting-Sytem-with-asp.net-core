"use client";

import type { ReactNode } from "react";

import { PosKitchenPrintHubProvider } from "@/features/pos/pos-kitchen-print-hub-provider";

export default function PosLayout({ children }: { children: ReactNode }) {
  return <PosKitchenPrintHubProvider>{children}</PosKitchenPrintHubProvider>;
}
