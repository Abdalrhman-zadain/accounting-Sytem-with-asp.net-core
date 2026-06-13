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
  CreateRepCarUnloadDto,
  UpdateRepCarUnloadDto,
} from "./dto/rep-car-stock.dto";
import { RepCarStockService } from "./rep-car-stock.service";
import type { AuthorizedUser } from "../../../platform/auth/auth.types";

type ResolvedUnloadLine = {
  itemId: string;
  quantity: Prisma.Decimal;
  unitOfMeasure: string;
  description: string | null;
  unitCost: Prisma.Decimal;
  lineTotalAmount: Prisma.Decimal;
};

@Injectable()
export class RepCarUnloadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly itemMasterService: ItemMasterService,
    private readonly warehousesService: WarehousesService,
    private readonly inventoryPostingService: InventoryPostingService,
    private readonly repCarStockService: RepCarStockService,
  ) {}

  private unloadInclude() {
    return {
      warehouse: {
        select: { id: true, code: true, name: true, isActive: true },
      },
      salesRep: {
        select: { id: true, code: true, name: true, status: true },
      },
      postedByUser: { select: { id: true, username: true, name: true } },
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
    return `RCU-${stamp}`;
  }

  private mapUnload(row: Awaited<ReturnType<typeof this.getByIdRaw>>) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      unloadDate: row.unloadDate.toISOString(),
      warehouseId: row.warehouseId,
      warehouse: row.warehouse,
      salesRepId: row.salesRepId,
      salesRep: row.salesRep,
      description: row.description,
      totalQuantity: Number(row.totalQuantity.toString()),
      totalAmount: Number(row.totalAmount.toFixed(2)),
      postedAt: row.postedAt?.toISOString() ?? null,
      postedByUser: row.postedByUser,
      lines: row.lines.map((line) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        itemId: line.itemId,
        item: line.item,
        quantity: Number(line.quantity.toString()),
        unitCost: Number(line.unitCost.toFixed(2)),
        unitOfMeasure: line.unitOfMeasure,
        description: line.description,
        lineTotalAmount: Number(line.lineTotalAmount.toFixed(2)),
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async getByIdRaw(id: string) {
    const row = await this.prisma.repCarUnload.findUnique({
      where: { id },
      include: this.unloadInclude(),
    });
    if (!row) {
      throw new BadRequestException(`Rep car unload ${id} was not found.`);
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

    const where: Prisma.RepCarUnloadWhereInput = {
      ...(query.status ? { status: query.status as RepCarLoadStatus } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            unloadDate: {
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
      this.prisma.repCarUnload.count({ where }),
      this.prisma.repCarUnload.findMany({
        where,
        include: this.unloadInclude(),
        orderBy: [{ unloadDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((row) => this.mapUnload(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string, user?: AuthorizedUser) {
    const row = await this.getByIdRaw(id);
    const repScope = this.repCarStockService.resolveSalesRepScope(user);
    if (repScope && row.salesRepId !== repScope) {
      throw new BadRequestException("Rep car unload was not found.");
    }
    return this.mapUnload(row);
  }

  private async resolveLines(
    lines: CreateRepCarUnloadDto["lines"],
  ): Promise<ResolvedUnloadLine[]> {
    const resolved: ResolvedUnloadLine[] = [];
    for (const line of lines) {
      const item = await this.itemMasterService.ensureActiveItem(line.itemId);
      if (!item.trackInventory) {
        throw new BadRequestException(
          `Item ${item.code} does not track inventory and cannot be unloaded from a rep car.`,
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

  private calculateTotals(lines: ResolvedUnloadLine[]) {
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

  async create(dto: CreateRepCarUnloadDto, user?: AuthorizedUser) {
    this.repCarStockService.ensureManageRepLoads(user);
    await this.warehousesService.getActiveWarehouseReference(dto.warehouseId);
    await this.repCarStockService.ensureActiveSalesRep(dto.salesRepId);

    const reference = dto.reference?.trim() || this.generateReference();
    const lines = await this.resolveLines(dto.lines);
    const totals = this.calculateTotals(lines);

    try {
      const created = await this.prisma.repCarUnload.create({
        data: {
          reference,
          unloadDate: new Date(dto.unloadDate),
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
        include: this.unloadInclude(),
      });

      await this.auditService.log({
        userId: user?.userId,
        entity: "RepCarUnload",
        entityId: created.id,
        action: AuditAction.CREATE,
        details: { reference: created.reference, status: created.status },
      });

      return this.mapUnload(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("A rep car unload with this reference already exists.");
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateRepCarUnloadDto, user?: AuthorizedUser) {
    this.repCarStockService.ensureManageRepLoads(user);
    const current = await this.getByIdRaw(id);
    if (current.status !== RepCarLoadStatus.DRAFT) {
      throw new BadRequestException("Only draft rep car unloads can be edited.");
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
          await tx.repCarUnloadLine.deleteMany({ where: { repCarUnloadId: id } });
        }
        return tx.repCarUnload.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            unloadDate: dto.unloadDate ? new Date(dto.unloadDate) : undefined,
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
          include: this.unloadInclude(),
        });
      });

      await this.auditService.log({
        userId: user?.userId,
        entity: "RepCarUnload",
        entityId: updated.id,
        action: AuditAction.UPDATE,
        details: { reference: updated.reference, status: updated.status },
      });

      return this.mapUnload(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("A rep car unload with this reference already exists.");
      }
      throw error;
    }
  }

  async post(id: string, user?: AuthorizedUser) {
    this.repCarStockService.ensureManageRepLoads(user);
    const unload = await this.prisma.repCarUnload.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: { lineNumber: "asc" },
          include: { item: { select: { id: true, code: true, isActive: true, trackInventory: true } } },
        },
      },
    });
    if (!unload) {
      throw new BadRequestException(`Rep car unload ${id} was not found.`);
    }
    if (unload.status !== RepCarLoadStatus.DRAFT) {
      throw new BadRequestException("Only draft rep car unloads can be posted.");
    }

    await this.warehousesService.getActiveWarehouseReference(unload.warehouseId);
    await this.repCarStockService.ensureActiveSalesRep(unload.salesRepId);

    const preventNegativeStock = this.inventoryPostingService.preventNegativeStock();

    const updated = await this.prisma.$transaction(async (tx) => {
      let totalQuantity = new Prisma.Decimal(0);
      let totalAmount = new Prisma.Decimal(0);

      for (const line of unload.lines) {
        if (!line.item?.isActive || !line.item.trackInventory) {
          throw new BadRequestException(
            "Rep car unload lines must reference active inventory-tracked items.",
          );
        }

        const repBalance = await tx.repCarStockBalance.findUnique({
          where: {
            salesRepId_itemId: {
              salesRepId: unload.salesRepId,
              itemId: line.itemId,
            },
          },
        });
        const repOnHand = repBalance?.onHandQuantity ?? new Prisma.Decimal(0);
        const repValuation = repBalance?.valuationAmount ?? new Prisma.Decimal(0);

        if (preventNegativeStock && repOnHand.lt(line.quantity)) {
          throw new BadRequestException(
            `Item ${line.item.code} does not have enough stock on the rep car (${repOnHand.toString()} available).`,
          );
        }

        const unitCost = this.repCarStockService.averageUnitCost(repOnHand, repValuation);
        const lineTotalAmount = unitCost.mul(line.quantity);

        totalQuantity = totalQuantity.add(line.quantity);
        totalAmount = totalAmount.add(lineTotalAmount);

        await tx.repCarUnloadLine.update({
          where: { id: line.id },
          data: {
            unitCost,
            lineTotalAmount,
          },
        });

        await this.repCarStockService.applyRepCarBalance(tx, {
          salesRepId: unload.salesRepId,
          itemId: line.itemId,
          quantityDelta: line.quantity.neg(),
          valueDelta: lineTotalAmount.neg(),
        });

        await this.repCarStockService.createRepCarMovement(tx, {
          movementType: RepCarStockMovementType.LOAD_OUT,
          transactionType: "RepCarUnload",
          transactionId: unload.id,
          transactionLineId: line.id,
          transactionReference: unload.reference,
          transactionDate: unload.unloadDate,
          salesRepId: unload.salesRepId,
          itemId: line.itemId,
          quantityOut: line.quantity,
          unitCost,
          valueOut: lineTotalAmount,
          description: line.description ?? unload.description,
        });

        await tx.inventoryItem.update({
          where: { id: line.itemId },
          data: {
            onHandQuantity: { increment: line.quantity },
            valuationAmount: { increment: lineTotalAmount },
          },
        });

        const warehouseBalance = await this.inventoryPostingService.applyWarehouseBalance(tx, {
          itemId: line.itemId,
          warehouseId: unload.warehouseId,
          quantityDelta: line.quantity,
          valueDelta: lineTotalAmount,
        });

        await this.inventoryPostingService.createMovement(tx, {
          movementType: InventoryStockMovementType.REP_CAR_UNLOAD,
          transactionType: "RepCarUnload",
          transactionId: unload.id,
          transactionLineId: line.id,
          transactionReference: unload.reference,
          transactionDate: unload.unloadDate,
          itemId: line.itemId,
          warehouseId: unload.warehouseId,
          quantityIn: line.quantity,
          unitCost,
          valueIn: lineTotalAmount,
          balanceId: warehouseBalance.id,
          runningQuantity: warehouseBalance.onHandQuantity,
          runningValuation: warehouseBalance.valuationAmount,
          description: line.description ?? unload.description,
        });

        await this.inventoryPostingService.addCostLayer(tx, {
          itemId: line.itemId,
          warehouseId: unload.warehouseId,
          quantity: line.quantity,
          unitCost,
          movementType: InventoryStockMovementType.REP_CAR_UNLOAD,
          sourceType: "RepCarUnload",
          sourceId: unload.id,
          sourceLineId: line.id,
          sourceReference: unload.reference,
          sourceDate: unload.unloadDate,
        });
      }

      return tx.repCarUnload.update({
        where: { id: unload.id },
        data: {
          status: RepCarLoadStatus.POSTED,
          postedAt: new Date(),
          postedByUserId: user?.userId ?? null,
          totalQuantity,
          totalAmount,
        },
        include: this.unloadInclude(),
      });
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "RepCarUnload",
      entityId: updated.id,
      action: AuditAction.POST,
      details: { reference: updated.reference, status: updated.status },
    });

    return this.mapUnload(updated);
  }

  async cancel(id: string, user?: AuthorizedUser) {
    this.repCarStockService.ensureManageRepLoads(user);
    const current = await this.getByIdRaw(id);
    if (current.status !== RepCarLoadStatus.DRAFT) {
      throw new BadRequestException("Only draft rep car unloads can be cancelled.");
    }

    const updated = await this.prisma.repCarUnload.update({
      where: { id },
      data: { status: RepCarLoadStatus.CANCELLED },
      include: this.unloadInclude(),
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "RepCarUnload",
      entityId: updated.id,
      action: AuditAction.UPDATE,
      details: { reference: updated.reference, status: updated.status },
    });

    return this.mapUnload(updated);
  }
}
