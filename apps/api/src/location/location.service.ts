import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class LocationService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll() {
    const locations = await this.prisma.location.findMany({
      include: {
        _count: {
          select: {
            turmas: true,
            courses: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return Promise.all(
      locations.map(async (loc) => {
        const [students, instructors, admins] = await Promise.all([
          this.prisma.user.count({ where: { locationId: loc.id, role: 'STUDENT' } }),
          this.prisma.user.count({ where: { locationId: loc.id, role: 'INSTRUCTOR' } }),
          this.prisma.user.count({ where: { locationId: loc.id, role: 'ADMIN' } }),
        ]);

        return {
          ...loc,
          counts: {
            students,
            instructors,
            admins,
          },
        };
      }),
    );
  }

  async findOne(id: string) {
    return this.prisma.location.findUnique({
      where: { id },
      include: {
        users: true,
        turmas: true,
      },
    });
  }

  async create(name: string, actorId?: string) {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const location = await this.prisma.location.create({
      data: { name, slug },
    });

    await this.audit.log('Criação de Localidade', name, location.id, actorId, { name, slug });
    return location;
  }

  async update(id: string, name: string, actorId?: string) {
    const location = await this.prisma.location.update({
      where: { id },
      data: { name },
    });

    await this.audit.log('Atualização de Localidade', name, id, actorId, { name });
    return location;
  }

  async delete(id: string, actorId?: string) {
    const location = await this.prisma.location.findUnique({ where: { id } });
    if (!location) throw new Error('Location not found');

    await this.prisma.location.delete({ where: { id } });

    await this.audit.log('Exclusão de Localidade', location.name, id, actorId, { name: location.name });
    return location;
  }
}
