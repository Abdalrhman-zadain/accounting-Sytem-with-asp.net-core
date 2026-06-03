import {
  AuditAction,
  DeliveryStatus,
  OrderType,
  PosAccountingStatus,
  PosOperationalStatus,
  PosPaymentMethod,
  TableStatus,
} from "../../../generated/prisma";
import { PosService } from "./pos.service";

describe("PosService restaurant operations", () => {
  const prismaMock = {
    salesInvoice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    posPayment: {
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    journalEntry: {
      findFirst: jest.fn(),
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
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
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
      "POS_VIEW_POS_REPORTS",
      "POS_VIEW_POS_SCREEN",
      "POS_HOLD_SALE",
    ],
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaMock.$queryRaw.mockResolvedValue([]);
    prismaMock.$executeRaw.mockResolvedValue(1);
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
      posPayments: [{ amount: "25.10" }],
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
          correctedByUserId: "u1",
          allocatedAmount: expect.anything(),
          outstandingAmount: expect.anything(),
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

  it("returns POS settings with runtime overrides and permission-based toggles", async () => {
    const previousAllowCreditSale = process.env.POS_ALLOW_CREDIT_SALE;
    const previousAllowNegativeStock = process.env.POS_ALLOW_NEGATIVE_STOCK;
    const previousDiscountTaxPolicy = process.env.POS_INVOICE_DISCOUNT_TAX_POLICY;
    const previousDiscountLimit = process.env.POS_MAX_CASHIER_DISCOUNT_PERCENT;

    process.env.POS_ALLOW_CREDIT_SALE = "false";
    process.env.POS_ALLOW_NEGATIVE_STOCK = "false";
    process.env.POS_INVOICE_DISCOUNT_TAX_POLICY = "BEFORE_TAX";
    process.env.POS_MAX_CASHIER_DISCOUNT_PERCENT = "15";

    prismaMock.$queryRaw.mockResolvedValue([
      { key: "POS_POSTING_MODE", value: "BY_SESSION" },
      { key: "POS_COGS_POSTING_ENABLED", value: "true" },
    ]);

    const result = await service.getSettings({
      ...authorizedUser,
      permissions: [
        ...authorizedUser.permissions,
        "POS_CREDIT_SALE",
        "POS_SELL_NEGATIVE_STOCK",
      ],
    });

    expect(result.runtime).toEqual(
      expect.objectContaining({
        postingMode: "BY_SESSION",
        cogsPostingEnabled: true,
        allowCreditSale: true,
        negativeStockAllowed: true,
        invoiceDiscountTaxPolicy: "BEFORE_TAX",
        cashierDiscountLimitPercent: 15,
      }),
    );

    process.env.POS_ALLOW_CREDIT_SALE = previousAllowCreditSale;
    process.env.POS_ALLOW_NEGATIVE_STOCK = previousAllowNegativeStock;
    process.env.POS_INVOICE_DISCOUNT_TAX_POLICY = previousDiscountTaxPolicy;
    process.env.POS_MAX_CASHIER_DISCOUNT_PERCENT = previousDiscountLimit;
  });

  it("updates POS runtime settings for posting mode and COGS posting", async () => {
    prismaMock.$queryRaw
      .mockResolvedValueOnce([
        { key: "POS_POSTING_MODE", value: "BY_INVOICE" },
        { key: "POS_COGS_POSTING_ENABLED", value: "true" },
      ]);

    const result = await service.updateSettings(
      {
        postingMode: "BY_INVOICE",
        cogsPostingEnabled: true,
      },
      authorizedUser,
    );

    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(2);
    expect(result.runtime).toEqual(
      expect.objectContaining({
        postingMode: "BY_INVOICE",
        cogsPostingEnabled: true,
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

  it("falls back to a null correction user when the authenticated user id is stale", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.salesInvoice.findUnique.mockResolvedValue({
      id: "inv-stale",
      subtotalAmount: "20.00",
      taxAmount: "1.60",
      serviceChargeAmount: "0.00",
      deliveryFeeAmount: "0.00",
      posPayments: [{ amount: "21.60" }],
      orderType: OrderType.DINE_IN,
      tableId: "t1",
      posAccountingStatus: PosAccountingStatus.PENDING_REVIEW,
    });
    prismaMock.deliveryCompany.findUnique.mockResolvedValue({ id: "dc1", isActive: true });
    prismaMock.kitchenOrder.findUnique.mockResolvedValue(null);

    await service.correctOrderType(
      "inv-stale",
      {
        orderType: OrderType.DELIVERY,
        deliveryCompanyId: "dc1",
        reason: "Stale user session",
      },
      authorizedUser,
    );

    expect(prismaMock.salesInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv-stale" },
        data: expect.objectContaining({
          correctedByUserId: null,
        }),
      }),
    );
  });

  it("rejects order corrections that would reduce the total below already applied payments", async () => {
    prismaMock.salesInvoice.findUnique.mockResolvedValue({
      id: "inv-overpaid",
      subtotalAmount: "5.00",
      taxAmount: "0.80",
      serviceChargeAmount: "2.00",
      deliveryFeeAmount: "0.00",
      posPayments: [{ amount: "7.80" }],
      orderType: OrderType.DELIVERY,
      tableId: null,
      posAccountingStatus: PosAccountingStatus.PENDING_REVIEW,
    });

    await expect(
      service.correctOrderType(
        "inv-overpaid",
        {
          orderType: OrderType.TAKEAWAY,
          deliveryFeeAmount: 0,
          serviceChargeAmount: 0,
          reason: "Remove delivery charges",
        },
        authorizedUser,
      ),
    ).rejects.toThrow("Corrected order total cannot be lower than the already applied POS payments.");
  });

  it("corrects the payment method and updates the linked payment row", async () => {
    prismaMock.salesInvoice.findUnique.mockResolvedValue({
      id: "inv-pay",
      deliveryCompanyId: null,
      posOperationalStatus: PosOperationalStatus.COMPLETED,
      posAccountingStatus: PosAccountingStatus.PENDING_REVIEW,
      posSessionId: "session-1",
      posSession: {
        id: "session-1",
        cashAccountId: "cash-account-id",
      },
      deliveryCompany: null,
      posPayments: [
        {
          id: "payment-1",
          paymentMethod: PosPaymentMethod.CASH,
          amount: "11.59",
          reference: null,
          deliveryCompanyId: null,
          bankCashAccountId: "cash-account-id",
          bankCashAccount: {
            id: "cash-account-id",
            type: "Cash",
          },
          deliveryCompany: null,
        },
      ],
    });
    prismaMock.journalEntry.findFirst.mockResolvedValue(null);

    jest.spyOn(service as any, "resolveCorrectionBankCashAccountId").mockResolvedValue("bank-transfer-account-id");
    jest.spyOn(service as any, "recomputeSessionExpectedCash").mockResolvedValue(0);
    jest.spyOn(service as any, "getPosPostingMode").mockResolvedValue("BY_SESSION");
    jest.spyOn(service as any, "syncSessionGroupedJournalEntry").mockResolvedValue(null);

    await service.correctPaymentMethod(
      "inv-pay",
      {
        paymentMethod: PosPaymentMethod.BANK_TRANSFER,
        reference: "BT-123",
        reason: "Customer paid by transfer",
      },
      authorizedUser,
    );

    expect(prismaMock.posPayment.update).toHaveBeenCalledWith({
      where: { id: "payment-1" },
      data: {
        paymentMethod: PosPaymentMethod.BANK_TRANSFER,
        bankCashAccountId: "bank-transfer-account-id",
        deliveryCompanyId: null,
        reference: "BT-123",
      },
    });
    expect(prismaMock.salesInvoice.update).toHaveBeenCalledWith({
      where: { id: "inv-pay" },
      data: expect.objectContaining({
        deliveryCompanyId: null,
        correctionReason: "Customer paid by transfer",
        isCorrected: true,
        correctedByUserId: "u1",
      }),
    });
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "SalesInvoice",
        entityId: "inv-pay",
        action: AuditAction.UPDATE,
      }),
    );
  });

  it("requires a reference number when correcting payment method to card", async () => {
    prismaMock.salesInvoice.findUnique.mockResolvedValue({
      id: "inv-card-ref",
      deliveryCompanyId: null,
      posOperationalStatus: PosOperationalStatus.COMPLETED,
      posAccountingStatus: PosAccountingStatus.PENDING_REVIEW,
      posSessionId: "session-1",
      posSession: {
        id: "session-1",
        cashAccountId: "cash-account-id",
      },
      deliveryCompany: null,
      posPayments: [
        {
          id: "payment-card-ref",
          paymentMethod: PosPaymentMethod.CASH,
          amount: "11.59",
          reference: null,
          deliveryCompanyId: null,
          bankCashAccountId: "cash-account-id",
          bankCashAccount: {
            id: "cash-account-id",
            type: "Cash",
          },
          deliveryCompany: null,
        },
      ],
    });

    await expect(
      service.correctPaymentMethod(
        "inv-card-ref",
        {
          paymentMethod: PosPaymentMethod.CARD,
          reference: "",
          reason: "Customer actually paid by Visa",
        },
        authorizedUser,
      ),
    ).rejects.toThrow("Reference number is required for the selected payment method.");
  });

  it("corrects cash payment to card when a reference number is provided", async () => {
    prismaMock.salesInvoice.findUnique.mockResolvedValue({
      id: "inv-card",
      deliveryCompanyId: null,
      posOperationalStatus: PosOperationalStatus.COMPLETED,
      posAccountingStatus: PosAccountingStatus.PENDING_REVIEW,
      posSessionId: "session-1",
      posSession: {
        id: "session-1",
        cashAccountId: "cash-account-id",
      },
      deliveryCompany: null,
      posPayments: [
        {
          id: "payment-card",
          paymentMethod: PosPaymentMethod.CASH,
          amount: "11.59",
          reference: null,
          deliveryCompanyId: null,
          bankCashAccountId: "cash-account-id",
          bankCashAccount: {
            id: "cash-account-id",
            type: "Cash",
          },
          deliveryCompany: null,
        },
      ],
    });
    prismaMock.journalEntry.findFirst.mockResolvedValue(null);

    jest.spyOn(service as any, "resolveCorrectionBankCashAccountId").mockResolvedValue("card-account-id");
    jest.spyOn(service as any, "recomputeSessionExpectedCash").mockResolvedValue(0);
    jest.spyOn(service as any, "getPosPostingMode").mockResolvedValue("BY_SESSION");
    jest.spyOn(service as any, "syncSessionGroupedJournalEntry").mockResolvedValue(null);

    await service.correctPaymentMethod(
      "inv-card",
      {
        paymentMethod: PosPaymentMethod.CARD,
        reference: "VISA-784512",
        reason: "Customer actually paid by Visa",
      },
      authorizedUser,
    );

    expect(prismaMock.posPayment.update).toHaveBeenCalledWith({
      where: { id: "payment-card" },
      data: {
        paymentMethod: PosPaymentMethod.CARD,
        bankCashAccountId: "card-account-id",
        deliveryCompanyId: null,
        reference: "VISA-784512",
      },
    });
  });

  it("adds a small balancing adjustment line for tiny grouped journal rounding deltas", () => {
    const adjusted = (service as any).applySmallBalancingAdjustment(
      [
        {
          accountId: "cash-account",
          description: "POS session SESSION-1 grouped posting",
          debitAmount: 1.45,
          creditAmount: 0,
        },
        {
          accountId: "sales-account",
          description: "POS session SESSION-1 grouped posting",
          debitAmount: 0,
          creditAmount: 1.44,
        },
      ],
      "sales-account",
      "POS session SESSION-1 grouped posting rounding adjustment",
    );

    expect(adjusted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: "sales-account",
          debitAmount: 0,
          creditAmount: 0.01,
        }),
      ]),
    );
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
