import { Injectable } from '@nestjs/common';
import { InventoryItemType } from '../../../../generated/prisma';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { ImportInventoryItemRowDto, ImportInventoryItemsDto } from './dto/import-inventory-items.dto';
import { ItemMasterService } from './item-master.service';

type ImportRowStatus = 'valid' | 'error' | 'skip';

type ResolvedImportRow = {
  rowNumber: number;
  input: ImportInventoryItemRowDto;
  status: ImportRowStatus;
  errors: string[];
  resolved?: {
    code: string | null;
    itemGroupId: string;
    itemCategoryId: string;
    unitOfMeasureId: string;
  };
};

type MasterLookups = {
  groupsByCode: Map<string, {
    id: string;
    code: string;
    isActive: boolean;
    inventoryAccountId: string | null;
    cogsAccountId: string | null;
    salesAccountId: string | null;
    adjustmentAccountId: string | null;
  }>;
  categoriesByCode: Map<string, {
    id: string;
    code: string;
    itemGroupId: string;
    isActive: boolean;
  }>;
  unitsByCode: Map<string, {
    id: string;
    code: string;
    isActive: boolean;
  }>;
  existingCodes: Set<string>;
  existingBarcodes: Set<string>;
};

@Injectable()
export class ItemImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemMasterService: ItemMasterService,
  ) {}

  async preview(dto: ImportInventoryItemsDto) {
    const lookups = await this.loadMasterLookups();
    const rows = this.validateRows(dto.rows, lookups, dto.duplicatePolicy ?? 'skip');
    return {
      rows,
      summary: this.buildSummary(rows),
    };
  }

  async import(dto: ImportInventoryItemsDto) {
    const lookups = await this.loadMasterLookups();
    const rows = this.validateRows(dto.rows, lookups, dto.duplicatePolicy ?? 'skip');

    const created: Array<{ rowNumber: number; id: string; code: string; name: string }> = [];
    const skipped: Array<{ rowNumber: number; code: string | null; reason: string }> = [];
    const failed: Array<{ rowNumber: number; errors: string[] }> = [];

    for (const row of rows) {
      if (row.status === 'skip') {
        skipped.push({
          rowNumber: row.rowNumber,
          code: row.input.code?.trim() || null,
          reason: row.errors[0] ?? 'Skipped duplicate code.',
        });
        continue;
      }

      if (row.status === 'error') {
        failed.push({ rowNumber: row.rowNumber, errors: row.errors });
        continue;
      }

      try {
        const payload = this.buildCreatePayload(row.input, lookups);
        const item = await this.itemMasterService.create(payload);
        created.push({
          rowNumber: row.rowNumber,
          id: item.id,
          code: item.code,
          name: item.name,
        });
        if (item.code) {
          lookups.existingCodes.add(this.normalizeCode(item.code));
        }
        if (item.barcode) {
          lookups.existingBarcodes.add(this.normalizeCode(item.barcode));
        }
      } catch (error) {
        failed.push({
          rowNumber: row.rowNumber,
          errors: [error instanceof Error ? error.message : 'Import failed.'],
        });
      }
    }

    return {
      created,
      skipped,
      failed,
      summary: {
        createdCount: created.length,
        skippedCount: skipped.length,
        failedCount: failed.length,
        totalRows: rows.length,
      },
    };
  }

  private validateRows(
    rows: ImportInventoryItemRowDto[],
    lookups: MasterLookups,
    duplicatePolicy: 'skip',
  ): ResolvedImportRow[] {
    const seenCodes = new Set<string>();
    const seenBarcodes = new Set<string>();

    return rows.map((input, index) => {
      const rowNumber = index + 1;
      const errors: string[] = [];
      const name = input.name?.trim();
      const groupCode = this.normalizeCode(input.groupCode);
      const categoryCode = this.normalizeCode(input.categoryCode);
      const unitCode = this.normalizeCode(input.unitCode);
      const explicitCode = input.code?.trim() || null;
      const normalizedExplicitCode = explicitCode ? this.normalizeCode(explicitCode) : null;
      const barcode = input.barcode?.trim() || null;
      const normalizedBarcode = barcode ? this.normalizeCode(barcode) : null;

      if (!name) {
        errors.push('Name is required.');
      } else if (name.length > 120) {
        errors.push('Name must be 120 characters or fewer.');
      }

      if (!groupCode) {
        errors.push('Group code is required.');
      }
      if (!categoryCode) {
        errors.push('Category code is required.');
      }
      if (!unitCode) {
        errors.push('Unit code is required.');
      }

      const group = groupCode ? lookups.groupsByCode.get(groupCode) : undefined;
      if (groupCode && !group) {
        errors.push(`Item group "${input.groupCode}" was not found.`);
      } else if (group && !group.isActive) {
        errors.push(`Item group "${input.groupCode}" is inactive.`);
      }

      const category = categoryCode ? lookups.categoriesByCode.get(categoryCode) : undefined;
      if (categoryCode && !category) {
        errors.push(`Item category "${input.categoryCode}" was not found.`);
      } else if (category && !category.isActive) {
        errors.push(`Item category "${input.categoryCode}" is inactive.`);
      } else if (category && group && category.itemGroupId !== group.id) {
        errors.push(`Item category "${input.categoryCode}" does not belong to group "${input.groupCode}".`);
      }

      const unit = unitCode ? lookups.unitsByCode.get(unitCode) : undefined;
      if (unitCode && !unit) {
        errors.push(`Unit of measure "${input.unitCode}" was not found.`);
      } else if (unit && !unit.isActive) {
        errors.push(`Unit of measure "${input.unitCode}" is inactive.`);
      }

      if (explicitCode && explicitCode.length > 40) {
        errors.push('Item code must be 40 characters or fewer.');
      }

      if (input.defaultSalesPrice && !/^\d+(\.\d{1,4})?$/.test(input.defaultSalesPrice)) {
        errors.push('Default sales price must be a valid decimal.');
      }
      if (input.defaultPurchasePrice && !/^\d+(\.\d{1,4})?$/.test(input.defaultPurchasePrice)) {
        errors.push('Default purchase price must be a valid decimal.');
      }

      if (input.type && !Object.values(InventoryItemType).includes(input.type)) {
        errors.push(`Item type "${input.type}" is invalid.`);
      }

      if (normalizedExplicitCode) {
        if (seenCodes.has(normalizedExplicitCode)) {
          errors.push(`Duplicate item code "${explicitCode}" in import file.`);
        }
        seenCodes.add(normalizedExplicitCode);

        if (
          duplicatePolicy === 'skip' &&
          lookups.existingCodes.has(normalizedExplicitCode)
        ) {
          return {
            rowNumber,
            input,
            status: 'skip' as const,
            errors: [`Item code "${explicitCode}" already exists.`],
            resolved: group && category && unit
              ? {
                  code: explicitCode,
                  itemGroupId: group.id,
                  itemCategoryId: category.id,
                  unitOfMeasureId: unit.id,
                }
              : undefined,
          };
        }
      }

      if (normalizedBarcode) {
        if (seenBarcodes.has(normalizedBarcode)) {
          errors.push(`Duplicate barcode "${barcode}" in import file.`);
        }
        seenBarcodes.add(normalizedBarcode);

        if (lookups.existingBarcodes.has(normalizedBarcode)) {
          errors.push(`Barcode "${barcode}" is already used by another item.`);
        }
      }

      if (errors.length > 0) {
        return {
          rowNumber,
          input,
          status: 'error' as const,
          errors,
        };
      }

      return {
        rowNumber,
        input,
        status: 'valid' as const,
        errors: [],
        resolved: {
          code: explicitCode,
          itemGroupId: group!.id,
          itemCategoryId: category!.id,
          unitOfMeasureId: unit!.id,
        },
      };
    });
  }

  private buildCreatePayload(
    input: ImportInventoryItemRowDto,
    lookups: MasterLookups,
  ): CreateInventoryItemDto {
    const group = lookups.groupsByCode.get(this.normalizeCode(input.groupCode))!;
    const category = lookups.categoriesByCode.get(this.normalizeCode(input.categoryCode))!;
    const unit = lookups.unitsByCode.get(this.normalizeCode(input.unitCode))!;
    const hasPrices = Boolean(input.defaultSalesPrice || input.defaultPurchasePrice);

    const sellByWeight = unit.code === 'KG';

    return {
      code: input.code?.trim() || undefined,
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      barcode: input.barcode?.trim() || undefined,
      unitOfMeasure: unit.code,
      unitOfMeasureId: unit.id,
      itemGroupId: group.id,
      itemCategoryId: category.id,
      type: input.type ?? InventoryItemType.FINISHED_GOOD,
      inventoryAccountId: group.inventoryAccountId ?? undefined,
      cogsAccountId: group.cogsAccountId ?? undefined,
      salesAccountId: group.salesAccountId ?? undefined,
      adjustmentAccountId: group.adjustmentAccountId ?? undefined,
      defaultSalesPrice: input.defaultSalesPrice,
      defaultPurchasePrice: input.defaultPurchasePrice,
      currencyCode: hasPrices ? 'JOD' : undefined,
      trackInventory: true,
      reorderLevel: '0',
      reorderQuantity: '0',
      allowFractionalQuantity: sellByWeight,
      minSalesQuantity: sellByWeight ? '0.001' : '1',
      isActive: true,
    };
  }

  private async loadMasterLookups(): Promise<MasterLookups> {
    const [groups, categories, units, existingItems] = await Promise.all([
      this.prisma.inventoryItemGroup.findMany({
        select: {
          id: true,
          code: true,
          isActive: true,
          inventoryAccountId: true,
          cogsAccountId: true,
          salesAccountId: true,
          adjustmentAccountId: true,
        },
      }),
      this.prisma.inventoryItemCategory.findMany({
        select: {
          id: true,
          code: true,
          itemGroupId: true,
          isActive: true,
        },
      }),
      this.prisma.inventoryUnitOfMeasure.findMany({
        select: {
          id: true,
          code: true,
          isActive: true,
        },
      }),
      this.prisma.inventoryItem.findMany({
        select: {
          code: true,
          barcode: true,
        },
      }),
    ]);

    return {
      groupsByCode: new Map(groups.map((group) => [this.normalizeCode(group.code), group])),
      categoriesByCode: new Map(categories.map((category) => [this.normalizeCode(category.code), category])),
      unitsByCode: new Map(units.map((unit) => [this.normalizeCode(unit.code), unit])),
      existingCodes: new Set(
        existingItems
          .map((item) => item.code)
          .filter(Boolean)
          .map((code) => this.normalizeCode(code)),
      ),
      existingBarcodes: new Set(
        existingItems
          .map((item) => item.barcode)
          .filter((barcode): barcode is string => Boolean(barcode))
          .map((barcode) => this.normalizeCode(barcode)),
      ),
    };
  }

  private buildSummary(rows: ResolvedImportRow[]) {
    return {
      totalRows: rows.length,
      validCount: rows.filter((row) => row.status === 'valid').length,
      skipCount: rows.filter((row) => row.status === 'skip').length,
      errorCount: rows.filter((row) => row.status === 'error').length,
    };
  }

  private normalizeCode(value: string) {
    return value.trim().toUpperCase();
  }
}
