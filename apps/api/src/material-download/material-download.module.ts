import { Module } from '@nestjs/common';
import { MaterialDownloadService } from './material-download.service';
import { MaterialDownloadController } from './material-download.controller';

@Module({
  controllers: [MaterialDownloadController],
  providers: [MaterialDownloadService],
})
export class MaterialDownloadModule {}
