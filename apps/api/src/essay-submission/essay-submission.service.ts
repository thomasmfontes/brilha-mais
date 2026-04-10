import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ProgressService } from '../progress/progress.service';
import { SubmitEssayDto } from './dto/submit-essay.dto';
import { ReviewEssayDto } from './dto/review-essay.dto';
import { SubmissionStatus } from '@prisma/client';

@Injectable()
export class EssaySubmissionService {
  constructor(
    private prisma: PrismaService,
    private progress: ProgressService,
  ) {}

  async submit(userId: string, dto: SubmitEssayDto) {
    const { lessonId, content, fileUrl, fileName } = dto;

    // Check if lesson exists and is of type ESSAY
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson || lesson.contentType !== 'ESSAY') {
      throw new HttpException(
        'Aula não encontrada ou não é do tipo dissertativa',
        HttpStatus.BAD_REQUEST,
      );
    }

    const submission = await this.prisma.essaySubmission.upsert({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      create: {
        userId,
        lessonId,
        content,
        fileUrl,
        fileName,
        status: 'PENDING',
      },
      update: {
        content,
        fileUrl,
        fileName,
        status: 'PENDING',
      },
    });

    // Mark as completed in progress
    await this.progress.toggleLessonCompletion(userId, lessonId, true);

    return submission;
  }

  async getMySubmission(userId: string, lessonId: string) {
    return this.prisma.essaySubmission.findUnique({
      where: {
        userId_lessonId: { userId, lessonId },
      },
    });
  }

  async getSubmissionsByLesson(lessonId: string, instructorId: string, role?: string, status?: SubmissionStatus) {
    const isAdmin = role?.toUpperCase() === 'ADMIN';
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });

    if (!lesson || (!isAdmin && lesson.module.course.instructorId !== instructorId)) {
      throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
    }

    const where: any = { 
      lessonId,
      user: { role: 'STUDENT' }
    };
    if (status) where.status = status;

    return this.prisma.essaySubmission.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllSubmissions(instructorId: string, role?: string, status?: SubmissionStatus) {
    const isAdmin = role?.toUpperCase() === 'ADMIN';
    const where: any = {
      user: { role: 'STUDENT' }
    };
    if (status) where.status = status;

    if (!isAdmin) {
      where.lesson = {
        module: {
          course: {
            instructorId: instructorId,
          },
        },
      };
    }

    return this.prisma.essaySubmission.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        lesson: {
          select: {
            id: true,
            title: true,
            content: true,
            order: true,
            module: {
              select: {
                title: true,
                order: true,
                course: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async review(submissionId: string, instructorId: string, dto: ReviewEssayDto, role?: string) {
    const isAdmin = role?.toUpperCase() === 'ADMIN';
    const submission = await this.prisma.essaySubmission.findUnique({
      where: { id: submissionId },
      include: { lesson: { include: { module: { include: { course: true } } } } },
    });

    if (!submission || (!isAdmin && submission.lesson.module.course.instructorId !== instructorId)) {
      throw new HttpException('Acesso negado ou submissão não encontrada', HttpStatus.FORBIDDEN);
    }

    return (this.prisma.essaySubmission.update as any)({
      where: { id: submissionId },
      data: {
        grade: dto.grade,
        feedback: dto.feedback,
        feedbackFileUrl: dto.feedbackFileUrl,
        feedbackFileName: dto.feedbackFileName,
        status: 'REVIEWED',
      },
    });
  }

  async requestRedo(submissionId: string, instructorId: string, dto?: ReviewEssayDto, role?: string) {
    const isAdmin = role?.toUpperCase() === 'ADMIN';
    console.log('[DEBUG] requestRedo:', { submissionId, instructorId, role, isAdmin });
    
    const submission = await this.prisma.essaySubmission.findUnique({
      where: { id: submissionId },
      include: { lesson: { include: { module: { include: { course: true } } } } },
    });

    if (!submission) {
      console.log('[DEBUG] Submission not found');
      throw new HttpException('Submissão não encontrada', HttpStatus.NOT_FOUND);
    }

    if (!isAdmin && submission.lesson.module.course.instructorId !== instructorId) {
      console.log('[DEBUG] Ownership check failed:', { 
        courseInstructorId: submission.lesson.module.course.instructorId,
        currentUserId: instructorId 
      });
      throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
    }

    // Reset progress for this student and lesson
    await this.progress.toggleLessonCompletion(submission.userId, submission.lessonId, false);

    // Update status to REDO_REQUIRED and save feedback
    return this.prisma.essaySubmission.update({
      where: { id: submissionId },
      data: { 
        status: 'REDO_REQUIRED' as any,
        grade: null,
        feedback: dto?.feedback,
        feedbackFileUrl: dto?.feedbackFileUrl,
        feedbackFileName: dto?.feedbackFileName,
      },
    });
  }
}
