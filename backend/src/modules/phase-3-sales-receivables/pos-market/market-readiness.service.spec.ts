import { MarketReadinessService } from "./market-readiness.service";

describe("MarketReadinessService", () => {
  const prismaMock = {
    posRuntimeSetting: { findMany: jest.fn() },
    account: { findUnique: jest.fn() },
    bankCashAccount: { findFirst: jest.fn() },
    customer: { findMany: jest.fn() },
    salesRepresentative: { findMany: jest.fn() },
    repCarStockBalance: { findFirst: jest.fn() },
    inventoryWarehouse: { findFirst: jest.fn() },
    posAccessRole: { findUnique: jest.fn() },
    user: { findMany: jest.fn(), findFirst: jest.fn() },
    posPermission: { findUnique: jest.fn() },
    posAccessRolePermission: { findFirst: jest.fn() },
  };

  let service: MarketReadinessService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MarketReadinessService();

    prismaMock.posRuntimeSetting.findMany.mockResolvedValue([
      { key: "POS_MAPPING_CASH_ACCOUNT_ID", value: "acc-cash" },
      { key: "POS_MAPPING_SALES_REVENUE_ACCOUNT_ID", value: "acc-revenue" },
    ]);
    prismaMock.account.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      code: where.id,
      isActive: true,
      isPosting: true,
    }));
    prismaMock.bankCashAccount.findFirst.mockResolvedValue({ id: "bc-cash" });
    prismaMock.customer.findMany.mockResolvedValue([
      { id: "cust-1", code: "MKT-AMMAN-01", name: "Amman Market" },
    ]);
    prismaMock.salesRepresentative.findMany.mockResolvedValue([
      { id: "rep-1", code: "REP-MARKET-01", name: "North Rep" },
    ]);
    prismaMock.repCarStockBalance.findFirst.mockResolvedValue({
      salesRepId: "rep-1",
      itemId: "item-1",
      onHandQuantity: { toString: () => "10" },
    });
    prismaMock.inventoryWarehouse.findFirst.mockResolvedValue({
      id: "wh-main",
      code: "WH-MAIN",
      name: "Main Warehouse",
    });
    prismaMock.posAccessRole.findUnique.mockResolvedValue({ id: "role-market-cashier" });
    prismaMock.user.findMany.mockResolvedValue([{ id: "u1", username: "market_cashier" }]);
    prismaMock.user.findFirst.mockResolvedValue({ id: "admin-1", username: "admin", role: "ADMIN" });
    prismaMock.posPermission.findUnique.mockResolvedValue({ id: "perm-credit" });
    prismaMock.posAccessRolePermission.findFirst.mockResolvedValue({ id: "link-1" });
  });

  it("returns ready when all required checks pass", async () => {
    const report = await service.runPreflight(prismaMock as never);

    expect(report.ready).toBe(true);
    expect(report.errorCount).toBe(0);
    expect(report.context.destinationMarketId).toBe("cust-1");
    expect(report.context.cashRegisterId).toBe("bc-cash");
    expect(report.checks.some((row) => row.id === "mapping_cash" && row.severity === "ok")).toBe(true);
  });

  it("fails when cash mapping is missing", async () => {
    prismaMock.posRuntimeSetting.findMany.mockResolvedValue([
      { key: "POS_MAPPING_SALES_REVENUE_ACCOUNT_ID", value: "acc-revenue" },
    ]);
    prismaMock.bankCashAccount.findFirst.mockResolvedValue(null);

    const report = await service.runPreflight(prismaMock as never);

    expect(report.ready).toBe(false);
    expect(report.checks.find((row) => row.id === "mapping_cash")?.severity).toBe("error");
  });

  it("fails when no destination markets exist", async () => {
    prismaMock.customer.findMany.mockResolvedValue([]);

    const report = await service.runPreflight(prismaMock as never);

    expect(report.ready).toBe(false);
    expect(report.checks.find((row) => row.id === "destination_markets")?.severity).toBe("error");
  });
});
