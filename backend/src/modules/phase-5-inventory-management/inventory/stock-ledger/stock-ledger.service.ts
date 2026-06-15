import { BadRequestException, Injectable } from "@nestjs/common";
import {
  InventoryStockMovementType,
  Prisma,
} from "../../../../generated/prisma";

import { PrismaService } from "../../../../common/prisma/prisma.service";

type StockLedgerListQuery = {
  itemId?: string;
  warehouseId?: string;
  movementType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: string;
  limit?: string;
};

type StockMovementWithRelations = Prisma.InventoryStockMovementGetPayload<{
  include: {
    item: {
      select: {
        id: true;
        code: true;
        name: true;
        unitOfMeasure: true;
      };
    };
    warehouse: {
      select: {
        id: true;
        code: true;
        name: true;
      };
    };
  };
}>;

type StockMovementDisplayType =
  | "PURCHASE_INVOICE_REVERSAL"
  | "SALES_INVOICE_REVERSAL";

type StockMovementRowView = {
  id: string;
  movementType: InventoryStockMovementType;
  transactionType: string;
  transactionId: string;
  transactionLineId: string | null;
  transactionReference: string;
  transactionDate: string;
  quantityIn: string;
  quantityOut: string;
  unitCost: string;
  valueIn: string;
  valueOut: string;
  runningQuantity: string;
  runningValuation: string;
  description: string | null;
  item: {
    id: string;
    code: string;
    name: string;
    unitOfMeasure: string | null;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  createdAt: string;
  displayType?: StockMovementDisplayType;
  sortCreatedAt: string;
};

@Injectable()
export class StockLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: StockLedgerListQuery = {}) {
    const page = this.parsePaginationNumber(query.page, {
      fallback: 1,
      min: 1,
      max: 10_000,
      label: "Page",
    });
    const limit = this.parsePaginationNumber(query.limit, {
      fallback: 20,
      min: 1,
      max: 100,
      label: "Limit",
    });
    const skip = (page - 1) * limit;
    const where: Prisma.InventoryStockMovementWhereInput = {
      itemId: query.itemId,
      warehouseId: query.warehouseId,
    };
    const movementType = this.parseMovementType(query.movementType);
    const search = query.search?.trim().toLocaleLowerCase();

