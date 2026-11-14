import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma.module';
import { FinanceLabController } from './finance-lab.controller';
import { FinanceLabService } from './finance-lab.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [FinanceLabController],
  providers: [FinanceLabService],
  exports: [FinanceLabService],
})
export class FinanceLabModule {}
