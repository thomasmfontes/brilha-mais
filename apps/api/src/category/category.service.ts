import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class CategoryService {
  private cache = new Map<string, { data: any; expiresAt: number }>();

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private getCache(key: string) {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache(key: string, data: any) {
    this.cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  invalidateCache() {
    this.cache.clear();
  }

  async findAll(userId?: string) {
    const cacheKey = userId ?? '__all__';
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const where: any = {};

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          turmas: { include: { areas: true } },
          studentAreas: true,
        },
      });

      if (user?.role === 'STUDENT') {
        const areaIds = Array.from(
          new Set([
            ...user.turmas.flatMap((t) => t.areas.map((a) => a.categoryId)),
            ...user.studentAreas.map((a) => a.categoryId),
          ]),
        );

        where.id = { in: areaIds };
        // We do NOT filter categories by locationId for students here
        // because the assignment to the Category via Turma/Area is the source of truth.
        // This allows shared categories (like RH) to work across units.
      } else if (user?.role === 'INSTRUCTOR') {
        const instructorAreas = await this.prisma.instructorArea.findMany({
          where: { userId },
          select: { categoryId: true },
        });
        where.id = { in: instructorAreas.map((a) => a.categoryId) };
        // Same for instructors: if they are assigned to an area, they should see it.
      }
    }

    const result = await this.prisma.category.findMany({
      where,
      include: {
        _count: { select: { courses: true } },
        instructors: { include: { user: true } },
      },
    });

    this.setCache(cacheKey, result);
    return result;
  }

  async create(
    name: string,
    icon?: string,
    locationId?: string,
    actorId?: string,
  ) {
    const category = await (this.prisma.category.create as any)({
      data: { name, icon, locationId },
    });
    this.invalidateCache();

    await this.audit.log('Criação de Área', name, category.id, actorId, {
      name,
      icon,
    });
    return category;
  }

  async update(id: string, name: string, icon?: string) {
    const result = await this.prisma.category.update({
      where: { id },
      data: { name, icon },
    });
    this.invalidateCache();
    return result;
  }

  async delete(id: string, actorId?: string) {
    const category = await this.prisma.category.delete({ where: { id } });
    this.invalidateCache();

    await this.audit.log(
      'Exclusão de Área',
      category.name ?? 'Área',
      id,
      actorId,
      { name: category.name },
    );
    return category;
  }
}
