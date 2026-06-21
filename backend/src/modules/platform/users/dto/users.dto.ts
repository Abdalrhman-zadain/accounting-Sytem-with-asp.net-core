import { Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";
import { PosAccessRoleCode, PosPermissionCode, PosPermissionOverrideEffect } from "../../../../generated/prisma";

const POS_ROLE_CODES = ["CASHIER", "ACCOUNTANT", "KITCHEN", "WAITER"] as const;

export class PermissionOverrideDto {
  @IsString()
  code!: PosPermissionCode;

  @IsEnum(PosPermissionOverrideEffect)
  effect!: PosPermissionOverrideEffect;
}

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(POS_ROLE_CODES, { each: true })
  posRoles?: PosAccessRoleCode[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionOverrideDto)
  permissionOverrides?: PermissionOverrideDto[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(POS_ROLE_CODES, { each: true })
  posRoles?: PosAccessRoleCode[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionOverrideDto)
  permissionOverrides?: PermissionOverrideDto[];
}
