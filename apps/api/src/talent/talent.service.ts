import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  UpdateTalentProfileDto,
  UpdateResumeDto,
  UploadParentDocumentDto,
  ToggleMinorApprovalDto,
} from './dto/update-talent-profile.dto';

@Injectable()
export class TalentService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.talentProfile.findUnique({
      where: { userId },
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
      },
    });

    if (profile) {
      return profile;
    }

    // In-memory default for new profiles - DO NOT persist to database on read
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
    });

    return {
      userId,
      phone: null,
      birthDate: null,
      city: null,
      state: null,
      headline: null,
      bio: null,
      areasOfInterest: [],
      availability: null,
      linkedinUrl: null,
      resumeUrl: null,
      resumeFileName: null,
      resumeFileSize: null,
      resumeUpdatedAt: null,
      isAvailable: true,
      lgpdConsent: false,
      lgpdConsentAt: null,
      isMinor: false,
      parentName: null,
      parentContact: null,
      parentConsent: false,
      parentDocumentUrl: null,
      parentDocumentFileName: null,
      parentDocumentUploadedAt: null,
      minorApproved: false,
      minorApprovedAt: null,
      minorApprovedById: null,
      user,
    };
  }

  // Alias for backward compatibility if any internal code calls it
  async getOrCreateProfile(userId: string) {
    return this.getProfile(userId);
  }

  async updateProfile(userId: string, dto: UpdateTalentProfileDto) {
    const dataToUpdate: any = {};

    if (dto.phone !== undefined) dataToUpdate.phone = dto.phone || null;
    if (dto.city !== undefined) dataToUpdate.city = dto.city || null;
    if (dto.state !== undefined) dataToUpdate.state = dto.state || null;
    if (dto.headline !== undefined) dataToUpdate.headline = dto.headline || null;
    if (dto.bio !== undefined) dataToUpdate.bio = dto.bio || null;
    if (dto.areasOfInterest !== undefined) {
      dataToUpdate.areasOfInterest = Array.isArray(dto.areasOfInterest)
        ? dto.areasOfInterest
        : [];
    }
    if (dto.availability !== undefined) dataToUpdate.availability = dto.availability || null;
    if (dto.linkedinUrl !== undefined) dataToUpdate.linkedinUrl = dto.linkedinUrl || null;
    if (dto.isAvailable !== undefined) dataToUpdate.isAvailable = Boolean(dto.isAvailable);

    if (dto.birthDate) {
      const parsed = new Date(dto.birthDate);
      dataToUpdate.birthDate = isNaN(parsed.getTime()) ? null : parsed;
    } else if (dto.birthDate === null || dto.birthDate === '') {
      dataToUpdate.birthDate = null;
    }

    if (dto.lgpdConsent !== undefined) {
      dataToUpdate.lgpdConsent = Boolean(dto.lgpdConsent);
      dataToUpdate.lgpdConsentAt = dto.lgpdConsent ? new Date() : null;
    }

    if (dto.isMinor !== undefined) dataToUpdate.isMinor = Boolean(dto.isMinor);
    if (dto.parentName !== undefined) dataToUpdate.parentName = dto.parentName || null;
    if (dto.parentContact !== undefined) dataToUpdate.parentContact = dto.parentContact || null;
    if (dto.parentConsent !== undefined) dataToUpdate.parentConsent = Boolean(dto.parentConsent);

    const userSelect = {
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
    };

    const updated = await this.prisma.talentProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...dataToUpdate,
      },
      update: dataToUpdate,
      include: {
        user: {
          select: userSelect,
        },
      },
    });

    await this.audit.log(
      'Atualização de Perfil de Talentos',
      updated.user.name || 'Aluno',
      userId,
      userId,
      {
        lgpdConsent: updated.lgpdConsent,
        isMinor: updated.isMinor,
        isAvailable: updated.isAvailable,
        headline: updated.headline,
      },
    );

    return updated;
  }

  async updateResume(userId: string, dto: UpdateResumeDto) {
    const updated = await this.prisma.talentProfile.upsert({
      where: { userId },
      create: {
        userId,
        resumeUrl: dto.resumeUrl,
        resumeFileName: dto.resumeFileName,
        resumeFileSize: dto.resumeFileSize,
        resumeUpdatedAt: new Date(),
      },
      update: {
        resumeUrl: dto.resumeUrl,
        resumeFileName: dto.resumeFileName,
        resumeFileSize: dto.resumeFileSize,
        resumeUpdatedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Also mirror into studentMaterial for consistency if not already there
    try {
      await this.prisma.studentMaterial.create({
        data: {
          name: dto.resumeFileName,
          url: dto.resumeUrl,
          type: dto.resumeFileName.endsWith('.pdf')
            ? 'application/pdf'
            : 'application/octet-stream',
          size: dto.resumeFileSize,
          category: 'RESUME',
          userId,
        },
      });
    } catch (e) {
      // Ignore mirror error
    }

    await this.audit.log(
      'Upload de Currículo (Banco de Talentos)',
      dto.resumeFileName,
      userId,
      userId,
      {
        fileName: dto.resumeFileName,
        url: dto.resumeUrl,
      },
    );

    return updated;
  }

  async removeResume(userId: string) {
    const existing = await this.prisma.talentProfile.findUnique({
      where: { userId },
    });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.talentProfile.update({
      where: { userId },
      data: {
        resumeUrl: null,
        resumeFileName: null,
        resumeFileSize: null,
        resumeUpdatedAt: null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await this.audit.log(
      'Remoção de Currículo (Banco de Talentos)',
      'Currículo Removido',
      userId,
      userId,
    );

    return updated;
  }

  async findAllForAdmin(query: {
    search?: string;
    turmaId?: string;
    area?: string;
    availableOnly?: boolean;
    hasResumeOnly?: boolean;
    minorPendingOnly?: boolean;
    minorApprovedOnly?: boolean;
  }) {
    const where: any = {
      user: {
        role: Role.STUDENT,
        ...(query.turmaId
          ? {
              turmas: {
                some: {
                  id: query.turmaId,
                },
              },
            }
          : {}),
      },
    };

    if (query.availableOnly) {
      where.isAvailable = true;
    }

    if (query.hasResumeOnly) {
      where.resumeUrl = { not: null };
    }

    if (query.minorPendingOnly) {
      where.isMinor = true;
      where.minorApproved = false;
    } else if (query.minorApprovedOnly) {
      where.isMinor = true;
      where.minorApproved = true;
    }

    if (query.area) {
      where.areasOfInterest = { has: query.area };
    }

    if (query.search) {
      where.OR = [
        { user: { name: { contains: query.search, mode: 'insensitive' } } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { headline: { contains: query.search, mode: 'insensitive' } },
        { bio: { contains: query.search, mode: 'insensitive' } },
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
            enrollments: {
              select: {
                course: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
            meetingAttendances: {
              select: { id: true },
            },
          },
        },
      },
    });

    return talents;
  }

  async findOneForAdmin(idOrUserId: string) {
    const profile = await this.prisma.talentProfile.findFirst({
      where: {
        OR: [{ id: idOrUserId }, { userId: idOrUserId }],
      },
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
            enrollments: {
              select: {
                course: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
            meetingAttendances: {
              select: {
                id: true,
                timestamp: true,
                meeting: {
                  select: {
                    title: true,
                    date: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil de talento não encontrado');
    }

    let approverName: string | null = null;
    if (profile.minorApprovedById) {
      const approver = await this.prisma.user.findUnique({
        where: { id: profile.minorApprovedById },
        select: { name: true, email: true },
      });
      approverName = approver?.name || approver?.email || null;
    }

    return {
      ...profile,
      approverName,
    };
  }

  async uploadParentDocument(
    idOrUserId: string,
    adminUser: any,
    dto: UploadParentDocumentDto,
  ) {
    const existing = await this.findOneForAdmin(idOrUserId);

    const updated = await this.prisma.talentProfile.update({
      where: { id: existing.id },
      data: {
        parentDocumentUrl: dto.parentDocumentUrl,
        parentDocumentFileName: dto.parentDocumentFileName,
        parentDocumentUploadedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await this.audit.log(
      'Upload de Termo dos Pais (Menor de Idade)',
      `${updated.user.name || 'Aluno'} - ${dto.parentDocumentFileName}`,
      adminUser.id,
      updated.userId,
      {
        fileName: dto.parentDocumentFileName,
        url: dto.parentDocumentUrl,
      },
    );

    return this.findOneForAdmin(updated.id);
  }

  async removeParentDocument(idOrUserId: string, adminUser: any) {
    const existing = await this.findOneForAdmin(idOrUserId);

    const updated = await this.prisma.talentProfile.update({
      where: { id: existing.id },
      data: {
        parentDocumentUrl: null,
        parentDocumentFileName: null,
        parentDocumentUploadedAt: null,
        minorApproved: false,
        minorApprovedAt: null,
        minorApprovedById: null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await this.audit.log(
      'Remoção de Termo dos Pais (Menor de Idade)',
      `Termo removido de ${updated.user.name || 'Aluno'}`,
      adminUser.id,
      updated.userId,
    );

    return this.findOneForAdmin(updated.id);
  }

  async toggleMinorApproval(
    idOrUserId: string,
    adminUser: any,
    dto: ToggleMinorApprovalDto,
  ) {
    const existing = await this.findOneForAdmin(idOrUserId);

    const updated = await this.prisma.talentProfile.update({
      where: { id: existing.id },
      data: {
        minorApproved: dto.approved,
        minorApprovedAt: dto.approved ? new Date() : null,
        minorApprovedById: dto.approved ? adminUser.id : null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await this.audit.log(
      dto.approved
        ? 'Liberação de Menor no Banco de Talentos'
        : 'Revogação de Liberação de Menor',
      `Status de ${updated.user.name || 'Aluno'}: ${dto.approved ? 'Liberado para Empresas' : 'Pendente'}`,
      adminUser.id,
      updated.userId,
      {
        minorApproved: dto.approved,
        approvedBy: adminUser.name || adminUser.email,
      },
    );

    return this.findOneForAdmin(updated.id);
  }

  async getStats() {
    const studentFilter = { user: { role: Role.STUDENT } };

    const totalProfiles = await this.prisma.talentProfile.count({
      where: studentFilter,
    });
    const withResume = await this.prisma.talentProfile.count({
      where: { ...studentFilter, resumeUrl: { not: null } },
    });
    const lgpdConsented = await this.prisma.talentProfile.count({
      where: { ...studentFilter, lgpdConsent: true },
    });
    const minorsWithParentConsent = await this.prisma.talentProfile.count({
      where: { ...studentFilter, isMinor: true, parentConsent: true },
    });
    const minorsPendingApproval = await this.prisma.talentProfile.count({
      where: { ...studentFilter, isMinor: true, minorApproved: false },
    });
    const minorsApproved = await this.prisma.talentProfile.count({
      where: { ...studentFilter, isMinor: true, minorApproved: true },
    });
    // Available for companies: must be student, available, consented LGPD, and if minor, must be approved by admin
    const available = await this.prisma.talentProfile.count({
      where: {
        ...studentFilter,
        isAvailable: true,
        lgpdConsent: true,
        OR: [
          { isMinor: false },
          { isMinor: true, minorApproved: true },
        ],
      },
    });

    return {
      totalProfiles,
      withResume,
      lgpdConsented,
      minorsWithParentConsent,
      minorsPendingApproval,
      minorsApproved,
      available,
    };
  }
}
