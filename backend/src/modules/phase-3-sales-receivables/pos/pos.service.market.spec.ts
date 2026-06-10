import { BadRequestException } from "@nestjs/common";

import { PosProduct, PosSessionStatus } from "../../../generated/prisma";
import { PosService } from "./pos.service";

describe("PosService market operations", () => {
  const prismaMock = {
    posSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    inventoryWarehouse: {
      findUnique: jest.fn(),
    },
    bankCashAccount: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    posRuntimeSetting: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  const auditServiceMock = {
    log: jest.fn(),
  };

  let service: PosService;

  const marketCashier = {
    userId: "market-u1",
    permissions: ["POS_OPEN_SESSION", "POS_VIEW_POS_SCREEN", "POS_COMPLETE_SALE"],
    posRoles: ["MARKET_CASHIER"],
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue({ id: "market-u1", isActive: true });
    prismaMock.$queryRaw.mockResolvedValue([{ next: 1 }]);
    prismaMock.posRuntimeSetting.findMany.mockResolvedValue([]);
    prismaMock.inventoryWarehouse.findUnique.mockResolvedValue({
      id: "wh-market",
      name: "Market Warehouse",
      isActive: true,
    });
    prismaMock.bankCashAccount.findFirst.mockResolvedValue({ id: "bc-market" });
    prismaMock.bankCashAccount.findUnique.mockResolvedValue({
      id: "bc-market",
      isActive: true,
    });
    prismaMock.posSession.findFirst.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock as never),
    );
    service = new PosService(
      prismaMock as never,
      auditServiceMock as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it("opens a market session with PosProduct.MARKET and default terminal name", async () => {
    prismaMock.posSession.create.mockResolvedValue({
      id: "sess-market-1",
      sessionNumber: "POS-00042",
      posProduct: PosProduct.MARKET,
      terminalName: "Market POS 01",
      branchName: null,
      status: PosSessionStatus.OPEN,
      openingCash: "100.00",
      expectedCash: "100.00",
      openedAt: new Date("2026-06-09T10:00:00.000Z"),
      closedAt: null,
      notes: null,
      warehouseId: "wh-market",
      cashierUserId: "market-u1",
      cashAccountId: "bc-market",
      warehouse: { id: "wh-market", name: "Market Warehouse" },
      cashierUser: { id: "market-u1", name: "Market Cashier", email: "market@example.com" },
      cashAccount: { id: "bc-market", name: "Market Cash", account: { name: "Cash", nameAr: null } },
      salesInvoices: [],
      posReturns: [],
      createdAt: new Date("2026-06-09T10:00:00.000Z"),
      updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    });

    const session = await service.openSession(
      {
        warehouseId: "wh-market",
        cashAccountId: "bc-market",
        openingCash: 100,
      },
      marketCashier,
      PosProduct.MARKET,
    );

    expect(prismaMock.posSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          posProduct: PosProduct.MARKET,
          cashierUserId: "market-u1",
        }),
      }),
    );
    expect(prismaMock.posSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          posProduct: PosProduct.MARKET,
          terminalName: "Market POS 01",
          warehouseId: "wh-market",
          cashAccountId: "bc-market",
        }),
      }),
    );
    expect(session.posProduct).toBe(PosProduct.MARKET);
    expect(session.terminalName).toBe("Market POS 01");
  });

  it("returns only the active MARKET session for market cashiers", async () => {
    prismaMock.posSession.findFirst.mockResolvedValue({
      id: "sess-market-1",
      sessionNumber: "POS-00042",
      posProduct: PosProduct.MARKET,
      terminalName: "Market POS 01",
      branchName: null,
      status: PosSessionStatus.OPEN,
      openingCash: "100.00",
      expectedCash: "100.00",
      openedAt: new Date("2026-06-09T10:00:00.000Z"),
      closedAt: null,
      notes: null,
      warehouseId: "wh-market",
      cashierUserId: "market-u1",
      cashAccountId: "bc-market",
      warehouse: { id: "wh-market", name: "Market Warehouse" },
      cashierUser: { id: "market-u1", name: "Market Cashier", email: "market@example.com" },
      cashAccount: { id: "bc-market", name: "Market Cash", account: { name: "Cash", nameAr: null } },
      salesInvoices: [],
      posReturns: [],
      createdAt: new Date("2026-06-09T10:00:00.000Z"),
      updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    });

    const session = await service.getActiveSession(marketCashier, PosProduct.MARKET);

    expect(prismaMock.posSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          posProduct: PosProduct.MARKET,
        }),
      }),
    );
    expect(session?.posProduct).toBe(PosProduct.MARKET);
  });

  it("rejects market hold sales without a destination market customer", async () => {
    const marketCashierWithHold = {
      ...marketCashier,
      permissions: [...marketCashier.permissions, "POS_HOLD_SALE"],
    };
    prismaMock.posSession.findUnique.mockResolvedValue({
      id: "sess-market-1",
      posProduct: PosProduct.MARKET,
      status: PosSessionStatus.OPEN,
      cashAccountId: "bc-market",
      warehouse: { id: "wh-market", name: "Market Warehouse" },
      cashierUser: { id: "market-u1", name: "Market Cashier", email: "market@example.com" },
      cashAccount: { id: "bc-market", name: "Market Cash", account: { name: "Cash", nameAr: null } },
      salesInvoices: [],
      posReturns: [],
    });

    await expect(
      service.holdSale(
        {
          sessionId: "sess-market-1",
          lines: [
            {
              itemId: "item-1",
              quantity: 1,
              unitPrice: 5,
            },
          ],
        } as any,
        marketCashierWithHold,
        PosProduct.MARKET,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("allows pay-later normalization with zero payments when credit sale is enabled", () => {
    const normalized = (service as any).normalizePayments([], new Map(), 125.5, true);
    expect(normalized.totalApplied).toBe(0);
    expect(normalized.outstandingAmount).toBe(125.5);
    expect(normalized.payments).toEqual([]);
  });

  it("rejects pay-later normalization when credit sale is disabled", () => {
    expect(() => (service as any).normalizePayments([], new Map(), 50, false)).toThrow(
      BadRequestException,
    );
  });

  it("supports partial payment normalization when credit sale is enabled", () => {
    const accountMap = new Map([
      [
        "bc-market",
        {
          id: "bc-market",
          account: {
            id: "acc-cash",
            isActive: true,
            isPosting: true,
            allowManualPosting: true,
          },
        },
      ],
    ]);
    const normalized = (service as any).normalizePayments(
      [{ bankCashAccountId: "bc-market", amount: 40, paymentMethod: "CASH" }],
      accountMap,
      100,
      true,
    );
    expect(normalized.totalApplied).toBe(40);
    expect(normalized.outstandingAmount).toBe(60);
  });
});
