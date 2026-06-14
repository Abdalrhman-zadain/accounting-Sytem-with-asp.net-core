import {
  ensureQzSigningConfigured,
} from "@/features/pos-shared/qz-tray-security";

type QzApi = {
  websocket: {
    isActive: () => boolean;
    connect: () => Promise<void>;
  };
  printers: {
    find: () => Promise<string[]>;
  };
  configs: {
    create: (printerName: string) => unknown;
  };
  print: (
    config: unknown,
    data: Array<{
      type: "pixel";
      format: "html";
      flavor: "plain";
      data: string;
    }>,
  ) => Promise<void>;
  security: {
    setSignatureAlgorithm: (algorithm: string) => void;
    setCertificatePromise: (
      handler: (resolve: (certificate: string) => void, reject: (error: unknown) => void) => void,
    ) => void;
    setSignaturePromise: (
      handler: (
        toSign: string,
      ) => (
        resolve: (signature: string) => void,
        reject: (error: unknown) => void,
      ) => void,
    ) => void;
  };
};

export type PosMarketPrintBridgeStatus = {
  mode: "qz" | "browser";
  available: boolean;
  printers: string[];
  error?: string;
};

export class PosMarketPrintBridgeError extends Error {
  constructor(
    public readonly code:
      | "PRINT_BRIDGE_OFFLINE"
      | "PRINTER_NOT_CONFIGURED"
      | "PRINTER_NOT_FOUND"
      | "PRINT_BLOCKED"
      | "PRINT_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "PosMarketPrintBridgeError";
  }
}

function getWindowQz(): QzApi | null {
  if (typeof window === "undefined") return null;
  return ((window as Window & { qz?: QzApi }).qz ?? null);
}

let qzClientLoadPromise: Promise<QzApi | null> | null = null;

async function loadQzClientScript(): Promise<QzApi | null> {
  if (typeof document === "undefined") return null;
  const existing = getWindowQz();
  if (existing) return existing;
  if (qzClientLoadPromise) return qzClientLoadPromise;

  qzClientLoadPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/qz-tray/qz-tray.js";
    script.async = true;
    script.onload = () => resolve(getWindowQz());
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return qzClientLoadPromise;
}

async function getQz(): Promise<QzApi | null> {
  return getWindowQz() ?? loadQzClientScript();
}

async function ensureQzConnected(): Promise<QzApi> {
  const qz = await getQz();
  if (!qz) {
    throw new PosMarketPrintBridgeError(
      "PRINT_BRIDGE_OFFLINE",
      "QZ Tray client library is not available.",
    );
  }
  if (!qz.websocket.isActive()) {
    await ensureQzSigningConfigured(qz);
    await qz.websocket.connect();
  }
  return qz;
}

export async function listPosMarketPrinters(): Promise<string[]> {
  const qz = await ensureQzConnected();
  return qz.printers.find();
}

export async function getPosMarketPrintBridgeStatus(): Promise<PosMarketPrintBridgeStatus> {
  try {
    const printers = await listPosMarketPrinters();
    return { mode: "qz", available: true, printers };
  } catch (error) {
    return {
      mode: "browser",
      available: false,
      printers: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function printHtmlWithQz(printerName: string | null, html: string): Promise<void> {
  if (!printerName) {
    throw new PosMarketPrintBridgeError(
      "PRINTER_NOT_CONFIGURED",
      "No printer has been configured for this print job.",
    );
  }

  const qz = await ensureQzConnected();
  const printers = await qz.printers.find();
  if (!printers.includes(printerName)) {
    throw new PosMarketPrintBridgeError(
      "PRINTER_NOT_FOUND",
      `Printer "${printerName}" was not found on this machine.`,
    );
  }

  await qz.print(qz.configs.create(printerName), [
    {
      type: "pixel",
      format: "html",
      flavor: "plain",
      data: html,
    },
  ]);
}

export function printHtmlWithBrowser(html: string, windowName = "_blank"): void {
  if (typeof window === "undefined") return;

  const win = window.open("", windowName, "width=400,height=700");
  if (!win) {
    throw new PosMarketPrintBridgeError("PRINT_BLOCKED", "Print window was blocked.");
  }

  win.document.write(html);
  win.document.close();
  win.focus();

  setTimeout(() => {
    try {
      win.print();
    } catch {
      throw new PosMarketPrintBridgeError("PRINT_FAILED", "Browser print failed.");
    }
  }, 400);
}
