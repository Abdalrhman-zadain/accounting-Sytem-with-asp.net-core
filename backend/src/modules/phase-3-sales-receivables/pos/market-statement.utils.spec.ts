import {
  buildMarketStatementLedger,
  formatMarketStatementAmount,
  parseMarketStatementDateRange,
} from "./market-statement.utils";

describe("market-statement.utils", () => {
  it("formats amounts with three decimal places", () => {
    expect(formatMarketStatementAmount(71.9)).toBe("71.900");
    expect(formatMarketStatementAmount(0)).toBe("0.000");
  });

  it("builds opening row and running balance across deliveries and payments", () => {
    const result = buildMarketStatementLedger({
      fromDate: "2025-05-01",
      openingBalance: 100,
      deliveries: [
        {
          id: "inv-1",
          reference: "SI-001",
          receiptNumber: "MKT-001",
          deliveredAt: "2025-05-10T10:00:00.000Z",
          totalAmount: 50,
        },
        {
          id: "inv-2",
          reference: "SI-002",
          receiptNumber: "MKT-002",
          deliveredAt: "2025-05-20T10:00:00.000Z",
          totalAmount: 30,
        },
      ],
      payments: [
        {
          id: "pay-1",
          reference: "RCP-001",
          receiptDate: "2025-05-15T12:00:00.000Z",
          amount: 40,
          description: null,
          bankCashAccountName: "صندوق",
        },
      ],
    });

    expect(result.openingBalance).toBe("100.000");
    expect(result.lines[0]?.details).toContain("الرصيد المدور");
    expect(result.lines[0]?.balance).toBe("100.000");

    expect(result.lines[1]?.documentType).toBe("تسليم");
    expect(result.lines[1]?.details).toBe("MKT-001");
    expect(result.lines[1]?.balance).toBe("150.000");
    expect(result.lines[2]?.documentType).toBe("قبض");
    expect(result.lines[2]?.details).toBe("RCP-001");
    expect(result.lines[2]?.balance).toBe("110.000");
    expect(result.lines[3]?.documentType).toBe("تسليم");
    expect(result.lines[3]?.balance).toBe("140.000");

    expect(result.totals.debit).toBe("80.000");
    expect(result.totals.credit).toBe("40.000");
    expect(result.totals.closingBalance).toBe("140.000");
    expect(result.totals.transactionCount).toBe(3);
  });

  it("rejects invalid statement date ranges", () => {
    expect(() => parseMarketStatementDateRange("2025-05-31", "2025-05-01")).toThrow(
      "fromDate must be on or before toDate.",
    );
    expect(() => parseMarketStatementDateRange("invalid", "2025-05-01")).toThrow(
      "Invalid statement date range.",
    );
  });
});
