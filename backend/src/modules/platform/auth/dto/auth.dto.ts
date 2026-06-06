import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
    @ApiProperty({ example: 'cashier.01' })
    @IsString()
    @IsNotEmpty()
    username!: string;

    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'password123', minLength: 6 })
    @IsString()
    @MinLength(6)
    password!: string;

    @ApiProperty({ example: 'John Doe', required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ example: ['ACCOUNTANT'], required: false, isArray: true })
    @IsOptional()
    @IsArray()
    @IsIn(['CASHIER', 'ACCOUNTANT', 'KITCHEN', 'WAITER'], { each: true })
    posRoles?: string[];
}

export class LoginDto {
    @ApiProperty({ example: 'cashier.01' })
    @IsString()
    @IsNotEmpty()
    username!: string;

    @ApiProperty({ example: 'password123' })
    @IsString()
    @IsNotEmpty()
    password!: string;
}