    const rows = await this.prisma.inventoryStockMovement.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            unitOfMeasure: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
    });

    const invoiceContext = await this.loadInvoiceContext(rows);
    const expandedRows = this.expandRows(rows, invoiceContext);
    const withRunningBalances = this.recomputeRunningBalances(expandedRows);
    const filteredRows = withRunningBalances.filter((row) => {
      if (movementType && row.movementType !== movementType) {
        return false;
      }
      if (!this.matchesDateRange(row.transactionDate, query.dateFrom, query.dateTo)) {
        return false;
      }
      if (!search) {
        return true;
      }

      return [
        row.transactionReference,
        row.transactionType,
        row.item.code,
        row.item.name,
        row.warehouse.code,
        row.warehouse.name,
      ].some((value) => value.toLocaleLowerCase().includes(search));
    });

    const total = filteredRows.length;
    const pagedRows = filteredRows.slice(skip, skip + limit);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data: pagedRows.map(({ sortCreatedAt: _sortCreatedAt, ...row }) => row),
      page,
      limit,
      total,
      totalPages,
    };
  }

  private mapMovement(row: StockMovementWithRelations) {
    return {
      id: row.id,
      movementType: row.movementType,
      transactionType: row.transactionType,
      transactionId: row.transactionId,
      transactionLineId: row.transactionLineId,
      transactionReference: row.transactionReference,
      transactionDate: row.transactionDate.toISOString(),
      quantityIn: row.quantityIn.toString(),
      quantityOut: row.quantityOut.toString(),
      unitCost: row.unitCost.toString(),
      valueIn: row.valueIn.toString(),
      valueOut: row.valueOut.toString(),
      runningQuantity: row.runningQuantity.toString(),
      runningValuation: row.runningValuation.toString(),
      description: row.description,
      item: {
        id: row.item.id,
        code: row.item.code,
        name: row.item.name,
        unitOfMeasure: row.item.unitOfMeasure,
      },
      warehouse: {
        id: row.warehouse.id,
        code: row.warehouse.code,
        name: row.warehouse.name,
      },
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async loadInvoiceContext(rows: StockMovementWithRelations[]) {
    const purchaseInvoiceIds = Array.from(
      new Set(
        rows
          .filter((row) => row.transactionType === "PurchaseInvoice")
          .map((row) => row.transactionId),
      ),
    );
    const salesInvoiceIds = Array.from(
      new Set(
        rows
          .filter((row) => row.transactionType === "SalesInvoice")
          .map((row) => row.transactionId),
      ),
    );

    const [purchaseInvoices, salesInvoices] = await Promise.all([
      purchaseInvoiceIds.length
        ? this.prisma.purchaseInvoice.findMany({
            where: { id: { in: purchaseInvoiceIds } },
            select: { id: true, status: true, updatedAt: true },
          })
        : Promise.resolve([]),
      salesInvoiceIds.length
        ? this.prisma.salesInvoice.findMany({
            where: { id: { in: salesInvoiceIds } },
            select: { id: true, status: true, updatedAt: true },
          })
        : Promise.resolve([]),
    ]);

    return {
      purchaseInvoices: new Map(
        purchaseInvoices.map((invoice) => [invoice.id, invoice]),
      ),
      salesInvoices: new Map(salesInvoices.map((invoice) => [invoice.id, invoice])),
    };
  }

  private expandRows(
    rows: StockMovementWithRelations[],
    invoiceContext: {
      purchaseInvoices: Map<
        string,
        { id: string; status: string; updatedAt: Date }
      >;
      salesInvoices: Map<string, { id: string; status: string; updatedAt: Date }>;
    },
  ) {
    const purchaseReturnKeys = new Set(
      rows
        .filter(
          (row) =>
            row.transactionType === "PurchaseInvoice" &&
            row.movementType === InventoryStockMovementType.PURCHASE_RETURN,
        )
        .map((row) => this.buildMovementKey(row)),
    );

    const expanded: StockMovementRowView[] = [];
    for (const row of rows) {
      const baseRow: StockMovementRowView = {
        ...this.mapMovement(row),
        sortCreatedAt: row.createdAt.toISOString(),
      };

      if (
        row.transactionType === "SalesInvoice" &&
        row.movementType === InventoryStockMovementType.SALES_RETURN
      ) {
        baseRow.displayType = "SALES_INVOICE_REVERSAL";
      }

      expanded.push(baseRow);

      const purchaseInvoice = invoiceContext.purchaseInvoices.get(row.transactionId);
      const needsPurchaseReversalRow =
        row.transactionType === "PurchaseInvoice" &&
        row.movementType === InventoryStockMovementType.PURCHASE_RECEIPT &&
        purchaseInvoice?.status === "REVERSED" &&
        !purchaseReturnKeys.has(this.buildMovementKey(row));

      if (!needsPurchaseReversalRow) {
        continue;
      }

      const originalCreatedAt = row.createdAt.getTime();
      const reversalCreatedAt = Math.max(
        originalCreatedAt + 1,
        purchaseInvoice.updatedAt.getTime(),
      );

      expanded.push({
        ...baseRow,
        id: `${row.id}:purchase-reversal`,
        movementType: InventoryStockMovementType.PURCHASE_RETURN,
        quantityIn: "0",
        quantityOut: row.quantityIn.toString(),
        valueIn: "0",
        valueOut: row.valueIn.toString(),
        runningQuantity: "0",
        runningValuation: "0",
        displayType: "PURCHASE_INVOICE_REVERSAL",
        description: `Reversal of ${row.transactionReference}`,
        sortCreatedAt: new Date(reversalCreatedAt).toISOString(),
      });
    }

    return expanded.sort((left, right) => {
      const dateCompare =
        new Date(left.transactionDate).getTime() -
        new Date(right.transactionDate).getTime();
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return (
        new Date(left.sortCreatedAt).getTime() -
        new Date(right.sortCreatedAt).getTime()
      );
    });
  }

  private recomputeRunningBalances(rows: StockMovementRowView[]) {
    const runningByBucket = new Map<
      string,
      { quantity: Prisma.Decimal; valuation: Prisma.Decimal }
    >();

    return rows.map((row) => {
      const bucketKey = `${row.item.id}:${row.warehouse.id}`;
      const previous =
        runningByBucket.get(bucketKey) ?? {
          quantity: new Prisma.Decimal(0),
          valuation: new Prisma.Decimal(0),
        };

      const nextQuantity = previous.quantity
        .add(new Prisma.Decimal(row.quantityIn))
        .sub(new Prisma.Decimal(row.quantityOut));
      const nextValuation = previous.valuation
        .add(new Prisma.Decimal(row.valueIn))
        .sub(new Prisma.Decimal(row.valueOut));

      runningByBucket.set(bucketKey, {
        quantity: nextQuantity,
        valuation: nextValuation,
      });

      return {
        ...row,
        runningQuantity: nextQuantity.toString(),
        runningValuation: nextValuation.toString(),
      };
    });
  }

  private buildMovementKey(row: {
    transactionId: string;
    transactionLineId: string | null;
    itemId: string;
    warehouseId: string;
  }) {
    return [
      row.transactionId,
      row.transactionLineId ?? "",
      row.itemId,
      row.warehouseId,
    ].join(":");
  }

  private parseMovementType(value?: string) {
    if (!value) {
      return undefined;
    }
    if (value in InventoryStockMovementType) {
      return value as InventoryStockMovementType;
    }
    throw new BadRequestException("Invalid stock movement type.");
  }

  private matchesDateRange(
    value: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) {
      return false;
    }

    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      if (!Number.isNaN(fromTime) && timestamp < fromTime) {
        return false;
      }
    }

    if (dateTo) {
      const toTime = new Date(dateTo).getTime();
      if (!Number.isNaN(toTime) && timestamp > toTime) {
        return false;
      }
    }

    return true;
  }

  private parsePaginationNumber(
    value: string | undefined,
    options: { fallback: number; min: number; max: number; label: string },
  ) {
    if (!value?.trim()) {
      return options.fallback;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
      throw new BadRequestException(
        `${options.label} must be a valid integer.`,
      );
    }
    if (parsed < options.min || parsed > options.max) {
      throw new BadRequestException(
        `${options.label} must be between ${options.min} and ${options.max}.`,
      );
    }

    return parsed;
  }
}
