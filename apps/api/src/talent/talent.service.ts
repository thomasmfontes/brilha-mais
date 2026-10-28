import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateTalentProfileDto, UpdateResumeDto } from './dto/update-talent-profile.dto';

@Injectable()
export class TalentService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getOrCreateProfile(userId: string) {
    let profile = await this.prisma.talentProfile.findUnique({
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

    if (!profile) {
      profile = await this.prisma.talentProfile.create({
        data: {
          userId,
          isAvailable: true,
          areasOfInterest: [],
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
            },
          },
        },
      });
    }

    return profile;
  }

  async updateProfile(userId: string, dto: UpdateTalentProfileDto) {
    // Ensure profile exists
    await this.getOrCreateProfile(userId);

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

    const updated = await this.prisma.talentProfile.update({
      where: { userId },
      data: dataToUpdate,
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
    await this.getOrCreateProfile(userId);

    const updated = await this.prisma.talentProfile.update({
      where: { userId },
      data: {
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
    await this.getOrCreateProfile(userId);

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
  }) {
    const where: any = {};

    if (query.availableOnly) {
      where.isAvailable = true;
    }

    if (query.hasResumeOnly) {
      where.resumeUrl = { not: null };
    }

    if (query.area) {
      where.areasOfInterest = { has: query.area };
    }

    if (query.turmaId) {
      where.user = {
        turmas: {
          some: {
            id: query.turmaId,
          },
        },
      };
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

    return profile;
  }

  async getStats() {
    const totalProfiles = await this.prisma.talentProfile.count();
    const withResume = await this.prisma.talentProfile.count({
      where: { resumeUrl: { not: null } },
    });
    const lgpdConsented = await this.prisma.talentProfile.count({
      where: { lgpdConsent: true },
    });
    const minorsWithParentConsent = await this.prisma.talentProfile.count({
      where: { isMinor: true, parentConsent: true },
    });
    const available = await this.prisma.talentProfile.count({
      where: { isAvailable: true, lgpdConsent: true },
    });

    return {
      totalProfiles,
      withResume,
      lgpdConsented,
      minorsWithParentConsent,
      available,
    };
  }
}
