import {
  buildMarketRepSalesReport,
  classifyPosCheckoutPaymentMode,
  parseMarketRepSalesReportDocumentTypes,
  parseMarketRepSalesReportPaymentTypes,
} from "./market-rep-sales-report.utils";

describe("market-rep-sales-report.utils", () => {
  it("classifies cash when POS payments cover the invoice total", () => {
    expect(classifyPosCheckoutPaymentMode(100, [100])).toBe("cash");
    expect(classifyPosCheckoutPaymentMode(100, [60, 40])).toBe("cash");
  });

  it("classifies credit when POS payments do not cover the invoice total", () => {
    expect(classifyPosCheckoutPaymentMode(100, [50])).toBe("credit");
    expect(classifyPosCheckoutPaymentMode(100, [])).toBe("credit");
  });

  it("builds sales rows with negative return values and total sum", () => {
    const result = buildMarketRepSalesReport({
      salesRepName: "عامر بدارين",
      sales: [
        {
          id: "inv-1",
          reference: "SI-001",
          receiptNumber: "109",
          soldAt: "2026-05-10T10:00:00.000Z",
          totalAmount: 100,
          posPaymentAmounts: [],
          customerCode: "25",
          customerName: "محل زكي",
        },
        {
          id: "inv-2",
          reference: "SI-002",
          receiptNumber: "110",
          soldAt: "2026-05-20T10:00:00.000Z",
          totalAmount: 50,
          posPaymentAmounts: [50],
          customerCode: "12",
          customerName: "سوبر ماركت",
        },
      ],
      returns: [
        {
          id: "ret-1",
          reference: "PR-001",
          returnedAt: "2026-05-15T12:00:00.000Z",
          totalAmount: 30,
          posPaymentAmounts: [],
          linkedInvoiceTotalAmount: 100,
          customerCode: "25",
          customerName: "محل زكي",
        },
      ],
    });

    expect(result.lines).toHaveLength(3);
    expect(result.lines[0]?.documentType).toBe("فاتورة بيع");
    expect(result.lines[1]?.documentType).toBe("مرتجع مبيعات");
    expect(result.lines[1]?.documentValue).toBe("-30.000");
    expect(result.lines[2]?.paymentMode).toBe("نقدي");
    expect(result.totals.documentCount).toBe(3);
    expect(result.totals.totalAmount).toBe("120.000");
  });

  it("filters by document type and payment type", () => {
    const result = buildMarketRepSalesReport({
      salesRepName: "Rep",
      documentTypes: "sales",
      paymentTypes: "cash",
      sales: [
        {
          id: "inv-1",
          reference: "SI-001",
          receiptNumber: "109",
          soldAt: "2026-05-10T10:00:00.000Z",
          totalAmount: 100,
          posPaymentAmounts: [],
          customerCode: "25",
          customerName: "Credit sale",
        },
        {
          id: "inv-2",
          reference: "SI-002",
          receiptNumber: "110",
          soldAt: "2026-05-11T10:00:00.000Z",
          totalAmount: 50,
          posPaymentAmounts: [50],
          customerCode: "12",
          customerName: "Cash sale",
        },
      ],
      returns: [],
    });

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.customerName).toBe("Cash sale");
  });

  it("parses filter query values with defaults", () => {
    expect(parseMarketRepSalesReportDocumentTypes(undefined)).toBe("both");
    expect(parseMarketRepSalesReportDocumentTypes("returns")).toBe("returns");
    expect(parseMarketRepSalesReportPaymentTypes("cash")).toBe("cash");
    expect(parseMarketRepSalesReportPaymentTypes("invalid")).toBe("both");
  });
});
