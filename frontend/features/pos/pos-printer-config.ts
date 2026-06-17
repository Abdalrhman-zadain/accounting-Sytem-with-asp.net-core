export type PosPrintBridgeMode = "qz" | "browser";

export type PosPrinterConfig = {
  kitchenPrinterName: string | null;
  receiptPrinterName: string | null;
  autoPrintKotOnSend: boolean;
  autoPrintReceiptOnPay: boolean;
  kitchenPrintHubEnabled: boolean;
  printBridge: PosPrintBridgeMode;
};

const STORAGE_KEY = "pos.printer-config.v2";
const LEGACY_STORAGE_KEY = "pos.printer-config.v1";

export const DEFAULT_POS_PRINTER_CONFIG: PosPrinterConfig = {
  kitchenPrinterName: null,
  receiptPrinterName: null,
  autoPrintKotOnSend: true,
  autoPrintReceiptOnPay: true,
  kitchenPrintHubEnabled: true,
  printBridge: "qz",
};

function normalizeConfig(raw: Partial<PosPrinterConfig> | null | undefined): PosPrinterConfig {
  return {
    ...DEFAULT_POS_PRINTER_CONFIG,
    ...raw,
    kitchenPrinterName: raw?.kitchenPrinterName?.trim() || null,
    receiptPrinterName: raw?.receiptPrinterName?.trim() || null,
    autoPrintKotOnSend: raw?.autoPrintKotOnSend ?? DEFAULT_POS_PRINTER_CONFIG.autoPrintKotOnSend,
    autoPrintReceiptOnPay:
      raw?.autoPrintReceiptOnPay ?? DEFAULT_POS_PRINTER_CONFIG.autoPrintReceiptOnPay,
    kitchenPrintHubEnabled:
      raw?.kitchenPrintHubEnabled ?? DEFAULT_POS_PRINTER_CONFIG.kitchenPrintHubEnabled,
    printBridge: raw?.printBridge === "browser" ? "browser" : "qz",
  };
}

function readStoredPrinterConfig(): PosPrinterConfig | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const current = window.localStorage.getItem(STORAGE_KEY);
    if (current) {
      return normalizeConfig(JSON.parse(current) as Partial<PosPrinterConfig>);
    }

    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) {
      return null;
    }

    const migrated = normalizeConfig(JSON.parse(legacy) as Partial<PosPrinterConfig>);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return null;
  }
}

export function loadPosPrinterConfig(): PosPrinterConfig {
  if (typeof window === "undefined") {
    return DEFAULT_POS_PRINTER_CONFIG;
  }

  return readStoredPrinterConfig() ?? DEFAULT_POS_PRINTER_CONFIG;
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

export function hasDuplicatePosPrinterTargets(config: PosPrinterConfig): boolean {
  return Boolean(
    config.kitchenPrinterName &&
    config.receiptPrinterName &&
    config.kitchenPrinterName === config.receiptPrinterName,
  );
}
