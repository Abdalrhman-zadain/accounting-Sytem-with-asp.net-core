import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { MAX_AMOUNT } from '../../../../common/validation/decimal-limits';

export class CreateBankCashAccountDto {
  @IsString()
  @Length(1, 64)
  type!: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  bankName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  accountNumber?: string;

  @IsString()
  @Length(1, 12)
  currencyCode!: string;

  @IsString()
  accountId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
  openingBalance?: number;

  @IsOptional()
  @IsString()
  openingBalanceOffsetAccountId?: string;
}
