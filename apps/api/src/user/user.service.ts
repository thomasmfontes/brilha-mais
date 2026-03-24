import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CategoryService } from '../category/category.service';
import { Role } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private categoryService: CategoryService,
  ) { }

  async findAll() {
    return this.prisma.user.findMany({
      include: {
        assignedAreas: { include: { category: true } },
        studentAreas: { include: { category: true } },
        turmas: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        assignedAreas: { include: { category: true } },
        studentAreas: { include: { category: true } },
        turmas: true,
      },
    });
  }

  async updateRole(userId: string, role: string, actorId?: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as Role },
    });

    const roleLabel = role === 'ADMIN' ? 'Administrador' : role === 'INSTRUCTOR' ? 'Instrutor' : 'Aluno';

    await this.audit.log(
      `Alteração de Role → ${roleLabel}`,
      user.name ?? 'Usuário',
      userId,
      actorId,
      { newRole: role, userName: user.name }
    );

    return user;
  }

  async updateName(userId: string, name: string, actorId?: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name },
    });

    await this.audit.log(
      'Atualização de Nome',
      name,
      userId,
      actorId,
      { newName: name }
    );

    return user;
  }

  async assignInstructorArea(userId: string, categoryId: string, actorId?: string) {
    const assignment = await this.prisma.instructorArea.upsert({
      where: {
        userId_categoryId: { userId, categoryId },
      },
      update: {},
      create: { userId, categoryId },
      include: { category: true, user: true }
    });

    await this.audit.log(
      'Atribuição de Área (Instrutor)',
      'Usuário',
      userId,
      actorId,
      { category: assignment.category.name, userName: assignment.user.name }
    );

    return assignment;
  }

  async assignStudentArea(userId: string, categoryId: string) {
    return this.prisma.studentArea.upsert({
      where: {
        userId_categoryId: { userId, categoryId },
      },
      update: {},
      create: { userId, categoryId },
    });
  }

  async removeInstructorArea(userId: string, categoryId: string) {
    return this.prisma.instructorArea.delete({
      where: {
        userId_categoryId: { userId, categoryId },
      },
    });
  }

  async removeStudentArea(userId: string, categoryId: string) {
    return this.prisma.studentArea.delete({
      where: {
        userId_categoryId: { userId, categoryId },
      },
    });
  }

  async syncAreas(userId: string, instructorAreaIds: string[], studentAreaIds: string[], actorId?: string) {
    // 1. Get user details for audit logging
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // 2. Perform bulk update in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Clear existing areas
      await tx.instructorArea.deleteMany({ where: { userId } });
      await tx.studentArea.deleteMany({ where: { userId } });

      // Create new areas
      if (instructorAreaIds.length > 0) {
        await tx.instructorArea.createMany({
          data: instructorAreaIds.map((categoryId) => ({ userId, categoryId })),
        });
      }

      if (studentAreaIds.length > 0) {
        await tx.studentArea.createMany({
          data: studentAreaIds.map((categoryId) => ({ userId, categoryId })),
        });
      }

      // Log the change
      await this.audit.log(
        'Atualização de Permissões',
        user.name ?? 'Usuário',
        userId,
        actorId,
        {
          userName: user.name,
          instructorAreasCount: instructorAreaIds.length,
          studentAreasCount: studentAreaIds.length
        }
      );

      return tx.user.findUnique({
        where: { id: userId },
        include: {
          assignedAreas: { include: { category: true } },
          studentAreas: { include: { category: true } },
          turmas: true,
        },
      });
    });

    // Invalidate the category cache so newly assigned areas appear immediately
    this.categoryService.invalidateCache();

    return result;
  }

  async syncTurmas(userId: string, turmaIds: string[], actorId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        turmas: {
          set: turmaIds.map((id) => ({ id })),
        },
      },
      include: {
        turmas: true,
        assignedAreas: { include: { category: true } },
        studentAreas: { include: { category: true } },
      },
    });

    await this.audit.log(
      'Atualização de Turmas',
      user.name ?? 'Usuário',
      userId,
      actorId,
      {
        userName: user.name,
        turmasCount: turmaIds.length,
        turmas: updatedUser.turmas.map(t => t.name).join(', ')
      }
    );

    return updatedUser;
  }

  async remove(id: string, actorId?: string) {
    // Fetch user info before deleting for audit log
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('User not found');

    // Single query — all relations cascade at DB level
    await this.prisma.user.delete({ where: { id } });

    await this.audit.log(
      'Exclusão de Usuário',
      user.name ?? 'Usuário',
      id,
      actorId,
      { userName: user.name, email: user.email }
    );

    return user;
  }

  async markWelcomeVideoAsSeen(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { hasSeenWelcomeVideo: true },
    });
  }
}
