import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Role, CandidateStage } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  ActivateCompanyDto,
  UpdateCandidateStageDto,
} from './dto/company.dto';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(verifyHash, 'hex'),
  );
}

@Injectable()
export class CompanyService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private authService: AuthService,
  ) {}

  // -------------------------------------------------------------
  // ADMIN OPERATIONS
  // -------------------------------------------------------------

  async create(dto: CreateCompanyDto, adminUser: any) {
    const existingCompany = await this.prisma.partnerCompany.findFirst({
      where: {
        OR: [
          { contactEmail: dto.contactEmail },
          ...(dto.cnpj ? [{ cnpj: dto.cnpj }] : []),
        ],
      },
    });

    if (existingCompany) {
      throw new BadRequestException(
        'Já existe uma empresa cadastrada com este e-mail de contato ou CNPJ.',
      );
    }

    // Check if user exists with this email
    let user = await this.prisma.user.findUnique({
      where: { email: dto.contactEmail },
    });

    if (user && user.role !== Role.COMPANY) {
      throw new BadRequestException(
        'Este e-mail já pertence a uma conta de aluno ou instrutor no sistema.',
      );
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: dto.contactEmail,
          name: dto.contactName,
          role: Role.COMPANY,
        },
      });
    }

    // Generate secure invite token with 7-day expiration
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const company = await this.prisma.partnerCompany.create({
      data: {
        name: dto.name,
        tradeName: dto.tradeName,
        cnpj: dto.cnpj,
        segment: dto.segment,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        notes: dto.notes,
        inviteToken,
        inviteExpiresAt,
        userId: user.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    await this.audit.log(
      'Cadastro de Empresa Parceira',
      company.name,
      company.id,
      adminUser?.id,
      {
        companyId: company.id,
        contactEmail: company.contactEmail,
        contactName: company.contactName,
      },
    );

    return company;
  }

  async findAllForAdmin(query?: { search?: string; status?: string }) {
    const where: any = {};

    if (query?.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { tradeName: { contains: s, mode: 'insensitive' } },
        { contactName: { contains: s, mode: 'insensitive' } },
        { contactEmail: { contains: s, mode: 'insensitive' } },
        { cnpj: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query?.status === 'active') {
      where.isActive = true;
    } else if (query?.status === 'inactive') {
      where.isActive = false;
    } else if (query?.status === 'pending') {
      where.termsAccepted = false;
    }

    const companies = await this.prisma.partnerCompany.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            interactions: true,
          },
        },
        interactions: {
          select: {
            stage: true,
          },
        },
      },
    });

    return companies.map((comp) => {
      const stats = {
        saved: comp.interactions.filter((i) => i.stage === CandidateStage.SAVED)
          .length,
        interview: comp.interactions.filter(
          (i) => i.stage === CandidateStage.INTERVIEW,
        ).length,
        hired: comp.interactions.filter((i) => i.stage === CandidateStage.HIRED)
          .length,
      };

      const isInviteExpired =
        comp.inviteExpiresAt && comp.inviteExpiresAt < new Date();

      return {
        ...comp,
        interactions: undefined,
        pipelineStats: stats,
        isInviteExpired,
      };
    });
  }

  async findOneForAdmin(id: string) {
    const company = await this.prisma.partnerCompany.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        interactions: {
          include: {
            talent: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatarUrl: true },
                },
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, adminUser: any) {
    const existing = await this.prisma.partnerCompany.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    const updated = await this.prisma.partnerCompany.update({
      where: { id },
      data: {
        name: dto.name,
        tradeName: dto.tradeName,
        cnpj: dto.cnpj,
        segment: dto.segment,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        notes: dto.notes,
        isActive: dto.isActive,
      },
      include: {
        user: true,
      },
    });

    // Keep associated user name and email in sync
    if (existing.userId && (dto.contactName || dto.contactEmail)) {
      await this.prisma.user.update({
        where: { id: existing.userId },
        data: {
          name: dto.contactName,
          email: dto.contactEmail,
        },
      });
    }

    await this.audit.log(
      'Atualização de Empresa Parceira',
      updated.name,
      updated.id,
      adminUser?.id,
      { changes: dto },
    );

    return updated;
  }

  async reissueInvite(id: string, adminUser: any) {
    const company = await this.prisma.partnerCompany.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.partnerCompany.update({
      where: { id },
      data: {
        inviteToken,
        inviteExpiresAt,
      },
    });

    await this.audit.log(
      'Reemissão de Convite para Empresa',
      company.name,
      company.id,
      adminUser?.id,
    );

    return {
      message: 'Novo convite gerado com sucesso.',
      inviteToken: updated.inviteToken,
      inviteExpiresAt: updated.inviteExpiresAt,
    };
  }

  async remove(id: string, adminUser: any) {
    const company = await this.prisma.partnerCompany.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    // Soft delete/deactivate to preserve historical interactions and audit logs
    const updated = await this.prisma.partnerCompany.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    await this.audit.log(
      'Desativação de Empresa Parceira',
      company.name,
      company.id,
      adminUser?.id,
    );

    return { message: 'Empresa desativada com sucesso.', company: updated };
  }

  async getStatsForAdmin() {
    const totalCompanies = await this.prisma.partnerCompany.count();
    const activeCompanies = await this.prisma.partnerCompany.count({
      where: { isActive: true, termsAccepted: true },
    });

    const interactions = await this.prisma.companyCandidateInteraction.groupBy({
      by: ['stage'],
      _count: {
        id: true,
      },
    });

    const stageMap: Record<string, number> = {
      SAVED: 0,
      INTERVIEW: 0,
      HIRED: 0,
      ARCHIVED: 0,
    };

    interactions.forEach((item) => {
      stageMap[item.stage] = item._count.id;
    });

    // Recent hiring events
    const recentHires =
      await this.prisma.companyCandidateInteraction.findMany({
        where: { stage: CandidateStage.HIRED },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          company: { select: { id: true, name: true } },
          talent: {
            include: {
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
      });

    return {
      totalCompanies,
      activeCompanies,
      totalSaved: stageMap.SAVED,
      totalInterview: stageMap.INTERVIEW,
      totalHired: stageMap.HIRED,
      recentHires,
    };
  }

  // -------------------------------------------------------------
  // PUBLIC ACCESS & ENTERPRISE ACTIVATION FLOW
  // -------------------------------------------------------------

  async validateInvitation(token: string) {
    if (!token) {
      throw new BadRequestException('Token de convite não informado.');
    }

    const company = await this.prisma.partnerCompany.findUnique({
      where: { inviteToken: token },
    });

    if (!company) {
      throw new NotFoundException(
        'Convite corporativo não encontrado ou link inválido.',
      );
    }

    if (company.inviteExpiresAt && company.inviteExpiresAt < new Date()) {
      throw new BadRequestException(
        'Este convite expirou. Solicite um novo link à coordenação do Brilha Mais.',
      );
    }

    return {
      valid: true,
      companyId: company.id,
      name: company.name,
      tradeName: company.tradeName,
      cnpj: company.cnpj,
      contactName: company.contactName,
      contactEmail: company.contactEmail,
      termsAccepted: company.termsAccepted,
    };
  }

  async activateCompany(dto: ActivateCompanyDto, ip?: string) {
    if (!dto.termsAccepted) {
      throw new BadRequestException(
        'O aceite dos Termos de Compromisso e Confidencialidade LGPD é obrigatório para ativação corporativa.',
      );
    }

    const company = await this.prisma.partnerCompany.findUnique({
      where: { inviteToken: dto.inviteToken },
      include: { user: true },
    });

    if (!company) {
      throw new NotFoundException('Convite inválido ou não encontrado.');
    }

    if (company.inviteExpiresAt && company.inviteExpiresAt < new Date()) {
      throw new BadRequestException('Este convite expirou.');
    }

    const hashedPassword = hashPassword(dto.password);

    // Ensure User exists and has role COMPANY
    let user = company.user;
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: company.contactEmail,
          name: company.contactName,
          role: Role.COMPANY,
          password: hashedPassword,
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          name: company.contactName,
          role: Role.COMPANY,
        },
      });
    }

    const updatedCompany = await this.prisma.partnerCompany.update({
      where: { id: company.id },
      data: {
        userId: user.id,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        termsAcceptedBy: `${company.contactName} (${company.contactEmail})`,
        inviteToken: null,
        inviteExpiresAt: null,
        isActive: true,
      },
    });

    await this.audit.log(
      'Ativação de Empresa e Aceite de Termos LGPD',
      company.name,
      updatedCompany.id,
      user.id,
      {
        companyId: company.id,
        contactName: company.contactName,
        contactEmail: company.contactEmail,
        ip,
      },
    );

    const loginRes = await this.authService.login(user);

    return {
      message: 'Conta corporativa ativada com sucesso.',
      access_token: loginRes.access_token,
      user: loginRes.user,
      company: updatedCompany,
    };
  }

  async loginCompany(body: { email: string; password?: string }) {
    const { email, password } = body;
    if (!email || !password) {
      throw new BadRequestException('E-mail e senha são obrigatórios.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        partnerCompany: true,
      },
    });

    if (!user || user.role !== Role.COMPANY) {
      throw new UnauthorizedException('Credenciais corporativas inválidas.');
    }

    if (!user.partnerCompany) {
      throw new UnauthorizedException(
        'Nenhuma empresa parceira vinculada a esta conta.',
      );
    }

    if (!user.partnerCompany.isActive) {
      throw new ForbiddenException(
        'O acesso desta empresa está suspenso. Entre em contato com a coordenação.',
      );
    }

    if (!user.password || !verifyPassword(password, user.password)) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    const authRes = await this.authService.login(user);

    return {
      access_token: authRes.access_token,
      user: authRes.user,
      company: user.partnerCompany,
    };
  }

  // -------------------------------------------------------------
  // COMPANY PORTAL OPERATIONS (Role: COMPANY)
  // -------------------------------------------------------------

  async getCompanyProfileForUser(userId: string) {
    const company = await this.prisma.partnerCompany.findUnique({
      where: { userId },
    });

    if (!company) {
      throw new NotFoundException('Perfil de empresa não encontrado.');
    }

    return company;
  }

  async findTalentsForCompany(
    userId: string,
    query: {
      search?: string;
      area?: string;
      availability?: string;
      city?: string;
    },
  ) {
    const company = await this.getCompanyProfileForUser(userId);

    // STRICT LGPD COMPLIANCE FILTER:
    // 1. Must be STUDENT
    // 2. Must have isAvailable: true
    // 3. Must have lgpdConsent: true
    // 4. If minor (isMinor: true), MUST have minorApproved: true
    const where: any = {
      isAvailable: true,
      lgpdConsent: true,
      user: {
        role: Role.STUDENT,
      },
      OR: [{ isMinor: false }, { isMinor: true, minorApproved: true }],
    };

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.availability) {
      where.availability = query.availability;
    }

    if (query.area) {
      where.areasOfInterest = { has: query.area };
    }

    if (query.search) {
      const s = query.search.trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { headline: { contains: s, mode: 'insensitive' } },
            { bio: { contains: s, mode: 'insensitive' } },
            { city: { contains: s, mode: 'insensitive' } },
            { user: { name: { contains: s, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const talents = await this.prisma.talentProfile.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            turmas: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        companyInteractions: {
          where: { companyId: company.id },
          select: {
            id: true,
            stage: true,
            notes: true,
            hiredAt: true,
            hiredRole: true,
            updatedAt: true,
          },
        },
      },
    });

    return talents.map((t) => {
      const interaction = t.companyInteractions?.[0] || null;
      return {
        ...t,
        companyInteractions: undefined,
        currentStage: interaction?.stage || null,
        interactionNotes: interaction?.notes || null,
        hiredRole: interaction?.hiredRole || null,
        hiredAt: interaction?.hiredAt || null,
      };
    });
  }

  async getTalentDetailsForCompany(
    userId: string,
    talentId: string,
    ip?: string,
  ) {
    const company = await this.getCompanyProfileForUser(userId);

    const talent = await this.prisma.talentProfile.findUnique({
      where: { id: talentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            turmas: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        companyInteractions: {
          where: { companyId: company.id },
        },
      },
    });

    if (!talent) {
      throw new NotFoundException('Perfil de talento não encontrado.');
    }

    // Verify compliance
    if (
      !talent.isAvailable ||
      !talent.lgpdConsent ||
      (talent.isMinor && !talent.minorApproved)
    ) {
      throw new ForbiddenException(
        'Este perfil não está disponível para consulta pública ou convênio.',
      );
    }

    // Audit the view
    await this.audit.log(
      'Visualização de Talento por Empresa',
      talent.user?.name || talent.id,
      talent.id,
      userId,
      {
        companyId: company.id,
        companyName: company.name,
        candidateName: talent.user?.name,
        ip,
      },
    );

    const interaction = talent.companyInteractions?.[0] || null;

    return {
      ...talent,
      companyInteractions: undefined,
      currentStage: interaction?.stage || null,
      interactionNotes: interaction?.notes || null,
      hiredRole: interaction?.hiredRole || null,
      hiredAt: interaction?.hiredAt || null,
    };
  }

  async recordResumeDownload(userId: string, talentId: string, ip?: string) {
    const company = await this.getCompanyProfileForUser(userId);

    const talent = await this.prisma.talentProfile.findUnique({
      where: { id: talentId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!talent || !talent.resumeUrl) {
      throw new NotFoundException('Currículo não encontrado para este aluno.');
    }

    // Strict compliance check
    if (
      !talent.isAvailable ||
      !talent.lgpdConsent ||
      (talent.isMinor && !talent.minorApproved)
    ) {
      throw new ForbiddenException(
        'Este currículo não está disponível para download.',
      );
    }

    // Nominal audit log
    await this.audit.log(
      'Download de Currículo por Empresa',
      talent.resumeFileName || 'Currículo',
      talent.id,
      userId,
      {
        companyId: company.id,
        companyName: company.name,
        candidateName: talent.user?.name,
        fileName: talent.resumeFileName,
        url: talent.resumeUrl,
        ip,
      },
    );

    return {
      resumeUrl: talent.resumeUrl,
      resumeFileName: talent.resumeFileName,
    };
  }

  async updateCandidateStage(
    userId: string,
    talentId: string,
    dto: UpdateCandidateStageDto,
  ) {
    const company = await this.getCompanyProfileForUser(userId);

    const talent = await this.prisma.talentProfile.findUnique({
      where: { id: talentId },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    if (!talent) {
      throw new NotFoundException('Candidato não encontrado.');
    }

    const interaction = await this.prisma.companyCandidateInteraction.upsert({
      where: {
        companyId_talentId: {
          companyId: company.id,
          talentId,
        },
      },
      create: {
        companyId: company.id,
        talentId,
        stage: dto.stage,
        notes: dto.notes,
        hiredRole: dto.hiredRole,
        hiredAt:
          dto.stage === CandidateStage.HIRED
            ? dto.hiredAt
              ? new Date(dto.hiredAt)
              : new Date()
            : null,
      },
      update: {
        stage: dto.stage,
        notes: dto.notes !== undefined ? dto.notes : undefined,
        hiredRole: dto.hiredRole !== undefined ? dto.hiredRole : undefined,
        hiredAt:
          dto.stage === CandidateStage.HIRED
            ? dto.hiredAt
              ? new Date(dto.hiredAt)
              : new Date()
            : null,
      },
    });

    await this.audit.log(
      'Atualização de Status de Candidato por Empresa',
      talent.user?.name || talent.id,
      talent.id,
      userId,
      {
        companyId: company.id,
        companyName: company.name,
        candidateName: talent.user?.name,
        stage: dto.stage,
        hiredRole: dto.hiredRole,
      },
    );

    return interaction;
  }

  async getPipeline(userId: string) {
    const company = await this.getCompanyProfileForUser(userId);

    const interactions =
      await this.prisma.companyCandidateInteraction.findMany({
        where: { companyId: company.id },
        include: {
          talent: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                  turmas: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

    // Group by stage
    const pipeline = {
      SAVED: [] as any[],
      INTERVIEW: [] as any[],
      HIRED: [] as any[],
      ARCHIVED: [] as any[],
    };

    interactions.forEach((item) => {
      if (pipeline[item.stage]) {
        pipeline[item.stage].push({
          interactionId: item.id,
          stage: item.stage,
          notes: item.notes,
          hiredRole: item.hiredRole,
          hiredAt: item.hiredAt,
          updatedAt: item.updatedAt,
          talent: {
            id: item.talent.id,
            userId: item.talent.userId,
            headline: item.talent.headline,
            city: item.talent.city,
            state: item.talent.state,
            availability: item.talent.availability,
            areasOfInterest: item.talent.areasOfInterest,
            resumeUrl: item.talent.resumeUrl,
            resumeFileName: item.talent.resumeFileName,
            phone: item.talent.phone,
            user: item.talent.user,
          },
        });
      }
    });

    return {
      company: {
        id: company.id,
        name: company.name,
        contactName: company.contactName,
      },
      pipeline,
      counts: {
        saved: pipeline.SAVED.length,
        interview: pipeline.INTERVIEW.length,
        hired: pipeline.HIRED.length,
        archived: pipeline.ARCHIVED.length,
        total: interactions.length,
      },
    };
  }
}
