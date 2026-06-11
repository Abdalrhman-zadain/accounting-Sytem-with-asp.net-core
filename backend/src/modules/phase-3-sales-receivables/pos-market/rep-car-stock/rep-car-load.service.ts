import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import {
  AuditAction,
  InventoryStockMovementType,
  Prisma,
  RepCarLoadStatus,
  RepCarStockMovementType,
} from "../../../../generated/prisma";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AuditService } from "../../../phase-1-accounting-foundation/accounting-core/audit/audit.service";
import { ItemMasterService } from "../../../phase-5-inventory-management/inventory/item-master/item-master.service";
import { InventoryPostingService } from "../../../phase-5-inventory-management/inventory/shared/inventory-posting.service";
import { WarehousesService } from "../../../phase-5-inventory-management/inventory/warehouses/warehouses.service";
import {
  CreateRepCarLoadDto,
  UpdateRepCarLoadDto,
} from "./dto/rep-car-stock.dto";
import { RepCarStockService } from "./rep-car-stock.service";
import {
  evaluateRepLoadReverseEligibility,
  type RepLoadReversePreview,
} from "./rep-car-load-reverse.utils";
import type { AuthorizedUser } from "../../../platform/auth/auth.types";

type ResolvedLoadLine = {
  itemId: string;
  quantity: Prisma.Decimal;
  unitOfMeasure: string;
  description: string | null;
  unitCost: Prisma.Decimal;
  lineTotalAmount: Prisma.Decimal;
};

