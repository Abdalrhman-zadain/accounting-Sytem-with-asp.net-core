import { describe, expect, it } from "vitest";
import { buildSessionRollReportDocumentHtml } from "./pos-session-roll-print";
import type { PosSession, PosSessionReport } from "@/types/api";

function buildSession(overrides: Partial<PosSession> = {}): PosSession {
  return {
    id: "session-1",
    sessionNumber: "SHIFT-001",
    branchName: "عمان",
    terminalName: "POS-1",
    openedAt: "2026-06-18T10:00:00.000Z",
    closedAt: "2026-06-18T18:00:00.000Z",
    status: "CLOSED",
    accountingStatus: "PENDING_REVIEW",
    openingCash: "100.00",
    expectedCash: "250.00",
    actualCash: "248.50",
    difference: "-1.50",
    totalSales: "1250.75",
    taxAmount: "160.10",
    discountAmount: "25.00",
    cashSales: "800.00",
    cardSales: "350.75",
    deliveryCompanySales: "100.00",
    invoiceCount: 42,
    cashierUser: { id: "u1", name: "كاشير 1", email: "cashier@example.com" },
    warehouse: { id: "w1", name: "المستودع الرئيسي" },
    ...overrides,
  } as PosSession;
}

function buildReport(overrides: Partial<PosSessionReport> = {}): PosSessionReport {
  return {
    sessionId: "session-1",
    sessionNumber: "SHIFT-001",
    totalSales: "1250.75",
    tax: "160.10",
    discounts: "25.00",
    cashSales: "800.00",
    cardSales: "350.75",
    cliqSales: "0.00",
    walletSales: "0.00",
    deliveryCompanySales: "100.00",
    cashRefunds: "12.00",
    openingCash: "100.00",
    expectedCash: "250.00",
    actualCash: "248.50",
    difference: "-1.50",
    invoiceCount: 42,
    sales: [
      {
        id: "sale-1",
        reference: "POS-1001",
        invoiceDate: "2026-06-18T12:30:00.000Z",
        totalAmount: "15.50",
        taxAmount: "2.00",
        customer: { id: "c1", name: "عميل عام" },
        lines: [
          {
            id: "line-1",
            itemName: "شاورما دجاج",
            description: "شاورما دجاج",
            quantity: "2",
            lineAmount: "15.50",
            modifiers: {
              addons: [{ groupId: "g1", optionId: "o1", name: "جبنة إضافية", priceAdjustment: 1 }],
            },
          },
        ],
        payments: [{ paymentMethod: "CASH", amount: "15.50" }],
      },
    ],
    returns: [],
    ...overrides,
  } as PosSessionReport;
}

describe("buildSessionRollReportDocumentHtml", () => {
  it("uses shared receipt layout styles for shift closing report", () => {
    const html = buildSessionRollReportDocumentHtml({
      session: buildSession(),
      report: buildReport(),
      printedBy: "محاسب",
      printType: "SESSION_ROLL_REPORT",
    });

    expect(html).toContain("تقرير إغلاق الوردية");
    expect(html).toContain("Tahoma");
    expect(html).toContain('class="summary-line emphasis"');
    expect(html).toContain('class="payment-box"');
    expect(html).toContain("1,250.75 د.أ");
    expect(html).toContain("فارق الكاش");
    expect(html).toContain("-1.50");
    expect(html).not.toContain("font-size: 9pt");
  });

  it("renders invoice list with aligned money rows", () => {
    const html = buildSessionRollReportDocumentHtml({
      session: buildSession(),
      report: buildReport(),
      printedBy: "محاسب",
      printType: "INVOICE_LIST_ROLL",
    });

    expect(html).toContain("قائمة الفواتير");
    expect(html).toContain("POS-1001");
    expect(html).toContain("إجمالي الفواتير");
    expect(html).toContain('class="summary-amt thermal-amt"');
  });

  it("renders all receipts roll with item table and addons", () => {
    const html = buildSessionRollReportDocumentHtml({
      session: buildSession(),
      report: buildReport(),
      printedBy: "محاسب",
      printType: "ALL_RECEIPTS_ROLL",
    });

    expect(html).toContain("كل الإيصالات");
    expect(html).toContain("items-table");
    expect(html).toContain("الصنف");
    expect(html).toContain("شاورما دجاج");
    expect(html).toContain("جبنة إضافية");
    expect(html).toContain('class="payment-box"');
  });
});
