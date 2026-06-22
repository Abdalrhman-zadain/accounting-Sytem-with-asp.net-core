import { describe, expect, it } from "vitest";
import {
  buildArabicPaymentSummary,
  buildPosReceiptHtml,
  extractDailyOrderNumber,
  normalizeReceiptForArabicPrint,
  type PosReceiptData,
} from "@/features/pos/pos-receipt-print";

function buildSampleReceipt(overrides: Partial<PosReceiptData> = {}): PosReceiptData {
  return {
    receiptNumber: "RECEIPT-20260618-0030",
    soldAt: "2026-06-18T15:03:00.000Z",
    companyName: "كرنشي",
    branchName: "رئيسي",
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

describe("extractDailyOrderNumber", () => {
  it("returns the daily sequence without date prefix", () => {
    expect(extractDailyOrderNumber("RECEIPT-20260618-0042")).toBe("42");
    expect(extractDailyOrderNumber("RECEIPT-20260618-1042")).toBe("1042");
    expect(extractDailyOrderNumber("POS-20260618-0007")).toBe("7");
  });
});

describe("buildPosReceiptHtml", () => {
  it("renders old boxed Arabic restaurant receipt clone", () => {
    const html = buildPosReceiptHtml(normalizeReceiptForArabicPrint(buildSampleReceipt()));

    expect(html).toContain('class="brand-header"');
    expect(html).toContain('class="receipt-number-strip"');
    expect(html).toContain('class="receipt-box"');
    expect(html).toContain("كرنشي");
    expect(html).toContain(">30</div>");
    expect(html).toContain("القاعة: رئيسي");
    expect(html).toContain("الدور: 30");
    expect(html).toContain(">السعر</td>");
    expect(html).toContain(">الإجمالي</td>");
    expect(html).not.toContain("سعر<br/>الانفرادي");
    expect(html).not.toContain("سعر<br/>الاجمالي");
    expect(html).toContain("2.50");
    expect(html).toContain("thermal-amt");
    expect(html).toContain("2.5mm");
    expect(html).toContain("white-space: nowrap");
    expect(html).toContain("font-size: 9px");
    expect(html).toContain("min-width: 16mm");
    expect(html).toContain("الاجمالي");
    expect(html).toContain("الخصم");
    expect(html).toContain("الخدمات");
    expect(html).toContain("الضريبة 16%");
    expect(html).toContain("المطلوب");
    expect(html).toContain('class="summary-line emphasis"');
    expect(html).toContain("عدد الأصناف");
    expect(html).toContain("عدد المواد");
    expect(html).toContain("مدخل الفاتورة");
    expect(html).toContain("طريقة الدفع");
    expect(html).toContain("سفري/نقد");
    expect(html).not.toContain("سفري/نقد 2.50");
    expect(html).not.toContain('class="payment-box"');
    expect(html).not.toContain("مدفوع");
    expect(html).toContain("شكراً لزيارتكم");
    expect(html).toContain('class="thermal-ltr" dir="ltr"');
    expect(html).toContain("0791208488");
    expect(html).toContain("المقابلين - شارع القدس");
    expect(html).not.toContain("صنع");
    expect(html).not.toContain("المجموع الفرعي");
    expect(html).not.toContain("الصافي");
    expect(html).not.toContain("إيصال بيع");
    expect(html).not.toContain("Simple Account");
  });

  it("renders custom receipt contact fields when provided", () => {
    const html = buildPosReceiptHtml(
      normalizeReceiptForArabicPrint(
        buildSampleReceipt({
          phone: "0790000000",
          address: "عنوان مخصص",
          tagline: "سناكات ومقبلات",
        }),
      ),
    );

    expect(html).toContain('class="thermal-ltr" dir="ltr"');
    expect(html).toContain("0790000000");
    expect(html).toContain("عنوان مخصص");
    expect(html).not.toContain("0791208488");
    expect(html).not.toContain("سناكات ومقبلات");
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
    expect(html).toContain("0.00");
    expect(html.match(/خصم/g)?.length).toBeGreaterThanOrEqual(1);
    expect(html).not.toContain("بطاقة");
  });

  it("formats large amounts with grouping and mixed payments", () => {
    const html = buildPosReceiptHtml(
      normalizeReceiptForArabicPrint(
        buildSampleReceipt({
          payments: [
            { paymentMethod: "CASH", amount: 125.5 },
            { paymentMethod: "CARD", amount: 1234.56 },
          ],
          total: 1360.06,
          paid: 1360.06,
          tendered: 1400,
          change: 39.94,
          subtotal: 1200,
          tax: 160.06,
          lines: [
            {
              name: "مشاوي مشكل",
              quantity: 1,
              unitPrice: 125.5,
              discountAmount: 0,
              taxAmount: 20.08,
              lineTotal: 125.5,
            },
          ],
        }),
      ),
    );

    expect(html).toContain("125.50");
    expect(html).toContain("1,360.06");
    expect(html).toContain("سفري/مختلط");
  });

  it("renders order notes in a bottom note box", () => {
    const html = buildPosReceiptHtml(
      normalizeReceiptForArabicPrint(
        buildSampleReceipt({
          orderNotes: "بدون بصل",
        }),
      ),
    );

    expect(html).toContain('class="receipt-box note-box"');
    expect(html).toContain("ملاحظات");
    expect(html).toContain("بدون بصل");
    const noteIndex = html.indexOf("بدون بصل");
    const thanksIndex = html.indexOf("شكراً لزيارتكم");
    expect(noteIndex).toBeGreaterThan(-1);
    expect(thanksIndex).toBeGreaterThan(noteIndex);
  });

  it("renders delivery notes at the bottom for delivery orders", () => {
    const html = buildPosReceiptHtml(
      normalizeReceiptForArabicPrint(
        buildSampleReceipt({
          orderType: "DELIVERY",
          deliveryNotes: "اتصل عند الوصول",
        }),
      ),
    );

    expect(html).toContain('class="receipt-box note-box"');
    expect(html).toContain("اتصل عند الوصول");
  });

  it("shows table and hall info for dine-in orders", () => {
    const html = buildPosReceiptHtml(
      normalizeReceiptForArabicPrint(
        buildSampleReceipt({
          orderType: "DINE_IN",
          tableNumber: "1",
          cashierName: "كاشير صباحي",
          payments: [{ paymentMethod: "CASH", amount: 14 }],
          total: 14,
          paid: 14,
          tendered: 14,
          subtotal: 14,
          tax: 0,
          lines: [
            {
              name: "راس شوي",
              quantity: 2,
              unitPrice: 7,
              discountAmount: 0,
              taxAmount: 0,
              lineTotal: 14,
            },
          ],
        }),
      ),
    );

    expect(html).toContain("الطاولة");
    expect(html).toContain("حجز 1");
    expect(html).toContain("صالة/كاشير حجز 1");
    expect(html).toContain("كاشير صباحي");
    expect(html).toContain("راس شوي");
    expect(html).toContain("عدد الأصناف");
    expect(html).toContain("عدد المواد");
    expect(html).not.toContain("الموظف");
    expect(html).not.toContain("أحمد");
  });

  it("prints delivery address for delivery orders", () => {
    const html = buildPosReceiptHtml(
      normalizeReceiptForArabicPrint(
        buildSampleReceipt({
          orderType: "DELIVERY",
          deliveryAddress: "شارع الملكة رانيا، عمّان",
          deliveryCompanyName: "طلبات",
          driverName: "خالد",
          deliveryNotes: "اتصل عند الوصول",
          deliveryFeeAmount: 1.5,
        }),
      ),
    );

    expect(html).toContain("شارع الملكة رانيا، عمّان");
    expect(html).toContain("1.50");
  });

  it("renders provisional bill with unpaid label instead of sale receipt header", () => {
    const html = buildPosReceiptHtml(
      normalizeReceiptForArabicPrint(
        buildSampleReceipt({
          receiptKind: "provisional",
          receiptNumber: "POS-20260620-0012",
          payments: [],
          paid: 0,
          tendered: 0,
          change: 0,
          paymentSummary: "غير مدفوع",
        }),
      ),
    );

    expect(html).not.toContain("إيصال بيع");
    expect(html).toContain("مدخل الفاتورة");
    expect(html).toContain(">POS-20260620-0012</div>");
    expect(html).not.toContain("الدور:");
    expect(html).toContain("غير مدفوع");
    expect(html).not.toContain("نقد");
    expect(html).not.toContain("الباقي");
  });

  it("renders traditional Arabic quantity labels for sell-by-weight asnaq items", () => {
    const html = buildPosReceiptHtml(
      normalizeReceiptForArabicPrint(
        buildSampleReceipt({
          lines: [
            {
              name: "فوارغ",
              quantity: 0.5,
              unitPrice: 10,
              discountAmount: 0,
              taxAmount: 0,
              lineTotal: 5,
            },
            {
              name: "فوارغ",
              quantity: 0.25,
              unitPrice: 10,
              discountAmount: 0,
              taxAmount: 0,
              lineTotal: 2.5,
              unitCode: "KG",
            },
            {
              name: "آبوات",
              quantity: 0.125,
              unitPrice: 10,
              discountAmount: 0,
              taxAmount: 0,
              lineTotal: 1.25,
              unitCode: "KG",
            },
          ],
        }),
      ),
    );

    expect(html).toContain("نص كيلو");
    expect(html).toContain("وقية");
    expect(html).toContain("عدد واحد");
    expect(html).toContain('<td class="col-qty">وقية</td>');
    expect(html).toContain('<td class="col-total thermal-amt">2.50</td>');
    expect(html).toContain('<td class="col-qty">عدد واحد</td>');
    expect(html).toContain('<td class="col-total thermal-amt">1.25</td>');
    expect(html).not.toContain('class="col-qty">0.5</td>');
    expect(html).not.toContain("0.25 KG");
    expect(html).not.toContain("0.125 KG");
  });

  it("scales longer item names down instead of wrapping or truncating them", () => {
    const html = buildPosReceiptHtml(
      normalizeReceiptForArabicPrint(
        buildSampleReceipt({
          lines: [
            {
              name: "توفي سواس انجليزي",
              quantity: 0.25,
              unitPrice: 5.75,
              discountAmount: 0,
              taxAmount: 0,
              lineTotal: 1.44,
              unitCode: "KG",
            },
            {
              name: "راس",
              quantity: 1,
              unitPrice: 7,
              discountAmount: 0,
              taxAmount: 0,
              lineTotal: 7,
            },
          ],
        }),
      ),
    );

    expect(html).toContain(
      '<td class="col-name" style="font-size: 11px">توفي سواس انجليزي</td>',
    );
    expect(html).toContain('<td class="col-name" style="font-size: 14px">راس</td>');
    expect(html).not.toContain("توفي سواس ان...");
    expect(html).not.toContain("text-overflow: ellipsis");
  });

  it("does not print addon rows on customer receipts", () => {
    const html = buildPosReceiptHtml(
      normalizeReceiptForArabicPrint(
        buildSampleReceipt({
          lines: [
            {
              name: "شاورما دجاج",
              quantity: 2,
              unitPrice: 5,
              discountAmount: 0,
              taxAmount: 0.8,
              lineTotal: 10.8,
              modifiers: {
                addons: [
                  {
                    groupId: "g1",
                    groupName: "صوصات",
                    optionId: "o1",
                    name: "ثومية",
                    priceAdjustment: 0.5,
                  },
                ],
              },
            },
          ],
        }),
      ),
    );

    expect(html).toContain("شاورما دجاج");
    expect(html).not.toContain('class="item-addon-row"');
    expect(html).not.toContain("ثومية");
  });

  it("wraps long footer address inside the 80mm receipt width", () => {
    const html = buildPosReceiptHtml(
      normalizeReceiptForArabicPrint(
        buildSampleReceipt({
          address: "عمان - شارع القدس - إشارة الرئيسي مقابل قاعات شذى للأفراح",
        }),
      ),
    );

    expect(html).toContain('class="footer-contact"');
    expect(html).toContain('class="footer-address"');
    expect(html).toContain('class="footer-phone"');
    expect(html).toContain("white-space: normal");
    expect(html).toContain("overflow-wrap: anywhere");
    expect(html).toContain("عمان - شارع القدس");
    expect(html).toContain("0791208488");
  });
});

describe("normalizeReceiptForArabicPrint", () => {
  it("maps default cashier label to Arabic", () => {
    const normalized = normalizeReceiptForArabicPrint(buildSampleReceipt());
    expect(normalized.cashierName).toBe("كاشير");
  });

  it("maps POS Cashier label to Arabic", () => {
    const normalized = normalizeReceiptForArabicPrint(
      buildSampleReceipt({ cashierName: "POS Cashier" }),
    );
    expect(normalized.cashierName).toBe("كاشير");
  });

  it("does not append amounts to single payment method labels", () => {
    expect(buildArabicPaymentSummary(["CASH"], [1.25])).toBe("نقد");
    expect(buildArabicPaymentSummary(["CASH", "CARD"], [1, 2])).toBe("مختلط");

    const normalized = normalizeReceiptForArabicPrint(
      buildSampleReceipt({
        payments: [],
        paymentSummary: "CASH 1.25",
      }),
    );
    expect(normalized.paymentSummary).toBe("نقد");
  });
});
