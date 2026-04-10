import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const ADMIN_CACHE_TTL_MS = 2 * 60 * 1000;   // 2 minutes
const INSTRUCTOR_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

@Injectable()
export class StatsService {
  private adminCache = new Map<string, { data: any; expiresAt: number }>();
  private instructorCache = new Map<string, { data: any; expiresAt: number }>();

  constructor(private prisma: PrismaService) { }

  async getAdminStats(locationId?: string) {
    const cacheKey = locationId || 'GLOBAL';
    const cached = this.adminCache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    // Filters for Unit Admins
    const userWhere = locationId ? { locationId } : {};
    const enrollmentWhere = locationId ? { user: { locationId } } : { user: { role: 'STUDENT' as const } };
    const logWhere = locationId ? { user: { locationId } } : {};
    const courseWhere = locationId ? { locationId } : {};

    const [totalUsers, totalCourses, totalEnrollments, recentLogs] =
      await Promise.all([
        this.prisma.user.count({ where: userWhere }),
        this.prisma.course.count({ where: courseWhere }),
        this.prisma.enrollment.count({ where: enrollmentWhere }),
        this.prisma.auditLog.findMany({
          where: logWhere,
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true } } },
        }),
      ]);

    const data = {
      totalUsers,
      totalCourses,
      totalEnrollments,
      recentLogs: recentLogs.map((log) => ({
        user: log.user?.name || 'Sistema',
        action: log.action,
        entity: log.entity,
        time: log.createdAt,
      })),
    };

    this.adminCache.set(cacheKey, { data, expiresAt: Date.now() + ADMIN_CACHE_TTL_MS });
    return data;
  }

  // Call this whenever a user/course/enrollment changes to bust the admin cache
  invalidateAdminCache(locationId?: string) {
    if (locationId) {
      this.adminCache.delete(locationId);
    } else {
      this.adminCache.clear();
    }
  }

  async getInstructorStats(instructorId: string) {
    const cached = this.instructorCache.get(instructorId);
    if (cached && Date.now() < cached.expiresAt) return cached.data;

    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const [
        totalStudents,
        totalProgressEntries,
        totalCourses,
        lastMonthStudents,
        prevMonthStudents,
        lastMonthProgress,
        prevMonthProgress
      ] = await Promise.all([
        this.prisma.enrollment.count({ 
          where: { 
            course: { instructorId },
            user: { role: 'STUDENT' }
          } 
        }),
        this.prisma.progress.findMany({
          where: { isCompleted: true, lesson: { module: { course: { instructorId } } } },
          include: { lesson: { select: { duration: true } } }
        }),
        this.prisma.course.count({ where: { instructorId } }),
        this.prisma.enrollment.count({
          where: { 
            course: { instructorId }, 
            enrolledAt: { gte: thirtyDaysAgo },
            user: { role: 'STUDENT' }
          }
        }),
        this.prisma.enrollment.count({
          where: { 
            course: { instructorId }, 
            enrolledAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
            user: { role: 'STUDENT' }
          }
        }),
        this.prisma.progress.findMany({
          where: { isCompleted: true, updatedAt: { gte: thirtyDaysAgo }, lesson: { module: { course: { instructorId } } } },
          include: { lesson: { select: { duration: true } } }
        }),
        this.prisma.progress.findMany({
          where: { isCompleted: true, updatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, lesson: { module: { course: { instructorId } } } },
          include: { lesson: { select: { duration: true } } }
        })
      ]);

      const calculateMinutes = (entries: any[]) =>
        Math.round((entries || []).reduce((acc, p) => acc + (p.lesson?.duration || 0), 0) / 60);

      const totalMinutes = calculateMinutes(totalProgressEntries);
      const lastMonthMinutes = calculateMinutes(lastMonthProgress);
      const prevMonthMinutes = calculateMinutes(prevMonthProgress);

      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? `+100% este mês` : "0% este mês";
        const diff = ((current - previous) / previous) * 100;
        return `${diff >= 0 ? '+' : ''}${Math.round(diff)}% este mês`;
      };

      const data = {
        totalStudents: totalStudents || 0,
        totalMinutes: totalMinutes >= 1000 ? `${(totalMinutes / 1000).toFixed(1)}k` : totalMinutes.toString(),
        totalCourses: totalCourses || 0,
        studentsTrend: calculateTrend(lastMonthStudents, prevMonthStudents),
        minutesTrend: calculateTrend(lastMonthMinutes, prevMonthMinutes)
      };

      this.instructorCache.set(instructorId, { data, expiresAt: Date.now() + INSTRUCTOR_CACHE_TTL_MS });
      return data;
    } catch (error) {
      console.error('Error in getInstructorStats:', error);
      throw error;
    }
  }
}
