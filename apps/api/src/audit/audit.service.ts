import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async log(
        action: string,
        entity: string,
        entityId?: string,
        userId?: string,
        details?: any,
    ) {
        try {
            return await this.prisma.auditLog.create({
                data: {
                    action,
                    entity,
                    entityId,
                    userId,
                    details: details || {},
                },
            });
        } catch (error) {
            console.error('Failed to create audit log:', error);
            // We don't throw here to avoid breaking the main operation
        }
    }

    async getActivityForInstructor(instructorId: string, isAdmin: boolean = false, limit: number = 50) {
        try {
            const where: any = {};

            if (!isAdmin) {
                // For instructors, only show logs related to their courses
                where.OR = [
                    {
                        entity: 'Curso',
                        entityId: {
                            in: await this.prisma.course.findMany({
                                where: { instructorId },
                                select: { id: true }
                            }).then(courses => courses.map(c => c.id))
                        }
                    },
                    {
                        // Match activities where details contains a courseId from this instructor
                        details: {
                            path: ['courseId'],
                            array_contains: await this.prisma.course.findMany({
                                where: { instructorId },
                                select: { id: true }
                            }).then(courses => courses.map(c => c.id))
                        }
                    },
                    {
                        // Specific mapping for lesson_view and other custom actions
                        // We can also filter by entity if we know the courseId is there
                        action: { in: ['lesson_view', 'quiz_submit', 'quiz_start'] },
                        details: {
                            path: ['instructorId'],
                            equals: instructorId
                        }
                    }
                ];
            }

            return await this.prisma.auditLog.findMany({
                where,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true,
                            avatarUrl: true
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Failed to fetch instructor activity:', error);
            return [];
        }
    }
}
