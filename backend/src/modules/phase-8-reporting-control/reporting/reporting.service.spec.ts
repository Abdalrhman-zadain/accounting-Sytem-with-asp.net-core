import { Prisma } from "../../../generated/prisma";
import { ReportingService } from "./reporting.service";

describe("ReportingService trial balance helpers", () => {
  const service = new ReportingService({} as never);

  const decimal = (value: number | string) => new Prisma.Decimal(value);

  it("keeps a pure period credit as a closing credit without doubling", () => {
    const closing = (service as any).calculateClosingBalance(decimal(0), decimal(0), decimal(0), decimal("92311.750"));

    expect(closing.closingDebit.toFixed(3)).toBe("0.000");
    expect(closing.closingCredit.toFixed(3)).toBe("92311.750");
    expect(closing.side).toBe("CREDIT");
    expect(closing.sideLabel).toBe("دائن");
  });

  it("keeps an opening debit with no period movement on the debit side", () => {
    const closing = (service as any).calculateClosingBalance(decimal("64620.656"), decimal(0), decimal(0), decimal(0));

    expect(closing.closingDebit.toFixed(3)).toBe("64620.656");
    expect(closing.closingCredit.toFixed(3)).toBe("0.000");
    expect(closing.side).toBe("DEBIT");
    expect(closing.sideLabel).toBe("مدين");
  });

  it("nets opening and period activity so equal opposite movement closes to zero", () => {
    const closing = (service as any).calculateClosingBalance(decimal("9648.650"), decimal(0), decimal(0), decimal("9648.650"));

    expect(closing.closingDebit.toFixed(3)).toBe("0.000");
    expect(closing.closingCredit.toFixed(3)).toBe("0.000");
    expect(closing.side).toBe("ZERO");
    expect(closing.sideLabel).toBe("-");
  });

  it("rolls child balances into parents recursively without duplicating them", () => {
    const accounts = [
      {
        id: "parent",
        code: "1000",
        name: "Cash",
        nameAr: "النقد",
        type: "ASSET",
        currencyCode: "JOD",
        segment3: null,
        segment4: null,
        segment5: null,
        isActive: true,
        isPosting: false,
        parentAccountId: null,
      },
      {
        id: "child",
        code: "1001",
        name: "Cash Box",
        nameAr: "الصندوق",
        type: "ASSET",
        currencyCode: "JOD",
        segment3: null,
        segment4: null,
        segment5: null,
        isActive: true,
        isPosting: true,
        parentAccountId: "parent",
      },
    ] as const;

    const opening = new Map([
      [
        "child",
        {
          debit: decimal(0),
          credit: decimal(0),
        },
      ],
    ]);
    const period = new Map([
      [
        "child",
        {
          debit: decimal(0),
          credit: decimal("92311.750"),
        },
      ],
    ]);

    const rows = (service as any).buildAccountTreeBalances(accounts as never, { opening, period });
    const parentRow = rows.find((row: any) => row.account.id === "parent");
    const childRow = rows.find((row: any) => row.account.id === "child");

    expect(parentRow.periodCredit.toFixed(3)).toBe("92311.750");
    expect(parentRow.closingCredit.toFixed(3)).toBe("92311.750");
    expect(parentRow.closingDebit.toFixed(3)).toBe("0.000");

    expect(childRow.periodCredit.toFixed(3)).toBe("92311.750");
    expect(childRow.closingCredit.toFixed(3)).toBe("92311.750");
    expect(childRow.closingDebit.toFixed(3)).toBe("0.000");
  });

  it("summarizes totals from posting rows only and adds balancing difference on the opposite side", () => {
    const rows = [
      {
        account: { id: "parent", isPosting: false },
        openingDebit: decimal("100.000"),
        openingCredit: decimal(0),
        periodDebit: decimal("50.000"),
        periodCredit: decimal(0),
        closingDebit: decimal("150.000"),
        closingCredit: decimal(0),
      },
      {
        account: { id: "child-a", isPosting: true },
        openingDebit: decimal("100.000"),
        openingCredit: decimal(0),
        periodDebit: decimal("20.000"),
        periodCredit: decimal(0),
        closingDebit: decimal("120.000"),
        closingCredit: decimal(0),
      },
      {
        account: { id: "child-b", isPosting: true },
        openingDebit: decimal(0),
        openingCredit: decimal("30.000"),
        periodDebit: decimal("30.000"),
        periodCredit: decimal(0),
        closingDebit: decimal(0),
        closingCredit: decimal(0),
      },
    ];

    const summary = (service as any).summarizeTrialBalanceRows(rows.filter((row: any) => row.account.isPosting));

    expect(summary.totals.openingDebit.toFixed(3)).toBe("100.000");
    expect(summary.totals.openingCredit.toFixed(3)).toBe("30.000");
    expect(summary.totals.periodDebit.toFixed(3)).toBe("50.000");
    expect(summary.totals.periodCredit.toFixed(3)).toBe("0.000");
    expect(summary.totals.closingDebit.toFixed(3)).toBe("120.000");
    expect(summary.totals.closingCredit.toFixed(3)).toBe("0.000");
    expect(summary.summaryRows).toEqual([
      {
        kind: "total",
        openingDebit: "100.000",
        openingCredit: "30.000",
        periodDebit: "50.000",
        periodCredit: "0.000",
        closingDebit: "120.000",
        closingCredit: "0.000",
      },
      {
        kind: "difference",
        openingDebit: "0.000",
        openingCredit: "70.000",
        periodDebit: "0.000",
        periodCredit: "50.000",
        closingDebit: "0.000",
        closingCredit: "120.000",
      },
    ]);
  });
});
