import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Prisma, RepCarTransferStatus } from "../../../../generated/prisma";
import { RepCarTransferService } from "./rep-car-transfer.service";
import { RepCarStockService } from "./rep-car-stock.service";

describe("RepCarTransferService", () => {
  const prisma = {
    repCarTransfer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const auditService = { log: jest.fn() };
  const itemMasterService = { ensureActiveItem: jest.fn() };
  const inventoryPostingService = { preventNegativeStock: jest.fn(() => true) };
  const repCarStockService = Object.assign(new RepCarStockService({} as never, {} as never), {
    ensureActiveSalesRep: jest.fn(),
    averageUnitCost: jest.fn(() => new Prisma.Decimal(5)),
    applyRepCarBalance: jest.fn(),
    createRepCarMovement: jest.fn(),
  });

  let service: RepCarTransferService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RepCarTransferService(
      prisma as never,
      auditService as never,
      itemMasterService as never,
      inventoryPostingService as never,
      repCarStockService as never,
    );
  });

  describe("create", () => {
    it("rejects transfers where source and destination are the same rep", async () => {
      await expect(
        service.create(
          {
            transferDate: "2026-06-13",
            fromSalesRepId: "rep-1",
            toSalesRepId: "rep-1",
            lines: [{ itemId: "item-1", quantity: "1", unitOfMeasure: "EA" }],
          },
          { userId: "user-1", role: "ADMIN" } as never,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects non-admin users", async () => {
      await expect(
        service.create(
          {
            transferDate: "2026-06-13",
            fromSalesRepId: "rep-1",
            toSalesRepId: "rep-2",
            lines: [{ itemId: "item-1", quantity: "1", unitOfMeasure: "EA" }],
          },
          { userId: "user-1", role: "USER", posRoles: ["MARKET_REP"] } as never,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("post", () => {
    it("rejects post when source rep car stock is insufficient", async () => {
      prisma.repCarTransfer.findUnique.mockResolvedValue({
        id: "transfer-1",
        reference: "RCT-TEST",
        status: RepCarTransferStatus.DRAFT,
        transferDate: new Date("2026-06-13"),
        fromSalesRepId: "rep-from",
        toSalesRepId: "rep-to",
        description: null,
        lines: [
          {
            id: "line-1",
            itemId: "item-1",
            quantity: new Prisma.Decimal(10),
            item: { id: "item-1", code: "MKT-001", isActive: true, trackInventory: true },
          },
        ],
      });

      prisma.$transaction.mockImplementation(async (callback) =>
        callback({
          repCarStockBalance: {
            findUnique: jest.fn().mockResolvedValue({
              onHandQuantity: new Prisma.Decimal(2),
              valuationAmount: new Prisma.Decimal(10),
            }),
          },
          repCarTransferLine: { update: jest.fn() },
          repCarTransfer: { update: jest.fn() },
        }),
      );

      await expect(service.post("transfer-1", { userId: "user-1", role: "ADMIN" } as never)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
