import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import {
  Prisma,
  RepCarStockMovementType,
  SalesRepStatus,
} from "../../../../generated/prisma";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type { AuthorizedUser } from "../../../platform/auth/auth.types";
import { ItemMasterService } from "../../../phase-5-inventory-management/inventory/item-master/item-master.service";

type RepBalanceDelta = {
  salesRepId: string;
  itemId: string;
  quantityDelta: Prisma.Decimal;
  valueDelta: Prisma.Decimal;
};

type RepMovementInput = {
  movementType: RepCarStockMovementType;
  transactionType: string;
  transactionId: string;
  transactionLineId?: string | null;
  transactionReference: string;
  transactionDate: Date;
  salesRepId: string;
  itemId: string;
  quantityIn?: Prisma.Decimal;
  quantityOut?: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  valueIn?: Prisma.Decimal;
  valueOut?: Prisma.Decimal;
  description?: string | null;
};

@Injectable()
export class RepCarStockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemMasterService: ItemMasterService,
  ) {}

  isMarketRepScopedUser(user?: AuthorizedUser) {
    return Boolean(
      user?.posRoles?.includes("MARKET_REP" as AuthorizedUser["posRoles"][number]) &&
        !user?.posRoles?.includes("ACCOUNTANT") &&
        user?.role !== "ADMIN" &&
        user?.role !== "MANAGER",
    );
  }

  resolveSalesRepScope(
    user?: AuthorizedUser,
    querySalesRepId?: string,
  ): string | null | undefined {
    if (this.isMarketRepScopedUser(user)) {
      if (!user?.salesRepId) {
        throw new ForbiddenException(
          "Market sales rep account is not linked to a sales representative.",
        );
      }
      return user.salesRepId;
    }
    const normalized = querySalesRepId?.trim();
    return normalized || undefined;
  }

  canManageRepLoads(user?: AuthorizedUser) {
    if (!user) return false;
    if (user.role === "ADMIN" || user.role === "MANAGER") return true;
    return user.permissions?.includes("POS_MARKET_MANAGE_REP_LOADS") ?? false;
  }

  canRepStocktake(user?: AuthorizedUser) {
    if (!user) return false;
    if (user.role === "ADMIN" || user.role === "MANAGER") return true;
    return user.permissions?.includes("POS_MARKET_REP_STOCKTAKE") ?? false;
  }

  ensureManageRepLoads(user?: AuthorizedUser) {
    if (!this.canManageRepLoads(user)) {
      throw new ForbiddenException("You do not have permission to manage rep car loads.");
    }
  }

  ensureRepStocktake(user?: AuthorizedUser) {
    if (!this.canRepStocktake(user)) {
      throw new ForbiddenException("You do not have permission to post rep car stocktakes.");
    }
  }

  async ensureActiveSalesRep(salesRepId: string) {
    const rep = await this.prisma.salesRepresentative.findFirst({
      where: { id: salesRepId, status: SalesRepStatus.ACTIVE },
      select: { id: true, code: true, name: true },
    });
    if (!rep) {
      throw new BadRequestException("Sales representative was not found or is inactive.");
    }
    return rep;
  }

  async applyRepCarBalance(tx: Prisma.TransactionClient, delta: RepBalanceDelta) {
    await tx.repCarStockBalance.upsert({
      where: {
        salesRepId_itemId: {
          salesRepId: delta.salesRepId,
          itemId: delta.itemId,
        },
      },
      create: {
        salesRepId: delta.salesRepId,
        itemId: delta.itemId,
        onHandQuantity: delta.quantityDelta,
        valuationAmount: delta.valueDelta,
      },
      update: {
        onHandQuantity: { increment: delta.quantityDelta },
        valuationAmount: { increment: delta.valueDelta },
      },
    });

    return tx.repCarStockBalance.findUniqueOrThrow({
      where: {
        salesRepId_itemId: {
          salesRepId: delta.salesRepId,
          itemId: delta.itemId,
        },
      },
    });
  }

  averageUnitCost(quantity: Prisma.Decimal, value: Prisma.Decimal) {
    if (quantity.lte(0)) {
      return new Prisma.Decimal(0);
    }
    return value.div(quantity);
  }

  async createRepCarMovement(tx: Prisma.TransactionClient, movement: RepMovementInput) {
    const balance = await tx.repCarStockBalance.findUnique({
      where: {
        salesRepId_itemId: {
          salesRepId: movement.salesRepId,
          itemId: movement.itemId,
        },
      },
    });
    const runningQuantity = balance?.onHandQuantity ?? new Prisma.Decimal(0);
    const runningValuation = balance?.valuationAmount ?? new Prisma.Decimal(0);

    await tx.repCarStockMovement.create({
      data: {
        movementType: movement.movementType,
        transactionType: movement.transactionType,
        transactionId: movement.transactionId,
        transactionLineId: movement.transactionLineId ?? null,
        transactionReference: movement.transactionReference,
        transactionDate: movement.transactionDate,
        salesRepId: movement.salesRepId,
        itemId: movement.itemId,
        quantityIn: movement.quantityIn ?? new Prisma.Decimal(0),
        quantityOut: movement.quantityOut ?? new Prisma.Decimal(0),
        unitCost: movement.unitCost,
        valueIn: movement.valueIn ?? new Prisma.Decimal(0),
        valueOut: movement.valueOut ?? new Prisma.Decimal(0),
        runningQuantity,
        runningValuation,
        description: movement.description ?? null,
      },
    });
  }

  async applySaleDeduction(
    tx: Prisma.TransactionClient,
    salesRepId: string,
    invoice: {
      id: string;
      reference: string;
      invoiceDate: Date;
      lines: Array<{
        id: string;
        itemId: string | null;
        quantity: Prisma.Decimal;
        description: string | null;
        item?: {
          id: string;
          code: string;
          trackInventory: boolean;
          cogsAccountId: string | null;
          inventoryAccountId: string | null;
          isActive: boolean;
        } | null;
      }>;
    },
    options?: { allowNegative?: boolean },
  ) {
    const accountingLines: Array<{
      accountId: string;
      description: string;
      debitAmount: number;
      creditAmount: number;
    }> = [];

    for (const line of invoice.lines) {
      if (!line.itemId || !line.item?.trackInventory || !line.item.isActive) {
        continue;
      }

      const balance = await tx.repCarStockBalance.findUnique({
        where: {
          salesRepId_itemId: { salesRepId, itemId: line.itemId },
        },
      });
      const available = balance?.onHandQuantity ?? new Prisma.Decimal(0);
      if (!options?.allowNegative && available.lt(line.quantity)) {
        throw new BadRequestException(
          `Item ${line.item.code} does not have enough stock on the rep car (${available.toString()} available).`,
        );
      }

      const currentValuation = balance?.valuationAmount ?? new Prisma.Decimal(0);
      const unitCost = this.averageUnitCost(available, currentValuation);
      const totalCost = unitCost.mul(line.quantity);

      await this.applyRepCarBalance(tx, {
        salesRepId,
        itemId: line.itemId,
        quantityDelta: line.quantity.neg(),
        valueDelta: totalCost.neg(),
      });

      await this.createRepCarMovement(tx, {
        movementType: RepCarStockMovementType.SALE_OUT,
        transactionType: "SalesInvoice",
        transactionId: invoice.id,
        transactionLineId: line.id,
        transactionReference: invoice.reference,
        transactionDate: invoice.invoiceDate,
        salesRepId,
        itemId: line.itemId,
        quantityOut: line.quantity,
        unitCost,
        valueOut: totalCost,
        description: line.description,
      });

      const amount = Number(totalCost.toFixed(2));
      if (amount > 0 && line.item.cogsAccountId && line.item.inventoryAccountId) {
        accountingLines.push({
          accountId: line.item.cogsAccountId,
          description: `COGS ${invoice.reference}`,
          debitAmount: amount,
          creditAmount: 0,
        });
        accountingLines.push({
          accountId: line.item.inventoryAccountId,
          description: `Inventory relief ${invoice.reference}`,
          debitAmount: 0,
          creditAmount: amount,
        });
      }
    }

    return { accountingLines };
  }

  async listBalances(salesRepId: string, user?: AuthorizedUser) {
    const scope = this.resolveSalesRepScope(user, salesRepId);
    const targetRepId = scope ?? salesRepId;
    if (!targetRepId) {
      throw new BadRequestException("salesRepId is required.");
    }
    if (scope && scope !== salesRepId) {
      throw new ForbiddenException("You can only view your own rep car stock.");
    }

    await this.ensureActiveSalesRep(targetRepId);

    const rows = await this.prisma.repCarStockBalance.findMany({
      where: {
        salesRepId: targetRepId,
        onHandQuantity: { gt: 0 },
      },
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            unitOfMeasure: true,
            trackInventory: true,
            allowFractionalQuantity: true,
            defaultSalesPrice: true,
            isActive: true,
            attachmentsText: true,
            itemGroup: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: [{ item: { name: "asc" } }],
    });

    return rows.map((row) => ({
      salesRepId: row.salesRepId,
      itemId: row.itemId,
      onHandQuantity: Number(row.onHandQuantity.toString()),
      valuationAmount: Number(row.valuationAmount.toFixed(2)),
      item: row.item,
    }));
  }

  async listMovements(
    query: {
      salesRepId?: string;
      itemId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: string;
      limit?: string;
    },
    user?: AuthorizedUser,
  ) {
    const scope = this.resolveSalesRepScope(user, query.salesRepId);
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 25)));
    const skip = (page - 1) * limit;

    const where: Prisma.RepCarStockMovementWhereInput = {
      ...(scope ? { salesRepId: scope } : query.salesRepId ? { salesRepId: query.salesRepId } : {}),
      ...(query.itemId ? { itemId: query.itemId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            transactionDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.repCarStockMovement.findMany({
        where,
        include: {
          item: { select: { id: true, code: true, name: true } },
          salesRep: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      this.prisma.repCarStockMovement.count({ where }),
    ]);

    return {
      data: data.map((row) => ({
        id: row.id,
        movementType: row.movementType,
        transactionType: row.transactionType,
        transactionId: row.transactionId,
        transactionReference: row.transactionReference,
        transactionDate: row.transactionDate.toISOString(),
        salesRepId: row.salesRepId,
        salesRep: row.salesRep,
        itemId: row.itemId,
        item: row.item,
        quantityIn: Number(row.quantityIn.toString()),
        quantityOut: Number(row.quantityOut.toString()),
        unitCost: Number(row.unitCost.toFixed(2)),
        valueIn: Number(row.valueIn.toFixed(2)),
        valueOut: Number(row.valueOut.toFixed(2)),
        runningQuantity: Number(row.runningQuantity.toString()),
        runningValuation: Number(row.runningValuation.toFixed(2)),
        description: row.description,
        createdAt: row.createdAt.toISOString(),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async listActiveSalesReps() {
    const reps = await this.prisma.salesRepresentative.findMany({
      where: { status: SalesRepStatus.ACTIVE },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    });
    return reps;
  }

  async getMarketCatalog(salesRepId: string, user?: AuthorizedUser) {
    const scope = this.resolveSalesRepScope(user, salesRepId);
    const targetRepId = scope ?? salesRepId;
    if (!targetRepId) {
      throw new BadRequestException("salesRepId is required.");
    }
    await this.ensureActiveSalesRep(targetRepId);

    const marketItems = [];
    const pageLimit = 100;
    let page = 1;
    let totalPages = 1;
    do {
      const catalog = await this.itemMasterService.list({
        isActive: "true",
        limit: String(pageLimit),
        page: String(page),
      });
      totalPages = catalog.totalPages;
      marketItems.push(
        ...catalog.data.filter(
          (item) =>
            item.code.startsWith("MKT-") ||
            item.itemGroup?.code?.startsWith("MARKET-") ||
            item.itemGroup?.code?.startsWith("MKT-"),
        ),
      );
      page += 1;
    } while (page <= totalPages);

    const balances = await this.prisma.repCarStockBalance.findMany({
      where: { salesRepId: targetRepId },
      select: { itemId: true, onHandQuantity: true, valuationAmount: true },
    });
    const balanceByItem = new Map(balances.map((b) => [b.itemId, b]));

    return marketItems.map((item) => {
      const balance = balanceByItem.get(item.id);
      return {
        ...item,
        onHandQuantity: balance ? Number(balance.onHandQuantity.toString()) : 0,
        valuationAmount: balance ? Number(balance.valuationAmount.toFixed(2)) : 0,
        repCarStock: true,
      };
    });
  }
}
