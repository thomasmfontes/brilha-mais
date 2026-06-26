import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateTurmaDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  locationId?: string;
}

export class UpdateTurmaDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  locationId?: string;
}
