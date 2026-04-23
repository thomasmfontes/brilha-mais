import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards, Req, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import { EssaySubmissionService } from './essay-submission.service';
import { SubmitEssayDto } from './dto/submit-essay.dto';
import { ReviewEssayDto } from './dto/review-essay.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubmissionStatus, Role } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import * as express from 'express';

@Controller('essay-submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
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
  getAllPendingSubmissions(
    @Req() req: any, 
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('courseId') courseId?: string
  ) {
    const targetStatus = status === 'ALL' ? undefined : (status || 'PENDING');
    return this.service.getAllSubmissions(
      req.user.id, 
      req.user.role, 
      targetStatus as any,
      Number(page) || 1,
      Number(limit) || 10,
      search,
      courseId
    );
  }

  @Patch(':id/review')
  review(@Req() req: any, @Param('id') submissionId: string, @Body() dto: ReviewEssayDto) {
    return this.service.review(submissionId, req.user.id, dto, req.user.role);
  }

  @Patch(':id/redo')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  requestRedo(@Req() req: any, @Param('id') submissionId: string, @Body() dto: ReviewEssayDto) {
    return this.service.requestRedo(submissionId, req.user.id, dto, req.user.role);
  }

  @Get(':id/download')
  async download(@Req() req: any, @Param('id') submissionId: string, @Res() res: express.Response) {
    const { fileUrl, prettyName } = await this.service.getDownloadInfo(submissionId, req.user.id, req.user.role);
    
    if (!fileUrl) {
      throw new HttpException('Arquivo não encontrado', HttpStatus.NOT_FOUND);
    }

    const https = require('https');
    https.get(fileUrl, (externalRes: any) => {
      // Set headers for download
      res.setHeader('Content-Type', externalRes.headers['content-type'] || 'application/octet-stream');
      // Use RFC 5987 for better filename support (handling special chars)
      const encodedName = encodeURIComponent(prettyName).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`);
      
      externalRes.pipe(res);
    }).on('error', (err: any) => {
      console.error('Download proxy error:', err);
      if (!res.headersSent) {
        res.status(500).send('Erro ao processar download');
      }
    });
  }
}
