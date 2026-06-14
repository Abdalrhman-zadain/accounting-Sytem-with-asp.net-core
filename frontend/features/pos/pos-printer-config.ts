export type PosPrintBridgeMode = "agent" | "qz" | "browser";

export type PosPrinterConfig = {
  kitchenPrinterName: string | null;
  receiptPrinterName: string | null;
  autoPrintKotOnSend: boolean;
  autoPrintReceiptOnPay: boolean;
  printBridge: PosPrintBridgeMode;
};

const STORAGE_KEY = "pos.printer-config.v1";

export const DEFAULT_POS_PRINTER_CONFIG: PosPrinterConfig = {
  kitchenPrinterName: null,
  receiptPrinterName: null,
  autoPrintKotOnSend: true,
  autoPrintReceiptOnPay: true,
  printBridge: "agent",
};

function normalizeConfig(raw: Partial<PosPrinterConfig> | null | undefined): PosPrinterConfig {
  return {
    ...DEFAULT_POS_PRINTER_CONFIG,
    ...raw,
    kitchenPrinterName: raw?.kitchenPrinterName?.trim() || null,
    receiptPrinterName: raw?.receiptPrinterName?.trim() || null,
    printBridge:
      raw?.printBridge === "browser"
        ? "browser"
        : raw?.printBridge === "qz"
          ? "qz"
          : raw?.printBridge === "agent"
            ? "agent"
            : DEFAULT_POS_PRINTER_CONFIG.printBridge,
  };
}

export function loadPosPrinterConfig(): PosPrinterConfig {
  if (typeof window === "undefined") {
    return DEFAULT_POS_PRINTER_CONFIG;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_POS_PRINTER_CONFIG;
    }
    return normalizeConfig(JSON.parse(raw) as Partial<PosPrinterConfig>);
  } catch {
    return DEFAULT_POS_PRINTER_CONFIG;
  }
}

export function savePosPrinterConfig(config: PosPrinterConfig): PosPrinterConfig {
  const normalized = normalizeConfig(config);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function updatePosPrinterConfig(
  patch: Partial<PosPrinterConfig>,
): PosPrinterConfig {
  return savePosPrinterConfig({
    ...loadPosPrinterConfig(),
    ...patch,
  });
}
