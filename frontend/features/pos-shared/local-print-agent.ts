export const LOCAL_PRINT_AGENT_BASE = "http://127.0.0.1:9188";

export type LocalPrintAgentHealth = {
  ok: boolean;
  version?: string;
};

export class LocalPrintAgentError extends Error {
  constructor(
    message: string,
    public readonly code: "AGENT_OFFLINE" | "PRINT_FAILED" | "INVALID_RESPONSE",
  ) {
    super(message);
    this.name = "LocalPrintAgentError";
  }
}

async function agentFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${LOCAL_PRINT_AGENT_BASE}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new LocalPrintAgentError(
      "Simple Account Print Agent is not running on this PC. Download and start it from POS → Printers.",
      "AGENT_OFFLINE",
    );
  }

  if (!response.ok) {
    let message = `Print agent request failed (${response.status}).`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new LocalPrintAgentError(message, "PRINT_FAILED");
  }

  return (await response.json()) as T;
}

export async function checkLocalPrintAgent(): Promise<LocalPrintAgentHealth> {
  return agentFetch<LocalPrintAgentHealth>("/health");
}

export async function listLocalAgentPrinters(): Promise<string[]> {
  const payload = await agentFetch<{ printers?: string[] }>("/printers");
  return Array.isArray(payload.printers) ? payload.printers : [];
}

export async function printHtmlWithLocalAgent(
  printerName: string,
  html: string,
): Promise<void> {
  await agentFetch<{ ok: boolean }>("/print", {
    method: "POST",
    body: JSON.stringify({ printerName, html }),
  });
}

export async function isLocalPrintAgentAvailable(): Promise<boolean> {
  try {
    const health = await checkLocalPrintAgent();
    return health.ok === true;
  } catch {
    return false;
  }
}
