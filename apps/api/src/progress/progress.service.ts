import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async getProgress(userId: string, courseId: string) {
    const completedLessons = await this.prisma.progress.findMany({
      where: {
        userId,
        lesson: {
          module: {
            courseId,
          },
        },
        isCompleted: true,
      },
    });

    // Get total lessons count
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            _count: {
              select: { lessons: true },
            },
          },
        },
      },
    });

    const totalLessons =
      course?.modules.reduce((acc, m) => acc + (m._count as any).lessons, 0) ||
      0;
    const progress =
      totalLessons > 0
        ? Math.round((completedLessons.length / totalLessons) * 100)
        : 0;

    return {
      completedLessonsIds: completedLessons.map((p: any) => p.lessonId),
      progress,
    };
  }

  async toggleLessonCompletion(
    userId: string,
    lessonId: string,
    completed: boolean,
  ) {
    return this.prisma.progress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      create: {
        userId,
        lessonId,
        isCompleted: completed,
      },
      update: {
        isCompleted: completed,
      },
    });
  }
}
