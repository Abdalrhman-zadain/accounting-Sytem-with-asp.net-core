import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';

import { InventoryItemType } from '../../../../../generated/prisma';

export class ImportInventoryItemRowDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsString()
  @Length(1, 40)
  groupCode!: string;

  @IsString()
  @Length(1, 40)
  categoryCode!: string;

  @IsString()
  @Length(1, 40)
  unitCode!: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  barcode?: string;

  @IsOptional()
  @Matches(/^\d+(\.\d{1,4})?$/)
  defaultSalesPrice?: string;

  @IsOptional()
  @Matches(/^\d+(\.\d{1,4})?$/)
  defaultPurchasePrice?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsEnum(InventoryItemType)
  type?: InventoryItemType;
}

export class ImportInventoryItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportInventoryItemRowDto)
  rows!: ImportInventoryItemRowDto[];

  @IsOptional()
  @IsIn(['skip'])
  duplicatePolicy?: 'skip';
}
