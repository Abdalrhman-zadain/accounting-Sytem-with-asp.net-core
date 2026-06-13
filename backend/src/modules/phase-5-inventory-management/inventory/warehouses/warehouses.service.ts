import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { CreateInventoryWarehouseDto } from './dto/create-inventory-warehouse.dto';
import { UpdateInventoryWarehouseDto } from './dto/update-inventory-warehouse.dto';

type InventoryWarehouseListQuery = {
  isActive?: string;
  isTransit?: string;
  search?: string;
};

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: InventoryWarehouseListQuery = {}) {
    const search = query.search?.trim();
    const rows = await this.prisma.inventoryWarehouse.findMany({
      where: {
        isActive: query.isActive === undefined || query.isActive === '' ? undefined : query.isActive === 'true',
        isTransit: query.isTransit === undefined || query.isTransit === '' ? undefined : query.isTransit === 'true',
        OR: search
          ? [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
              { responsiblePerson: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    const stockedItemCountByWarehouseId = await this.getStockedItemCountMap(
      rows.map((row) => row.id),
    );

    return rows.map((row) =>
      this.mapWarehouse(row, stockedItemCountByWarehouseId.get(row.id) ?? 0),
    );
  }

  async getById(id: string) {
    const warehouse = await this.getWarehouseOrThrow(id);
    const stockedItemCountByWarehouseId = await this.getStockedItemCountMap([id]);
    return this.mapWarehouse(
      warehouse,
      stockedItemCountByWarehouseId.get(id) ?? 0,
    );
  }

  async create(dto: CreateInventoryWarehouseDto) {
    const created = await this.prisma
      .$transaction(async (tx) => {
        const isTransit = dto.isTransit ?? false;
        const isDefaultTransit = dto.isDefaultTransit ?? false;

        if (isDefaultTransit && !isTransit) {
          throw new BadRequestException('Default transit warehouse must be marked as transit.');
        }

        if (isDefaultTransit) {
          await tx.inventoryWarehouse.updateMany({
            where: { isDefaultTransit: true },
            data: { isDefaultTransit: false },
          });
        }

        return tx.inventoryWarehouse.create({
          data: {
            code: dto.code?.trim() || this.generateReference('WH'),
            name: dto.name.trim(),
            address: dto.address?.trim() || null,
            responsiblePerson: dto.responsiblePerson?.trim() || null,
            isTransit,
            isDefaultTransit,
          },
        });
      })
      .catch((error: unknown) => {
        if (this.isCodeConflict(error)) {
          throw new ConflictException('An inventory warehouse with this code already exists.');
        }
        throw error;
      });

    return this.mapWarehouse(created, 0);
  }

  async update(id: string, dto: UpdateInventoryWarehouseDto) {
    const current = await this.getWarehouseOrThrow(id);
    if (!current.isActive) {
      throw new BadRequestException('Deactivated warehouses cannot be edited.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextIsTransit = dto.isTransit ?? current.isTransit;
      const nextIsDefaultTransit = dto.isDefaultTransit ?? current.isDefaultTransit;

      if (nextIsDefaultTransit && !nextIsTransit) {
        throw new BadRequestException('Default transit warehouse must be marked as transit.');
      }

      if (nextIsDefaultTransit) {
        await tx.inventoryWarehouse.updateMany({
          where: { id: { not: id }, isDefaultTransit: true },
          data: { isDefaultTransit: false },
        });
      }

      return tx.inventoryWarehouse.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          address: dto.address === undefined ? undefined : dto.address.trim() || null,
          responsiblePerson:
            dto.responsiblePerson === undefined ? undefined : dto.responsiblePerson.trim() || null,
          isTransit: dto.isTransit,
          isActive: dto.isActive,
          isDefaultTransit: dto.isDefaultTransit,
        },
      });
    });

    if (updated.isActive && current.code !== updated.code) {
      await this.syncPreferredWarehouseCode(updated.id, updated.code);
    }

    const stockedItemCountByWarehouseId = await this.getStockedItemCountMap([id]);
    return this.mapWarehouse(
      updated,
      stockedItemCountByWarehouseId.get(id) ?? 0,
    );
  }

  async deactivate(id: string) {
    await this.getWarehouseOrThrow(id);

    const updated = await this.prisma.inventoryWarehouse.update({
      where: { id },
      data: { isActive: false },
    });

    const stockedItemCountByWarehouseId = await this.getStockedItemCountMap([id]);
    return this.mapWarehouse(
      updated,
      stockedItemCountByWarehouseId.get(id) ?? 0,
    );
  }

  async getActiveWarehouseReference(id?: string) {
    if (!id) {
      return null;
    }

    const warehouse = await this.prisma.inventoryWarehouse.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
        isTransit: true,
        isDefaultTransit: true,
      },
    });

    if (!warehouse) {
      throw new BadRequestException('Preferred warehouse was not found.');
    }
    if (!warehouse.isActive) {
      throw new BadRequestException('Deactivated warehouses cannot be selected for new inventory records.');
    }

    return warehouse;
  }

  private async getWarehouseOrThrow(id: string) {
    const warehouse = await this.prisma.inventoryWarehouse.findUnique({
      where: { id },
    });

    if (!warehouse) {
      throw new BadRequestException(`Inventory warehouse ${id} was not found.`);
    }

    return warehouse;
  }

  private mapWarehouse(row: Prisma.InventoryWarehouseGetPayload<object>, itemCount: number) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      address: row.address,
      responsiblePerson: row.responsiblePerson,
      isTransit: row.isTransit,
      isDefaultTransit: row.isDefaultTransit,
      isActive: row.isActive,
      status: row.isActive ? 'ACTIVE' : 'INACTIVE',
      itemCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async getStockedItemCountMap(warehouseIds: string[]) {
    if (warehouseIds.length === 0) {
      return new Map<string, number>();
    }

    const rows = await this.prisma.inventoryWarehouseBalance.groupBy({
      by: ['warehouseId'],
      where: {
        warehouseId: { in: warehouseIds },
        onHandQuantity: { gt: 0 },
      },
      _count: {
        itemId: true,
      },
    });

    return new Map(rows.map((row) => [row.warehouseId, row._count.itemId]));
  }

  private generateReference(prefix: string) {
    const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    return `${prefix}-${compactDate}-${suffix}`;
  }

  private isCodeConflict(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    return error.code === 'P2002' && Array.isArray(error.meta?.target) && error.meta.target.includes('code');
  }

  private async syncPreferredWarehouseCode(warehouseId: string, warehouseCode: string) {
    await this.prisma.inventoryItem.updateMany({
      where: { preferredWarehouseId: warehouseId },
      data: { preferredWarehouseCode: warehouseCode },
    });
  }
}
