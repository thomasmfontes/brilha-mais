import { Module } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [LocationController],
  providers: [LocationService, PrismaService, AuditService],
  exports: [LocationService],
})
export class LocationModule {}
