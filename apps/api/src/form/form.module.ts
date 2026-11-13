import { Module } from '@nestjs/common';
import { FormController } from './form.controller';
import { FormService } from './form.service';
import { PrismaModule } from '../prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [FormController],
  providers: [FormService],
  exports: [FormService],
})
export class FormModule {}
