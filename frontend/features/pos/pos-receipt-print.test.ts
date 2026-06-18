import { describe, expect, it } from "vitest";
import {
  buildPosReceiptHtml,
  normalizeReceiptForArabicPrint,
  type PosReceiptData,
} from "@/features/pos/pos-receipt-print";

function buildSampleReceipt(overrides: Partial<PosReceiptData> = {}): PosReceiptData {
  return {
    receiptNumber: "RECEIPT-20260618-0030",
    soldAt: "2026-06-18T15:03:00.000Z",
    companyName: "كاشوكة",
    branchName: "عمان",
    taxNumber: "16952073",
    cashierName: "Cashier",
    terminalName: "POS-1",
    warehouseName: "Main",
    tableNumber: null,
    orderType: "TAKEAWAY",
    waiterName: null,
    serviceChargeAmount: 0,
    deliveryFeeAmount: 0,
    taxRatePercent: 16,
    paymentSummary: "",
    payments: [{ paymentMethod: "CASH", amount: 2.5 }],
    total: 2.5,
    paid: 2.5,
    tendered: 2.5,
    change: 0,
    subtotal: 2.16,
    discount: 0,
    tax: 0.34,
    lines: [
      {
        name: "فتة مقادم لشخص واحد",
        quantity: 1,
        unitPrice: 2.5,
        discountAmount: 0,
        taxAmount: 0.34,
        lineTotal: 2.5,
      },
    ],
    ...overrides,
  };
}

describe("buildPosReceiptHtml", () => {
  it("renders Kashouka-style Arabic columns, totals, and payment box", () => {
    const html = buildPosReceiptHtml(normalizeReceiptForArabicPrint(buildSampleReceipt()));

    expect(html).toContain("الصنف");
    expect(html).toContain("السعر");
    expect(html).toContain("الكمية");
    expect(html).toContain("الإجمالي");
    expect(html).toContain("2.50");
    expect(html).toContain("thermal-amt");
    expect(html).toContain("2.5mm");
    expect(html).toContain("المجموع الفرعي");
    expect(html).toContain("الضريبة 16%");
    expect(html).toContain("الصافي");
    expect(html).toContain('class="total-row emphasis"');
    expect(html).toContain('class="payment-box"');
    expect(html).toContain("نقد");
    expect(html).toContain("بطاقة");
    expect(html).toContain("مدفوع");
    expect(html).toContain("شكراً لزيارتكم");
  });

  it("shows line discount rows for discounted items without duplicating invoice discount", () => {
    const html = buildPosReceiptHtml(
      normalizeReceiptForArabicPrint(
        buildSampleReceipt({
          total: 0,
          paid: 0,
          tendered: 0,
          subtotal: 0,
          discount: 2.5,
          tax: 0,
          payments: [],
          lines: [
            {
              name: "وجبه مجانية لشخص واحد",
              quantity: 1,
              unitPrice: 2.5,
              discountAmount: 2.5,
              taxAmount: 0,
              lineTotal: 0,
            },
          ],
        }),
      ),
    );

    expect(html).toContain("وجبه مجانية لشخص واحد");
    expect(html).toContain('class="item-disc-row"');
    expect(html).toContain("-2.50");
    expect(html.match(/خصم/g)?.length).toBe(1);
  });

  it("shows table and staff row for dine-in orders", () => {
    const html = buildPosReceiptHtml(
      normalizeReceiptForArabicPrint(
        buildSampleReceipt({
          orderType: "DINE_IN",
          tableNumber: "6",
          waiterName: "أحمد",
        }),
      ),
    );

    expect(html).toContain("طاولة");
    expect(html).toContain("6");
    expect(html).toContain("الموظف");
    expect(html).toContain("أحمد");
  });
});

describe("normalizeReceiptForArabicPrint", () => {
  it("maps default cashier label to Arabic", () => {
    const normalized = normalizeReceiptForArabicPrint(buildSampleReceipt());
    expect(normalized.cashierName).toBe("كاشير");
  });
});
