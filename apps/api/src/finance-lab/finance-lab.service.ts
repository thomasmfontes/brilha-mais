import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma.service';
import { DEFAULT_INVESTMENT_PORTFOLIOS } from './default-portfolios';
import { UpdatePortfolioDto } from './dto/finance-lab.dto';

export function isFinanceCategoryName(name?: string | null): boolean {
  const norm = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  return (
    norm.includes('financ') ||
    norm.includes('investiment') ||
    norm.includes('economia')
  );
}

const UPDATED_BY_SELECT = {
  id: true,
  name: true,
  avatarUrl: true,
  role: true,
};

@Injectable()
export class FinanceLabService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private hasFinanceCategory(
    areas?: Array<{ category?: { name?: string | null } | null }>,
  ): boolean {
    return (areas || []).some((area) =>
      isFinanceCategoryName(area?.category?.name),
    );
  }

  async verifyFinanceAccess(userId: string) {
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
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      return { user, canEdit: true };
    }

    if (user.role === 'INSTRUCTOR') {
      if (this.hasFinanceCategory(user.assignedAreas)) {
        return { user, canEdit: true };
      }
      throw new ForbiddenException(
        'A Calculadora de Investimentos é exclusiva para alunos e instrutores da área de Finanças.',
      );
    }

    if (user.role === 'STUDENT') {
      const hasDirectArea = this.hasFinanceCategory(user.studentAreas);
      const hasTurmaArea = (user.turmas || []).some((turma) =>
        this.hasFinanceCategory(turma.areas),
      );
      const hasFinanceEnrollment = (user.enrollments || []).some(
        (enrollment) =>
          isFinanceCategoryName(enrollment.course?.category?.name) ||
          isFinanceCategoryName(enrollment.course?.title),
      );

      if (hasDirectArea || hasTurmaArea || hasFinanceEnrollment) {
        return { user, canEdit: false };
      }
    }

    throw new ForbiddenException(
      'A Calculadora de Investimentos é exclusiva para alunos e instrutores da área de Finanças.',
    );
  }

  async verifyFinanceEditorAccess(userId: string) {
    const access = await this.verifyFinanceAccess(userId);
    if (!access.canEdit) {
      throw new ForbiddenException(
        'Apenas instrutores de Finanças e administradores podem editar as carteiras-modelo.',
      );
    }
    return access;
  }

  private async ensureDefaultPortfolios() {
    for (const template of DEFAULT_INVESTMENT_PORTFOLIOS) {
      await this.prisma.investmentPortfolio.upsert({
        where: { slug: template.slug },
        update: {},
        create: {
          slug: template.slug,
          title: template.title,
          subtitle: template.subtitle,
          description: template.description,
          riskLevel: template.riskLevel,
          recommendedHorizon: template.recommendedHorizon,
          expectedAnnualPct: template.expectedAnnualPct,
          benchmarkNote: template.benchmarkNote,
          order: template.order,
          allocations: template.allocations as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  private async findFinanceInstructors() {
    try {
      const instructors = await this.prisma.user.findMany({
        where: { role: 'INSTRUCTOR' },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          assignedAreas: { include: { category: true } },
        },
        orderBy: { name: 'asc' },
      });

      return instructors
        .filter((inst) => this.hasFinanceCategory(inst.assignedAreas))
        .map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl }));
    } catch {
      return [];
    }
  }

  async getPortfolios(userId: string) {
    const { canEdit } = await this.verifyFinanceAccess(userId);
    const instructors = await this.findFinanceInstructors();

    try {
      let portfolios = await this.prisma.investmentPortfolio.findMany({
        orderBy: { order: 'asc' },
        include: {
          updatedBy: { select: UPDATED_BY_SELECT },
        },
      });

      if (portfolios.length === 0) {
        await this.ensureDefaultPortfolios();
        portfolios = await this.prisma.investmentPortfolio.findMany({
          orderBy: { order: 'asc' },
          include: {
            updatedBy: { select: UPDATED_BY_SELECT },
          },
        });
      }

      return {
        portfolios,
        instructors,
        canEdit,
        isFallback: false,
      };
    } catch (error: any) {
      if (error?.code === 'P2021') {
        const now = new Date().toISOString();
        return {
          portfolios: DEFAULT_INVESTMENT_PORTFOLIOS.map((item) => ({
            id: `default-${item.slug}`,
            ...item,
            updatedById: null,
            updatedBy: null,
            createdAt: now,
            updatedAt: now,
          })),
          instructors,
          canEdit,
          isFallback: true,
        };
      }
      throw error;
    }
  }

  private async upsertPortfolioRecord(
    slug: string,
    userId: string,
    payload: {
      title: string;
      subtitle: string;
      description: string;
      riskLevel: string;
      recommendedHorizon: string;
      expectedAnnualPct: number;
      benchmarkNote: string | null;
      order: number;
      allocations: Prisma.InputJsonValue;
    },
  ) {
    try {
      await this.ensureDefaultPortfolios();
      const sharedFields = {
        title: payload.title,
        subtitle: payload.subtitle,
        description: payload.description,
        riskLevel: payload.riskLevel,
        recommendedHorizon: payload.recommendedHorizon,
        expectedAnnualPct: payload.expectedAnnualPct,
        benchmarkNote: payload.benchmarkNote,
        allocations: payload.allocations,
        updatedById: userId,
      };
      return await this.prisma.investmentPortfolio.upsert({
        where: { slug },
        update: sharedFields,
        create: {
          slug,
          order: payload.order,
          ...sharedFields,
        },
        include: {
          updatedBy: { select: UPDATED_BY_SELECT },
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2021') {
        throw new BadRequestException(
          'A tabela de carteiras ainda não foi migrada no banco de dados.',
        );
      }
      throw error;
    }
  }

  async updatePortfolio(userId: string, slug: string, dto: UpdatePortfolioDto) {
    await this.verifyFinanceEditorAccess(userId);

    const isKnownDefault = DEFAULT_INVESTMENT_PORTFOLIOS.some(
      (item) => item.slug === slug,
    );

    let existing: { id: string; slug: string } | null = null;
    try {
      existing = await this.prisma.investmentPortfolio.findUnique({
        where: { slug },
        select: { id: true, slug: true },
      });
    } catch (error: any) {
      if (error?.code === 'P2021') {
        throw new BadRequestException(
          'A tabela de carteiras ainda não foi migrada no banco de dados.',
        );
      }
      throw error;
    }

    if (!isKnownDefault && !existing) {
      throw new NotFoundException('Carteira de investimentos não encontrada.');
    }

    const totalPct = dto.allocations.reduce(
      (acc, item) => acc + Number(item.percentage || 0),
      0,
    );
    if (Math.abs(totalPct - 100) > 0.01) {
      throw new BadRequestException(
        `A soma das alocações deve ser exatamente 100% (atual: ${totalPct.toFixed(1)}%).`,
      );
    }

    const defaultTemplate = DEFAULT_INVESTMENT_PORTFOLIOS.find(
      (item) => item.slug === slug,
    );
    const updated = await this.upsertPortfolioRecord(slug, userId, {
      title: dto.title.trim(),
      subtitle: dto.subtitle.trim(),
      description: dto.description.trim(),
      riskLevel: dto.riskLevel.trim(),
      recommendedHorizon: dto.recommendedHorizon.trim(),
      expectedAnnualPct: dto.expectedAnnualPct,
      benchmarkNote: dto.benchmarkNote?.trim() || null,
      order: defaultTemplate?.order ?? 99,
      allocations: dto.allocations.map((item) => ({
        ...item,
      })) as unknown as Prisma.InputJsonValue,
    });

    await this.audit.log(
      'Atualização de Carteira de Investimentos',
      updated.title,
      updated.id,
      userId,
      {
        slug,
        totalAllocations: dto.allocations.length,
        expectedAnnualPct: dto.expectedAnnualPct,
      },
    );

    return updated;
  }

  async resetPortfolio(userId: string, slug: string) {
    await this.verifyFinanceEditorAccess(userId);

    const template = DEFAULT_INVESTMENT_PORTFOLIOS.find(
      (item) => item.slug === slug,
    );
    if (!template) {
      throw new NotFoundException('Carteira padrão não encontrada.');
    }

    const restored = await this.upsertPortfolioRecord(slug, userId, {
      title: template.title,
      subtitle: template.subtitle,
      description: template.description,
      riskLevel: template.riskLevel,
      recommendedHorizon: template.recommendedHorizon,
      expectedAnnualPct: template.expectedAnnualPct,
      benchmarkNote: template.benchmarkNote,
      order: template.order,
      allocations: template.allocations.map((item) => ({
        ...item,
      })) as unknown as Prisma.InputJsonValue,
    });

    await this.audit.log(
      'Restauração de Carteira de Investimentos',
      restored.title,
      restored.id,
      userId,
      { slug },
    );

    return restored;
  }
}
