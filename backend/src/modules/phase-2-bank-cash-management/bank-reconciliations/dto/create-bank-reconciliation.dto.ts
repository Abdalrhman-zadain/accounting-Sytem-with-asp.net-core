import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';
import { MAX_AMOUNT } from '../../../../common/validation/decimal-limits';

export class CreateBankReconciliationDto {
  @IsString()
  bankCashAccountId!: string;

  @IsDateString()
  statementDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Max(MAX_AMOUNT)
  statementEndingBalance!: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  notes?: string;
}

export class CreateBankStatementLineDto {
  @IsDateString()
  transactionDate!: string;

  @IsOptional()
  @IsString()
  @Length(0, 64)
  reference?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
  debitAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
  creditAmount!: number;
}

export class ImportBankStatementLinesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBankStatementLineDto)
  lines!: CreateBankStatementLineDto[];
}

export class CreateBankReconciliationMatchDto {
  @IsString()
  statementLineId!: string;

  @IsString()
  ledgerTransactionId!: string;
}
