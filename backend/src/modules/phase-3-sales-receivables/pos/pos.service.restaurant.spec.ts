import {
  AuditAction,
  DeliveryStatus,
  KitchenStatus,
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
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    salesInvoiceLine: {
      deleteMany: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    posPayment: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    account: {
      findUnique: jest.fn(),
    },
    bankCashAccount: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    journalEntry: {
      findFirst: jest.fn(),
    },
    deliveryCompany: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    deliveryDriver: {
      findUnique: jest.fn(),
    },
    posRuntimeSetting: {
      findMany: jest.fn(),
    },
    posTable: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    posSession: {
      findUnique: jest.fn(),
    },
    kitchenOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    kitchenOrderItem: {
      delete: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
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
    prismaMock.posRuntimeSetting.findMany.mockResolvedValue([]);
    prismaMock.account.findUnique.mockResolvedValue({
      id: "acc-1",
      code: "1110001",
      isActive: true,
      isPosting: true,
    });
    prismaMock.bankCashAccount.findFirst.mockResolvedValue({ id: "bc-1" });
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
    prismaMock.deliveryCompany.findUnique.mockResolvedValue({ id: "dc1", isActive: true, receivableAccountId: "rec1" });
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

  it("updates POS account mappings and delivery receivable mappings", async () => {
    prismaMock.posRuntimeSetting.findMany.mockResolvedValueOnce([
      { key: "POS_MAPPING_CASH_ACCOUNT_ID", value: "cash-account" },
      { key: "POS_MAPPING_CARD_ACCOUNT_ID", value: "card-clearing-account" },
      { key: "POS_MAPPING_SALES_REVENUE_ACCOUNT_ID", value: "sales-revenue" },
      { key: "POS_MAPPING_OUTPUT_VAT_ACCOUNT_ID", value: "vat-output" },
      { key: "POS_MAPPING_SALES_DISCOUNT_ACCOUNT_ID", value: "sales-discount" },
      { key: "POS_MAPPING_SALES_RETURNS_ACCOUNT_ID", value: "sales-returns" },
      {
        key: "POS_MAPPING_DELIVERY_COMPANIES",
        value: JSON.stringify([{ id: "dc1", receivableAccountId: "talabat-rec" }]),
      },
    ] as any);

    const result = await service.updateSettings(
      {
        cashAccountId: "cash-account",
        cardAccountId: "card-clearing-account",
        salesRevenueAccountId: "sales-revenue",
        outputVatAccountId: "vat-output",
        salesDiscountAccountId: "sales-discount",
        salesReturnsAccountId: "sales-returns",
        deliveryCompanies: [{ id: "dc1", receivableAccountId: "talabat-rec" }],
      },
      authorizedUser,
    );

    expect(prismaMock.$executeRaw).toHaveBeenCalled();
    expect(prismaMock.deliveryCompany.update).toHaveBeenCalledWith({
      where: { id: "dc1" },
      data: {
        receivableAccountId: "talabat-rec",
        commissionAccountId: null,
        serviceFeeAccountId: null,
      },
    });
    expect(result.accounts).toEqual(
      expect.objectContaining({
        cashAccountId: "cash-account",
        cardAccountId: "card-clearing-account",
        salesRevenueAccountId: "sales-revenue",
        outputVatAccountId: "vat-output",
        salesDiscountAccountId: "sales-discount",
        salesReturnsAccountId: "sales-returns",
        deliveryCompanies: [{ id: "dc1", receivableAccountId: "talabat-rec" }],
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
    prismaMock.deliveryCompany.findUnique.mockResolvedValue({ id: "dc1", isActive: true, receivableAccountId: "rec1" });
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

  describe("saveDraft waiter permissions", () => {
    const waiterWithoutCompleteSale = {
      userId: "waiter1",
      posRoles: ["WAITER"],
      permissions: [
        "RST_SEND_KOT",
        "RST_VIEW_TABLE_SCREEN",
        "RST_OPEN_TABLE_ORDER",
        "POS_HOLD_SALE",
        "POS_ADD_ITEM_TO_CART",
      ],
    } as any;

    it("allows waiter saveDraft with hold/table-order permissions only", async () => {
      prismaMock.posSession.findUnique.mockResolvedValue(null);

      await expect(
        service.saveDraft(
          {
            sessionId: "s1",
            orderType: "DINE_IN",
            tableId: "t1",
            waiterId: "waiter1",
            lines: [{ itemId: "item1", quantity: 1, unitPrice: 5, lineAmount: 5 }],
          } as any,
          waiterWithoutCompleteSale,
        ),
      ).rejects.toThrow("POS session s1 was not found");
    });

    it("rejects waiter saveDraft without draft permissions", async () => {
      await expect(
        service.saveDraft(
          { sessionId: "s1", lines: [{ itemId: "item1", quantity: 1 }] } as any,
          {
            userId: "waiter1",
            posRoles: ["WAITER"],
            permissions: ["RST_SEND_KOT"],
          } as any,
        ),
      ).rejects.toThrow("permission to save POS drafts");
    });
  });
});

// ---------------------------------------------------------------------------
// Pre-order helper unit tests
// ---------------------------------------------------------------------------

describe("PosService.parseReservationNotes", () => {
  let service: PosService;

  beforeEach(() => {
    const prismaMock = {
      salesInvoice: { findUnique: jest.fn(), update: jest.fn() },
      posPayment: { update: jest.fn() },
      user: { findUnique: jest.fn() },
      journalEntry: { findFirst: jest.fn() },
      deliveryCompany: { findUnique: jest.fn() },
      deliveryDriver: { findUnique: jest.fn() },
      posTable: { findUnique: jest.fn(), update: jest.fn() },
      kitchenOrder: { findUnique: jest.fn(), update: jest.fn() },
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
      $transaction: jest.fn(),
    };
    service = new PosService(
      prismaMock as never,
      { log: jest.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it("returns defaults for null input", () => {
    const result = service.parseReservationNotes(null);
    expect(result.notes).toBeNull();
    expect(result.orderNotes).toBeNull();
    expect(result.attendanceStatus).toBe("UNKNOWN");
    expect(result.preOrderSaleId).toBeNull();
    expect(result.preOrderUpdatedAt).toBeNull();
  });

  it("returns defaults for plain-string notes (legacy format)", () => {
    const result = service.parseReservationNotes("some notes");
    expect(result.notes).toBe("some notes");
    expect(result.orderNotes).toBeNull();
    expect(result.preOrderSaleId).toBeNull();
  });

  it("parses JSON notes correctly including preOrderSaleId", () => {
    const payload = JSON.stringify({
      notes: "vip",
      orderNotes: "2 burgers",
      attendanceStatus: "ARRIVED",
      attendanceMarkedAt: "2026-06-03T10:00:00.000Z",
      preOrderSaleId: "sale123",
      preOrderUpdatedAt: "2026-06-03T10:00:00.000Z",
    });
    const result = service.parseReservationNotes(payload);
    expect(result.notes).toBe("vip");
    expect(result.orderNotes).toBe("2 burgers");
    expect(result.attendanceStatus).toBe("ARRIVED");
    expect(result.preOrderSaleId).toBe("sale123");
    expect(result.preOrderUpdatedAt).toBe("2026-06-03T10:00:00.000Z");
  });

  it("returns null for preOrderSaleId when not present in JSON", () => {
    const payload = JSON.stringify({ notes: null, attendanceStatus: "UNKNOWN" });
    const result = service.parseReservationNotes(payload);
    expect(result.preOrderSaleId).toBeNull();
  });

  it("handles malformed JSON gracefully", () => {
    const result = service.parseReservationNotes("{bad json");
    expect(result.preOrderSaleId).toBeNull();
    expect(result.attendanceStatus).toBe("UNKNOWN");
  });
});

describe("PosService.openReservationPreOrder — guard conditions", () => {
  const prismaMock = {
    posTableReservation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    salesInvoice: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    salesInvoiceLine: { deleteMany: jest.fn() },
    posSession: { findFirst: jest.fn(), findUnique: jest.fn() },
    posTable: { findUnique: jest.fn(), update: jest.fn() },
    customer: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    taxTreatment: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    journalEntry: { findFirst: jest.fn() },
    salesInvoiceCounter: { upsert: jest.fn() },
    kitchenOrder: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    kitchenOrderItem: { delete: jest.fn(), update: jest.fn(), count: jest.fn() },
    posPayment: { deleteMany: jest.fn() },
    posRuntimeSetting: { findMany: jest.fn().mockResolvedValue([]) },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $executeRaw: jest.fn().mockResolvedValue(1),
    $transaction: jest.fn(),
  };

  let service: PosService;
  const user = {
    userId: "u1",
    permissions: ["POS_VIEW_POS_SCREEN"],
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.posRuntimeSetting.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock as never),
    );
    service = new PosService(
      prismaMock as never,
      { log: jest.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it("throws NotFoundException when reservation does not exist", async () => {
    prismaMock.posTableReservation.findUnique.mockResolvedValue(null);
    await expect(
      service.openReservationPreOrder("nonexistent", user),
    ).rejects.toThrow("Reservation not found.");
  });

  it("throws BadRequestException when reservation is not ACTIVE", async () => {
    prismaMock.posTableReservation.findUnique.mockResolvedValue({
      id: "r1",
      status: "CANCELLED",
      notes: null,
      table: { id: "t1", tableNumber: "T1", activeInvoiceId: null },
    });
    await expect(
      service.openReservationPreOrder("r1", user),
    ).rejects.toThrow("Only ACTIVE reservations can have pre-orders.");
  });

  it("throws BadRequestException when table already has an active order", async () => {
    prismaMock.posTableReservation.findUnique.mockResolvedValue({
      id: "r1",
      status: "ACTIVE",
      notes: null,
      table: { id: "t1", tableNumber: "T1", activeInvoiceId: "existing-invoice" },
    });
    await expect(
      service.openReservationPreOrder("r1", user),
    ).rejects.toThrow("Cannot add pre-order: the table already has a different active order.");
  });

  it("does NOT update table activeInvoiceId when creating a pre-order", async () => {
    prismaMock.posTableReservation.findUnique.mockResolvedValue({
      id: "r1",
      status: "ACTIVE",
      notes: JSON.stringify({ preOrderSaleId: null }),
      table: { id: "t1", tableNumber: "T1", activeInvoiceId: null },
    });
    prismaMock.posSession.findFirst.mockResolvedValue({ id: "sess1", status: "OPEN" });
    prismaMock.taxTreatment.findFirst.mockResolvedValue({ id: "tax1" });
    prismaMock.customer.findFirst.mockResolvedValue({ id: "cust-walkin", isActive: true });
    prismaMock.customer.findUnique.mockResolvedValue({ id: "cust-walkin", isActive: true });
    prismaMock.customer.create.mockResolvedValue({ id: "cust-walkin", isActive: true });
    prismaMock.salesInvoiceCounter.upsert.mockResolvedValue({ lastNumber: 1 });
    prismaMock.salesInvoice.findFirst.mockResolvedValue(null);
    prismaMock.salesInvoice.create.mockResolvedValue({
      id: "preorder-inv",
      reference: "POS-001",
      status: "DRAFT",
      invoiceDate: new Date(),
      subtotalAmount: { toString: () => "0" },
      discountAmount: { toString: () => "0" },
      taxAmount: { toString: () => "0" },
      totalAmount: { toString: () => "0" },
      allocatedAmount: { toString: () => "0" },
      outstandingAmount: { toString: () => "0" },
      posOperationalStatus: "HELD",
      posAccountingStatus: "UNPOSTED",
      posChangeAmount: null,
      posVoidedAt: null,
      posVoidReason: null,
      posReviewedAt: null,
      posReviewedByUserId: null,
      posReviewNotes: null,
      posCompletedAt: null,
      postedAt: null,
      serviceChargeAmount: { toString: () => "0" },
      deliveryFeeAmount: { toString: () => "0" },
      isCorrected: false,
      correctedAt: null,
      correctionReason: null,
      orderType: "DINE_IN",
      originalOrderType: null,
      tableId: "t1",
      waiterId: null,
      deliveryStatus: null,
      deliveryAddress: null,
      deliveryNotes: null,
      deliveryCompanyId: null,
      driverId: null,
      lines: [],
      posPayments: [],
      posSession: null,
      customer: { id: "cust-walkin", name: "Walk-in" },
      table: { id: "t1", tableNumber: "T1", status: "AVAILABLE" },
      waiter: null,
      deliveryCompany: null,
      driver: null,
      journalEntry: null,
      createdAt: new Date("2026-06-03T10:00:00.000Z"),
      updatedAt: new Date("2026-06-03T10:00:00.000Z"),
    });
    prismaMock.posTableReservation.update.mockResolvedValue({});

    await service.openReservationPreOrder("r1", user);

    // Crucially: posTable.update should NOT have been called to set activeInvoiceId
    expect(prismaMock.posTable.update).not.toHaveBeenCalled();
    // The reservation should have been updated with the preOrderSaleId
    expect(prismaMock.posTableReservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "r1" },
        data: expect.objectContaining({
          notes: expect.stringContaining("preorder-inv"),
        }),
      }),
    );
  });

  describe("sendSaleToKitchen / waiter lock", () => {
    const waiterUser = {
      userId: "waiter1",
      posRoles: ["WAITER"],
      permissions: [
        "RST_SEND_KOT",
        "RST_VIEW_TABLE_SCREEN",
        "RST_OPEN_TABLE_ORDER",
        "POS_HOLD_SALE",
        "POS_COMPLETE_SALE",
      ],
    } as any;

    const cashierUser = {
      userId: "cashier1",
      posRoles: ["CASHIER"],
      permissions: ["RST_SEND_KOT", "POS_VIEW_POS_SCREEN", "POS_COMPLETE_SALE"],
    } as any;

    it("rejects waiter completeSale", async () => {
      await expect(
        service.completeSale({ sessionId: "s1", lines: [], payments: [] } as any, waiterUser),
      ).rejects.toThrow("Waiters cannot complete sales or take payment");
    });

    it("rejects waiter second confirm after waiterConfirmedAt", async () => {
      prismaMock.salesInvoice.findUnique.mockResolvedValue({
        id: "inv1",
        invoiceType: "POS",
        posOperationalStatus: "DRAFT",
        waiterConfirmedAt: new Date(),
        orderType: "DINE_IN",
        tableId: "t1",
        waiterId: "waiter1",
        description: null,
        lines: [
          {
            id: "line1",
            itemId: "item1",
            itemName: "Burger",
            quantity: { toString: () => "1" },
            description: null,
            modifiers: null,
            kitchenSentAt: new Date(),
          },
        ],
        kitchenOrder: { id: "kot1", items: [] },
      });

      await expect(service.sendSaleToKitchen("inv1", waiterUser)).rejects.toThrow(
        "already confirmed",
      );
    });

    it("rejects cashier saveDraft that removes a kitchen line marked ready", async () => {
      const salesReceivablesMock = {
        resolveSalesInvoiceLines: jest.fn().mockResolvedValue([
          { itemId: "item2", quantity: 1 },
        ]),
        computeSalesDocumentTotals: jest.fn().mockReturnValue({
          subtotalAmount: 5,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: 5,
        }),
        buildSalesInvoiceLineInput: jest.fn(),
      };
      const lockedService = new PosService(
        prismaMock as never,
        { log: jest.fn() } as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        salesReceivablesMock as never,
      );

      prismaMock.posSession.findUnique.mockResolvedValue({
        id: "s1",
        status: "OPEN",
        cashAccountId: "bc-1",
        warehouseId: "wh1",
      });
      prismaMock.customer.findFirst.mockResolvedValue({
        id: "cust-walkin",
        isActive: true,
      });
      prismaMock.kitchenOrder.findUnique.mockResolvedValue({
        items: [{ salesInvoiceLineId: "line1", status: KitchenStatus.READY }],
      });
      prismaMock.salesInvoice.findUnique.mockResolvedValue({
        id: "inv1",
        invoiceType: "POS",
        posSessionId: "s1",
        posOperationalStatus: "DRAFT",
        journalEntryId: null,
        waiterConfirmedAt: null,
        lines: [
          {
            id: "line1",
            itemId: "item1",
            quantity: { toString: () => "2" },
            kitchenSentAt: new Date(),
          },
        ],
      });

      await expect(
        lockedService.saveDraft(
          {
            sessionId: "s1",
            invoiceId: "inv1",
            lines: [{ itemId: "item2", quantity: 1 }],
          } as any,
          cashierUser,
        ),
      ).rejects.toThrow("ready or served");
    });

    it("rejects any cart change when the order already has a kitchen-ready line", async () => {
      const salesReceivablesMock = {
        resolveSalesInvoiceLines: jest.fn().mockResolvedValue([
          { salesInvoiceLineId: "line1", itemId: "item1", quantity: 3 },
          { salesInvoiceLineId: "line2", itemId: "item2", quantity: 1 },
        ]),
        computeSalesDocumentTotals: jest.fn().mockReturnValue({
          subtotalAmount: 20,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: 20,
        }),
        buildSalesInvoiceLineInput: jest.fn(),
      };
      const lockedService = new PosService(
        prismaMock as never,
        { log: jest.fn() } as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        salesReceivablesMock as never,
      );

      prismaMock.posSession.findUnique.mockResolvedValue({
        id: "s1",
        status: "OPEN",
        cashAccountId: "bc-1",
        warehouseId: "wh1",
      });
      prismaMock.customer.findFirst.mockResolvedValue({
        id: "cust-walkin",
        isActive: true,
      });
      prismaMock.kitchenOrder.findUnique.mockResolvedValue({
        items: [{ salesInvoiceLineId: "line1", status: KitchenStatus.READY }],
      });
      prismaMock.salesInvoice.findUnique.mockResolvedValue({
        id: "inv1",
        invoiceType: "POS",
        posSessionId: "s1",
        posOperationalStatus: "DRAFT",
        journalEntryId: null,
        waiterConfirmedAt: null,
        lines: [
          {
            id: "line1",
            itemId: "item1",
            quantity: { toString: () => "2" },
            kitchenSentAt: new Date(),
          },
          {
            id: "line2",
            itemId: "item2",
            quantity: { toString: () => "1" },
            kitchenSentAt: null,
          },
        ],
      });

      await expect(
        lockedService.saveDraft(
          {
            sessionId: "s1",
            invoiceId: "inv1",
            lines: [
              { salesInvoiceLineId: "line1", itemId: "item1", quantity: 2 },
              { salesInvoiceLineId: "line2", itemId: "item2", quantity: 2 },
            ],
          } as any,
          cashierUser,
        ),
      ).rejects.toThrow("kitchen-ready items");
    });
  });
});
