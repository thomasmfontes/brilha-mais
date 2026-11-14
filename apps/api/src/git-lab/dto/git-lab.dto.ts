import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CompleteGitExerciseDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'exerciseSlug deve conter apenas letras minúsculas, números e hífens',
  })
  @MaxLength(80)
  exerciseSlug: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  commandsCount?: number;
}
