import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AreaAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;
    if (user.role === 'ADMIN') return true;

    const courseId = request.params.courseId || request.body.courseId;
    if (!courseId) return true; // Detailed checks should be in specific controllers

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { categoryId: true },
    });

    if (!course || !course.categoryId) return true;

    if (user.role === 'INSTRUCTOR') {
      const assignment = await this.prisma.instructorArea.findUnique({
        where: {
          userId_categoryId: {
            userId: user.id,
            categoryId: course.categoryId,
          },
        },
      });
      if (!assignment)
        throw new ForbiddenException(
          'You are not assigned to this knowledge area',
        );
    }

    if (user.role === 'STUDENT') {
      const assignment = await this.prisma.studentArea.findUnique({
        where: {
          userId_categoryId: {
            userId: user.id,
            categoryId: course.categoryId,
          },
        },
      });
      if (!assignment)
        throw new ForbiddenException(
          'You do not have access to this knowledge area',
        );
    }

    return true;
  }
}
