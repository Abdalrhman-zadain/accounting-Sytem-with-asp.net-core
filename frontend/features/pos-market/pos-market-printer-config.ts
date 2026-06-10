export type PosMarketPrintBridgeMode = "qz" | "browser";

export type PosMarketPrinterConfig = {
  receiptPrinterName: string | null;
  autoPrintReceiptOnPay: boolean;
  printBridge: PosMarketPrintBridgeMode;
};

const STORAGE_KEY = "pos-market.printer-config.v1";

export const DEFAULT_POS_MARKET_PRINTER_CONFIG: PosMarketPrinterConfig = {
  receiptPrinterName: null,
  autoPrintReceiptOnPay: true,
  printBridge: "qz",
};

function normalizeConfig(
  raw: Partial<PosMarketPrinterConfig> | null | undefined,
): PosMarketPrinterConfig {
  return {
    ...DEFAULT_POS_MARKET_PRINTER_CONFIG,
    ...raw,
    receiptPrinterName: raw?.receiptPrinterName?.trim() || null,
    printBridge: raw?.printBridge === "browser" ? "browser" : "qz",
  };
}

export function loadPosMarketPrinterConfig(): PosMarketPrinterConfig {
  if (typeof window === "undefined") {
    return DEFAULT_POS_MARKET_PRINTER_CONFIG;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_POS_MARKET_PRINTER_CONFIG;
    return normalizeConfig(JSON.parse(raw) as Partial<PosMarketPrinterConfig>);
  } catch {
    return DEFAULT_POS_MARKET_PRINTER_CONFIG;
  }
}

export function savePosMarketPrinterConfig(config: PosMarketPrinterConfig): PosMarketPrinterConfig {
  const normalized = normalizeConfig(config);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function updatePosMarketPrinterConfig(
  patch: Partial<PosMarketPrinterConfig>,
): PosMarketPrinterConfig {
  return savePosMarketPrinterConfig({
    ...loadPosMarketPrinterConfig(),
    ...patch,
  });
}
