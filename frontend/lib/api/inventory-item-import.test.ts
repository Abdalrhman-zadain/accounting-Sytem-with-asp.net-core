import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  importInventoryItems,
  previewInventoryItemImport,
} from "@/lib/api";

describe("inventory item import fetchers", () => {
  const fetchMock = vi.fn();

  const sampleRow = {
    name: "Fresh milk 1L",
    groupCode: "MARKET-DAIRY",
    categoryCode: "MARKET-DAIRY",
    unitCode: "PCS",
    code: "MKT-099",
  };

  const previewPayload = {
    rows: [sampleRow],
    duplicatePolicy: "skip" as const,
  };

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:3007/api");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
  });

  function jsonResponse(body: unknown, status = 201) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  it("previewInventoryItemImport posts JSON to /inventory/items/import/preview with auth", async () => {
    const previewResult = {
      rows: [
        {
          rowNumber: 1,
          input: sampleRow,
          status: "valid",
          errors: [],
        },
      ],
      summary: {
        totalRows: 1,
        validCount: 1,
        skipCount: 0,
        errorCount: 0,
      },
    };
    fetchMock.mockResolvedValue(jsonResponse(previewResult));

    const result = await previewInventoryItemImport(previewPayload, "test-token");

    expect(result).toEqual(previewResult);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:3007/api/inventory/items/import/preview");
    expect(options.method).toBe("POST");
    expect((options.headers as Headers).get("Authorization")).toBe("Bearer test-token");
    expect((options.headers as Headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(options.body as string)).toEqual(previewPayload);
  });

  it("importInventoryItems posts JSON to /inventory/items/import with auth", async () => {
    const importResult = {
      created: [{ rowNumber: 1, id: "item-1", code: "MKT-099", name: sampleRow.name }],
      skipped: [],
      failed: [],
      summary: {
        createdCount: 1,
        skippedCount: 0,
        failedCount: 0,
        totalRows: 1,
      },
    };
    fetchMock.mockResolvedValue(jsonResponse(importResult));

    const result = await importInventoryItems(previewPayload, "import-token");

    expect(result).toEqual(importResult);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:3007/api/inventory/items/import");
    expect(options.method).toBe("POST");
    expect((options.headers as Headers).get("Authorization")).toBe("Bearer import-token");
    expect(JSON.parse(options.body as string)).toEqual(previewPayload);
  });

  it("surfaces API errors from previewInventoryItemImport", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: ["name must be longer than or equal to 1 characters"] }, 400),
    );

    await expect(previewInventoryItemImport(previewPayload, "test-token")).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 400 &&
        error.message.includes("name must be longer"),
    );
  });
});
