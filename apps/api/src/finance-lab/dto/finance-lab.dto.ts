import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class AllocationItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  percentage: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  color: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  category: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(400)
  examples: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(600)
  rationale: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  liquidity: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minSuggestedAmount?: number;
}

export class UpdatePortfolioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  subtitle: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  riskLevel: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  recommendedHorizon: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(40)
  expectedAnnualPct: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  benchmarkNote?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => AllocationItemDto)
  allocations: AllocationItemDto[];
}
