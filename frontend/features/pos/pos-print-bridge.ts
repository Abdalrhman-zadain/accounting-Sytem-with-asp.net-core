type QzPrintJob =
  | {
      type: "pixel";
      format: "html";
      flavor: "plain";
      data: string;
    }
  | {
      type: "raw";
      format: "plain";
      data: string;
    };

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
  print: (config: unknown, data: QzPrintJob[]) => Promise<void>;
};

export type PosPrintBridgeStatus = {
  mode: "qz" | "browser";
  available: boolean;
  printers: string[];
  error?: string;
};

export class PosPrintBridgeError extends Error {
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
    this.name = "PosPrintBridgeError";
  }
}

/** Delay after layout/images are ready before triggering browser print. */
export const THERMAL_PRINT_READY_DELAY_MS = 800;

/** Blank feed lines sent after HTML jobs so thermal cutters do not clip the footer. */
const THERMAL_QZ_TRAILING_FEED = "\n\n\n\n";

export async function waitForDocumentImages(doc: Document): Promise<void> {
  const images = Array.from(doc.images);
  const pending = images.filter((image) => !image.complete);
  if (pending.length === 0) {
    return;
  }

  await Promise.all(
    pending.map(
      (image) =>
        new Promise<void>((resolve) => {
          image.onload = () => resolve();
          image.onerror = () => resolve();
        }),
    ),
  );
}

function scheduleBrowserPrint(win: Window): void {
  void waitForDocumentImages(win.document).then(() => {
    window.setTimeout(() => {
      try {
        win.print();
      } catch {
        throw new PosPrintBridgeError("PRINT_FAILED", "Browser print failed.");
      }
    }, THERMAL_PRINT_READY_DELAY_MS);
  });
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
    throw new PosPrintBridgeError(
      "PRINT_BRIDGE_OFFLINE",
      "QZ Tray client library is not available.",
    );
  }
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }
  return qz;
}

export async function listPosPrinters(): Promise<string[]> {
  const qz = await ensureQzConnected();
  return qz.printers.find();
}

export async function getPosPrintBridgeStatus(): Promise<PosPrintBridgeStatus> {
  try {
    const printers = await listPosPrinters();
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
    throw new PosPrintBridgeError(
      "PRINTER_NOT_CONFIGURED",
      "No printer has been configured for this print job.",
    );
  }

  const qz = await ensureQzConnected();
  const printers = await qz.printers.find();
  if (!printers.includes(printerName)) {
    throw new PosPrintBridgeError(
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
    {
      type: "raw",
      format: "plain",
      data: THERMAL_QZ_TRAILING_FEED,
    },
  ]);
}

export function printHtmlWithBrowser(html: string, windowName = "_blank"): void {
  if (typeof window === "undefined") return;

  const win = window.open("", windowName, "width=400,height=700");
  if (!win) {
    throw new PosPrintBridgeError("PRINT_BLOCKED", "Print window was blocked.");
  }

  win.document.write(html);
  win.document.close();
  win.focus();
  scheduleBrowserPrint(win);
}
