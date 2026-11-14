import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_INVESTMENT_PORTFOLIOS } from './default-portfolios';
import {
  FinanceLabService,
  isFinanceCategoryName,
} from './finance-lab.service';

describe('FinanceLabService', () => {
  let service: FinanceLabService;
  let prismaMock: any;
  let auditMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'inst-fin-1',
            name: 'Prof. Ana Finanças',
            avatarUrl: null,
            assignedAreas: [{ category: { name: 'Finanças' } }],
          },
          {
            id: 'inst-tech-1',
            name: 'Prof. Carlos Tech',
            avatarUrl: null,
            assignedAreas: [{ category: { name: 'Tecnologia' } }],
          },
        ]),
      },
      investmentPortfolio: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    auditMock = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new FinanceLabService(prismaMock, auditMock);
  });

  describe('isFinanceCategoryName', () => {
    it('matches Finance category variants regardless of accents or casing', () => {
      expect(isFinanceCategoryName('Finanças')).toBe(true);
      expect(isFinanceCategoryName('Educação Financeira')).toBe(true);
      expect(isFinanceCategoryName('FINANCAS PESSOAIS')).toBe(true);
      expect(isFinanceCategoryName('Investimentos')).toBe(true);
      expect(isFinanceCategoryName('Economia')).toBe(true);
    });

    it('rejects non-Finance categories and empty values', () => {
      expect(isFinanceCategoryName('Tecnologia')).toBe(false);
      expect(isFinanceCategoryName('Inglês')).toBe(false);
      expect(isFinanceCategoryName('Recursos Humanos')).toBe(false);
      expect(isFinanceCategoryName('')).toBe(false);
      expect(isFinanceCategoryName(null)).toBe(false);
    });
  });

  describe('verifyFinanceAccess', () => {
    it('grants edit access to SUPER_ADMIN and ADMIN', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u-admin',
        role: 'SUPER_ADMIN',
        assignedAreas: [],
        studentAreas: [],
        turmas: [],
        enrollments: [],
      });

      const res = await service.verifyFinanceAccess('u-admin');
      expect(res.canEdit).toBe(true);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u-adm2',
        role: 'ADMIN',
        assignedAreas: [],
        studentAreas: [],
        turmas: [],
        enrollments: [],
      });
      const res2 = await service.verifyFinanceAccess('u-adm2');
      expect(res2.canEdit).toBe(true);
    });

    it('grants edit access to Finance INSTRUCTOR and denies non-Finance INSTRUCTOR', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'inst-1',
        role: 'INSTRUCTOR',
        assignedAreas: [{ category: { name: 'Finanças' } }],
        studentAreas: [],
        turmas: [],
        enrollments: [],
      });
      const ok = await service.verifyFinanceAccess('inst-1');
      expect(ok.canEdit).toBe(true);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'inst-2',
        role: 'INSTRUCTOR',
        assignedAreas: [{ category: { name: 'Tecnologia' } }],
        studentAreas: [],
        turmas: [],
        enrollments: [],
      });
      await expect(service.verifyFinanceAccess('inst-2')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('grants read-only access to STUDENT via studentAreas, turmas, or enrollments', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'stu-1',
        role: 'STUDENT',
        assignedAreas: [],
        studentAreas: [{ category: { name: 'Finanças' } }],
        turmas: [],
        enrollments: [],
      });
      await expect(service.verifyFinanceAccess('stu-1')).resolves.toMatchObject({
        canEdit: false,
      });

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'stu-2',
        role: 'STUDENT',
        assignedAreas: [],
        studentAreas: [],
        turmas: [{ areas: [{ category: { name: 'Educação Financeira' } }] }],
        enrollments: [],
      });
      await expect(service.verifyFinanceAccess('stu-2')).resolves.toMatchObject({
        canEdit: false,
      });

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'stu-3',
        role: 'STUDENT',
        assignedAreas: [],
        studentAreas: [],
        turmas: [],
        enrollments: [
          {
            course: {
              id: 'c-1',
              title: 'Educação Financeira na Prática',
              category: { name: 'Geral' },
            },
          },
        ],
      });
      await expect(service.verifyFinanceAccess('stu-3')).resolves.toMatchObject({
        canEdit: false,
      });
    });

    it('denies STUDENT without Finance links', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'stu-tech',
        role: 'STUDENT',
        assignedAreas: [],
        studentAreas: [{ category: { name: 'Tecnologia' } }],
        turmas: [{ areas: [{ category: { name: 'Inglês' } }] }],
        enrollments: [],
      });

      await expect(service.verifyFinanceAccess('stu-tech')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getPortfolios', () => {
    beforeEach(() => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'stu-fin',
        role: 'STUDENT',
        assignedAreas: [],
        studentAreas: [{ category: { name: 'Finanças' } }],
        turmas: [],
        enrollments: [],
      });
    });

    it('auto-seeds default portfolios when database table is empty', async () => {
      const seededRows = DEFAULT_INVESTMENT_PORTFOLIOS.map((p, idx) => ({
        id: `p-${idx}`,
        ...p,
        updatedBy: null,
      }));
      prismaMock.investmentPortfolio.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(seededRows);
      prismaMock.investmentPortfolio.upsert.mockResolvedValue({});

      const result = await service.getPortfolios('stu-fin');

      expect(prismaMock.investmentPortfolio.upsert).toHaveBeenCalledTimes(3);
      expect(result.portfolios).toHaveLength(3);
      expect(result.canEdit).toBe(false);
      expect(result.isFallback).toBe(false);
      expect(result.instructors).toEqual([
        { id: 'inst-fin-1', name: 'Prof. Ana Finanças', avatarUrl: null },
      ]);
    });

    it('falls back gracefully when InvestmentPortfolio table does not exist yet (P2021)', async () => {
      prismaMock.investmentPortfolio.findMany.mockRejectedValue({
        code: 'P2021',
      });

      const result = await service.getPortfolios('stu-fin');

      expect(result.isFallback).toBe(true);
      expect(result.portfolios).toHaveLength(3);
      expect(result.portfolios[0].slug).toBe('reserva');
    });
  });

  describe('updatePortfolio & resetPortfolio', () => {
    const validDto = {
      title: 'Primeiros Passos',
      subtitle: 'Reserva',
      description: 'Descrição teste',
      riskLevel: 'Conservador',
      recommendedHorizon: 'Curto prazo',
      expectedAnnualPct: 11.2,
      benchmarkNote: 'CDI ~11,15%',
      allocations: [
        {
          id: 'a1',
          label: 'Tesouro Selic',
          percentage: 60,
          color: '#F19B0A',
          category: 'Renda Fixa',
          examples: 'Tesouro Selic',
          rationale: 'Segurança',
          liquidity: 'Diária',
          minSuggestedAmount: 1,
        },
        {
          id: 'a2',
          label: 'CDB 100% CDI',
          percentage: 40,
          color: '#10B981',
          category: 'Renda Fixa',
          examples: 'CDB liquidez diária',
          rationale: 'Reserva',
          liquidity: 'Diária',
          minSuggestedAmount: 1,
        },
      ],
    };

    beforeEach(() => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'inst-fin-1',
        role: 'INSTRUCTOR',
        assignedAreas: [{ category: { name: 'Finanças' } }],
        studentAreas: [],
        turmas: [],
        enrollments: [],
      });
    });

    it('rejects updates when allocation percentages do not sum to 100%', async () => {
      prismaMock.investmentPortfolio.findUnique.mockResolvedValue({
        id: 'p-1',
        slug: 'reserva',
      });

      await expect(
        service.updatePortfolio('inst-fin-1', 'reserva', {
          ...validDto,
          allocations: [
            { ...validDto.allocations[0], percentage: 50 },
            { ...validDto.allocations[1], percentage: 40 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects unknown portfolio slugs', async () => {
      prismaMock.investmentPortfolio.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePortfolio('inst-fin-1', 'inexistente', validDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates portfolio when sum equals 100% and records audit log', async () => {
      prismaMock.investmentPortfolio.findUnique.mockResolvedValue({
        id: 'p-1',
        slug: 'reserva',
      });
      prismaMock.investmentPortfolio.upsert.mockResolvedValue({
        id: 'p-1',
        slug: 'reserva',
        ...validDto,
        updatedBy: {
          id: 'inst-fin-1',
          name: 'Prof. Ana Finanças',
          avatarUrl: null,
          role: 'INSTRUCTOR',
        },
      });

      const updated = await service.updatePortfolio(
        'inst-fin-1',
        'reserva',
        validDto,
      );

      expect(updated.title).toBe('Primeiros Passos');
      expect(auditMock.log).toHaveBeenCalledWith(
        'Atualização de Carteira de Investimentos',
        'Primeiros Passos',
        'p-1',
        'inst-fin-1',
        expect.objectContaining({ slug: 'reserva', totalAllocations: 2 }),
      );
    });

    it('restores default portfolio and records audit log', async () => {
      prismaMock.investmentPortfolio.upsert.mockResolvedValue({
        id: 'p-1',
        slug: 'reserva',
        title: 'Primeiros Passos',
      });

      const restored = await service.resetPortfolio('inst-fin-1', 'reserva');

      expect(restored.slug).toBe('reserva');
      expect(auditMock.log).toHaveBeenCalledWith(
        'Restauração de Carteira de Investimentos',
        'Primeiros Passos',
        'p-1',
        'inst-fin-1',
        { slug: 'reserva' },
      );
    });
  });
});
