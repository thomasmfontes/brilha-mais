import { Module } from '@nestjs/common';
import { MaterialDownloadService } from './material-download.service';
import { MaterialDownloadController } from './material-download.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [MaterialDownloadController],
  providers: [MaterialDownloadService, PrismaService],
})
export class MaterialDownloadModule {}
