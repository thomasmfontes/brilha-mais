import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TalentService } from './talent.service';
import {
  UpdateTalentProfileDto,
  UpdateResumeDto,
  UploadParentDocumentDto,
  ToggleMinorApprovalDto,
} from './dto/update-talent-profile.dto';
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
    return this.talentService.getProfile(req.user.id);
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
    @Query('minorPendingOnly') minorPendingOnly?: string,
    @Query('minorApprovedOnly') minorApprovedOnly?: string,
  ) {
    return this.talentService.findAllForAdmin({
      search,
      turmaId,
      area,
      availableOnly: availableOnly === 'true',
      hasResumeOnly: hasResumeOnly === 'true',
      minorPendingOnly: minorPendingOnly === 'true',
      minorApprovedOnly: minorApprovedOnly === 'true',
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

  @Post(':id/parent-document')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  uploadParentDocument(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UploadParentDocumentDto,
  ) {
    return this.talentService.uploadParentDocument(id, req.user, dto);
  }

  @Delete(':id/parent-document')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  removeParentDocument(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.talentService.removeParentDocument(id, req.user);
  }

  @Patch(':id/minor-approval')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  toggleMinorApproval(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: ToggleMinorApprovalDto,
  ) {
    return this.talentService.toggleMinorApproval(id, req.user, dto);
  }
}
