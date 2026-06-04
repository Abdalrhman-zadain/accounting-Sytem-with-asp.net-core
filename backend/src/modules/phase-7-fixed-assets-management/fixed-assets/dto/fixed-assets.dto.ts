import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";

import { MAX_AMOUNT } from "../../../../common/validation/decimal-limits";

import {
  FixedAssetDepreciationMethod,
  FixedAssetDisposalMethod,
  FixedAssetStatus,
} from "../../../../generated/prisma";

export class CreateFixedAssetCategoryDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  code?: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  assetAccountId!: string;

  @IsString()
  accumulatedDepreciationAccountId!: string;

  @IsString()
  depreciationExpenseAccountId!: string;

  @IsOptional()
  @IsString()
  disposalGainAccountId?: string;

  @IsOptional()
  @IsString()
  disposalLossAccountId?: string;
}

export class UpdateFixedAssetCategoryDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  assetAccountId?: string;

  @IsOptional()
  @IsString()
  accumulatedDepreciationAccountId?: string;

  @IsOptional()
  @IsString()
  depreciationExpenseAccountId?: string;

  @IsOptional()
  @IsString()
  disposalGainAccountId?: string;

  @IsOptional()
  @IsString()
  disposalLossAccountId?: string;
}

export class CreateFixedAssetDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  code?: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsString()
  categoryId!: string;

  @IsDateString()
  acquisitionDate!: string;

  @IsDateString()
  depreciationStartDate!: string;

  @IsNumber()
  @Min(1)
  @Max(MAX_AMOUNT)
  usefulLifeMonths!: number;

  @IsEnum(FixedAssetDepreciationMethod)
  depreciationMethod!: FixedAssetDepreciationMethod;

  @IsOptional()
  @IsNumber()
  @Max(MAX_AMOUNT)
  residualValue?: number;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  costCenter?: string;

  @IsOptional()
  @IsString()
  employee?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  branch?: string;
}

export class UpdateFixedAssetDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  @IsOptional()
  @IsDateString()
  depreciationStartDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(MAX_AMOUNT)
  usefulLifeMonths?: number;

  @IsOptional()
  @IsEnum(FixedAssetDepreciationMethod)
  depreciationMethod?: FixedAssetDepreciationMethod;

  @IsOptional()
  @IsNumber()
  @Max(MAX_AMOUNT)
  residualValue?: number;

  @IsOptional()
  @IsEnum(FixedAssetStatus)
  status?: FixedAssetStatus;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  costCenter?: string;

  @IsOptional()
  @IsString()
  employee?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  branch?: string;
}

export class CreateFixedAssetAcquisitionDto {
  @IsOptional()
  @IsString()
  reference?: string;

  @IsString()
  assetId!: string;

  @IsDateString()
  acquisitionDate!: string;

  @IsNumber()
  @Min(0.01)
  @Max(MAX_AMOUNT)
  acquisitionCost!: number;

  @IsOptional()
  @IsNumber()
  @Max(MAX_AMOUNT)
  capitalizedCost?: number;

  @IsOptional()
  @IsString()
  supplierReference?: string;

  @IsOptional()
  @IsString()
  purchaseInvoiceReference?: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsString()
  clearingAccountId!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateFixedAssetDepreciationRunDto {
  @IsOptional()
  @IsString()
  reference?: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateFixedAssetDisposalDto {
  @IsOptional()
  @IsString()
  reference?: string;

  @IsString()
  assetId!: string;

  @IsDateString()
  disposalDate!: string;

  @IsEnum(FixedAssetDisposalMethod)
  method!: FixedAssetDisposalMethod;

  @IsOptional()
  @IsNumber()
  @Max(MAX_AMOUNT)
  proceedsAmount?: number;

  @IsOptional()
  @IsNumber()
  @Max(MAX_AMOUNT)
  disposalExpense?: number;

  @IsOptional()
  @IsString()
  proceedsAccountId?: string;

  @IsOptional()
  @IsString()
  disposalExpenseAccountId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateFixedAssetTransferDto {
  @IsOptional()
  @IsString()
  reference?: string;

  @IsString()
  assetId!: string;

  @IsDateString()
  transferDate!: string;

  @IsOptional()
  @IsString()
  toDepartment?: string;

  @IsOptional()
  @IsString()
  toCostCenter?: string;

  @IsOptional()
  @IsString()
  toEmployee?: string;

  @IsOptional()
  @IsString()
  toLocation?: string;

  @IsOptional()
  @IsString()
  toBranch?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
