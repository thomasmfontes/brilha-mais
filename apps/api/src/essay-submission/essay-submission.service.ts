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

    if (lesson.deadline && new Date() > new Date(lesson.deadline)) {
      throw new HttpException(
        'O prazo para entrega deste desafio expirou',
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

  private async getInstructorPermissionData(instructorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: instructorId },
      include: { assignedAreas: true },
    });
    return {
      locationId: user?.locationId,
      areaIds: user?.assignedAreas.map((a) => a.categoryId) || [],
    };
  }

  async getMySubmission(userId: string, lessonId: string) {
    return this.prisma.essaySubmission.findUnique({
      where: {
        userId_lessonId: { userId, lessonId },
      },
    });
  }

  async getSubmissionsByLesson(lessonId: string, instructorId: string, role?: string, status?: SubmissionStatus) {
    const isSuperAdmin = role?.toUpperCase() === 'SUPER_ADMIN';
    const isAdmin = role?.toUpperCase() === 'ADMIN';

    const where: any = { 
      lessonId,
      user: { role: 'STUDENT' }
    };
    if (status) where.status = status;

    if (!isSuperAdmin) {
      const { locationId, areaIds } = await this.getInstructorPermissionData(instructorId);
      
      // Check if user has access to the course (Admins see everything in their location, 
      // Instructors need ownership or global category match)
      if (!isAdmin) {
        const lesson = await this.prisma.lesson.findUnique({
          where: { id: lessonId },
          include: { module: { include: { course: true } } },
        });

        if (!lesson) throw new HttpException('Aula não encontrada', HttpStatus.NOT_FOUND);

        const isOwner = lesson.module.course.instructorId === instructorId;
        const isGlobalInArea = lesson.module.course.isGlobal && lesson.module.course.categoryId && areaIds.includes(lesson.module.course.categoryId);

        if (!isOwner && !isGlobalInArea) {
          throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
        }
      }

      // Restrict submissions to students from the user's location
      where.user.locationId = locationId;
    }

    return this.prisma.essaySubmission.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllSubmissions(
    instructorId: string, 
    role?: string, 
    status?: SubmissionStatus,
    page: number = 1,
    limit: number = 10,
    search?: string,
    courseId?: string
  ) {
    const isSuperAdmin = role?.toUpperCase() === 'SUPER_ADMIN';
    const isAdmin = role?.toUpperCase() === 'ADMIN';
    
    const where: any = {
      user: { role: 'STUDENT' }
    };
    if (status) where.status = status;

    if (!isSuperAdmin) {
      const { locationId, areaIds } = await this.getInstructorPermissionData(instructorId);
      
      if (isAdmin) {
        where.user.locationId = locationId;
      } else {
        where.AND = [
          { user: { locationId: locationId } },
          {
            OR: [
              { lesson: { module: { course: { instructorId: instructorId } } } },
              { 
                lesson: { 
                  module: { 
                    course: { 
                      isGlobal: true, 
                      categoryId: { in: areaIds } 
                    } 
                  } 
                } 
              }
            ]
          }
        ];
      }
    }

    // Apply search filter
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { lesson: { title: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Apply course filter
    if (courseId && courseId !== 'ALL') {
      if (where.AND) {
        where.AND.push({ lesson: { module: { courseId } } });
      } else {
        where.lesson = { ...where.lesson, module: { courseId } };
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.essaySubmission.count({ where }),
      this.prisma.essaySubmission.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, locationId: true, email: true } },
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
                  course: { select: { id: true, title: true, isGlobal: true, categoryId: true, instructorId: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      }
    };
  }

  async review(submissionId: string, instructorId: string, dto: ReviewEssayDto, role?: string) {
    const isSuperAdmin = role?.toUpperCase() === 'SUPER_ADMIN';
    const isAdmin = role?.toUpperCase() === 'ADMIN';

    const submission = await this.prisma.essaySubmission.findUnique({
      where: { id: submissionId },
      include: { 
        user: { select: { locationId: true } },
        lesson: { include: { module: { include: { course: true } } } } 
      },
    });

    if (!submission) throw new HttpException('Submissão não encontrada', HttpStatus.NOT_FOUND);

    if (!isSuperAdmin) {
      const { locationId, areaIds } = await this.getInstructorPermissionData(instructorId);
      const course = submission.lesson.module.course;

      const isSameLocation = submission.user.locationId === locationId;

      if (!isSameLocation) {
        throw new HttpException('Acesso negado: Aluno de outra localidade', HttpStatus.FORBIDDEN);
      }

      if (!isAdmin) {
        const isOwner = course.instructorId === instructorId;
        const isGlobalInArea = course.isGlobal && course.categoryId && areaIds.includes(course.categoryId);

        if (!isOwner && !isGlobalInArea) {
          throw new HttpException('Acesso negado: Você não é o instrutor deste curso', HttpStatus.FORBIDDEN);
        }
      }
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
    const isSuperAdmin = role?.toUpperCase() === 'SUPER_ADMIN';
    const isAdmin = role?.toUpperCase() === 'ADMIN';
    
    const submission = await this.prisma.essaySubmission.findUnique({
      where: { id: submissionId },
      include: { 
        user: { select: { locationId: true } },
        lesson: { include: { module: { include: { course: true } } } } 
      },
    });

    if (!submission) {
      throw new HttpException('Submissão não encontrada', HttpStatus.NOT_FOUND);
    }

    if (!isSuperAdmin) {
      const { locationId, areaIds } = await this.getInstructorPermissionData(instructorId);
      const course = submission.lesson.module.course;

      const isSameLocation = submission.user.locationId === locationId;

      if (!isSameLocation) {
        throw new HttpException('Acesso negado: Aluno de outra localidade', HttpStatus.FORBIDDEN);
      }

      if (!isAdmin) {
        const isOwner = course.instructorId === instructorId;
        const isGlobalInArea = course.isGlobal && course.categoryId && areaIds.includes(course.categoryId);

        if (!isOwner && !isGlobalInArea) {
          throw new HttpException('Acesso negado: Você não é o instrutor deste curso', HttpStatus.FORBIDDEN);
        }
      }
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

  async getDownloadInfo(submissionId: string, instructorId: string, role?: string) {
    const isSuperAdmin = role?.toUpperCase() === 'SUPER_ADMIN';
    const isAdmin = role?.toUpperCase() === 'ADMIN';

    const submission = await this.prisma.essaySubmission.findUnique({
      where: { id: submissionId },
      include: { 
        user: { select: { name: true, locationId: true } },
        lesson: { 
          include: { 
            module: { include: { course: true } } 
          } 
        } 
      },
    });

    if (!submission) throw new HttpException('Submissão não encontrada', HttpStatus.NOT_FOUND);

    if (!isSuperAdmin) {
      const { locationId, areaIds } = await this.getInstructorPermissionData(instructorId);
      const course = submission.lesson.module.course;

      const isSameLocation = submission.user.locationId === locationId;

      if (!isSameLocation) {
        throw new HttpException('Acesso negado: Aluno de outra localidade', HttpStatus.FORBIDDEN);
      }

      if (!isAdmin) {
        const isOwner = course.instructorId === instructorId;
        const isGlobalInArea = course.isGlobal && course.categoryId && areaIds.includes(course.categoryId);

        if (!isOwner && !isGlobalInArea) {
          throw new HttpException('Acesso negado: Você não é o instrutor deste curso', HttpStatus.FORBIDDEN);
        }
      }
    }

    const sanitizeFilename = (name: string) => {
      return name.replace(/[<>:"/\\|?*]/g, '').trim();
    };

    const studentName = sanitizeFilename(submission.user.name || 'Aluno');
    const moduleNum = submission.lesson.module.order + 1;
    const lessonNum = submission.lesson.order + 1;
    const courseTitle = sanitizeFilename(submission.lesson.module.course.title || 'Curso');
    const originalExt = submission.fileName?.split('.').pop() || submission.fileUrl?.split('.').pop()?.split('?')[0] || 'file';

    // Format: João Silva - M1 - A10 - Algoritmos.ext
    const prettyName = `${studentName} - M${moduleNum} - A${lessonNum} - ${courseTitle}.${originalExt}`;

    return {
      fileUrl: submission.fileUrl,
      prettyName
    };
  }
}
