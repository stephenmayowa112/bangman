import { IsNumber, IsString, Min, Max, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FundWalletDto {
  @ApiProperty({
    example: 1000.50,
    description: 'Amount to fund in NGN',
    minimum: 0.000001,
    maximum: 10000000,
  })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0.000001, { message: 'Amount must be at least 0.000001' })
  @Max(10000000, { message: 'Amount cannot exceed 10,000,000' })
  amount: number;

  @ApiProperty({
    example: 'a1b2c3d4e5f6g7h8',
    description: 'Idempotency key (16-64 characters)',
    minLength: 16,
    maxLength: 64,
  })
  @IsString()
  @Length(16, 64, { message: 'Idempotency key must be between 16 and 64 characters' })
  idempotencyKey: string;
}
