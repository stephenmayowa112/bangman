import { IsString, IsNumber, Length, Matches, Min, Max } from 'class-validator';

export class ConvertCurrencyDto {
  @IsString()
  @Length(3, 3, { message: 'Currency must be exactly 3 characters' })
  @Matches(/^[A-Z]{3}$/, { message: 'Currency must be 3 uppercase letters' })
  sourceCurrency: string;

  @IsString()
  @Length(3, 3, { message: 'Currency must be exactly 3 characters' })
  @Matches(/^[A-Z]{3}$/, { message: 'Currency must be 3 uppercase letters' })
  targetCurrency: string;

  @IsNumber()
  @Min(0.000001, { message: 'Amount must be greater than 0' })
  @Max(10000000, { message: 'Amount must not exceed 10,000,000' })
  sourceAmount: number;

  @IsString()
  @Length(16, 64, { message: 'Idempotency key must be between 16 and 64 characters' })
  idempotencyKey: string;
}
