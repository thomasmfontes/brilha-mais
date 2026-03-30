import { IsNumber, IsString, IsOptional, Max, Min } from 'class-validator';

export class ReviewEssayDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  grade: number;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsString()
  feedbackFileUrl?: string;

  @IsOptional()
  @IsString()
  feedbackFileName?: string;
}
