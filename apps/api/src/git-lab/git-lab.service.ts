import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CompleteGitExerciseDto } from './dto/git-lab.dto';

export function isTechCategoryName(name?: string | null): boolean {
  const norm = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  return norm.includes('tecnologia');
}

@Injectable()
export class GitLabService {
  constructor(private readonly prisma: PrismaService) {}

  private hasTechCategory(
    areas?: Array<{ category?: { name?: string | null } | null }>,
  ): boolean {
    return (areas || []).some((area) =>
      isTechCategoryName(area.category?.name),
    );
  }

  async verifyTechAccess(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        assignedAreas: { include: { category: true } },
        studentAreas: { include: { category: true } },
        turmas: {
          include: {
            areas: { include: { category: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      return user;
    }

    if (user.role === 'INSTRUCTOR') {
      if (this.hasTechCategory(user.assignedAreas)) {
        return user;
      }
      throw new ForbiddenException(
        'O Git Lab é exclusivo para alunos e instrutores da área de Tecnologia.',
      );
    }

    if (user.role === 'STUDENT') {
      const hasDirectArea = this.hasTechCategory(user.studentAreas);
      const hasTurmaArea = (user.turmas || []).some((turma) =>
        this.hasTechCategory(turma.areas),
      );
      if (hasDirectArea || hasTurmaArea) {
        return user;
      }
    }

    throw new ForbiddenException(
      'O Git Lab é exclusivo para alunos e instrutores da área de Tecnologia.',
    );
  }

  private async findUserProgressSafe(userId: string) {
    try {
      return await this.prisma.gitExerciseProgress.findMany({
        where: { userId },
        orderBy: { completedAt: 'asc' },
      });
    } catch (error: any) {
      if (error?.code === 'P2021') {
        return [];
      }
      throw error;
    }
  }

  async getMyProgress(userId: string) {
    await this.verifyTechAccess(userId);
    const items = await this.findUserProgressSafe(userId);

    return {
      items,
      completedSlugs: items.map((item) => item.exerciseSlug),
      totalCompleted: items.length,
    };
  }

  async completeExercise(userId: string, dto: CompleteGitExerciseDto) {
    await this.verifyTechAccess(userId);

    const commandsCount = dto.commandsCount ?? 0;
    const record = await this.prisma.gitExerciseProgress.upsert({
      where: {
        userId_exerciseSlug: {
          userId,
          exerciseSlug: dto.exerciseSlug,
        },
      },
      create: {
        userId,
        exerciseSlug: dto.exerciseSlug,
        commandsCount,
        attempts: 1,
      },
      update: {
        commandsCount,
        attempts: { increment: 1 },
      },
    });

    const items = await this.findUserProgressSafe(userId);

    return {
      record,
      completedSlugs: items.map((item) => item.exerciseSlug),
      totalCompleted: items.length,
    };
  }

  async getStudentsProgress(actorId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      include: {
        assignedAreas: { include: { category: true } },
      },
    });

    if (!actor) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const isAdmin = actor.role === 'SUPER_ADMIN' || actor.role === 'ADMIN';
    const isTechInstructor =
      actor.role === 'INSTRUCTOR' &&
      this.hasTechCategory(actor.assignedAreas);

    if (!isAdmin && !isTechInstructor) {
      throw new ForbiddenException(
        'Acesso restrito a administradores ou instrutores da área de Tecnologia.',
      );
    }

    const categories = await this.prisma.category.findMany({
      select: { id: true, name: true },
    });
    const techCategoryIds = categories
      .filter((category) => isTechCategoryName(category.name))
      .map((category) => category.id);

    if (techCategoryIds.length === 0) {
      return [];
    }

    const where: any = {
      role: 'STUDENT',
      OR: [
        {
          studentAreas: {
            some: { categoryId: { in: techCategoryIds } },
          },
        },
        {
          turmas: {
            some: {
              areas: {
                some: { categoryId: { in: techCategoryIds } },
              },
            },
          },
        },
      ],
    };

    if (actor.role !== 'SUPER_ADMIN' && actor.locationId) {
      where.locationId = actor.locationId;
    }

    const students = await this.prisma.user.findMany({
      where,
      include: {
        turmas: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        gitExerciseProgress: { orderBy: { updatedAt: 'desc' } },
      },
    });

    return students
      .map((student) => {
        const progressRows = student.gitExerciseProgress || [];
        const completedSlugs = progressRows.map((row) => row.exerciseSlug);
        const totalCommands = progressRows.reduce(
          (acc, row) => acc + (row.commandsCount || 0),
          0,
        );
        const lastActivityAt =
          progressRows.length > 0 ? progressRows[0].updatedAt : null;

        return {
          id: student.id,
          name: student.name,
          email: student.email,
          avatarUrl: student.avatarUrl,
          locationName: student.location?.name || null,
          turmas: student.turmas,
          completedSlugs,
          completedCount: completedSlugs.length,
          totalCommands,
          lastActivityAt,
        };
      })
      .sort((a, b) => {
        if (b.completedCount !== a.completedCount) {
          return b.completedCount - a.completedCount;
        }
        return (a.name || a.email || '').localeCompare(
          b.name || b.email || '',
          'pt-BR',
        );
      });
  }
}
