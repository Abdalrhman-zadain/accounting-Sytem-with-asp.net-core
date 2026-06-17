import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LOCAL_PRINT_AGENT_BASE,
  LocalPrintAgentError,
  checkLocalPrintAgent,
  isLocalPrintAgentAvailable,
  listLocalAgentPrinters,
  printHtmlWithLocalAgent,
} from "@/features/pos-shared/local-print-agent";

describe("local-print-agent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("checks agent health", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, version: "1.0.0" }),
      }),
    );

    await expect(checkLocalPrintAgent()).resolves.toEqual({
      ok: true,
      version: "1.0.0",
    });

    expect(fetch).toHaveBeenCalledWith(`${LOCAL_PRINT_AGENT_BASE}/health`, {
      headers: { Accept: "application/json" },
    });
  });

  it("lists installed printers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ printers: ["XPrinter-Kitchen", "XPrinter-Receipt"] }),
      }),
    );

    await expect(listLocalAgentPrinters()).resolves.toEqual([
      "XPrinter-Kitchen",
      "XPrinter-Receipt",
    ]);
  });

  it("posts HTML print jobs", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await printHtmlWithLocalAgent("XPrinter-Kitchen", "<html><body>KOT</body></html>");

    expect(fetchMock).toHaveBeenCalledWith(`${LOCAL_PRINT_AGENT_BASE}/print`, {
      method: "POST",
      body: JSON.stringify({
        printerName: "XPrinter-Kitchen",
        html: "<html><body>KOT</body></html>",
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  });

  it("throws AGENT_OFFLINE when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(checkLocalPrintAgent()).rejects.toMatchObject({
      name: "LocalPrintAgentError",
      code: "AGENT_OFFLINE",
    });
  });

  it("throws PRINT_FAILED with server error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Printer "Missing" was not found on this machine.' }),
      }),
    );

    await expect(
      printHtmlWithLocalAgent("Missing", "<html></html>"),
    ).rejects.toMatchObject({
      name: "LocalPrintAgentError",
      code: "PRINT_FAILED",
      message: 'Printer "Missing" was not found on this machine.',
    });
  });

  it("reports availability from health check", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      }),
    );

    await expect(isLocalPrintAgentAvailable()).resolves.toBe(true);
  });

  it("returns false when agent is offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(isLocalPrintAgentAvailable()).resolves.toBe(false);
  });

  it("uses LocalPrintAgentError for typed failures", () => {
    const error = new LocalPrintAgentError("offline", "AGENT_OFFLINE");
    expect(error.code).toBe("AGENT_OFFLINE");
    expect(error.message).toBe("offline");
  });
});
