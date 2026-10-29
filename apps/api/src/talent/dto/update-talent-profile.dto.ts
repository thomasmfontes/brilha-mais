import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class UpdateTalentProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  areasOfInterest?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  availability?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  linkedinUrl?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  // LGPD & Responsável
  @IsOptional()
  @IsBoolean()
  lgpdConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  isMinor?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  parentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  parentContact?: string;

  @IsOptional()
  @IsBoolean()
  parentConsent?: boolean;
}

export class UpdateResumeDto {
  @IsString()
  resumeUrl: string;

  @IsString()
  resumeFileName: string;

  @IsOptional()
  @IsString()
  resumeFileSize?: string;
}

export class UploadParentDocumentDto {
  @IsString()
  parentDocumentUrl: string;

  @IsString()
  parentDocumentFileName: string;
}

export class ToggleMinorApprovalDto {
  @IsBoolean()
  approved: boolean;
}

