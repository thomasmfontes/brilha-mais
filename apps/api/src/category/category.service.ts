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
  ) { }

  private getCache(key: string) {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) { this.cache.delete(key); return null; }
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
      // Fetch user role and assigned areas in parallel
      const [user, instructorAreas, studentTurma] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, locationId: true } }),
        this.prisma.instructorArea.findMany({ where: { userId }, select: { categoryId: true } }),
        this.prisma.turma.findFirst({
          where: { users: { some: { id: userId } } },
          include: { areas: true }
        })
      ]);

      if (user?.role === 'STUDENT') {
        const areaIds = studentTurma?.areas.map(a => a.categoryId) || [];
        where.id = { ...where.id, in: areaIds };
      } else if (user?.role === 'INSTRUCTOR') {
        where.id = { ...where.id, in: instructorAreas.map((a) => a.categoryId) };
      }

      // Scope by location: (Category.locationId === user.locationId OR Category.locationId === null)
      if (user?.locationId) {
        where.OR = [
          { locationId: user.locationId },
          { locationId: null }
        ];
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

  async create(name: string, icon?: string, locationId?: string, actorId?: string) {
    const category = await (this.prisma.category.create as any)({ data: { name, icon, locationId } });
    this.invalidateCache();

    await this.audit.log('Criação de Área', name, category.id, actorId, { name, icon });
    return category;
  }

  async update(id: string, name: string, icon?: string) {
    const result = await this.prisma.category.update({ where: { id }, data: { name, icon } });
    this.invalidateCache();
    return result;
  }

  async delete(id: string, actorId?: string) {
    const category = await this.prisma.category.delete({ where: { id } });
    this.invalidateCache();

    await this.audit.log('Exclusão de Área', category.name ?? 'Área', id, actorId, { name: category.name });
    return category;
  }
}
