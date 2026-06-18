import { describe, expect, it } from "vitest";
import {
  fmtThermalReceiptAmtPadded,
  thermalReceiptItemDiscountRow,
  thermalReceiptItemRow4Col,
  thermalReceiptPaymentBoxHtml,
  thermalReceiptTotalRow,
} from "@/features/pos-shared/thermal-receipt-layout";

describe("thermal-receipt-layout amounts", () => {
  it("pads amounts for fixed-width thermal columns", () => {
    expect(fmtThermalReceiptAmtPadded(2.5)).toBe("   2.50");
    expect(fmtThermalReceiptAmtPadded(125)).toBe(" 125.00");
    expect(fmtThermalReceiptAmtPadded(-2.5)).toBe("  -2.50");
  });

  it("marks item, total, and payment amounts with thermal-amt", () => {
    const itemRow = thermalReceiptItemRow4Col("وجبه مجانية", 2.5, "1", 0);
    const totalRow = thermalReceiptTotalRow("الصافي", 2.5, { emphasis: true });
    const paymentBox = thermalReceiptPaymentBoxHtml([
      { label: "نقد", value: 2.5 },
      { label: "مدفوع", value: 2.5 },
    ]);

    expect(itemRow).toContain('class="col-total thermal-amt">   0.00');
    expect(itemRow).toContain('class="col-price thermal-amt">   2.50');
    expect(totalRow).toContain('class="total-amt thermal-amt">   2.50');
    expect(paymentBox).toContain('class="pay-amt thermal-amt">   2.50');
  });

  it("renders a line discount row", () => {
    const row = thermalReceiptItemDiscountRow(2.5);
    expect(row).toContain('class="item-disc-row"');
    expect(row).toContain("خصم");
    expect(row).toContain("-2.50");
  });
});
