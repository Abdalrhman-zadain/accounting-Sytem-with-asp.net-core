import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { MAX_AMOUNT } from '../../../../common/validation/decimal-limits';

export class CreateReceiptDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  reference?: string;

  @IsDateString()
  transactionDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(MAX_AMOUNT)
  amount!: number;

  @IsString()
  bankCashAccountId!: string;

  @IsString()
  counterAccountId!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  counterpartyName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}

export class CreatePaymentDto extends CreateReceiptDto {}

export class CreateTransferDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  reference?: string;

  @IsDateString()
  transactionDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(MAX_AMOUNT)
  amount!: number;

  @IsString()
  sourceBankCashAccountId!: string;

  @IsString()
  destinationBankCashAccountId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
