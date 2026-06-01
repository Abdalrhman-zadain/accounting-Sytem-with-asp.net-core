import { AuditAction, DeliveryStatus, OrderType, PosAccountingStatus, TableStatus } from "../../../generated/prisma";
import { PosService } from "./pos.service";

describe("PosService restaurant operations", () => {
  const prismaMock = {
    salesInvoice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    deliveryCompany: {
      findUnique: jest.fn(),
    },
    deliveryDriver: {
      findUnique: jest.fn(),
    },
    posTable: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    kitchenOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const auditServiceMock = {
    log: jest.fn(),
  };

  let service: PosService;

  const authorizedUser = {
    userId: "u1",
    permissions: [
      "POS_APPROVE_ACCOUNTING",
      "POS_CORRECT_ORDER_TYPE",
      "POS_VIEW_POS_SCREEN",
      "POS_HOLD_SALE",
    ],
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
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

  it("corrects order type to delivery and persists driver/company details", async () => {
    prismaMock.salesInvoice.findUnique.mockResolvedValue({
      id: "inv1",
      subtotalAmount: "20.00",
      taxAmount: "1.60",
      serviceChargeAmount: "0.00",
      deliveryFeeAmount: "0.00",
      orderType: OrderType.DINE_IN,
      tableId: "t1",
      posAccountingStatus: PosAccountingStatus.PENDING_REVIEW,
    });
    prismaMock.deliveryCompany.findUnique.mockResolvedValue({ id: "dc1", isActive: true });
    prismaMock.deliveryDriver.findUnique.mockResolvedValue({ id: "drv1", isActive: true });
    prismaMock.kitchenOrder.findUnique.mockResolvedValue({ id: "kot1", salesInvoiceId: "inv1" });

    await service.correctOrderType(
      "inv1",
      {
        orderType: OrderType.DELIVERY,
        deliveryCompanyId: "dc1",
        driverId: "drv1",
        deliveryFeeAmount: 3.5,
        reason: "Switched from dine-in to delivery",
      },
      authorizedUser,
    );

    expect(prismaMock.salesInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv1" },
        data: expect.objectContaining({
          orderType: OrderType.DELIVERY,
          tableId: null,
          deliveryCompanyId: "dc1",
          driverId: "drv1",
          deliveryStatus: DeliveryStatus.PENDING,
          correctionReason: "Switched from dine-in to delivery",
          isCorrected: true,
        }),
      }),
    );
    expect(prismaMock.posTable.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: {
        status: TableStatus.AVAILABLE,
        activeInvoiceId: null,
      },
    });
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "SalesInvoice",
        entityId: "inv1",
        action: AuditAction.UPDATE,
      }),
    );
  });

  it("assigns a driver only to delivery orders", async () => {
    prismaMock.salesInvoice.findUnique.mockResolvedValue({
      id: "inv-delivery",
      orderType: OrderType.DELIVERY,
    });
    prismaMock.deliveryDriver.findUnique.mockResolvedValue({
      id: "drv2",
      isActive: true,
    });

    await service.assignDriver("inv-delivery", "drv2", authorizedUser);

    expect(prismaMock.salesInvoice.update).toHaveBeenCalledWith({
      where: { id: "inv-delivery" },
      data: { driverId: "drv2" },
    });
  });

  it("transfers an active table order to another table", async () => {
    prismaMock.posTable.findUnique
      .mockResolvedValueOnce({
        id: "t1",
        tableNumber: "T1",
        activeInvoiceId: "inv1",
      })
      .mockResolvedValueOnce({
        id: "t2",
        tableNumber: "T2",
        activeInvoiceId: null,
      });
    prismaMock.kitchenOrder.findUnique.mockResolvedValue({
      id: "kot1",
      salesInvoiceId: "inv1",
    });

    await service.transferTable(
      { fromTableId: "t1", toTableId: "t2" },
      authorizedUser,
    );

    expect(prismaMock.salesInvoice.update).toHaveBeenCalledWith({
      where: { id: "inv1" },
      data: { tableId: "t2" },
    });
    expect(prismaMock.kitchenOrder.update).toHaveBeenCalledWith({
      where: { id: "kot1" },
      data: {
        tableId: "t2",
        tableName: "T2",
      },
    });
    expect(prismaMock.posTable.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: {
        status: TableStatus.AVAILABLE,
        activeInvoiceId: null,
      },
    });
    expect(prismaMock.posTable.update).toHaveBeenCalledWith({
      where: { id: "t2" },
      data: {
        status: TableStatus.OCCUPIED,
        activeInvoiceId: "inv1",
      },
    });
  });
});
