import { Controller, Post, Body, UseGuards, Req, Delete, Param } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentController {
    constructor(private readonly enrollmentService: EnrollmentService) { }

    @Post()
    async enroll(@Req() req: any, @Body('courseId') courseId: string) {
        const userId = req.user.id;
        return this.enrollmentService.create(userId, courseId);
    }

    @Delete(':courseId')
    async unenroll(@Req() req: any, @Param('courseId') courseId: string) {
        const userId = req.user.id;
        return this.enrollmentService.remove(userId, courseId);
    }
}
