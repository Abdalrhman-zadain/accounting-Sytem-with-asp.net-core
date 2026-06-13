import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import {
  AuditAction,
  Prisma,
  RepCarStockMovementType,
  RepCarTransferStatus,
} from "../../../../generated/prisma";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AuditService } from "../../../phase-1-accounting-foundation/accounting-core/audit/audit.service";
import { ItemMasterService } from "../../../phase-5-inventory-management/inventory/item-master/item-master.service";
import { InventoryPostingService } from "../../../phase-5-inventory-management/inventory/shared/inventory-posting.service";
import {
  CreateRepCarTransferDto,
  UpdateRepCarTransferDto,
} from "./dto/rep-car-stock.dto";
import { RepCarStockService } from "./rep-car-stock.service";
import {
  evaluateRepTransferReverseEligibility,
  type RepTransferReversePreview,
} from "./rep-car-transfer-reverse.utils";
import type { AuthorizedUser } from "../../../platform/auth/auth.types";

type ResolvedTransferLine = {
  itemId: string;
  quantity: Prisma.Decimal;
  unitOfMeasure: string;
  description: string | null;
  unitCost: Prisma.Decimal;
  lineTotalAmount: Prisma.Decimal;
};

@Injectable()
export class RepCarTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly itemMasterService: ItemMasterService,
    private readonly inventoryPostingService: InventoryPostingService,
    private readonly repCarStockService: RepCarStockService,
  ) {}

  private transferInclude() {
    return {
      fromSalesRep: {
        select: { id: true, code: true, name: true, status: true },
      },
      toSalesRep: {
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
    return `RCT-${Date.now().toString(36).toUpperCase()}`;
  }

  private mapTransfer(
    row: Awaited<ReturnType<typeof this.getByIdRaw>>,
    reversePreview?: RepTransferReversePreview,
  ) {
    const linePreviewByItem = new Map(
      (reversePreview?.lines ?? []).map((line) => [line.itemId, line]),
    );

    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      transferDate: row.transferDate.toISOString(),
      fromSalesRepId: row.fromSalesRepId,
      fromSalesRep: row.fromSalesRep,
      toSalesRepId: row.toSalesRepId,
      toSalesRep: row.toSalesRep,
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
          destOnHand: preview?.repOnHand ?? null,
          reverseShortfall: preview?.shortfall ?? null,
        };
      }),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async buildReversePreview(row: {
    status: RepCarTransferStatus;
    postedAt: Date | null;
    toSalesRepId: string;
    lines: Array<{
      itemId: string;
      quantity: Prisma.Decimal;
      item: { code: string };
    }>;
  }): Promise<RepTransferReversePreview | undefined> {
    if (row.status !== RepCarTransferStatus.POSTED || !row.postedAt) {
      return undefined;
    }

    const itemIds = [...new Set(row.lines.map((line) => line.itemId))];
    const [balances, salesAfterPost] = await Promise.all([
      this.prisma.repCarStockBalance.findMany({
        where: {
          salesRepId: row.toSalesRepId,
          itemId: { in: itemIds },
        },
        select: { itemId: true, onHandQuantity: true },
      }),
      this.prisma.repCarStockMovement.findFirst({
        where: {
          salesRepId: row.toSalesRepId,
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

    return evaluateRepTransferReverseEligibility({
      status: row.status,
      postedAt: row.postedAt,
      lines: row.lines,
      repBalances,
      hasSalesAfterPost: Boolean(salesAfterPost),
    });
  }

  private async getByIdRaw(id: string) {
    const row = await this.prisma.repCarTransfer.findUnique({
      where: { id },
      include: this.transferInclude(),
    });
    if (!row) {
      throw new BadRequestException(`Rep car transfer ${id} was not found.`);
    }
    return row;
  }

  private ensureDistinctReps(fromSalesRepId: string, toSalesRepId: string) {
    if (fromSalesRepId === toSalesRepId) {
      throw new BadRequestException("Source and destination sales reps must be different.");
    }
  }

  async list(
    query: {
      status?: string;
      fromSalesRepId?: string;
      toSalesRepId?: string;
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
    const search = query.search?.trim();
    const searchOr = search
      ? [
          { reference: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
          { fromSalesRep: { name: { contains: search, mode: "insensitive" as const } } },
          { fromSalesRep: { code: { contains: search, mode: "insensitive" as const } } },
          { toSalesRep: { name: { contains: search, mode: "insensitive" as const } } },
          { toSalesRep: { code: { contains: search, mode: "insensitive" as const } } },
        ]
      : null;

    const where: Prisma.RepCarTransferWhereInput = {
      ...(query.status ? { status: query.status as RepCarTransferStatus } : {}),
      ...(query.fromSalesRepId ? { fromSalesRepId: query.fromSalesRepId } : {}),
      ...(query.toSalesRepId ? { toSalesRepId: query.toSalesRepId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            transferDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const repScope = this.repCarStockService.resolveSalesRepScope(user, query.salesRepId);
    const repScopeOr = repScope
      ? [{ fromSalesRepId: repScope }, { toSalesRepId: repScope }]
      : query.salesRepId
        ? [{ fromSalesRepId: query.salesRepId }, { toSalesRepId: query.salesRepId }]
        : null;

    const andFilters: Prisma.RepCarTransferWhereInput[] = [];
    if (repScopeOr) {
      andFilters.push({ OR: repScopeOr });
    }
    if (searchOr) {
      andFilters.push({ OR: searchOr });
    }
    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const [total, rows] = await Promise.all([
      this.prisma.repCarTransfer.count({ where }),
      this.prisma.repCarTransfer.findMany({
        where,
        include: this.transferInclude(),
        orderBy: [{ transferDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    return {
      data: await Promise.all(
        rows.map(async (row) => {
          const reversePreview = await this.buildReversePreview(row);
          return this.mapTransfer(row, reversePreview);
        }),
      ),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string, user?: AuthorizedUser) {
    const row = await this.getByIdRaw(id);
    const repScope = this.repCarStockService.resolveSalesRepScope(user);
    if (
      repScope &&
      row.fromSalesRepId !== repScope &&
      row.toSalesRepId !== repScope
    ) {
      throw new BadRequestException("Rep car transfer was not found.");
    }
    const reversePreview = await this.buildReversePreview(row);
    return this.mapTransfer(row, reversePreview);
  }

  private async resolveLines(
    lines: CreateRepCarTransferDto["lines"],
  ): Promise<ResolvedTransferLine[]> {
    const resolved: ResolvedTransferLine[] = [];
    for (const line of lines) {
      const item = await this.itemMasterService.ensureActiveItem(line.itemId);
      if (!item.trackInventory) {
        throw new BadRequestException(
          `Item ${item.code} does not track inventory and cannot be transferred between rep cars.`,
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

  private calculateTotals(lines: ResolvedTransferLine[]) {
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

  async create(dto: CreateRepCarTransferDto, user?: AuthorizedUser) {
    this.repCarStockService.ensureManageRepTransfers(user);
    this.ensureDistinctReps(dto.fromSalesRepId, dto.toSalesRepId);
    await this.repCarStockService.ensureActiveSalesRep(dto.fromSalesRepId);
    await this.repCarStockService.ensureActiveSalesRep(dto.toSalesRepId);

    const reference = dto.reference?.trim() || this.generateReference();
    const lines = await this.resolveLines(dto.lines);
    const totals = this.calculateTotals(lines);

    try {
      const created = await this.prisma.repCarTransfer.create({
        data: {
          reference,
          transferDate: new Date(dto.transferDate),
          fromSalesRepId: dto.fromSalesRepId,
          toSalesRepId: dto.toSalesRepId,
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
        include: this.transferInclude(),
      });

      await this.auditService.log({
        userId: user?.userId,
        entity: "RepCarTransfer",
        entityId: created.id,
        action: AuditAction.CREATE,
        details: { reference: created.reference, status: created.status },
      });

      return this.mapTransfer(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("A rep car transfer with this reference already exists.");
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateRepCarTransferDto, user?: AuthorizedUser) {
    this.repCarStockService.ensureManageRepTransfers(user);
    const current = await this.getByIdRaw(id);
    if (current.status !== RepCarTransferStatus.DRAFT) {
      throw new BadRequestException("Only draft rep car transfers can be edited.");
    }

    const fromSalesRepId = dto.fromSalesRepId ?? current.fromSalesRepId;
    const toSalesRepId = dto.toSalesRepId ?? current.toSalesRepId;
    this.ensureDistinctReps(fromSalesRepId, toSalesRepId);
    await this.repCarStockService.ensureActiveSalesRep(fromSalesRepId);
    await this.repCarStockService.ensureActiveSalesRep(toSalesRepId);

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
          await tx.repCarTransferLine.deleteMany({ where: { repCarTransferId: id } });
        }
        return tx.repCarTransfer.update({
          where: { id },
          data: {
            reference: dto.reference?.trim(),
            transferDate: dto.transferDate ? new Date(dto.transferDate) : undefined,
            fromSalesRepId,
            toSalesRepId,
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
          include: this.transferInclude(),
        });
      });

      await this.auditService.log({
        userId: user?.userId,
        entity: "RepCarTransfer",
        entityId: updated.id,
        action: AuditAction.UPDATE,
        details: { reference: updated.reference, status: updated.status },
      });

      return this.mapTransfer(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("A rep car transfer with this reference already exists.");
      }
      throw error;
    }
  }

  async post(id: string, user?: AuthorizedUser) {
    this.repCarStockService.ensureManageRepTransfers(user);
    const transfer = await this.prisma.repCarTransfer.findUnique({
      where: { id },
      include: { lines: { orderBy: { lineNumber: "asc" }, include: { item: { select: { id: true, code: true, isActive: true, trackInventory: true } } } } },
    });
    if (!transfer) {
      throw new BadRequestException(`Rep car transfer ${id} was not found.`);
    }
    if (transfer.status !== RepCarTransferStatus.DRAFT) {
      throw new BadRequestException("Only draft rep car transfers can be posted.");
    }

    this.ensureDistinctReps(transfer.fromSalesRepId, transfer.toSalesRepId);
    await this.repCarStockService.ensureActiveSalesRep(transfer.fromSalesRepId);
    await this.repCarStockService.ensureActiveSalesRep(transfer.toSalesRepId);

    const preventNegativeStock = this.inventoryPostingService.preventNegativeStock();

    const updated = await this.prisma.$transaction(async (tx) => {
      let totalQuantity = new Prisma.Decimal(0);
      let totalAmount = new Prisma.Decimal(0);

      for (const line of transfer.lines) {
        if (!line.item?.isActive || !line.item.trackInventory) {
          throw new BadRequestException(
            "Rep car transfer lines must reference active inventory-tracked items.",
          );
        }

        const sourceBalance = await tx.repCarStockBalance.findUnique({
          where: {
            salesRepId_itemId: {
              salesRepId: transfer.fromSalesRepId,
              itemId: line.itemId,
            },
          },
        });
        const sourceQty = sourceBalance?.onHandQuantity ?? new Prisma.Decimal(0);
        const sourceValuation = sourceBalance?.valuationAmount ?? new Prisma.Decimal(0);

        if (preventNegativeStock && sourceQty.lt(line.quantity)) {
          throw new BadRequestException(
            `Item ${line.item.code} does not have enough stock on the source rep car (${sourceQty.toString()} available).`,
          );
        }

        const unitCost = this.repCarStockService.averageUnitCost(sourceQty, sourceValuation);
        const lineTotalAmount = unitCost.mul(line.quantity);

        totalQuantity = totalQuantity.add(line.quantity);
        totalAmount = totalAmount.add(lineTotalAmount);

        await tx.repCarTransferLine.update({
          where: { id: line.id },
          data: {
            unitCost,
            lineTotalAmount,
          },
        });

        await this.repCarStockService.applyRepCarBalance(tx, {
          salesRepId: transfer.fromSalesRepId,
          itemId: line.itemId,
          quantityDelta: line.quantity.neg(),
          valueDelta: lineTotalAmount.neg(),
        });

        await this.repCarStockService.createRepCarMovement(tx, {
          movementType: RepCarStockMovementType.TRANSFER_OUT,
          transactionType: "RepCarTransfer",
          transactionId: transfer.id,
          transactionLineId: line.id,
          transactionReference: transfer.reference,
          transactionDate: transfer.transferDate,
          salesRepId: transfer.fromSalesRepId,
          itemId: line.itemId,
          quantityOut: line.quantity,
          unitCost,
          valueOut: lineTotalAmount,
          description: line.description ?? transfer.description,
        });

        await this.repCarStockService.applyRepCarBalance(tx, {
          salesRepId: transfer.toSalesRepId,
          itemId: line.itemId,
          quantityDelta: line.quantity,
          valueDelta: lineTotalAmount,
        });

        await this.repCarStockService.createRepCarMovement(tx, {
          movementType: RepCarStockMovementType.TRANSFER_IN,
          transactionType: "RepCarTransfer",
          transactionId: transfer.id,
          transactionLineId: line.id,
          transactionReference: transfer.reference,
          transactionDate: transfer.transferDate,
          salesRepId: transfer.toSalesRepId,
          itemId: line.itemId,
          quantityIn: line.quantity,
          unitCost,
          valueIn: lineTotalAmount,
          description: line.description ?? transfer.description,
        });
      }

      return tx.repCarTransfer.update({
        where: { id: transfer.id },
        data: {
          status: RepCarTransferStatus.POSTED,
          postedAt: new Date(),
          postedByUserId: user?.userId ?? null,
          totalQuantity,
          totalAmount,
        },
        include: this.transferInclude(),
      });
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "RepCarTransfer",
      entityId: updated.id,
      action: AuditAction.POST,
      details: { reference: updated.reference, status: updated.status },
    });

    return this.mapTransfer(updated);
  }

  async cancel(id: string, user?: AuthorizedUser) {
    this.repCarStockService.ensureManageRepTransfers(user);
    const current = await this.getByIdRaw(id);
    if (current.status !== RepCarTransferStatus.DRAFT) {
      throw new BadRequestException("Only draft rep car transfers can be cancelled.");
    }

    const updated = await this.prisma.repCarTransfer.update({
      where: { id },
      data: { status: RepCarTransferStatus.CANCELLED },
      include: this.transferInclude(),
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "RepCarTransfer",
      entityId: updated.id,
      action: AuditAction.UPDATE,
      details: { reference: updated.reference, status: updated.status },
    });

    return this.mapTransfer(updated);
  }

  async reverse(id: string, user?: AuthorizedUser) {
    this.repCarStockService.ensureManageRepTransfers(user);
    const transfer = await this.prisma.repCarTransfer.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: { lineNumber: "asc" },
          include: { item: { select: { id: true, code: true } } },
        },
      },
    });
    if (!transfer) {
      throw new BadRequestException(`Rep car transfer ${id} was not found.`);
    }
    if (transfer.status !== RepCarTransferStatus.POSTED) {
      throw new BadRequestException("Only posted rep car transfers can be reversed.");
    }

    const reversePreview = await this.buildReversePreview(transfer);
    if (!reversePreview?.canReverse) {
      const reason = reversePreview?.reasons[0] ?? "This rep car transfer cannot be reversed.";
      throw new BadRequestException(reason);
    }

    await this.repCarStockService.ensureActiveSalesRep(transfer.fromSalesRepId);
    await this.repCarStockService.ensureActiveSalesRep(transfer.toSalesRepId);

    const preventNegativeStock = this.inventoryPostingService.preventNegativeStock();
    const reversalDate = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const line of transfer.lines) {
        const destBalance = await tx.repCarStockBalance.findUnique({
          where: {
            salesRepId_itemId: {
              salesRepId: transfer.toSalesRepId,
              itemId: line.itemId,
            },
          },
        });
        const destOnHand = destBalance?.onHandQuantity ?? new Prisma.Decimal(0);
        if (preventNegativeStock && destOnHand.lt(line.quantity)) {
          throw new BadRequestException(
            `Item ${line.item.code} does not have enough stock on the destination rep car to reverse this transfer.`,
          );
        }

        const unitCost = line.unitCost;
        const totalAmount = line.lineTotalAmount;

        await this.repCarStockService.applyRepCarBalance(tx, {
          salesRepId: transfer.toSalesRepId,
          itemId: line.itemId,
          quantityDelta: line.quantity.neg(),
          valueDelta: totalAmount.neg(),
        });

        await this.repCarStockService.createRepCarMovement(tx, {
          movementType: RepCarStockMovementType.TRANSFER_OUT,
          transactionType: "RepCarTransferReversal",
          transactionId: transfer.id,
          transactionLineId: line.id,
          transactionReference: transfer.reference,
          transactionDate: reversalDate,
          salesRepId: transfer.toSalesRepId,
          itemId: line.itemId,
          quantityOut: line.quantity,
          unitCost,
          valueOut: totalAmount,
          description: line.description ?? transfer.description,
        });

        await this.repCarStockService.applyRepCarBalance(tx, {
          salesRepId: transfer.fromSalesRepId,
          itemId: line.itemId,
          quantityDelta: line.quantity,
          valueDelta: totalAmount,
        });

        await this.repCarStockService.createRepCarMovement(tx, {
          movementType: RepCarStockMovementType.TRANSFER_IN,
          transactionType: "RepCarTransferReversal",
          transactionId: transfer.id,
          transactionLineId: line.id,
          transactionReference: transfer.reference,
          transactionDate: reversalDate,
          salesRepId: transfer.fromSalesRepId,
          itemId: line.itemId,
          quantityIn: line.quantity,
          unitCost,
          valueIn: totalAmount,
          description: line.description ?? transfer.description,
        });
      }

      return tx.repCarTransfer.update({
        where: { id: transfer.id },
        data: {
          status: RepCarTransferStatus.REVERSED,
          reversedAt: reversalDate,
          reversedByUserId: user?.userId ?? null,
        },
        include: this.transferInclude(),
      });
    });

    await this.auditService.log({
      userId: user?.userId,
      entity: "RepCarTransfer",
      entityId: updated.id,
      action: AuditAction.REVERSE,
      details: { reference: updated.reference, status: updated.status },
    });

    return this.mapTransfer(updated);
  }
}
