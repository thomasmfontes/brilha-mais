import { Module } from '@nestjs/common';
import { EssaySubmissionService } from './essay-submission.service';
import { EssaySubmissionController } from './essay-submission.controller';
import { ProgressService } from '../progress/progress.service';

@Module({
  controllers: [EssaySubmissionController],
  providers: [EssaySubmissionService, ProgressService],
})
export class EssaySubmissionModule {}
