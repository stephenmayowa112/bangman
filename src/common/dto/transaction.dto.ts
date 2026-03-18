import { IsOptional, IsEnum, IsString, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TransactionType {
  FUNDING = 'FUNDING',
  CONVERSION = 'CONVERSION',
  TRADE = 'TRADE',
}

export class TransactionFiltersDto {
  @ApiPropertyOptional({
    enum: TransactionType,
    description: 'Filter by transaction type',
    example: TransactionType.FUNDING,
  })
  @IsOptional()
  @IsEnum(TransactionType, { message: 'Invalid transaction type' })
  type?: TransactionType;

  @ApiPropertyOptional({
    example: 'NGN',
    description: 'Filter by currency (3 uppercase letters)',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00Z',
    description: 'Filter transactions from this date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid start date format' })
  startDate?: string;

  @ApiPropertyOptional({
    example: '2024-12-31T23:59:59Z',
    description: 'Filter transactions until this date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid end date format' })
  endDate?: string;
}

export class PaginationDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 20;
}
