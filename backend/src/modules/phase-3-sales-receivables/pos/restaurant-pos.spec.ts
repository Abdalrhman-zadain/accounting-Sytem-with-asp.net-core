import { PosTableController } from "./pos-table.controller";
import { PosKitchenController } from "./pos-kitchen.controller";
import { PosWaiterOrdersController } from "./pos-waiter-orders.controller";
import { TableStatus, KitchenStatus, WaiterFoodStatus } from "../../../generated/prisma";
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
    listWaiterOrders: jest.fn(),
    updateWaiterOrderStatus: jest.fn(),
  };

  let tableController: PosTableController;
  let kitchenController: PosKitchenController;
  let waiterOrdersController: PosWaiterOrdersController;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock as never));
    tableController = new PosTableController(prismaMock as never, posServiceMock as never);
    kitchenController = new PosKitchenController(prismaMock as never, posServiceMock as never);
    waiterOrdersController = new PosWaiterOrdersController(posServiceMock as never);
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

  describe("PosWaiterOrdersController", () => {
    it("lists waiter dine-in orders", async () => {
      const mockOrders = [
        { id: "o1", orderNumber: "KOT-1", waiterStatus: WaiterFoodStatus.WAITING },
      ];
      posServiceMock.listWaiterOrders.mockResolvedValue(mockOrders);

      const result = await waiterOrdersController.listOrders({ user: kitchenUser });
      expect(result).toEqual(mockOrders);
      expect(posServiceMock.listWaiterOrders).toHaveBeenCalledWith(kitchenUser, undefined);
    });

    it("updates waiter order status", async () => {
      const mockOrder = {
        id: "o1",
        orderNumber: "KOT-1",
        waiterStatus: WaiterFoodStatus.RECEIVED,
      };
      posServiceMock.updateWaiterOrderStatus.mockResolvedValue(mockOrder);

      const result = await waiterOrdersController.updateOrderStatus(
        { user: kitchenUser },
        "o1",
        { status: WaiterFoodStatus.RECEIVED },
      );
      expect(result).toEqual(mockOrder);
      expect(posServiceMock.updateWaiterOrderStatus).toHaveBeenCalledWith(
        "o1",
        WaiterFoodStatus.RECEIVED,
        kitchenUser,
      );
    });
  });

  describe("PosKitchenController", () => {
    it("reprints KOT ticket and logs audit reason", async () => {
      const mockUser = { id: "u1", username: "cashier1" };
      posServiceMock.auditKotReprint.mockResolvedValue({ success: true });

      const result = await kitchenController.reprintKot("o1", { reason: "Customer lost receipt" }, { user: mockUser } as any);
      expect(result).toEqual({ success: true });
      expect(posServiceMock.auditKotReprint).toHaveBeenCalledWith("o1", { reason: "Customer lost receipt" }, mockUser);
    });
  });
});
