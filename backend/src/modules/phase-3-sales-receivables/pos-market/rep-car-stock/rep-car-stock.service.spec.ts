import { BadRequestException } from "@nestjs/common";
import { Prisma } from "../../../../generated/prisma";
import { RepCarStockMovementType } from "../../../../generated/prisma";
import { RepCarStockService } from "./rep-car-stock.service";

describe("RepCarStockService.revertSaleDeduction", () => {
  const service = new RepCarStockService({} as never, {} as never);

  const salesRepId = "rep-1";
  const invoice = {
    id: "inv-1",
    reference: "POS-001",
    invoiceDate: new Date("2026-06-15"),
  };

  function createTx(movements: Array<Record<string, unknown>>) {
    const repCarStockMovement = {
      findMany: jest.fn().mockResolvedValue(movements),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
    };
    const repCarStockBalance = {
      upsert: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue({
        onHandQuantity: new Prisma.Decimal(5),
        valuationAmount: new Prisma.Decimal(50),
      }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        onHandQuantity: new Prisma.Decimal(5),
        valuationAmount: new Prisma.Decimal(50),
      }),
    };

    return {
      repCarStockMovement,
      repCarStockBalance,
    } as unknown as Prisma.TransactionClient;
  }

  it("restores rep car balance from SALE_OUT movements", async () => {
    const tx = createTx([
      {
        itemId: "item-1",
        quantityOut: new Prisma.Decimal(2),
        valueOut: new Prisma.Decimal(20),
        unitCost: new Prisma.Decimal(10),
        transactionLineId: "line-1",
        description: "Item A",
      },
    ]);

    await service.revertSaleDeduction(tx, salesRepId, invoice);

    expect(tx.repCarStockBalance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          onHandQuantity: { increment: new Prisma.Decimal(2) },
          valuationAmount: { increment: new Prisma.Decimal(20) },
        },
      }),
    );
    expect(tx.repCarStockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          movementType: RepCarStockMovementType.SALE_RETURN_IN,
          transactionId: invoice.id,
          quantityIn: new Prisma.Decimal(2),
          valueIn: new Prisma.Decimal(20),
        }),
      }),
    );
  });

  it("no-ops when there are no SALE_OUT movements", async () => {
    const tx = createTx([]);

    await service.revertSaleDeduction(tx, salesRepId, invoice);

    expect(tx.repCarStockBalance.upsert).not.toHaveBeenCalled();
    expect(tx.repCarStockMovement.create).not.toHaveBeenCalled();
  });

  it("blocks double reversal", async () => {
    const tx = createTx([
      {
        itemId: "item-1",
        quantityOut: new Prisma.Decimal(1),
        valueOut: new Prisma.Decimal(10),
        unitCost: new Prisma.Decimal(10),
        transactionLineId: "line-1",
        description: null,
      },
    ]);
    (tx.repCarStockMovement.count as jest.Mock).mockResolvedValue(1);

    await expect(service.revertSaleDeduction(tx, salesRepId, invoice)).rejects.toThrow(
      BadRequestException,
    );
  });
});
