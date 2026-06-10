import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import {
  AuditAction,
  Prisma,
  RepCarStockMovementType,
  RepCarStocktakeStatus,
} from "../../../../generated/prisma";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AuditService } from "../../../phase-1-accounting-foundation/accounting-core/audit/audit.service";
import { ItemMasterService } from "../../../phase-5-inventory-management/inventory/item-master/item-master.service";
import {
  CreateRepCarStocktakeDto,
  UpdateRepCarStocktakeDto,
} from "./dto/rep-car-stock.dto";
import { RepCarStockService } from "./rep-car-stock.service";
import type { AuthorizedUser } from "../../../platform/auth/auth.types";

type ResolvedStocktakeLine = {
  itemId: string;
  systemQuantity: Prisma.Decimal;
  countedQuantity: Prisma.Decimal;
  varianceQuantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  unitOfMeasure: string;
  description: string | null;
  lineTotalAmount: Prisma.Decimal;
};

@Injectable()
export class RepCarStocktakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly itemMasterService: ItemMasterService,
    private readonly repCarStockService: RepCarStockService,
  ) {}

  private stocktakeInclude() {
    return {
      salesRep: { select: { id: true, code: true, name: true, status: true } },
      postedByUser: { select: { id: true, username: true, name: true } },
      lines: {
        orderBy: { lineNumber: "asc" as const },
        include: {
          item: {
            select: { id: true, code: true, name: true, unitOfMeasure: true },
          },
        },
      },
    };
  }

  private generateReference() {
    return `RCS-${Date.now().toString(36).toUpperCase()}`;
  }

  private mapStocktake(row: Awaited<ReturnType<typeof this.getByIdRaw>>) {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      stocktakeDate: row.stocktakeDate.toISOString(),
      salesRepId: row.salesRepId,
      salesRep: row.salesRep,
      reason: row.reason,
      description: row.description,
      totalVarianceQuantity: Number(row.totalVarianceQuantity.toString()),
      totalAmount: Number(row.totalAmount.toFixed(2)),
      postedAt: row.postedAt?.toISOString() ?? null,
      postedByUser: row.postedByUser,
      lines: row.lines.map((line) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        itemId: line.itemId,
        item: line.item,
        systemQuantity: Number(line.systemQuantity.toString()),
        countedQuantity: Number(line.countedQuantity.toString()),
        varianceQuantity: Number(line.varianceQuantity.toString()),
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
    const row = await this.prisma.repCarStocktake.findUnique({
      where: { id },
      include: this.stocktakeInclude(),
    });
    if (!row) {
      throw new BadRequestException(`Rep car stocktake ${id} was not found.`);
    }
    return row;
  }

  async list(
    query: {
      status?: string;
      salesRepId?: string;
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

    const where: Prisma.RepCarStocktakeWhereInput = {
      ...(query.status ? { status: query.status as RepCarStocktakeStatus } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            stocktakeDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { reference: { contains: query.search, mode: "insensitive" } },
              { reason: { contains: query.search, mode: "insensitive" } },
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
      this.prisma.repCarStocktake.count({ where }),
      this.prisma.repCarStocktake.findMany({
        where,
        include: this.stocktakeInclude(),
        orderBy: [{ stocktakeDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((row) => this.mapStocktake(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string, user?: AuthorizedUser) {
    const row = await this.getByIdRaw(id);
    const repScope = this.repCarStockService.resolveSalesRepScope(user);
    if (repScope && row.salesRepId !== repScope) {
      throw new BadRequestException("Rep car stocktake was not found.");
    }
    return this.mapStocktake(row);
  }

  private async resolveLines(
    salesRepId: string,
    lines: CreateRepCarStocktakeDto["lines"],
  ): Promise<ResolvedStocktakeLine[]> {
    const resolved: ResolvedStocktakeLine[] = [];
    for (const line of lines) {
      const item = await this.itemMasterService.ensureActiveItem(line.itemId);
      const countedQuantity = new Prisma.Decimal(line.countedQuantity);
      if (countedQuantity.lt(0)) {
        throw new BadRequestException("Counted quantity cannot be negative.");
      }
      const balance = await this.prisma.repCarStockBalance.findUnique({
        where: { salesRepId_itemId: { salesRepId, itemId: item.id } },
      });
      const systemQuantity = balance?.onHandQuantity ?? new Prisma.Decimal(0);
      const valuation = balance?.valuationAmount ?? new Prisma.Decimal(0);
      const unitCost = this.repCarStockService.averageUnitCost(systemQuantity, valuation);
      const varianceQuantity = countedQuantity.sub(systemQuantity);
      const lineTotalAmount = varianceQuantity.mul(unitCost).abs();

      resolved.push({
        itemId: item.id,
        systemQuantity,
        countedQuantity,
        varianceQuantity,
        unitCost,
        unitOfMeasure: line.unitOfMeasure?.trim() || item.unitOfMeasure,
        description: line.description?.trim() || null,
        lineTotalAmount,
      });
    }
    return resolved;
  }

  private calculateTotals(lines: ResolvedStocktakeLine[]) {
    return lines.reduce(
      (acc, line) => ({
        totalVarianceQuantity: acc.totalVarianceQuantity.add(line.varianceQuantity),
        totalAmount: acc.totalAmount.add(line.lineTotalAmount),
      }),
      {
        totalVarianceQuantity: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(0),
      },
    );
  }

  async create(dto: CreateRepCarStocktakeDto, user?: AuthorizedUser) {
    this.repCarStockService.ensureRepStocktake(user);
    await this.repCarStockService.ensureActiveSalesRep(dto.salesRepId);

    const reference = dto.reference?.trim() || this.generateReference();
    const lines = await this.resolveLines(dto.salesRepId, dto.lines);
    const totals = this.calculateTotals(lines);

    try {
      const created = await this.prisma.repCarStocktake.create({
        data: {
          reference,
          stocktakeDate: new Date(dto.stocktakeDate),
          salesRepId: dto.salesRepId,
          reason: dto.reason.trim(),
          description: dto.description?.trim() || null,
          totalVarianceQuantity: totals.totalVarianceQuantity,
          totalAmount: totals.totalAmount,
          lines: {
            create: lines.map((line, index) => ({
              itemId: line.itemId,
              lineNumber: index + 1,
              systemQuantity: line.systemQuantity,
              countedQuantity: line.countedQuantity,
              varianceQuantity: line.varianceQuantity,
              unitCost: line.unitCost,
              unitOfMeasure: line.unitOfMeasure,
              description: line.description,
              lineTotalAmount: line.lineTotalAmount,
            })),
          },
        },
        include: this.stocktakeInclude(),
      });

      await this.auditService.log({
        userId: user?.userId,
        entity: "RepCarStocktake",
        entityId: created.id,
        action: AuditAction.CREATE,
        details: { reference: created.reference, status: created.status },
      });

      return this.mapStocktake(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "A rep car stocktake with this reference already exists.",
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateRepCarStocktakeDto, user?: AuthorizedUser) {
    this.repCarStockService.ensureRepStocktake(user);
    const current = await this.getByIdRaw(id);
    if (current.status !== RepCarStocktakeStatus.DRAFT) {
      throw new BadRequestException("Only draft rep car stocktakes can be edited.");
    }

    const salesRepId = dto.salesRepId ?? current.salesRepId;
    await this.repCarStockService.ensureActiveSalesRep(salesRepId);
    const lines = dto.lines ? await this.resolveLines(salesRepId, dto.lines) : null;
    const totals = lines
      ? this.calculateTotals(lines)
      : {
          totalVarianceQuantity: current.totalVarianceQuantity,
          totalAmount: current.totalAmount,
        };

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (lines) {
          await tx.repCarStocktakeLine.deleteMany({ where: { repCarStocktakeId: id } });
        }
        return tx.repCarStocktake.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            stocktakeDate: dto.stocktakeDate ? new Date(dto.stocktakeDate) : undefined,
            salesRepId,
            reason: dto.reason?.trim(),
            description:
              dto.description === undefined ? undefined : dto.description.trim() || null,
            totalVarianceQuantity: totals.totalVarianceQuantity,
            totalAmount: totals.totalAmount,
            lines: lines
              ? {
                  create: lines.map((line, index) => ({
                    itemId: line.itemId,
                    lineNumber: index + 1,
                    systemQuantity: line.systemQuantity,
                    countedQuantity: line.countedQuantity,
                    varianceQuantity: line.varianceQuantity,
                    unitCost: line.unitCost,
                    unitOfMeasure: line.unitOfMeasure,
                    description: line.description,
                    lineTotalAmount: line.lineTotalAmount,
                  })),
                }
              : undefined,
          },
          include: this.stocktakeInclude(),
        });
      });

      return this.mapStocktake(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "A rep car stocktake with this reference already exists.",
        );
      }
      throw error;
    }
  }

  async post(id: string, user?: AuthorizedUser) {
    this.repCarStockService.ensureRepStocktake(user);
    const stocktake = await this.prisma.repCarStocktake.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNumber: "asc" } } },
    });
    if (!stocktake) {
      throw new BadRequestException(`Rep car stocktake ${id} was not found.`);
    }
    if (stocktake.status !== RepCarStocktakeStatus.DRAFT) {
      throw new BadRequestException("Only draft rep car stocktakes can be posted.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      let totalVarianceQuantity = new Prisma.Decimal(0);
      let totalAmount = new Prisma.Decimal(0);

      for (const line of stocktake.lines) {
        const balance = await tx.repCarStockBalance.findUnique({
          where: {
            salesRepId_itemId: {
              salesRepId: stocktake.salesRepId,
              itemId: line.itemId,
            },
          },
        });
        const systemQuantity = balance?.onHandQuantity ?? new Prisma.Decimal(0);
        const currentValuation = balance?.valuationAmount ?? new Prisma.Decimal(0);
        const countedQuantity = line.countedQuantity;
        const varianceQuantity = countedQuantity.sub(systemQuantity);
        const unitCost = this.repCarStockService.averageUnitCost(
          systemQuantity,
          currentValuation,
        );
        const lineTotalAmount = varianceQuantity.mul(unitCost).abs();

        totalVarianceQuantity = totalVarianceQuantity.add(varianceQuantity);
        totalAmount = totalAmount.add(lineTotalAmount);

        await tx.repCarStocktakeLine.update({
          where: { id: line.id },
          data: {
            systemQuantity,
            varianceQuantity,
            unitCost,
            lineTotalAmount,
          },
        });

        if (!varianceQuantity.isZero()) {
          const valueDelta = varianceQuantity.mul(unitCost);
          await this.repCarStockService.applyRepCarBalance(tx, {
            salesRepId: stocktake.salesRepId,
            itemId: line.itemId,
            quantityDelta: varianceQuantity,
            valueDelta,
          });

          const movementType = varianceQuantity.gt(0)
            ? RepCarStockMovementType.STOCKTAKE_IN
            : RepCarStockMovementType.STOCKTAKE_OUT;

          await this.repCarStockService.createRepCarMovement(tx, {
            movementType,
            transactionType: "RepCarStocktake",
            transactionId: stocktake.id,
            transactionLineId: line.id,
            transactionReference: stocktake.reference,
            transactionDate: stocktake.stocktakeDate,
            salesRepId: stocktake.salesRepId,
            itemId: line.itemId,
            quantityIn: varianceQuantity.gt(0) ? varianceQuantity : new Prisma.Decimal(0),
            quantityOut: varianceQuantity.lt(0) ? varianceQuantity.abs() : new Prisma.Decimal(0),
            unitCost,
            valueIn: varianceQuantity.gt(0) ? valueDelta : new Prisma.Decimal(0),
            valueOut: varianceQuantity.lt(0) ? valueDelta.abs() : new Prisma.Decimal(0),
            description: line.description ?? stocktake.reason,
          });
        }
      }

      return tx.repCarStocktake.update({
        where: { id: stocktake.id },
        data: {
          status: RepCarStocktakeStatus.POSTED,
          postedAt: new Date(),
          postedByUserId: user?.userId ?? null,
          totalVarianceQuantity,
          totalAmount,
        },
        include: this.stocktakeInclude(),
      });
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "RepCarStocktake",
      entityId: updated.id,
      action: AuditAction.POST,
      details: { reference: updated.reference, status: updated.status },
    });

    return this.mapStocktake(updated);
  }

  async cancel(id: string, user?: AuthorizedUser) {
    this.repCarStockService.ensureRepStocktake(user);
    const current = await this.getByIdRaw(id);
    if (current.status !== RepCarStocktakeStatus.DRAFT) {
      throw new BadRequestException("Only draft rep car stocktakes can be cancelled.");
    }

    const updated = await this.prisma.repCarStocktake.update({
      where: { id },
      data: { status: RepCarStocktakeStatus.CANCELLED },
      include: this.stocktakeInclude(),
    });

    return this.mapStocktake(updated);
  }
}
