import { Injectable } from "@nestjs/common";
import { Prisma } from "../../../../generated/prisma";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { isMarketInventoryItem } from "../market-inventory-item.utils";
import { RepCarStockService } from "./rep-car-stock.service";
import type { AuthorizedUser } from "../../../platform/auth/auth.types";

@Injectable()
export class MarketStockOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repCarStockService: RepCarStockService,
  ) {}

  async getOverview(
    query: {
      search?: string;
      itemId?: string;
      hideZero?: string;
    },
    user?: AuthorizedUser,
  ) {
    this.repCarStockService.ensureManageRepLoads(user);

    const search = query.search?.trim();
    const hideZero = query.hideZero !== "false";

    const itemWhere: Prisma.InventoryItemWhereInput = {
      isActive: true,
      trackInventory: true,
      ...(query.itemId ? { id: query.itemId } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [warehouses, salesReps, warehouseBalances, repBalances, items] =
      await Promise.all([
        this.prisma.inventoryWarehouse.findMany({
          where: { isActive: true },
          select: { id: true, code: true, name: true, isActive: true, isTransit: true },
          orderBy: [{ name: "asc" }],
        }),
        this.prisma.salesRepresentative.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, code: true, name: true, status: true },
          orderBy: [{ name: "asc" }],
        }),
        this.prisma.inventoryWarehouseBalance.findMany({
          where: hideZero ? { onHandQuantity: { gt: 0 } } : {},
          select: {
            itemId: true,
            warehouseId: true,
            onHandQuantity: true,
            valuationAmount: true,
          },
        }),
        this.prisma.repCarStockBalance.findMany({
          where: hideZero ? { onHandQuantity: { gt: 0 } } : {},
          select: {
            itemId: true,
            salesRepId: true,
            onHandQuantity: true,
            valuationAmount: true,
          },
        }),
        this.prisma.inventoryItem.findMany({
          where: itemWhere,
          select: {
            id: true,
            code: true,
            name: true,
            unitOfMeasure: true,
            trackInventory: true,
            itemGroup: { select: { code: true } },
          },
          orderBy: [{ name: "asc" }],
        }),
      ]);

    const marketItems = items.filter((item) => isMarketInventoryItem(item));
    const marketItemIds = new Set(marketItems.map((item) => item.id));

    const filteredWarehouseBalances = warehouseBalances.filter((row) =>
      marketItemIds.has(row.itemId),
    );
    const filteredRepBalances = repBalances.filter((row) =>
      marketItemIds.has(row.itemId),
    );

    const itemIdsWithStock = new Set<string>();
    for (const row of filteredWarehouseBalances) {
      if (!hideZero || row.onHandQuantity.gt(0)) {
        itemIdsWithStock.add(row.itemId);
      }
    }
    for (const row of filteredRepBalances) {
      if (!hideZero || row.onHandQuantity.gt(0)) {
        itemIdsWithStock.add(row.itemId);
      }
    }

    const visibleItems = hideZero
      ? marketItems.filter((item) => itemIdsWithStock.has(item.id))
      : marketItems;

    const locations = [
      ...warehouses.map((warehouse) => ({
        id: warehouse.id,
        type: "warehouse" as const,
        code: warehouse.code,
        name: warehouse.name,
        isActive: warehouse.isActive,
        isTransit: warehouse.isTransit,
      })),
      ...salesReps.map((rep) => ({
        id: rep.id,
        type: "rep" as const,
        code: rep.code,
        name: rep.name,
        isActive: true,
        isTransit: false,
      })),
    ];

    const balances = [
      ...filteredWarehouseBalances.map((row) => ({
        locationId: row.warehouseId,
        locationType: "warehouse" as const,
        itemId: row.itemId,
        onHandQuantity: Number(row.onHandQuantity.toString()),
        valuationAmount: Number(row.valuationAmount.toFixed(2)),
      })),
      ...filteredRepBalances.map((row) => ({
        locationId: row.salesRepId,
        locationType: "rep" as const,
        itemId: row.itemId,
        onHandQuantity: Number(row.onHandQuantity.toString()),
        valuationAmount: Number(row.valuationAmount.toFixed(2)),
      })),
    ];

    return {
      locations,
      items: visibleItems.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        unitOfMeasure: item.unitOfMeasure,
      })),
      balances,
    };
  }
}
