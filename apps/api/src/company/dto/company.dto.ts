import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsEnum,
  MinLength,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { CandidateStage } from '@prisma/client';

export class CreateCompanyDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  tradeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  cnpj?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  segment?: string;

  @IsString()
  @MaxLength(100)
  contactName: string;

  @IsEmail()
  @MaxLength(120)
  contactEmail: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  tradeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  cnpj?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  segment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ActivateCompanyDto {
  @IsString()
  inviteToken: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsBoolean()
  termsAccepted: boolean;
}

export class UpdateCandidateStageDto {
  @IsEnum(CandidateStage)
  stage: CandidateStage;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  hiredRole?: string;

  @IsOptional()
  @IsDateString()
  hiredAt?: string;
}
