import { Controller, Get, Post, Body, UseGuards, Req, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('audit')
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @UseGuards(JwtAuthGuard)
    @Post('log')
    async logActivity(
        @Req() req: any,
        @Body() body: { action: string; entity: string; entityId?: string; details?: any }
    ) {
        return this.auditService.log(
            body.action,
            body.entity,
            body.entityId,
            req.user.id,
            body.details
        );
    }

    @UseGuards(JwtAuthGuard)
    @Get('instructor')
    async getInstructorActivity(@Req() req: any, @Query('limit') limit?: string) {
        // Only INSTRUCTOR, ADMIN, and SUPER_ADMIN can access this
        if (req.user.role !== 'INSTRUCTOR' && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
            return [];
        }

        return this.auditService.getActivityForInstructor(
            req.user.id,
            req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN',
            limit ? parseInt(limit) : 50,
            req.user.locationId
        );
    }
}