@Injectable()
export class RepCarLoadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly itemMasterService: ItemMasterService,
    private readonly warehousesService: WarehousesService,
    private readonly inventoryPostingService: InventoryPostingService,
    private readonly repCarStockService: RepCarStockService,
  ) {}

  private loadInclude() {
    return {
      warehouse: {
        select: { id: true, code: true, name: true, isActive: true },
      },
      salesRep: {
        select: { id: true, code: true, name: true, status: true },
      },
      postedByUser: { select: { id: true, username: true, name: true } },
      reversedByUser: { select: { id: true, username: true, name: true } },
      lines: {
        orderBy: { lineNumber: "asc" as const },
        include: {
          item: {
            select: {
              id: true,
              code: true,
              name: true,
              unitOfMeasure: true,
              trackInventory: true,
            },
          },
        },
      },
    };
  }

  private generateReference() {
    const stamp = Date.now().toString(36).toUpperCase();
    return `RCL-${stamp}`;
  }

  private mapLoad(
    row: Awaited<ReturnType<typeof this.getByIdRaw>>,
    reversePreview?: RepLoadReversePreview,
  ) {
    const linePreviewByItem = new Map(
      (reversePreview?.lines ?? []).map((line) => [line.itemId, line]),
    );

    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      loadDate: row.loadDate.toISOString(),
      warehouseId: row.warehouseId,
      warehouse: row.warehouse,
      salesRepId: row.salesRepId,
      salesRep: row.salesRep,
      description: row.description,
      totalQuantity: Number(row.totalQuantity.toString()),
      totalAmount: Number(row.totalAmount.toFixed(2)),
      postedAt: row.postedAt?.toISOString() ?? null,
      postedByUser: row.postedByUser,
      reversedAt: row.reversedAt?.toISOString() ?? null,
      reversedByUser: row.reversedByUser,
      canReverse: reversePreview?.canReverse ?? false,
      reverseBlockReasons: reversePreview?.reasons ?? [],
      hasSalesAfterPost: reversePreview?.hasSalesAfterPost ?? false,
      lines: row.lines.map((line) => {
        const preview = linePreviewByItem.get(line.itemId);
        return {
          id: line.id,
          lineNumber: line.lineNumber,
          itemId: line.itemId,
          item: line.item,
          quantity: Number(line.quantity.toString()),
          unitCost: Number(line.unitCost.toFixed(2)),
          unitOfMeasure: line.unitOfMeasure,
          description: line.description,
          lineTotalAmount: Number(line.lineTotalAmount.toFixed(2)),
          repOnHand: preview?.repOnHand ?? null,
          reverseShortfall: preview?.shortfall ?? null,
        };
      }),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async buildReversePreview(row: {
    status: RepCarLoadStatus;
    postedAt: Date | null;
    salesRepId: string;
    lines: Array<{
      itemId: string;
      quantity: Prisma.Decimal;
      item: { code: string };
    }>;
  }): Promise<RepLoadReversePreview | undefined> {
    if (row.status !== RepCarLoadStatus.POSTED || !row.postedAt) {
      return undefined;
    }

    const itemIds = [...new Set(row.lines.map((line) => line.itemId))];
    const [balances, salesAfterPost] = await Promise.all([
      this.prisma.repCarStockBalance.findMany({
        where: {
          salesRepId: row.salesRepId,
          itemId: { in: itemIds },
        },
        select: { itemId: true, onHandQuantity: true },
      }),
      this.prisma.repCarStockMovement.findFirst({
        where: {
          salesRepId: row.salesRepId,
          movementType: RepCarStockMovementType.SALE_OUT,
          itemId: { in: itemIds },
          transactionDate: { gte: row.postedAt },
        },
        select: { id: true },
      }),
    ]);

    const repBalances = new Map(
      balances.map((balance) => [balance.itemId, balance.onHandQuantity]),
    );

    return evaluateRepLoadReverseEligibility({
      status: row.status,
      postedAt: row.postedAt,
      lines: row.lines,
      repBalances,
      hasSalesAfterPost: Boolean(salesAfterPost),
    });
  }

  private async getByIdRaw(id: string) {
    const row = await this.prisma.repCarLoad.findUnique({
      where: { id },
      include: this.loadInclude(),
    });
    if (!row) {
      throw new BadRequestException(`Rep car load ${id} was not found.`);
    }
    return row;
  }

  async list(
    query: {
      status?: string;
      salesRepId?: string;
      warehouseId?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      page?: string;
      limit?: string;
    },
    user?: AuthorizedUser,
  ) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 25)));
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.RepCarLoadWhereInput = {
      ...(query.status ? { status: query.status as RepCarLoadStatus } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            loadDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { salesRep: { name: { contains: search, mode: "insensitive" } } },
              { salesRep: { code: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const repScope = this.repCarStockService.resolveSalesRepScope(user, query.salesRepId);
    if (repScope) {
      where.salesRepId = repScope;
    } else if (query.salesRepId) {
      where.salesRepId = query.salesRepId;
    }

    const [total, rows] = await Promise.all([
      this.prisma.repCarLoad.count({ where }),
      this.prisma.repCarLoad.findMany({
        where,
        include: this.loadInclude(),
        orderBy: [{ loadDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((row) => this.mapLoad(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string, user?: AuthorizedUser) {
    const row = await this.getByIdRaw(id);
    const repScope = this.repCarStockService.resolveSalesRepScope(user);
    if (repScope && row.salesRepId !== repScope) {
      throw new BadRequestException("Rep car load was not found.");
    }
    const reversePreview = await this.buildReversePreview(row);
    return this.mapLoad(row, reversePreview);
  }

  private async resolveLines(lines: CreateRepCarLoadDto["lines"]): Promise<ResolvedLoadLine[]> {
    const resolved: ResolvedLoadLine[] = [];
    for (const line of lines) {
      const item = await this.itemMasterService.ensureActiveItem(line.itemId);
      if (!item.trackInventory) {
        throw new BadRequestException(
          `Item ${item.code} does not track inventory and cannot be loaded to a rep car.`,
        );
      }
      const quantity = new Prisma.Decimal(line.quantity);
      if (quantity.lte(0)) {
        throw new BadRequestException("Line quantity must be greater than zero.");
      }
      resolved.push({
        itemId: item.id,
        quantity,
        unitOfMeasure: line.unitOfMeasure?.trim() || item.unitOfMeasure,
        description: line.description?.trim() || null,
        unitCost: new Prisma.Decimal(0),
        lineTotalAmount: new Prisma.Decimal(0),
      });
    }
    return resolved;
  }

  private calculateTotals(lines: ResolvedLoadLine[]) {
    return lines.reduce(
      (acc, line) => ({
        totalQuantity: acc.totalQuantity.add(line.quantity),
        totalAmount: acc.totalAmount.add(line.lineTotalAmount),
      }),
      {
        totalQuantity: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(0),
      },
    );
  }

  async create(dto: CreateRepCarLoadDto, user?: AuthorizedUser) {
    this.repCarStockService.ensureManageRepLoads(user);
    await this.warehousesService.getActiveWarehouseReference(dto.warehouseId);
    await this.repCarStockService.ensureActiveSalesRep(dto.salesRepId);

    const reference = dto.reference?.trim() || this.generateReference();
    const lines = await this.resolveLines(dto.lines);
    const totals = this.calculateTotals(lines);

    try {
      const created = await this.prisma.repCarLoad.create({
        data: {
          reference,
          loadDate: new Date(dto.loadDate),
          warehouseId: dto.warehouseId,
          salesRepId: dto.salesRepId,
          description: dto.description?.trim() || null,
          totalQuantity: totals.totalQuantity,
          totalAmount: totals.totalAmount,
          lines: {
            create: lines.map((line, index) => ({
              itemId: line.itemId,
              lineNumber: index + 1,
              quantity: line.quantity,
              unitCost: line.unitCost,
              unitOfMeasure: line.unitOfMeasure,
              description: line.description,
              lineTotalAmount: line.lineTotalAmount,
            })),
          },
        },
        include: this.loadInclude(),
      });

      await this.auditService.log({
        userId: user?.userId,
        entity: "RepCarLoad",
        entityId: created.id,
        action: AuditAction.CREATE,
        details: { reference: created.reference, status: created.status },
      });

      return this.mapLoad(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("A rep car load with this reference already exists.");
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateRepCarLoadDto, user?: AuthorizedUser) {
    this.repCarStockService.ensureManageRepLoads(user);
    const current = await this.getByIdRaw(id);
    if (current.status !== RepCarLoadStatus.DRAFT) {
      throw new BadRequestException("Only draft rep car loads can be edited.");
    }

    const warehouseId = dto.warehouseId ?? current.warehouseId;
    const salesRepId = dto.salesRepId ?? current.salesRepId;
    await this.warehousesService.getActiveWarehouseReference(warehouseId);
    await this.repCarStockService.ensureActiveSalesRep(salesRepId);

    const lines = dto.lines ? await this.resolveLines(dto.lines) : null;
    const totals = lines
      ? this.calculateTotals(lines)
      : {
          totalQuantity: current.totalQuantity,
          totalAmount: current.totalAmount,
        };

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lines) {
          await tx.repCarLoadLine.deleteMany({ where: { repCarLoadId: id } });
        }
        return tx.repCarLoad.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            loadDate: dto.loadDate ? new Date(dto.loadDate) : undefined,
            warehouseId,
            salesRepId,
            description:
              dto.description === undefined ? undefined : dto.description.trim() || null,
            totalQuantity: totals.totalQuantity,
            totalAmount: totals.totalAmount,
            lines: lines
              ? {
                  create: lines.map((line, index) => ({
                    itemId: line.itemId,
                    lineNumber: index + 1,
                    quantity: line.quantity,
                    unitCost: line.unitCost,
                    unitOfMeasure: line.unitOfMeasure,
                    description: line.description,
                    lineTotalAmount: line.lineTotalAmount,
                  })),
                }
              : undefined,
          },
          include: this.loadInclude(),
        });
      });

      await this.auditService.log({
        userId: user?.userId,
        entity: "RepCarLoad",
        entityId: updated.id,
        action: AuditAction.UPDATE,
        details: { reference: updated.reference, status: updated.status },
      });

      return this.mapLoad(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("A rep car load with this reference already exists.");
      }
      throw error;
    }
  }

  async post(id: string, user?: AuthorizedUser) {
    this.repCarStockService.ensureManageRepLoads(user);
    const load = await this.prisma.repCarLoad.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNumber: "asc" } } },
    });
    if (!load) {
      throw new BadRequestException(`Rep car load ${id} was not found.`);
    }
    if (load.status !== RepCarLoadStatus.DRAFT) {
      throw new BadRequestException("Only draft rep car loads can be posted.");
    }

    await this.warehousesService.getActiveWarehouseReference(load.warehouseId);
    await this.repCarStockService.ensureActiveSalesRep(load.salesRepId);

    const itemIds = [...new Set(load.lines.map((line) => line.itemId))];
    const items = await this.prisma.inventoryItem.findMany({
      where: { id: { in: itemIds } },
      select: {
        id: true,
        code: true,
        isActive: true,
        trackInventory: true,
        onHandQuantity: true,
        valuationAmount: true,
      },
    });
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const preventNegativeStock = this.inventoryPostingService.preventNegativeStock();
    const costingMethod = await this.inventoryPostingService.getCostingMethod();

    const updated = await this.prisma.$transaction(async (tx) => {
      let totalQuantity = new Prisma.Decimal(0);
      let totalAmount = new Prisma.Decimal(0);

      for (const line of load.lines) {
        const item = itemMap.get(line.itemId);
        if (!item?.isActive || !item.trackInventory) {
          throw new BadRequestException(
            "Rep car load lines must reference active inventory-tracked items.",
          );
        }

        const currentBalance = await tx.inventoryWarehouseBalance.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: line.itemId,
              warehouseId: load.warehouseId,
            },
          },
        });
        const currentQuantity = currentBalance?.onHandQuantity ?? new Prisma.Decimal(0);
        const currentValuation = currentBalance?.valuationAmount ?? new Prisma.Decimal(0);
        if (preventNegativeStock && currentQuantity.lt(line.quantity)) {
          throw new BadRequestException(
            `Item ${item.code} does not have enough stock in the warehouse for this load.`,
          );
        }

        const fallbackUnitCost = this.inventoryPostingService.averageUnitCost(
          currentQuantity,
          currentValuation,
        );
        const valuation = await this.inventoryPostingService.resolveIssueCost({
          tx,
          itemId: line.itemId,
          warehouseId: load.warehouseId,
          quantity: line.quantity,
          fallbackUnitCost,
          reference: load.reference,
          sourceType: "RepCarLoad",
          sourceId: load.id,
          sourceLineId: line.id,
          sourceDate: load.loadDate,
          costingMethod,
        });

        totalQuantity = totalQuantity.add(line.quantity);
        totalAmount = totalAmount.add(valuation.totalAmount);

        await tx.repCarLoadLine.update({
          where: { id: line.id },
          data: {
            unitCost: valuation.unitCost,
            lineTotalAmount: valuation.totalAmount,
          },
        });

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            onHandQuantity: { decrement: line.quantity },
            valuationAmount: { decrement: valuation.totalAmount },
          },
        });

        const warehouseBalance = await this.inventoryPostingService.applyWarehouseBalance(tx, {
          itemId: line.itemId,
          warehouseId: load.warehouseId,
          quantityDelta: line.quantity.neg(),
          valueDelta: valuation.totalAmount.neg(),
        });

        await this.inventoryPostingService.createMovement(tx, {
          movementType: InventoryStockMovementType.REP_CAR_LOAD,
          transactionType: "RepCarLoad",
          transactionId: load.id,
          transactionLineId: line.id,
          transactionReference: load.reference,
          transactionDate: load.loadDate,
          itemId: line.itemId,
          warehouseId: load.warehouseId,
          quantityOut: line.quantity,
          unitCost: valuation.unitCost,
          valueOut: valuation.totalAmount,
          balanceId: warehouseBalance.id,
          runningQuantity: warehouseBalance.onHandQuantity,
          runningValuation: warehouseBalance.valuationAmount,
          description: line.description ?? load.description,
        });

        await this.repCarStockService.applyRepCarBalance(tx, {
          salesRepId: load.salesRepId,
          itemId: line.itemId,
          quantityDelta: line.quantity,
          valueDelta: valuation.totalAmount,
        });

        await this.repCarStockService.createRepCarMovement(tx, {
          movementType: RepCarStockMovementType.LOAD_IN,
          transactionType: "RepCarLoad",
          transactionId: load.id,
          transactionLineId: line.id,
          transactionReference: load.reference,
          transactionDate: load.loadDate,
          salesRepId: load.salesRepId,
          itemId: line.itemId,
          quantityIn: line.quantity,
          unitCost: valuation.unitCost,
          valueIn: valuation.totalAmount,
          description: line.description ?? load.description,
        });
      }

      return tx.repCarLoad.update({
        where: { id: load.id },
        data: {
          status: RepCarLoadStatus.POSTED,
          postedAt: new Date(),
          postedByUserId: user?.userId ?? null,
          totalQuantity,
          totalAmount,
        },
        include: this.loadInclude(),
      });
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "RepCarLoad",
      entityId: updated.id,
      action: AuditAction.POST,
      details: { reference: updated.reference, status: updated.status },
    });

    return this.mapLoad(updated);
  }

  async cancel(id: string, user?: AuthorizedUser) {
    this.repCarStockService.ensureManageRepLoads(user);
    const current = await this.getByIdRaw(id);
    if (current.status !== RepCarLoadStatus.DRAFT) {
      throw new BadRequestException("Only draft rep car loads can be cancelled.");
    }

    const updated = await this.prisma.repCarLoad.update({
      where: { id },
      data: { status: RepCarLoadStatus.CANCELLED },
      include: this.loadInclude(),
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "RepCarLoad",
      entityId: updated.id,
      action: AuditAction.UPDATE,
      details: { reference: updated.reference, status: updated.status },
    });

    return this.mapLoad(updated);
  }

  async reverse(id: string, user?: AuthorizedUser) {
    this.repCarStockService.ensureManageRepLoads(user);
    const load = await this.prisma.repCarLoad.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNumber: "asc" }, include: { item: { select: { id: true, code: true } } } } },
    });
    if (!load) {
      throw new BadRequestException(`Rep car load ${id} was not found.`);
    }
    if (load.status !== RepCarLoadStatus.POSTED) {
      throw new BadRequestException("Only posted rep car loads can be reversed.");
    }

    const reversePreview = await this.buildReversePreview(load);
    if (!reversePreview?.canReverse) {
      const reason = reversePreview?.reasons[0] ?? "This rep car load cannot be reversed.";
      throw new BadRequestException(reason);
    }

    await this.warehousesService.getActiveWarehouseReference(load.warehouseId);
    await this.repCarStockService.ensureActiveSalesRep(load.salesRepId);

    const preventNegativeStock = this.inventoryPostingService.preventNegativeStock();
    const reversalDate = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const line of load.lines) {
        const balance = await tx.repCarStockBalance.findUnique({
          where: {
            salesRepId_itemId: {
              salesRepId: load.salesRepId,
              itemId: line.itemId,
            },
          },
        });
        const repOnHand = balance?.onHandQuantity ?? new Prisma.Decimal(0);
        if (preventNegativeStock && repOnHand.lt(line.quantity)) {
          throw new BadRequestException(
            `Item ${line.item.code} does not have enough stock on the rep car to reverse this load.`,
          );
        }

        const unitCost = line.unitCost;
        const totalAmount = line.lineTotalAmount;

        await this.repCarStockService.applyRepCarBalance(tx, {
          salesRepId: load.salesRepId,
          itemId: line.itemId,
          quantityDelta: line.quantity.neg(),
          valueDelta: totalAmount.neg(),
        });

        await this.repCarStockService.createRepCarMovement(tx, {
          movementType: RepCarStockMovementType.LOAD_OUT,
          transactionType: "RepCarLoadReversal",
          transactionId: load.id,
          transactionLineId: line.id,
          transactionReference: load.reference,
          transactionDate: reversalDate,
          salesRepId: load.salesRepId,
          itemId: line.itemId,
          quantityOut: line.quantity,
          unitCost,
          valueOut: totalAmount,
          description: line.description ?? load.description,
        });

        await tx.inventoryItem.update({
          where: { id: line.itemId },
          data: {
            onHandQuantity: { increment: line.quantity },
            valuationAmount: { increment: totalAmount },
          },
        });

        const warehouseBalance = await this.inventoryPostingService.applyWarehouseBalance(tx, {
          itemId: line.itemId,
          warehouseId: load.warehouseId,
          quantityDelta: line.quantity,
          valueDelta: totalAmount,
        });

        await this.inventoryPostingService.createMovement(tx, {
          movementType: InventoryStockMovementType.REP_CAR_LOAD_REVERSAL,
          transactionType: "RepCarLoadReversal",
          transactionId: load.id,
          transactionLineId: line.id,
          transactionReference: load.reference,
          transactionDate: reversalDate,
          itemId: line.itemId,
          warehouseId: load.warehouseId,
          quantityIn: line.quantity,
          unitCost,
          valueIn: totalAmount,
          balanceId: warehouseBalance.id,
          runningQuantity: warehouseBalance.onHandQuantity,
          runningValuation: warehouseBalance.valuationAmount,
          description: line.description ?? load.description,
        });

        await this.inventoryPostingService.addCostLayer(tx, {
          itemId: line.itemId,
          warehouseId: load.warehouseId,
          quantity: line.quantity,
          unitCost,
          movementType: InventoryStockMovementType.REP_CAR_LOAD_REVERSAL,
          sourceType: "RepCarLoadReversal",
          sourceId: load.id,
          sourceLineId: line.id,
          sourceReference: load.reference,
          sourceDate: reversalDate,
        });
      }

      return tx.repCarLoad.update({
        where: { id: load.id },
        data: {
          status: RepCarLoadStatus.REVERSED,
          reversedAt: reversalDate,
          reversedByUserId: user?.userId ?? null,
        },
        include: this.loadInclude(),
      });
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "RepCarLoad",
      entityId: updated.id,
      action: AuditAction.REVERSE,
      details: { reference: updated.reference, status: updated.status },
    });

    return this.mapLoad(updated);
  }
}
