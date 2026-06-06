                                                                                                                                            import { PosTableController } from "./pos-table.controller";
import { PosKitchenController } from "./pos-kitchen.controller";
import { TableStatus, KitchenStatus, OrderType } from "../../../generated/prisma";
import { NotFoundException } from "@nestjs/common";

describe("Restaurant POS Controllers", () => {
  const prismaMock = {
    posTable: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    kitchenOrder: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    kitchenOrderItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const kitchenUser = {
    userId: "kitchen1",
    posRoles: ["KITCHEN"],
    permissions: ["RST_VIEW_KITCHEN_SCREEN", "RST_UPDATE_KITCHEN_STATUS"],
  } as never;

  const posServiceMock = {
    auditKotReprint: jest.fn(),
    assertKitchenViewPermission: jest.fn(),
    assertKitchenUpdatePermission: jest.fn(),
  };

  let tableController: PosTableController;
  let kitchenController: PosKitchenController;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock as never));
    tableController = new PosTableController(prismaMock as never, posServiceMock as never);
    kitchenController = new PosKitchenController(prismaMock as never, posServiceMock as never);
  });

  describe("PosTableController", () => {
    it("lists all tables", async () => {
      const mockTables = [
        {
          id: "t1",
          tableNumber: "T1",
          capacity: 4,
          status: TableStatus.AVAILABLE,
          reservations: [],
        },
      ];
      prismaMock.posTable.findMany.mockResolvedValue(mockTables);

      const result = await tableController.listTables();
      expect(result).toEqual(mockTables);
      expect(prismaMock.posTable.findMany).toHaveBeenCalled();
    });

    it("gets table by id or throws NotFound", async () => {
      prismaMock.posTable.findUnique.mockResolvedValue(null);
      await expect(tableController.getTable("invalid")).rejects.toThrow(NotFoundException);

      const mockTable = { id: "t1", tableNumber: "T1", status: TableStatus.AVAILABLE };
      prismaMock.posTable.findUnique.mockResolvedValue(mockTable);
      const result = await tableController.getTable("t1");
      expect(result).toEqual(mockTable);
    });

    it("updates table status", async () => {
      const mockTable = { id: "t1", tableNumber: "T1", status: TableStatus.AVAILABLE };
      prismaMock.posTable.findUnique.mockResolvedValue(mockTable);
      prismaMock.posTable.update.mockResolvedValue({ ...mockTable, status: TableStatus.OCCUPIED });

      const result = await tableController.updateStatus("t1", { status: TableStatus.OCCUPIED });
      expect(result.status).toEqual(TableStatus.OCCUPIED);
      expect(prismaMock.posTable.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: { status: TableStatus.OCCUPIED },
        include: expect.any(Object),
      });
    });

    it("updates table waiter assignment", async () => {
      const mockTable = { id: "t1", tableNumber: "T1", assignedWaiterId: null };
      prismaMock.posTable.findUnique.mockResolvedValue(mockTable);
      prismaMock.posTable.update.mockResolvedValue({ ...mockTable, assignedWaiterId: "w1" });

      const result = await tableController.updateWaiter("t1", { assignedWaiterId: "w1" });
      expect(result.assignedWaiterId).toEqual("w1");
    });
  });

  describe("PosKitchenController", () => {
    it("lists kitchen orders", async () => {
      const mockOrders = [
        { id: "o1", orderNumber: "KOT-1", status: KitchenStatus.NEW },
      ];
      prismaMock.kitchenOrder.findMany.mockResolvedValue(mockOrders);

      const result = await kitchenController.listOrders({ user: kitchenUser });
      expect(result).toEqual(mockOrders);
    });

    it("gets kitchen order by id or throws NotFound", async () => {
      prismaMock.kitchenOrder.findUnique.mockResolvedValue(null);
      await expect(kitchenController.getOrder({ user: kitchenUser }, "invalid")).rejects.toThrow(
        NotFoundException,
      );

      const mockOrder = { id: "o1", orderNumber: "KOT-1" };
      prismaMock.kitchenOrder.findUnique.mockResolvedValue(mockOrder);
      const result = await kitchenController.getOrder({ user: kitchenUser }, "o1");
      expect(result).toEqual(mockOrder);
    });

    it("updates kitchen order status and propagates to items", async () => {
      const mockOrder = { id: "o1", orderNumber: "KOT-1", status: KitchenStatus.NEW };
      prismaMock.kitchenOrder.findUnique.mockResolvedValue(mockOrder);
      prismaMock.kitchenOrder.update.mockResolvedValue({ ...mockOrder, status: KitchenStatus.READY });

      const result = await kitchenController.updateOrderStatus("o1", { status: KitchenStatus.READY });
      expect(result.status).toEqual(KitchenStatus.READY);
      expect(prismaMock.kitchenOrderItem.updateMany).toHaveBeenCalledWith({
        where: { kitchenOrderId: "o1" },
        data: { status: KitchenStatus.READY },
      });
    });

    it("updates kitchen order item status and updates order status", async () => {
      const mockItem = { id: "item1", kitchenOrderId: "o1", status: KitchenStatus.NEW };
      prismaMock.kitchenOrderItem.findUnique.mockResolvedValue(mockItem);
      prismaMock.kitchenOrderItem.update.mockResolvedValue({ ...mockItem, status: KitchenStatus.READY });
      prismaMock.kitchenOrderItem.findMany.mockResolvedValue([
        { id: "item1", status: KitchenStatus.READY },
      ]);
      prismaMock.kitchenOrder.update.mockResolvedValue({ id: "o1", status: KitchenStatus.READY });

      const result = await kitchenController.updateOrderItemStatus(
        { user: kitchenUser },
        "item1",
        { status: KitchenStatus.READY },
      );
      expect(result.status).toEqual(KitchenStatus.READY);
      expect(prismaMock.kitchenOrder.update).toHaveBeenCalledWith({
        where: { id: "o1" },
        data: { status: KitchenStatus.READY },
      });
    });

    it("reprints KOT ticket and logs audit reason", async () => {
      const mockUser = { id: "u1", username: "cashier1" };
      posServiceMock.auditKotReprint.mockResolvedValue({ success: true });

      const result = await kitchenController.reprintKot("o1", { reason: "Customer lost receipt" }, { user: mockUser } as any);
      expect(result).toEqual({ success: true });
      expect(posServiceMock.auditKotReprint).toHaveBeenCalledWith("o1", { reason: "Customer lost receipt" }, mockUser);
    });
  });
});
