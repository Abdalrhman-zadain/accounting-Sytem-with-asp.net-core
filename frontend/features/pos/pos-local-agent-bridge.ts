import {
  isLocalPrintAgentAvailable,
  listLocalAgentPrinters,
  printHtmlWithLocalAgent,
} from "@/features/pos-shared/local-print-agent";
import {
  PosPrintBridgeError,
  type PosPrintBridgeStatus,
} from "@/features/pos/pos-print-bridge";

export async function getPosLocalAgentBridgeStatus(): Promise<PosPrintBridgeStatus> {
  try {
    const available = await isLocalPrintAgentAvailable();
    if (!available) {
      throw new PosPrintBridgeError(
        "PRINT_BRIDGE_OFFLINE",
        "Simple Account Print Agent is not running on this PC.",
      );
    }

    const printers = await listLocalAgentPrinters();
    return { mode: "agent", available: true, printers };
  } catch (error) {
    return {
      mode: "agent",
      available: false,
      printers: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function printHtmlWithLocalAgentBridge(
  printerName: string | null,
  html: string,
): Promise<void> {
  if (!printerName) {
    throw new PosPrintBridgeError(
      "PRINTER_NOT_CONFIGURED",
      "No printer has been configured for this print job.",
    );
  }

  const printers = await listLocalAgentPrinters();
  const matchedPrinter = printers.find(
    (name) => name.localeCompare(printerName, undefined, { sensitivity: "accent" }) === 0,
  );
  if (!matchedPrinter) {
    throw new PosPrintBridgeError(
      "PRINTER_NOT_FOUND",
      `Printer "${printerName}" was not found on this machine.`,
    );
  }

  try {
    await printHtmlWithLocalAgent(matchedPrinter, html);
  } catch (error) {
    throw new PosPrintBridgeError(
      "PRINT_FAILED",
      error instanceof Error ? error.message : String(error),
    );
  }
}
