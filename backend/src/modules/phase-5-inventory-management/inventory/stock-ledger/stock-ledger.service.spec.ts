import { Prisma } from "../../../../generated/prisma";

import { StockLedgerService } from "./stock-ledger.service";

describe("StockLedgerService", () => {
  const prisma = {
    inventoryStockMovement: {
      findMany: jest.fn(),
    },
    purchaseInvoice: {
      findMany: jest.fn(),
    },
    salesInvoice: {
      findMany: jest.fn(),
    },
  };

  let service: StockLedgerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StockLedgerService(prisma as never);
  });

  it("adds an opposite stock-out row for reversed purchase invoices", async () => {
    prisma.inventoryStockMovement.findMany.mockResolvedValue([
      movementRow({
        id: "move-purchase-1",
        movementType: "PURCHASE_RECEIPT",
        transactionType: "PurchaseInvoice",
        transactionId: "pi-1",
        transactionReference: "PI-001",
        quantityIn: decimal(840),
        quantityOut: decimal(0),
        valueIn: decimal(8400),
        valueOut: decimal(0),
      }),
    ]);
    prisma.purchaseInvoice.findMany.mockResolvedValue([
      { id: "pi-1", status: "REVERSED", updatedAt: new Date("2026-06-15T10:00:00.000Z") },
    ]);
    prisma.salesInvoice.findMany.mockResolvedValue([]);

    const result = await service.list({ itemId: "item-1", warehouseId: "wh-1", limit: "20", page: "1" });

    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({
      movementType: "PURCHASE_RECEIPT",
      quantityIn: "840",
      quantityOut: "0",
      runningQuantity: "840",
    });
    expect(result.data[1]).toMatchObject({
      movementType: "PURCHASE_RETURN",
      displayType: "PURCHASE_INVOICE_REVERSAL",
      quantityIn: "0",
      quantityOut: "840",
      runningQuantity: "0",
    });
  });

  it("marks sales invoice rollback rows as invoice reversals", async () => {
    prisma.inventoryStockMovement.findMany.mockResolvedValue([
      movementRow({
        id: "move-sale-1",
        movementType: "SALES_ISSUE",
        transactionType: "SalesInvoice",
        transactionId: "si-1",
        transactionReference: "SI-001",
        quantityIn: decimal(0),
        quantityOut: decimal(100),
        valueIn: decimal(0),
        valueOut: decimal(1000),
        createdAt: new Date("2026-06-15T09:00:00.000Z"),
      }),
      movementRow({
        id: "move-sale-2",
        movementType: "SALES_RETURN",
        transactionType: "SalesInvoice",
        transactionId: "si-1",
        transactionReference: "SI-001",
        quantityIn: decimal(100),
        quantityOut: decimal(0),
        valueIn: decimal(1000),
        valueOut: decimal(0),
        createdAt: new Date("2026-06-15T09:05:00.000Z"),
      }),
    ]);
    prisma.purchaseInvoice.findMany.mockResolvedValue([]);
    prisma.salesInvoice.findMany.mockResolvedValue([
      { id: "si-1", status: "DRAFT", updatedAt: new Date("2026-06-15T10:00:00.000Z") },
    ]);

    const result = await service.list({ itemId: "item-1", warehouseId: "wh-1", limit: "20", page: "1" });

    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({
      movementType: "SALES_ISSUE",
      quantityIn: "0",
      quantityOut: "100",
      runningQuantity: "-100",
    });
    expect(result.data[1]).toMatchObject({
      movementType: "SALES_RETURN",
      displayType: "SALES_INVOICE_REVERSAL",
      quantityIn: "100",
      quantityOut: "0",
      runningQuantity: "0",
    });
  });
});

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

function movementRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "move-1",
    movementType: "PURCHASE_RECEIPT",
    transactionType: "PurchaseInvoice",
    transactionId: "txn-1",
    transactionLineId: "line-1",
    transactionReference: "REF-1",
    transactionDate: new Date("2026-06-15T00:00:00.000Z"),
    itemId: "item-1",
    warehouseId: "wh-1",
    quantityIn: decimal(1),
    quantityOut: decimal(0),
    unitCost: decimal(10),
    valueIn: decimal(10),
    valueOut: decimal(0),
    runningQuantity: decimal(1),
    runningValuation: decimal(10),
    description: null,
    createdAt: new Date("2026-06-15T08:00:00.000Z"),
    updatedAt: new Date("2026-06-15T08:00:00.000Z"),
    item: {
      id: "item-1",
      code: "ITEM-1",
      name: "Item 1",
      unitOfMeasure: "PCS",
    },
    warehouse: {
      id: "wh-1",
      code: "MAIN",
      name: "Main Warehouse",
    },
    ...overrides,
  };
}
