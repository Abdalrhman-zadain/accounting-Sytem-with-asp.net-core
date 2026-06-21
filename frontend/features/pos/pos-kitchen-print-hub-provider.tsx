"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import {
  useKitchenPrintHub,
  type KitchenCartLinePrintRef,
  type KitchenPrintHubController,
} from "@/features/pos/pos-kitchen-print-hub";
import { loadPosPrinterConfig } from "@/features/pos/pos-printer-config";
import { hasPermission, isWaiterOnlyUser } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/providers/auth-provider";

const noopKitchenPrintHub: KitchenPrintHubController = {
  markKitchenOrderItemsPrinted: () => {},
  markKitchenOrderItemsPrintedForSale: () => {},
  markKitchenInvoiceFullyPrinted: () => {},
  markKitchenLinesFromCart: () => {},
};

const KitchenPrintHubContext = createContext<KitchenPrintHubController>(noopKitchenPrintHub);

export function useKitchenPrintHubActions(): KitchenPrintHubController {
  return useContext(KitchenPrintHubContext);
}

export type PosKitchenPrintHubProviderProps = {
  children: ReactNode;
  onPrintError?: (message: string) => void;
};

export function PosKitchenPrintHubProvider({
  children,
  onPrintError,
}: PosKitchenPrintHubProviderProps) {
  const { token, user } = useAuth();
  const { language } = useTranslation();
  const pathname = usePathname() ?? "";
  const printerConfig = loadPosPrinterConfig();

  const enabled =
    !pathname.startsWith("/pos/waiter") &&
    !isWaiterOnlyUser(user) &&
    hasPermission(user, "POS_VIEW_POS_SCREEN") &&
    printerConfig.kitchenPrintHubEnabled &&
    printerConfig.autoPrintKotOnSend &&
    Boolean(token);

  const hub = useKitchenPrintHub({
    enabled,
    token,
    language,
    onPrintError: (message) => {
      if (onPrintError) {
        onPrintError(message);
        return;
      }
      console.error("[kitchen-print-hub]", message);
    },
  });

  return (
    <KitchenPrintHubContext.Provider value={hub}>{children}</KitchenPrintHubContext.Provider>
  );
}

export type { KitchenCartLinePrintRef };
