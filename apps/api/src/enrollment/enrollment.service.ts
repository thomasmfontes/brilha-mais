import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class EnrollmentService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, courseId: string) {
        // Check if already enrolled
        const existingEnrollment = await this.prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId,
                },
            },
        });

        if (existingEnrollment) {
            return existingEnrollment;
        }

        // Create new enrollment
        return this.prisma.enrollment.create({
            data: {
                userId,
                courseId,
            },
        });
    }

    async findByUserAndCourse(userId: string, courseId: string) {
        return this.prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId,
                },
            },
        });
    }

    async remove(userId: string, courseId: string) {
        return this.prisma.enrollment.delete({
            where: {
                userId_courseId: {
                    userId,
                    courseId,
                },
            },
        });
    }
}
