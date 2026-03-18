import { IsString, IsNumber, Length, Matches, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConvertCurrencyDto {
  @ApiProperty({
    example: 'NGN',
    description: 'Source currency code (3 uppercase letters)',
  })
  @IsString()
  @Length(3, 3, { message: 'Currency code must be exactly 3 characters' })
  @Matches(/^[A-Z]{3}$/, { message: 'Currency must be 3 uppercase letters' })
  @IsNotEmpty()
  sourceCurrency: string;

  @ApiProperty({
    example: 'USD',
    description: 'Target currency code (3 uppercase letters)',
  })
  @IsString()
  @Length(3, 3, { message: 'Currency code must be exactly 3 characters' })
  @Matches(/^[A-Z]{3}$/, { message: 'Currency must be 3 uppercase letters' })
  @IsNotEmpty()
  targetCurrency: string;

  @ApiProperty({
    example: 1000.50,
    description: 'Amount to convert',
    minimum: 0.000001,
  })
  @IsNumber({}, { message: 'Source amount must be a number' })
  @Min(0.000001, { message: 'Source amount must be greater than 0' })
  sourceAmount: number;

  @ApiProperty({
    example: 'a1b2c3d4e5f6g7h8',
    description: 'Idempotency key (16-64 characters)',
    minLength: 16,
    maxLength: 64,
  })
  @IsString()
  @Length(16, 64, { message: 'Idempotency key must be between 16 and 64 characters' })
  @IsNotEmpty()
  idempotencyKey: string;
}

export class TradeDto {
  @ApiProperty({
    example: 'NGN',
    description: 'From currency code (3 uppercase letters)',
  })
  @IsString()
  @Length(3, 3, { message: 'Currency code must be exactly 3 characters' })
  @Matches(/^[A-Z]{3}$/, { message: 'Currency must be 3 uppercase letters' })
  @IsNotEmpty()
  fromCurrency: string;

  @ApiProperty({
    example: 'USD',
    description: 'To currency code (3 uppercase letters)',
  })
  @IsString()
  @Length(3, 3, { message: 'Currency code must be exactly 3 characters' })
  @Matches(/^[A-Z]{3}$/, { message: 'Currency must be 3 uppercase letters' })
  @IsNotEmpty()
  toCurrency: string;

  @ApiProperty({
    example: 1000.50,
    description: 'Amount to trade',
    minimum: 0.000001,
  })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0.000001, { message: 'Amount must be greater than 0' })
  amount: number;

  @ApiProperty({
    example: 'a1b2c3d4e5f6g7h8',
    description: 'Idempotency key (16-64 characters)',
    minLength: 16,
    maxLength: 64,
  })
  @IsString()
  @Length(16, 64, { message: 'Idempotency key must be between 16 and 64 characters' })
  @IsNotEmpty()
  idempotencyKey: string;
}

export class GetRateDto {
  @ApiProperty({
    example: 'NGN',
    description: 'From currency code',
  })
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  from: string;

  @ApiProperty({
    example: 'USD',
    description: 'To currency code',
  })
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  to: string;
}
