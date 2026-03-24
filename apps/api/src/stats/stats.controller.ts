import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { StatsService } from './stats.service';

@Controller('stats')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) { }

  @Get('admin')
  @Roles(Role.ADMIN)
  getAdminStats() {
    return this.statsService.getAdminStats();
  }

  @Get('instructor')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  getInstructorStats(@Req() req: any) {
    return this.statsService.getInstructorStats(req.user.id);
  }
}
