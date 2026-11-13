import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsIn,
  IsArray,
  IsObject,
  ValidateNested,
  MaxLength,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FormFieldType, FormTriageStatus } from '@prisma/client';

export class UpsertFormFieldDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(80)
  key: string;

  @IsEnum(FormFieldType)
  type: FormFieldType;

  @IsString()
  @MaxLength(300)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string | null;

  @IsInt()
  @Min(0)
  order: number;

  @IsBoolean()
  required: boolean;

  @IsOptional()
  @IsBoolean()
  allowOther?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  semanticKey?: string | null;

  @IsOptional()
  options?: any;

  @IsOptional()
  condition?: any;

  @IsOptional()
  validation?: any;
}

export class UpsertFormSectionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  tempId?: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsInt()
  @Min(0)
  order: number;

  @IsOptional()
  condition?: any;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertFormFieldDto)
  fields: UpsertFormFieldDto[];
}

export class SaveFormDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  coverImageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mobileCoverImageUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  opensAt?: string | null;

  @IsOptional()
  @IsDateString()
  closesAt?: string | null;

  @IsOptional()
  @IsBoolean()
  showOnLandingPage?: boolean;

  @IsOptional()
  @IsBoolean()
  enforceSingleSubmission?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  confirmationTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  confirmationMessage?: string | null;

  @IsOptional()
  @IsString()
  locationId?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertFormSectionDto)
  sections: UpsertFormSectionDto[];
}

export class CreateFromTemplateDto {
  @IsOptional()
  @IsString()
  templateKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  locationId?: string | null;
}

export class SubmitPublicFormDto {
  @IsObject()
  answers: Record<string, { value: string | string[]; otherText?: string }>;
}

export class UpdateSubmissionTriageDto {
  @IsOptional()
  @IsIn([
    FormTriageStatus.PENDING,
    FormTriageStatus.APPROVED,
    FormTriageStatus.REJECTED,
  ])
  status?: FormTriageStatus;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  adminNotes?: string | null;
}

export class EnrollSubmissionsDto {
  @IsArray()
  @IsString({ each: true })
  submissionIds: string[];

  @IsOptional()
  @IsString()
  turmaId?: string | null;
}
