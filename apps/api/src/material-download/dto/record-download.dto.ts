import { IsString, IsNotEmpty } from 'class-validator';

export class RecordDownloadDto {
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @IsString()
  @IsNotEmpty()
  materialName: string;

  @IsString()
  @IsNotEmpty()
  materialUrl: string;
}
