import { IsString, IsOptional, IsUUID } from 'class-validator';

export class SubmitEssayDto {
  @IsUUID()
  lessonId: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;
}
