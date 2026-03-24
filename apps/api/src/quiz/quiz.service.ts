import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class QuizService {
  constructor(private prisma: PrismaService) {}

  async createQuiz(lessonId: string, data: any) {
    return this.prisma.quiz.create({
      data: {
        title: data.title,
        description: data.description,
        lessonId,
        questions: {
          create: data.questions.map((q: any) => ({
            text: q.text,
            options: {
              create: q.options.map((o: any) => ({
                text: o.text,
                isCorrect: o.isCorrect,
              })),
            },
          })),
        },
      },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });
  }

  async getQuizByLesson(lessonId: string) {
    return this.prisma.quiz.findFirst({
      where: { lessonId },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });
  }
}
