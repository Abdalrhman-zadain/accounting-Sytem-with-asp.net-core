import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from "class-validator";

const QTY_PATTERN = /^\d+(\.\d{1,4})?$/;

export class RepCarLoadLineDto {
  @IsString()
  itemId!: string;

  @IsString()
  @Matches(QTY_PATTERN)
  quantity!: string;

  @IsString()
  @Length(1, 40)
  unitOfMeasure!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}

export class CreateRepCarLoadDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsDateString()
  loadDate!: string;

  @IsString()
  warehouseId!: string;

  @IsString()
  salesRepId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RepCarLoadLineDto)
  lines!: RepCarLoadLineDto[];
}

export class UpdateRepCarLoadDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsOptional()
  @IsDateString()
  loadDate?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  salesRepId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RepCarLoadLineDto)
  lines?: RepCarLoadLineDto[];
}

export class RepCarStocktakeLineDto {
  @IsString()
  itemId!: string;

  @IsString()
  @Matches(QTY_PATTERN)
  countedQuantity!: string;

  @IsString()
  @Length(1, 40)
  unitOfMeasure!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}

export class CreateRepCarStocktakeDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsDateString()
  stocktakeDate!: string;

  @IsString()
  salesRepId!: string;

  @IsString()
  @Length(1, 120)
  reason!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RepCarStocktakeLineDto)
  lines!: RepCarStocktakeLineDto[];
}

export class UpdateRepCarStocktakeDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsOptional()
  @IsDateString()
  stocktakeDate?: string;

  @IsOptional()
  @IsString()
  salesRepId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  reason?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RepCarStocktakeLineDto)
  lines?: RepCarStocktakeLineDto[];
}
