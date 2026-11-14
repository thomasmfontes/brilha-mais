import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GitLabService, isTechCategoryName } from './git-lab.service';

describe('GitLabService', () => {
  const createMockPrisma = () => ({
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    gitExerciseProgress: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  });

  describe('isTechCategoryName', () => {
    it('matches Tecnologia case-insensitively and handles accents', () => {
      expect(isTechCategoryName('Tecnologia')).toBe(true);
      expect(isTechCategoryName('tecnologia da informação')).toBe(true);
      expect(isTechCategoryName('Direito')).toBe(false);
      expect(isTechCategoryName(null)).toBe(false);
    });
  });

  describe('verifyTechAccess & getMyProgress', () => {
    it('allows student with Tecnologia via TurmaArea', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUnique.mockResolvedValue({
        id: 'stu-1',
        role: 'STUDENT',
        assignedAreas: [],
        studentAreas: [],
        turmas: [{ areas: [{ category: { name: 'Tecnologia' } }] }],
      });
      prisma.gitExerciseProgress.findMany.mockResolvedValue([
        { exerciseSlug: 'git-01-config-init', commandsCount: 4 },
      ]);

      const service = new GitLabService(prisma as any);
      const result = await service.getMyProgress('stu-1');

      expect(result.completedSlugs).toEqual(['git-01-config-init']);
      expect(result.totalCompleted).toBe(1);
    });

    it('allows student with Tecnologia via direct StudentArea', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUnique.mockResolvedValue({
        id: 'stu-2',
        role: 'STUDENT',
        assignedAreas: [],
        studentAreas: [{ category: { name: 'Tecnologia' } }],
        turmas: [],
      });
      prisma.gitExerciseProgress.findMany.mockResolvedValue([]);

      const service = new GitLabService(prisma as any);
      const result = await service.getMyProgress('stu-2');

      expect(result.totalCompleted).toBe(0);
      expect(result.completedSlugs).toEqual([]);
    });

    it('rejects student from Direito with ForbiddenException', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUnique.mockResolvedValue({
        id: 'stu-law',
        role: 'STUDENT',
        assignedAreas: [],
        studentAreas: [{ category: { name: 'Direito' } }],
        turmas: [{ areas: [{ category: { name: 'Direito' } }] }],
      });

      const service = new GitLabService(prisma as any);
      await expect(service.getMyProgress('stu-law')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when user does not exist', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUnique.mockResolvedValue(null);

      const service = new GitLabService(prisma as any);
      await expect(service.getMyProgress('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('completeExercise', () => {
    it('upserts exercise progress and returns updated slugs', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUnique.mockResolvedValue({
        id: 'stu-1',
        role: 'STUDENT',
        assignedAreas: [],
        studentAreas: [{ category: { name: 'Tecnologia' } }],
        turmas: [],
      });
      const upsertedRecord = {
        id: 'prog-1',
        userId: 'stu-1',
        exerciseSlug: 'git-02-stage-commit',
        commandsCount: 6,
        attempts: 1,
      };
      prisma.gitExerciseProgress.upsert.mockResolvedValue(upsertedRecord);
      prisma.gitExerciseProgress.findMany.mockResolvedValue([
        { exerciseSlug: 'git-01-config-init', commandsCount: 4 },
        upsertedRecord,
      ]);

      const service = new GitLabService(prisma as any);
      const res = await service.completeExercise('stu-1', {
        exerciseSlug: 'git-02-stage-commit',
        commandsCount: 6,
      });

      expect(prisma.gitExerciseProgress.upsert).toHaveBeenCalledWith({
        where: {
          userId_exerciseSlug: {
            userId: 'stu-1',
            exerciseSlug: 'git-02-stage-commit',
          },
        },
        create: {
          userId: 'stu-1',
          exerciseSlug: 'git-02-stage-commit',
          commandsCount: 6,
          attempts: 1,
        },
        update: {
          commandsCount: 6,
          attempts: { increment: 1 },
        },
      });
      expect(res.completedSlugs).toEqual([
        'git-01-config-init',
        'git-02-stage-commit',
      ]);
      expect(res.totalCompleted).toBe(2);
    });
  });

  describe('getStudentsProgress', () => {
    it('rejects instructor without Tecnologia assignedArea', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUnique.mockResolvedValue({
        id: 'inst-rh',
        role: 'INSTRUCTOR',
        locationId: 'loc-1',
        assignedAreas: [{ category: { name: 'Recursos Humanos' } }],
      });

      const service = new GitLabService(prisma as any);
      await expect(service.getStudentsProgress('inst-rh')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('scopes students by locationId for INSTRUCTOR/ADMIN', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUnique.mockResolvedValue({
        id: 'inst-tech',
        role: 'INSTRUCTOR',
        locationId: 'loc-sp',
        assignedAreas: [{ category: { name: 'Tecnologia' } }],
      });
      prisma.category.findMany.mockResolvedValue([
        { id: 'cat-tech', name: 'Tecnologia' },
        { id: 'cat-fin', name: 'Finanças' },
      ]);
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'stu-a',
          name: 'Ana',
          email: 'ana@brilha.com',
          avatarUrl: null,
          location: { id: 'loc-sp', name: 'São Paulo' },
          turmas: [{ id: 't1', name: 'Tech 2026' }],
          gitExerciseProgress: [
            {
              exerciseSlug: 'git-01-config-init',
              commandsCount: 5,
              updatedAt: new Date('2026-11-13T12:00:00Z'),
            },
          ],
        },
        {
          id: 'stu-b',
          name: 'Bruno',
          email: 'bruno@brilha.com',
          avatarUrl: null,
          location: { id: 'loc-sp', name: 'São Paulo' },
          turmas: [],
          gitExerciseProgress: [
            {
              exerciseSlug: 'git-01-config-init',
              commandsCount: 4,
              updatedAt: new Date('2026-11-13T11:00:00Z'),
            },
            {
              exerciseSlug: 'git-02-stage-commit',
              commandsCount: 6,
              updatedAt: new Date('2026-11-13T13:00:00Z'),
            },
          ],
        },
      ]);

      const service = new GitLabService(prisma as any);
      const students = await service.getStudentsProgress('inst-tech');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'STUDENT',
            locationId: 'loc-sp',
          }),
        }),
      );
      expect(students[0].name).toBe('Bruno');
      expect(students[0].completedCount).toBe(2);
      expect(students[0].totalCommands).toBe(10);
      expect(students[1].name).toBe('Ana');
      expect(students[1].completedCount).toBe(1);
    });

    it('does not scope by locationId for SUPER_ADMIN', async () => {
      const prisma = createMockPrisma();
      prisma.user.findUnique.mockResolvedValue({
        id: 'super-1',
        role: 'SUPER_ADMIN',
        locationId: 'loc-sp',
        assignedAreas: [],
      });
      prisma.category.findMany.mockResolvedValue([
        { id: 'cat-tech', name: 'Tecnologia' },
      ]);
      prisma.user.findMany.mockResolvedValue([]);

      const service = new GitLabService(prisma as any);
      await service.getStudentsProgress('super-1');

      const queryArg = prisma.user.findMany.mock.calls[0][0];
      expect(queryArg.where.locationId).toBeUndefined();
    });
  });
});
