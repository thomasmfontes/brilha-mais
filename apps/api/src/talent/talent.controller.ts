import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TalentService } from './talent.service';
import { UpdateTalentProfileDto, UpdateResumeDto } from './dto/update-talent-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('talents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TalentController {
  constructor(private readonly talentService: TalentService) {}

  // --- Student Endpoints ---

  @Get('me')
  getMyProfile(@Req() req: any) {
    return this.talentService.getOrCreateProfile(req.user.id);
  }

  @Put('me')
  updateMyProfile(
    @Req() req: any,
    @Body() dto: UpdateTalentProfileDto,
  ) {
    return this.talentService.updateProfile(req.user.id, dto);
  }

  @Post('me/resume')
  updateMyResume(
    @Req() req: any,
    @Body() dto: UpdateResumeDto,
  ) {
    return this.talentService.updateResume(req.user.id, dto);
  }

  @Delete('me/resume')
  removeMyResume(@Req() req: any) {
    return this.talentService.removeResume(req.user.id);
  }

  // --- Admin Endpoints ---

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  findAllForAdmin(
    @Query('search') search?: string,
    @Query('turmaId') turmaId?: string,
    @Query('area') area?: string,
    @Query('availableOnly') availableOnly?: string,
    @Query('hasResumeOnly') hasResumeOnly?: string,
  ) {
    return this.talentService.findAllForAdmin({
      search,
      turmaId,
      area,
      availableOnly: availableOnly === 'true',
      hasResumeOnly: hasResumeOnly === 'true',
    });
  }

  @Get('stats')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getStats() {
    return this.talentService.getStats();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  findOneForAdmin(@Param('id') id: string) {
    return this.talentService.findOneForAdmin(id);
  }
}
