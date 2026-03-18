import { IsNumber, IsString, Min, Max, Length } from 'class-validator';

export class FundWalletDto {
  @IsNumber()
  @Min(0.000001, { message: 'Amount must be greater than 0' })
  @Max(10000000, { message: 'Amount must not exceed 10,000,000' })
  amount: number;

  @IsString()
  @Length(16, 64, { message: 'Idempotency key must be between 16 and 64 characters' })
  idempotencyKey: string;
}
