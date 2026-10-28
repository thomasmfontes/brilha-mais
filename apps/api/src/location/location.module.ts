import { Module } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [LocationController],
  providers: [LocationService, AuditService],
  exports: [LocationService],
})
export class LocationModule {}
