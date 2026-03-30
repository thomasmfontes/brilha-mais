import { Controller, Post, Body, Get, Param, Patch, UseGuards, Req, Query } from '@nestjs/common';
import { EssaySubmissionService } from './essay-submission.service';
import { SubmitEssayDto } from './dto/submit-essay.dto';
import { ReviewEssayDto } from './dto/review-essay.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubmissionStatus } from '@prisma/client';

@Controller('essay-submissions')
@UseGuards(JwtAuthGuard)
export class EssaySubmissionController {
  constructor(private readonly service: EssaySubmissionService) {}

  @Post()
  submit(@Req() req: any, @Body() dto: SubmitEssayDto) {
    return this.service.submit(req.user.id, dto);
  }

  @Get('my/:lessonId')
  getMySubmission(@Req() req: any, @Param('lessonId') lessonId: string) {
    return this.service.getMySubmission(req.user.id, lessonId);
  }

  @Get('lesson/:lessonId')
  getSubmissionsByLesson(@Req() req: any, @Param('lessonId') lessonId: string, @Query('status') status?: string) {
    const targetStatus = status === 'ALL' ? undefined : (status || 'PENDING');
    return this.service.getSubmissionsByLesson(lessonId, req.user.id, req.user.role, targetStatus as any);
  }

  @Get('pending')
  getAllPendingSubmissions(@Req() req: any, @Query('status') status?: string) {
    // If status is 'ALL', don't pass it to service (service handles undefined as all).
    // If no status is provided, default to 'PENDING'.
    const targetStatus = status === 'ALL' ? undefined : (status || 'PENDING');
    return this.service.getAllSubmissions(req.user.id, req.user.role, targetStatus as any);
  }

  @Patch(':id/review')
  review(@Req() req: any, @Param('id') submissionId: string, @Body() dto: ReviewEssayDto) {
    return this.service.review(submissionId, req.user.id, dto, req.user.role);
  }
}
