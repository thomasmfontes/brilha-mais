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

    // Get all user counts grouped by location and role in a single efficient query
    const userGroups = await this.prisma.user.groupBy({
      by: ['locationId', 'role'],
      _count: true,
      where: {
        locationId: { not: null },
      },
    });

    return locations.map((loc) => {
      return {
        ...loc,
        counts: {
          students:
            userGroups.find(
              (g) =>
                (g.role as string) === 'STUDENT' && g.locationId === loc.id,
            )?._count ?? 0,
          instructors:
            userGroups.find(
              (g) =>
                (g.role as string) === 'INSTRUCTOR' && g.locationId === loc.id,
            )?._count ?? 0,
          admins:
            userGroups.find(
              (g) => (g.role as string) === 'ADMIN' && g.locationId === loc.id,
            )?._count ?? 0,
          supers:
            userGroups.find(
              (g) =>
                (g.role as string) === 'SUPER_ADMIN' && g.locationId === loc.id,
            )?._count ?? 0,
        },
      };
    });
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

    await this.audit.log('Criação de Localidade', name, location.id, actorId, {
      name,
      slug,
    });
    return location;
  }

  async update(id: string, name: string, actorId?: string) {
    const location = await this.prisma.location.update({
      where: { id },
      data: { name },
    });

    await this.audit.log('Atualização de Localidade', name, id, actorId, {
      name,
    });
    return location;
  }

  async delete(id: string, actorId?: string) {
    const location = await this.prisma.location.findUnique({ where: { id } });
    if (!location) throw new Error('Location not found');

    await this.prisma.location.delete({ where: { id } });

    await this.audit.log('Exclusão de Localidade', location.name, id, actorId, {
      name: location.name,
    });
    return location;
  }
}
