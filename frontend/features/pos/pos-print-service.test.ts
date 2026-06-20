import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const bridgeMocks = vi.hoisted(() => ({
  printHtmlWithBrowser: vi.fn(),
  printHtmlWithQz: vi.fn(),
  getPosPrintBridgeStatus: vi.fn(),
  printHtmlWithLocalAgentBridge: vi.fn(),
  getPosLocalAgentBridgeStatus: vi.fn(),
}));

vi.mock("@/features/pos/pos-print-bridge", async () => {
  const actual = await vi.importActual<typeof import("@/features/pos/pos-print-bridge")>(
    "@/features/pos/pos-print-bridge",
  );
  return {
    ...actual,
    printHtmlWithBrowser: bridgeMocks.printHtmlWithBrowser,
    printHtmlWithQz: bridgeMocks.printHtmlWithQz,
    getPosPrintBridgeStatus: bridgeMocks.getPosPrintBridgeStatus,
  };
});

vi.mock("@/features/pos/pos-local-agent-bridge", () => ({
  getPosLocalAgentBridgeStatus: bridgeMocks.getPosLocalAgentBridgeStatus,
  printHtmlWithLocalAgentBridge: bridgeMocks.printHtmlWithLocalAgentBridge,
}));

vi.mock("@/features/pos/pos-kot-print", () => ({
  buildKitchenDeltaTicketHtml: vi.fn(() => "<html><body>KOT delta</body></html>"),
  buildKitchenNewOrderTicketHtml: vi.fn(() => "<html><body>KOT new</body></html>"),
  buildKitchenOrderTicketHtml: vi.fn(() => "<html><body>KOT</body></html>"),
  buildKitchenTicketHtmlForLines: vi.fn(() => "<html><body>KOT lines</body></html>"),
  buildKitchenVoidTicketHtml: vi.fn(() => "<html><body>KOT void</body></html>"),
}));

vi.mock("@/features/pos/pos-kitchen-print-delta", () => ({
  captureKitchenLineSnapshotFromSale: vi.fn(() => []),
  diffKitchenSnapshots: vi.fn(() => ({ additions: [], voids: [], qtyDecreases: [] })),
  hasKitchenPrintDiff: vi.fn(() => false),
  isFirstKitchenSend: vi.fn(() => false),
  unsentKitchenLines: vi.fn(() => []),
}));

vi.mock("@/features/pos/pos-receipt-print", () => ({
  buildPosReceiptHtml: vi.fn(() => "<html><body>Receipt</body></html>"),
  normalizeReceiptForArabicPrint: vi.fn((receipt) => receipt),
}));

vi.mock("@/features/pos/pos-session-roll-print", () => ({
  buildSessionRollReportDocumentHtml: vi.fn(() => "<html><body>Session</body></html>"),
}));

const STORAGE_KEY = "pos.printer-config.v2";

function stubWindow() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    location: { origin: "http://localhost:3000" },
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  });
}

function setPrinterConfig(printBridge: "agent" | "qz" | "browser") {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      kitchenPrinterName: "XPrinter-Kitchen",
      receiptPrinterName: "XPrinter-Cashier",
      autoPrintKotOnSend: true,
      autoPrintReceiptOnPay: true,
      kitchenPrintHubEnabled: true,
      printBridge,
    }),
  );
}

describe("pos-print-service", () => {
  beforeEach(() => {
    stubWindow();
    bridgeMocks.printHtmlWithBrowser.mockReset();
    bridgeMocks.printHtmlWithQz.mockReset();
    bridgeMocks.printHtmlWithLocalAgentBridge.mockReset();
    bridgeMocks.getPosPrintBridgeStatus.mockReset();
    bridgeMocks.getPosLocalAgentBridgeStatus.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prints to the Local Print Agent in agent mode", async () => {
    setPrinterConfig("agent");
    const { printReceiptHtml } = await import("@/features/pos/pos-print-service");

    await expect(printReceiptHtml("<html><head></head><body>Receipt</body></html>")).resolves.toMatchObject({
      ok: true,
      mode: "agent",
      fallback: false,
    });

    expect(bridgeMocks.printHtmlWithLocalAgentBridge).toHaveBeenCalledWith(
      "XPrinter-Cashier",
      expect.stringContaining('<base href="http://localhost:3000/">'),
    );
    expect(bridgeMocks.printHtmlWithBrowser).not.toHaveBeenCalled();
    expect(bridgeMocks.printHtmlWithQz).not.toHaveBeenCalled();
  });

  it("does not fall back to browser when agent mode fails", async () => {
    setPrinterConfig("agent");
    bridgeMocks.printHtmlWithLocalAgentBridge.mockRejectedValue(
      new Error('Printer "XPrinter-Cashier" was not found on this machine.'),
    );
    const { printReceiptHtml } = await import("@/features/pos/pos-print-service");

    await expect(printReceiptHtml("<html></html>")).rejects.toThrow(
      'Printer "XPrinter-Cashier" was not found on this machine.',
    );

    expect(bridgeMocks.printHtmlWithBrowser).not.toHaveBeenCalled();
    expect(bridgeMocks.printHtmlWithQz).not.toHaveBeenCalled();
  });

  it("uses browser print only when browser mode is explicitly selected", async () => {
    setPrinterConfig("browser");
    const { printReceiptHtml } = await import("@/features/pos/pos-print-service");

    await expect(printReceiptHtml("<html></html>")).resolves.toMatchObject({
      ok: true,
      mode: "browser",
      fallback: false,
    });

    expect(bridgeMocks.printHtmlWithBrowser).toHaveBeenCalledWith(
      "<html></html>",
      "pos-receipt-roll",
    );
    expect(bridgeMocks.printHtmlWithLocalAgentBridge).not.toHaveBeenCalled();
    expect(bridgeMocks.printHtmlWithQz).not.toHaveBeenCalled();
  });

  it("does not fall back to browser when legacy QZ mode fails", async () => {
    setPrinterConfig("qz");
    bridgeMocks.printHtmlWithQz.mockRejectedValue(new Error("QZ Tray is not running."));
    const { printReceiptHtml } = await import("@/features/pos/pos-print-service");

    await expect(printReceiptHtml("<html></html>")).rejects.toThrow(
      "QZ Tray is not running.",
    );

    expect(bridgeMocks.printHtmlWithBrowser).not.toHaveBeenCalled();
    expect(bridgeMocks.printHtmlWithLocalAgentBridge).not.toHaveBeenCalled();
  });

  it("routes kitchen and receipt jobs to separate configured agent printers", async () => {
    setPrinterConfig("agent");
    const { printCustomerReceipt, printKitchenTicket } = await import(
      "@/features/pos/pos-print-service"
    );

    await printKitchenTicket({} as never, "ar");
    await printCustomerReceipt({} as never);

    expect(bridgeMocks.printHtmlWithLocalAgentBridge).toHaveBeenNthCalledWith(
      1,
      "XPrinter-Kitchen",
      expect.any(String),
    );
    expect(bridgeMocks.printHtmlWithLocalAgentBridge).toHaveBeenNthCalledWith(
      2,
      "XPrinter-Cashier",
      expect.any(String),
    );
  });
});
