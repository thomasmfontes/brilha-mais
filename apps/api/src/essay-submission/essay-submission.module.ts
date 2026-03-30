import { Module } from '@nestjs/common';
import { EssaySubmissionService } from './essay-submission.service';
import { EssaySubmissionController } from './essay-submission.controller';
import { PrismaService } from '../prisma.service';
import { ProgressService } from '../progress/progress.service';

@Module({
  controllers: [EssaySubmissionController],
  providers: [EssaySubmissionService, PrismaService, ProgressService],
})
export class EssaySubmissionModule {}
